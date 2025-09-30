const EventEmitter = require('events');

class TradingModule extends EventEmitter {
    constructor() {
        super();
        this.orderBooks = new Map(); // companyId -> { buyOrders: [], sellOrders: [] }
        this.marketMakers = new Map(); // companyId -> market maker data
        this.currentPrices = new Map(); // companyId -> current price
        this.ipoPrices = new Map(); // companyId -> ipo price
        this.tradingActive = false;
        this.pendingOrders = new Map(); // companyId -> { buyOrders: [], sellOrders: [] }
        this.weeklyTrading = false;
        this.ledgerModule = null; // Will be set by module bridge
        this.currentParticipants = []; // Will be set by module bridge
        this.tradingRounds = 0;
        this.maxTradingRounds = 3; // For testing - can be configurable
        this.tradingRoundDuration = 20000; // 20 seconds per round for testing
        this.tradingRoundBreak = 5000; // 5 seconds between rounds
        
        // Price movement parameters (adjustable)
        this.priceMovementParams = {
            baseRatio: 6, // 6:1 ratio = 0.5% movement
            baseMovement: 0.005, // 0.5% base movement
            maxMovement: 0.03, // 3% maximum movement per turn
            volatilityMultiplier: 1.0 // Normal volatility
        };
    }

    // Initialize trading for a company after IPO
    initializeCompany(companyId, ipoPrice) {
        this.orderBooks.set(companyId, {
            buyOrders: [],
            sellOrders: []
        });
        
        this.currentPrices.set(companyId, ipoPrice);
        
        // Store IPO price for price discovery
        this.ipoPrices.set(companyId, ipoPrice);
        
        // Initialize market maker for liquidity
        this.initializeMarketMaker(companyId, ipoPrice);
        
        console.log(`📈 Trading initialized for company ${companyId} at $${ipoPrice}`);
    }

    // Process bot trading for all companies
    processBotTrading(gameState, ledgerModule) {
        if (!this.tradingActive || !gameState.companies) {
            return;
        }

        console.log('🤖 Processing bot trading for all companies');

        for (const company of gameState.companies) {
            this.processBotTradingForCompany(company, gameState, ledgerModule);
        }
    }

    // Process bot trading for a specific company
    processBotTradingForCompany(company, gameState, ledgerModule) {
        const currentPrice = this.currentPrices.get(company.id) || company.currentPrice || company.ipoPrice;
        
        // Calculate market trends and rumors (simplified)
        const trend = this.calculateMarketTrend(company.id);
        const rumors = Math.random() * 0.4 - 0.2; // Random rumors between -0.2 and +0.2

        for (const participant of gameState.participants) {
            if (!participant.isHuman && participant.botProfile) {
                this.processBotTradingForParticipant(participant, company, currentPrice, trend, rumors, gameState, ledgerModule);
            }
        }
    }

    // Process trading for a specific bot participant
    processBotTradingForParticipant(participant, company, currentPrice, trend, rumors, gameState, ledgerModule) {
        const ledger = ledgerModule.ledgers.get(participant.id);
        if (!ledger) return;

        const availableCash = ledger.cash;
        const currentShares = participant.shares?.[company.id] || 0;

        // Generate trading order using bot profile
        const order = participant.botProfile.calculateTradingOrder(
            company,
            currentPrice,
            trend,
            rumors,
            availableCash,
            currentShares
        );

        if (!order) return; // No trade this tick

        // Check if bot can make the trade without exceeding caps
        const canTrade = participant.botProfile.canTrade(
            company,
            order.type,
            order.shares,
            currentShares,
            company.shares
        );

        if (!canTrade) {
            console.log(`🚫 ${participant.name} trade blocked by ownership cap`);
            return;
        }

        // Execute the bot's market order
        const marketOrder = {
            participantId: participant.id,
            companyId: company.id,
            companyName: company.name,
            type: order.type,
            shares: order.shares,
            reason: order.reason
        };

        const result = this.addMarketOrder(company.id, marketOrder, ledgerModule, gameState);
        
        if (result.success) {
            console.log(`🤖 ${participant.name} ${order.type} ${order.shares} shares of ${company.name} (${order.reason})`);
        } else {
            console.log(`❌ ${participant.name} trade failed: ${result.message}`);
        }
    }

    // Calculate market trend for a company (simplified)
    calculateMarketTrend(companyId) {
        const currentPrice = this.currentPrices.get(companyId);
        const ipoPrice = this.ipoPrices.get(companyId);
        
        if (!currentPrice || !ipoPrice) return 0;
        
        // Simple trend calculation based on price vs IPO
        return (currentPrice - ipoPrice) / ipoPrice;
    }

    // Initialize market maker to provide liquidity
    initializeMarketMaker(companyId, ipoPrice) {
        const spread = ipoPrice * 0.005; // 0.5% spread (much smaller)
        this.marketMakers.set(companyId, {
            bidPrice: ipoPrice - (spread / 2),
            askPrice: ipoPrice + (spread / 2),
            maxSpread: ipoPrice * 0.02, // Max 2% spread
            minSpread: ipoPrice * 0.001, // Min 0.1% spread
            liquidity: 100, // Shares available for market making
            lastUpdate: Date.now()
        });
        
        // Create initial market maker orders for liquidity
        this.createMarketMakerOrders(companyId, ipoPrice);
    }
    
    // Create market maker orders to provide liquidity
    createMarketMakerOrders(companyId, ipoPrice) {
        const marketMaker = this.marketMakers.get(companyId);
        if (!marketMaker) return;
        
        // Create sell orders at ask price (market maker selling to buyers)
        const sellOrder = {
            id: `marketmaker_sell_${companyId}_${Date.now()}`,
            participantId: 'marketmaker',
            companyId,
            orderType: 'sell',
            shares: 100, // Market maker provides 100 shares
            price: marketMaker.askPrice,
            type: 'limit',
            timestamp: Date.now()
        };
        
        // Create buy orders at bid price (market maker buying from sellers)
        const buyOrder = {
            id: `marketmaker_buy_${companyId}_${Date.now()}`,
            participantId: 'marketmaker',
            companyId,
            orderType: 'buy',
            shares: 100, // Market maker provides 100 shares
            price: marketMaker.bidPrice,
            type: 'limit',
            timestamp: Date.now()
        };
        
        // Add to order book
        if (!this.orderBooks.has(companyId)) {
            this.orderBooks.set(companyId, { buyOrders: [], sellOrders: [] });
        }
        
        const orderBook = this.orderBooks.get(companyId);
        orderBook.sellOrders.push(sellOrder);
        orderBook.buyOrders.push(buyOrder);
        
        // Sort orders by price (ascending for sell, descending for buy)
        orderBook.sellOrders.sort((a, b) => a.price - b.price);
        orderBook.buyOrders.sort((a, b) => b.price - a.price);
        
        console.log(`📊 Market maker created sell order: ${sellOrder.shares} shares at $${sellOrder.price.toFixed(2)} for ${companyId}`);
        console.log(`📊 Market maker created buy order: ${buyOrder.shares} shares at $${buyOrder.price.toFixed(2)} for ${companyId}`);
    }
    
    // Replenish market maker orders when they get filled
    replenishMarketMakerOrders(companyId) {
        const marketMaker = this.marketMakers.get(companyId);
        const orderBook = this.orderBooks.get(companyId);
        
        if (!marketMaker || !orderBook) return;
        
        // Check if market maker sell orders are running low
        const marketMakerSellOrders = orderBook.sellOrders.filter(order => order.participantId === 'marketmaker');
        const totalMarketMakerShares = marketMakerSellOrders.reduce((sum, order) => sum + order.shares, 0);
        
        // If less than 50 shares available, replenish
        if (totalMarketMakerShares < 50) {
            const currentPrice = this.currentPrices.get(companyId);
            if (currentPrice) {
                // Update market maker prices
                this.updateMarketMaker(companyId);
                
                // Create new sell order
                const newSellOrder = {
                    id: `marketmaker_sell_${companyId}_${Date.now()}`,
                    participantId: 'marketmaker',
                    companyId,
                    orderType: 'sell',
                    shares: 100,
                    price: marketMaker.askPrice,
                    type: 'limit',
                    timestamp: Date.now()
                };
                
                // Create new buy order
                const newBuyOrder = {
                    id: `marketmaker_buy_${companyId}_${Date.now()}`,
                    participantId: 'marketmaker',
                    companyId,
                    orderType: 'buy',
                    shares: 100,
                    price: marketMaker.bidPrice,
                    type: 'limit',
                    timestamp: Date.now()
                };
                
                orderBook.sellOrders.push(newSellOrder);
                orderBook.buyOrders.push(newBuyOrder);
                orderBook.sellOrders.sort((a, b) => a.price - b.price);
                orderBook.buyOrders.sort((a, b) => b.price - a.price);
                
                console.log(`📊 Market maker replenished: sell ${newSellOrder.shares} shares at $${newSellOrder.price.toFixed(2)}, buy ${newBuyOrder.shares} shares at $${newBuyOrder.price.toFixed(2)} for ${companyId}`);
            }
        }
    }

    // Submit a buy order (market or limit)
    submitBuyOrder(participantId, companyId, shares, price, orderType = 'limit') {
        console.log('🔍 TradingModule.submitBuyOrder called - weeklyTrading:', this.weeklyTrading, 'tradingActive:', this.tradingActive);
        if (!this.weeklyTrading) {
            console.log('❌ TradingModule: Weekly trading not active - rejecting buy order');
            return { success: false, error: 'Weekly trading not active' };
        }
        
        const order = {
            id: this.generateOrderId(),
            participantId,
            companyId,
            type: 'buy',
            orderType, // 'market' or 'limit'
            shares,
            price, // maxPrice for limit, current price for market
            timestamp: Date.now(),
            status: 'pending'
        };

        // Process limit orders immediately for real-time trading
        this.processImmediateOrder(companyId, order);
        return { success: true, orderId: order.id };
    }

    // Submit a sell order (market or limit)
    submitSellOrder(participantId, companyId, shares, price, orderType = 'limit') {
        console.log('🔍 TradingModule.submitSellOrder called - weeklyTrading:', this.weeklyTrading, 'tradingActive:', this.tradingActive);
        if (!this.weeklyTrading) {
            console.log('❌ TradingModule: Weekly trading not active - rejecting sell order');
            return { success: false, error: 'Weekly trading not active' };
        }
        
        const order = {
            id: this.generateOrderId(),
            participantId,
            companyId,
            type: 'sell',
            orderType, // 'market' or 'limit'
            shares,
            price, // minPrice for limit, current price for market
            timestamp: Date.now(),
            status: 'pending'
        };

        // Process limit orders immediately for real-time trading
        this.processImmediateOrder(companyId, order);
        return { success: true, orderId: order.id };
    }

    // Add pending order during weekly trading period
    addPendingOrder(companyId, order) {
        if (!this.pendingOrders.has(companyId)) {
            this.pendingOrders.set(companyId, { buyOrders: [], sellOrders: [] });
        }
        
        const pendingBook = this.pendingOrders.get(companyId);
        
        if (order.type === 'buy') {
            pendingBook.buyOrders.push(order);
        } else {
            pendingBook.sellOrders.push(order);
        }
        
        console.log(`📝 Pending ${order.orderType} ${order.type} order submitted: ${order.shares} shares at $${order.price}`);
        
        // Process orders immediately for real-time trading
        this.processImmediateOrder(companyId, order);
    }

    // Process individual order immediately for real-time trading
    processImmediateOrder(companyId, order) {
        console.log('🔍 TradingModule.processImmediateOrder called for:', companyId, 'order:', order.type, order.shares, 'shares at $', order.price, 'orderType:', order.orderType);
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) {
            console.log('❌ TradingModule: No order book found for company:', companyId);
            return;
        }

        if (order.orderType === 'market') {
            // Market orders execute immediately at best available price
            console.log('📈 Processing market order - executing immediately');
            const trades = this.executeMarketOrder(companyId, order);
            console.log(`🔍 executeMarketOrder returned:`, trades);
            
            if (trades && trades.length > 0) {
                console.log(`✅ Market order executed: ${trades.length} trades`);
                // Emit tradesExecuted event for market orders
                this.emit('tradesExecuted', { companyId, trades });
                this.replenishMarketMakerOrders(companyId);
            } else {
                console.log('❌ Market order could not be executed - no matching orders');
            }
        } else {
            // Limit orders go into the order book
            console.log('📝 Processing limit order - adding to order book');
            if (order.type === 'buy') {
                orderBook.buyOrders.push(order);
                orderBook.buyOrders.sort((a, b) => b.price - a.price); // Highest price first
            } else {
                orderBook.sellOrders.push(order);
                orderBook.sellOrders.sort((a, b) => a.price - b.price); // Lowest price first
            }

            // Try to match the order immediately
            const trades = this.processOrders(companyId);
            
            if (trades && trades.length > 0) {
                console.log(`✅ Limit order processed: ${trades.length} trades executed`);
                // Note: processOrders() already emits 'tradesExecuted' event, so no need to emit again
                
                // Replenish market maker orders if they were filled
                this.replenishMarketMakerOrders(companyId);
            }
        }
    }

    // Execute a market order immediately at best available price
    executeMarketOrder(companyId, order) {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) return [];

        const trades = [];
        let remainingShares = order.shares;

        if (order.type === 'buy') {
            // Market buy order - match against sell orders (lowest price first)
            const sellOrders = orderBook.sellOrders.sort((a, b) => a.price - b.price);
            
            for (const sellOrder of sellOrders) {
                if (remainingShares <= 0) break;
                
                const tradeShares = Math.min(remainingShares, sellOrder.shares);
                const tradePrice = sellOrder.price; // Market buy takes the ask price
                
                const trade = {
                    id: this.generateTradeId(),
                    buyerId: order.participantId,
                    sellerId: sellOrder.participantId,
                    companyId,
                    shares: tradeShares,
                    price: tradePrice,
                    timestamp: Date.now()
                };
                
                trades.push(trade);
                remainingShares -= tradeShares;
                sellOrder.shares -= tradeShares;
                
                // Remove fully filled sell orders
                if (sellOrder.shares <= 0) {
                    const index = orderBook.sellOrders.indexOf(sellOrder);
                    if (index > -1) orderBook.sellOrders.splice(index, 1);
                }
                
                // Refresh market maker orders if they were consumed
                if (sellOrder.participantId === 'marketmaker') {
                    this.replenishMarketMakerOrders(companyId);
                }
            }
        } else {
            // Market sell order - match against buy orders (highest price first)
            const buyOrders = orderBook.buyOrders.sort((a, b) => b.price - a.price);
            
            for (const buyOrder of buyOrders) {
                if (remainingShares <= 0) break;
                
                const tradeShares = Math.min(remainingShares, buyOrder.shares);
                const tradePrice = buyOrder.price; // Market sell takes the bid price
                
                const trade = {
                    id: this.generateTradeId(),
                    buyerId: buyOrder.participantId,
                    sellerId: order.participantId,
                    companyId,
                    shares: tradeShares,
                    price: tradePrice,
                    timestamp: Date.now()
                };
                
                trades.push(trade);
                remainingShares -= tradeShares;
                buyOrder.shares -= tradeShares;
                
                // Remove fully filled buy orders
                if (buyOrder.shares <= 0) {
                    const index = orderBook.buyOrders.indexOf(buyOrder);
                    if (index > -1) orderBook.buyOrders.splice(index, 1);
                }
                
                // Refresh market maker orders if they were consumed
                if (buyOrder.participantId === 'marketmaker') {
                    this.replenishMarketMakerOrders(companyId);
                }
            }
        }

        // Update current price based on trades
        if (trades.length > 0) {
            const lastTrade = trades[trades.length - 1];
            this.currentPrices.set(companyId, lastTrade.price);
            this.updateMarketMaker(companyId);
        }

        return trades;
    }

    // Process all pending orders at end of week (batch processing)
    processWeeklyOrders() {
        console.log('🔄 Processing weekly orders...');
        const allTrades = [];
        const priceChanges = new Map();

        // Process each company's pending orders
        this.pendingOrders.forEach((pendingBook, companyId) => {
            const trades = this.processCompanyOrders(companyId, pendingBook);
            allTrades.push(...trades);
            
            // Calculate price movement based on supply/demand pressure
            const priceChange = this.calculatePriceMovement(companyId, pendingBook);
            if (priceChange !== 0) {
                priceChanges.set(companyId, priceChange);
            }
        });

        // Apply price changes
        priceChanges.forEach((change, companyId) => {
            const currentPrice = this.currentPrices.get(companyId);
            const newPrice = currentPrice * (1 + change);
            this.currentPrices.set(companyId, newPrice);
            console.log(`📈 ${companyId}: $${currentPrice.toFixed(2)} → $${newPrice.toFixed(2)} (${(change * 100).toFixed(2)}%)`);
        });

        // Clear pending orders
        this.pendingOrders.clear();

        // Emit results
        this.emit('weeklyTradingComplete', { trades: allTrades, priceChanges: Object.fromEntries(priceChanges) });
        
        return { trades: allTrades, priceChanges: Object.fromEntries(priceChanges) };
    }

    // Process orders for a specific company
    processCompanyOrders(companyId, pendingBook) {
        const trades = [];
        const buyOrders = [...pendingBook.buyOrders];
        const sellOrders = [...pendingBook.sellOrders];
        
        // Sort orders
        buyOrders.sort((a, b) => b.price - a.price); // Highest price first
        sellOrders.sort((a, b) => a.price - b.price); // Lowest price first

        // Match orders
        let buyIndex = 0;
        let sellIndex = 0;

        while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
            const buyOrder = buyOrders[buyIndex];
            const sellOrder = sellOrders[sellIndex];

            // Check if orders can match
            if (buyOrder.price >= sellOrder.price) {
                const tradeShares = Math.min(buyOrder.shares, sellOrder.shares);
                const tradePrice = this.calculateTradePrice(buyOrder, sellOrder);

                // Create trade
                const trade = {
                    id: this.generateTradeId(),
                    companyId,
                    buyerId: buyOrder.participantId,
                    sellerId: sellOrder.participantId,
                    shares: tradeShares,
                    price: tradePrice,
                    timestamp: Date.now()
                };

                trades.push(trade);

                // Update orders
                buyOrder.shares -= tradeShares;
                sellOrder.shares -= tradeShares;

                // Remove filled orders
                if (buyOrder.shares === 0) buyIndex++;
                if (sellOrder.shares === 0) sellIndex++;
            } else {
                // No more matches possible
                break;
            }
        }

        return trades;
    }

    // Calculate logarithmic price movement based on supply/demand pressure
    calculatePriceMovement(companyId, pendingBook) {
        const buyOrders = pendingBook.buyOrders;
        const sellOrders = pendingBook.sellOrders;
        
        // Calculate total buy and sell pressure
        const totalBuyShares = buyOrders.reduce((sum, order) => sum + order.shares, 0);
        const totalSellShares = sellOrders.reduce((sum, order) => sum + order.shares, 0);
        
        if (totalBuyShares === 0 && totalSellShares === 0) {
            return 0; // No pressure, no movement
        }
        
        if (totalBuyShares === 0) {
            // Only sell pressure
            const ratio = totalSellShares / Math.max(totalBuyShares, 1);
            return -this.calculateLogarithmicMovement(ratio);
        }
        
        if (totalSellShares === 0) {
            // Only buy pressure
            const ratio = totalBuyShares / Math.max(totalSellShares, 1);
            return this.calculateLogarithmicMovement(ratio);
        }
        
        // Both buy and sell pressure - calculate net pressure
        const ratio = totalBuyShares / totalSellShares;
        const netMovement = this.calculateLogarithmicMovement(ratio);
        
        // Apply volatility multiplier
        const finalMovement = netMovement * this.priceMovementParams.volatilityMultiplier;
        
        // Apply maximum movement cap
        return Math.max(-this.priceMovementParams.maxMovement, 
                       Math.min(this.priceMovementParams.maxMovement, finalMovement));
    }

    // Calculate logarithmic price movement
    calculateLogarithmicMovement(ratio) {
        if (ratio === 1) return 0; // Balanced pressure
        
        // Logarithmic calculation
        const logRatio = Math.log(ratio);
        const movement = (logRatio / Math.log(this.priceMovementParams.baseRatio)) * this.priceMovementParams.baseMovement;
        
        return movement;
    }

    // Add market order - executes immediately at best available price
    addMarketOrder(companyId, order, ledgerModule, gameState) {
        if (!this.tradingActive) {
            console.log('❌ Trading not active - cannot process market order');
            return { success: false, message: 'Trading not active' };
        }

        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) {
            console.log(`❌ No order book for company ${companyId}`);
            return { success: false, message: 'Company not found' };
        }

        console.log(`📈 Processing market ${order.type} order for ${companyId}: ${order.shares} shares`);

        // Find best available price
        let bestPrice = 0;
        if (order.type === 'buy') {
            // For buy market order, find lowest sell price
            if (orderBook.sellOrders.length === 0) {
                return { success: false, message: 'No sellers available' };
            }
            bestPrice = orderBook.sellOrders[0].price;
        } else if (order.type === 'sell') {
            // For sell market order, find highest buy price
            if (orderBook.buyOrders.length === 0) {
                return { success: false, message: 'No buyers available' };
            }
            bestPrice = orderBook.buyOrders[0].price;
        }

        // Execute immediately at best price
        const marketOrder = {
            ...order,
            price: bestPrice,
            isMarketOrder: true
        };

        return this.executeMarketOrder(companyId, marketOrder, ledgerModule, gameState);
    }

    // Execute market order immediately
    executeMarketOrder(companyId, order, ledgerModule, gameState) {
        try {
            const participant = gameState.participants.find(p => p.id === order.participantId);
            if (!participant) {
                return { success: false, message: 'Participant not found' };
            }

            // Check if participant can afford the trade
            const totalCost = order.shares * order.price;
            const ledger = ledgerModule.ledgers.get(order.participantId);
            
            if (order.type === 'buy') {
                if (!ledger || ledger.cash < totalCost) {
                    return { success: false, message: 'Insufficient funds' };
                }
            } else if (order.type === 'sell') {
                const currentShares = participant.shares?.[companyId] || 0;
                if (currentShares < order.shares) {
                    return { success: false, message: 'Insufficient shares' };
                }
            }

            // Record the trade in ledger
            let success;
            if (order.type === 'buy') {
                success = ledgerModule.recordPurchase(
                    order.participantId,
                    companyId,
                    order.companyName || `Company ${companyId}`,
                    order.shares,
                    order.price,
                    'market'
                );
            } else {
                success = ledgerModule.recordSale(
                    order.participantId,
                    companyId,
                    order.companyName || `Company ${companyId}`,
                    order.shares,
                    order.price,
                    'market'
                );
            }

            if (!success) {
                return { success: false, message: 'Failed to record trade' };
            }

            // Update participant shares
            if (!participant.shares) participant.shares = {};
            if (!participant.shares[companyId]) participant.shares[companyId] = 0;
            
            if (order.type === 'buy') {
                participant.shares[companyId] += order.shares;
            } else {
                participant.shares[companyId] -= order.shares;
            }

            // Update current price
            this.currentPrices.set(companyId, order.price);

            // Create trade execution record
            const trade = {
                id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                companyId: companyId,
                participantId: order.participantId,
                participantName: participant.name,
                type: order.type,
                shares: order.shares,
                price: order.price,
                timestamp: new Date().toISOString(),
                isMarketOrder: true
            };

            // Emit trade execution
            this.emit('tradeExecuted', trade);

            console.log(`✅ Market ${order.type} executed: ${participant.name} ${order.shares} shares at $${order.price.toFixed(2)}`);

            return { success: true, trade: trade };

        } catch (error) {
            console.error('❌ Error executing market order:', error);
            return { success: false, message: 'Execution error' };
        }
    }

    // Add order to appropriate order book (legacy method for real-time trading)
    addOrderToBook(companyId, order) {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) return;

        if (order.type === 'buy') {
            orderBook.buyOrders.push(order);
            // Sort buy orders by price (highest first)
            orderBook.buyOrders.sort((a, b) => b.price - a.price);
        } else {
            orderBook.sellOrders.push(order);
            // Sort sell orders by price (lowest first)
            orderBook.sellOrders.sort((a, b) => a.price - b.price);
        }
    }

    // Process orders and match them
    processOrders(companyId) {
        const orderBook = this.orderBooks.get(companyId);
        if (!orderBook) return;

        console.log('🔍 TradingModule.processOrders called for:', companyId);
        console.log('🔍 Buy orders:', orderBook.buyOrders.length, 'Sell orders:', orderBook.sellOrders.length);
        
        const trades = [];
        let continueMatching = true;

        while (continueMatching && orderBook.buyOrders.length > 0 && orderBook.sellOrders.length > 0) {
            const bestBuy = orderBook.buyOrders[0];
            const bestSell = orderBook.sellOrders[0];
            
            console.log('🔍 Checking match: Buy $' + bestBuy.price + ' vs Sell $' + bestSell.price);

            // Check if orders can match
            if (bestBuy.price >= bestSell.price) {
                console.log('✅ Orders can match! Creating trade...');
                const tradePrice = this.calculateTradePrice(bestBuy, bestSell);
                const tradeShares = Math.min(bestBuy.shares, bestSell.shares);

                // Create trade
                const trade = {
                    id: this.generateTradeId(),
                    companyId,
                    buyerId: bestBuy.participantId,
                    sellerId: bestSell.participantId,
                    shares: tradeShares,
                    price: tradePrice,
                    timestamp: Date.now()
                };

                trades.push(trade);
                console.log('✅ Trade created:', tradeShares, 'shares at $' + tradePrice, 'between', bestBuy.participantId, 'and', bestSell.participantId);

                // Update orders
                bestBuy.shares -= tradeShares;
                bestSell.shares -= tradeShares;

                // Remove filled orders
                if (bestBuy.shares === 0) {
                    orderBook.buyOrders.shift();
                }
                if (bestSell.shares === 0) {
                    orderBook.sellOrders.shift();
                }

                // Update current price
                this.currentPrices.set(companyId, tradePrice);
            } else {
                console.log('❌ Orders cannot match: Buy $' + bestBuy.price + ' < Sell $' + bestSell.price);
                continueMatching = false;
            }
        }
        
        console.log('🔍 Order matching complete. Trades executed:', trades.length);

        // Update market maker prices based on trades
        if (trades.length > 0) {
            this.updateMarketMaker(companyId);
        }

        // Emit trades
        if (trades.length > 0) {
            this.emit('tradesExecuted', { companyId, trades });
        }
    }

    // Calculate trade price (mid-point for now)
    calculateTradePrice(buyOrder, sellOrder) {
        return (buyOrder.price + sellOrder.price) / 2;
    }

    // Update market maker prices based on recent trading activity
    updateMarketMaker(companyId) {
        const marketMaker = this.marketMakers.get(companyId);
        const currentPrice = this.currentPrices.get(companyId);
        const orderBook = this.orderBooks.get(companyId);
        
        if (!marketMaker || !currentPrice || !orderBook) return;

        // Simple price discovery: adjust price based on buy/sell ratio
        const buyOrders = orderBook.buyOrders;
        const sellOrders = orderBook.sellOrders;
        const totalBuyShares = buyOrders.reduce((sum, order) => sum + order.shares, 0);
        const totalSellShares = sellOrders.reduce((sum, order) => sum + order.shares, 0);
        
        // Price adjustment factor based on supply/demand
        let priceAdjustment = 0;
        if (totalBuyShares > totalSellShares) {
            // More buyers than sellers - price goes up
            const ratio = totalBuyShares / Math.max(totalSellShares, 1);
            priceAdjustment = currentPrice * 0.01 * Math.min(ratio - 1, 0.5); // Max 0.5% increase
        } else if (totalSellShares > totalBuyShares) {
            // More sellers than buyers - price goes down
            const ratio = totalSellShares / Math.max(totalBuyShares, 1);
            priceAdjustment = -currentPrice * 0.01 * Math.min(ratio - 1, 0.5); // Max 0.5% decrease
        }
        
        // Update current price with adjustment
        const ipoPrice = this.ipoPrices.get(companyId) || currentPrice; // Get IPO price or use current price as fallback
        const newPrice = Math.max(currentPrice + priceAdjustment, ipoPrice * 0.5); // Don't go below 50% of IPO price
        this.currentPrices.set(companyId, newPrice);
        
        // Adjust market maker prices to stay close to current market price
        const spread = Math.max(marketMaker.minSpread, Math.min(marketMaker.maxSpread, newPrice * 0.005));
        
        marketMaker.bidPrice = newPrice - (spread / 2);
        marketMaker.askPrice = newPrice + (spread / 2);
        marketMaker.lastUpdate = Date.now();

        console.log(`📊 Market maker updated for ${companyId}: Bid $${marketMaker.bidPrice.toFixed(3)}, Ask $${marketMaker.askPrice.toFixed(3)} (Price: $${newPrice.toFixed(3)}, Buy/Sell: ${totalBuyShares}/${totalSellShares})`);
    }

    // Get current market data for a company
    getMarketData(companyId) {
        const orderBook = this.orderBooks.get(companyId);
        const currentPrice = this.currentPrices.get(companyId);
        const marketMaker = this.marketMakers.get(companyId);

        if (!orderBook || !currentPrice) return null;

        return {
            companyId,
            currentPrice,
            marketMaker: marketMaker ? {
                bidPrice: marketMaker.bidPrice,
                askPrice: marketMaker.askPrice,
                spread: marketMaker.askPrice - marketMaker.bidPrice
            } : null,
            buyOrders: orderBook.buyOrders.slice(0, 5), // Top 5 buy orders
            sellOrders: orderBook.sellOrders.slice(0, 5), // Top 5 sell orders
            totalBuyShares: orderBook.buyOrders.reduce((sum, order) => sum + order.shares, 0),
            totalSellShares: orderBook.sellOrders.reduce((sum, order) => sum + order.shares, 0)
        };
    }

    // Start trading phase
    startTrading(companies) {
        console.log('🔍 TradingModule.startTrading called with:', companies);
        console.log('🔍 Companies type:', typeof companies);
        console.log('🔍 Companies is array:', Array.isArray(companies));
        
        this.tradingActive = true;
        this.weeklyTrading = true; // Enable order processing
        
        // Start trading rounds
        this.startTradingRounds();
        
        // CRITICAL FIX: Correct company data before initializing trading
        if (companies && Array.isArray(companies) && companies.length > 0) {
            console.log('🔍 Initializing trading for', companies.length, 'companies');
            
            // Fix companies that were processed during trading phase
            companies.forEach(company => {
                // Only fix companies that have been processed by IPO (have ipoPrice set)
                if (company.ipoPrice && (!company.totalSharesAllocated || company.totalSharesAllocated === 0) && company.shares > 0) {
                    company.totalSharesAllocated = company.shares;
                    console.log(`🔧 Trading Module Fix: ${company.name} totalSharesAllocated set to ${company.shares}`);
                }
                
                // CRITICAL FIX: If company has no ipoPrice but has currentPrice, set ipoPrice
                // Only do this for companies that have been processed by IPO (have totalSharesAllocated > 0)
                if (!company.ipoPrice && company.currentPrice && company.currentPrice > 0 && company.totalSharesAllocated > 0) {
                    company.ipoPrice = company.currentPrice;
                    console.log(`🔧 Trading Module Fix: ${company.name} ipoPrice set to currentPrice $${company.currentPrice.toFixed(2)}`);
                }
                
                // If company has ipoPrice but currentPrice is wrong, fix it
                if (company.ipoPrice && company.currentPrice !== company.ipoPrice) {
                    company.currentPrice = company.ipoPrice;
                    console.log(`🔧 Trading Module Fix: ${company.name} currentPrice set to ipoPrice $${company.ipoPrice.toFixed(2)}`);
                }
                
                this.initializeCompany(company.id, company.ipoPrice || company.currentPrice);
            });
        } else {
            console.log('⚠️ No valid companies provided to startTrading, using default initialization');
            console.log('⚠️ Companies value:', companies);
        }

        console.log('🚀 Trading phase started for all companies');
        this.emit('tradingStarted', { companies: companies.length });
    }

    // Stop trading
    stopTrading() {
        this.tradingActive = false;
        this.weeklyTrading = false;
        console.log('⏹️ Trading phase stopped');
        this.emit('tradingStopped');
        
        // Stop AI bot trading
        this.stopAIBotTrading();
        
        // Reset trading rounds
        this.tradingRounds = 0;
    }
    
    // Start trading rounds system
    startTradingRounds() {
        console.log('🔄 Trading rounds system DISABLED for manual control');
        console.log('📊 Manual control: No automatic timers, no automatic bot trading');
        
        // DISABLED: Automatic trading rounds for manual control
        // this.tradingRounds = 0;
        // this.runNextTradingRound();
    }
    
    // Run the next trading round
    runNextTradingRound() {
        if (this.tradingRounds >= this.maxTradingRounds) {
            console.log('✅ All trading rounds completed!');
            this.completeTradingPhase();
            return;
        }
        
        this.tradingRounds++;
        console.log(`\n🔄 TRADING ROUND ${this.tradingRounds}/${this.maxTradingRounds}`);
        console.log('='.repeat(50));
        
        // Start AI bot trading for this round
        this.startAIBotTrading();
        
        // Emit round start event
        this.emit('tradingRoundStarted', { 
            round: this.tradingRounds, 
            maxRounds: this.maxTradingRounds,
            duration: this.tradingRoundDuration 
        });
        
        // End this round after the duration
        setTimeout(() => {
            this.endTradingRound();
        }, this.tradingRoundDuration);
    }
    
    // End the current trading round
    endTradingRound() {
        console.log(`\n⏰ TRADING ROUND ${this.tradingRounds} ENDED`);
        console.log('='.repeat(50));
        
        // Stop AI bot trading for this round
        this.stopAIBotTrading();
        
        // Show round results
        this.showTradingRoundResults();
        
        // Emit round end event
        this.emit('tradingRoundEnded', { 
            round: this.tradingRounds, 
            maxRounds: this.maxTradingRounds 
        });
        
        // Wait for break, then start next round
        setTimeout(() => {
            this.runNextTradingRound();
        }, this.tradingRoundBreak);
    }
    
    // Show results of the trading round
    showTradingRoundResults() {
        console.log('\n📊 ROUND RESULTS:');
        console.log('================');
        
        // Show current prices for all companies
        this.currentPrices.forEach((price, companyId) => {
            console.log(`${companyId}: $${price.toFixed(2)}`);
        });
        
        // Show participant portfolios if available
        if (this.currentParticipants && this.currentParticipants.length > 0) {
            console.log('\n👥 PARTICIPANT PORTFOLIOS:');
            this.currentParticipants.forEach(participant => {
                const ledger = this.getBotLedger(participant.id);
                if (ledger) {
                    const cash = ledger.cash || 0;
                    const stockValue = ledger.totalStockValue || 0;
                    const netWorth = ledger.totalNetWorth || (cash + stockValue);
                    console.log(`${participant.name}: $${cash.toFixed(0)} cash, $${stockValue.toFixed(0)} stock, $${netWorth.toFixed(0)} total`);
                }
            });
        }
    }
    
    // Complete the entire trading phase
    completeTradingPhase() {
        console.log('\n🏁 TRADING PHASE COMPLETED!');
        console.log('==========================');
        
        this.tradingActive = false;
        this.weeklyTrading = false;
        
        // Emit trading phase completed event
        this.emit('tradingPhaseCompleted', {
            totalRounds: this.maxTradingRounds,
            finalPrices: Object.fromEntries(this.currentPrices)
        });
    }
    
    // Start AI bot trading system
    startAIBotTrading() {
        console.log('🤖 AI bot trading ENABLED for manual control');
        
        // Start AI bot trading with random intervals
        this.aiTradingInterval = setInterval(() => {
            this.executeAIBotTrading();
        }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds
        
        console.log('✅ AI bot trading started - bots will trade every 3-5 seconds');
    }
    
    // Stop AI bot trading
    stopAIBotTrading() {
        if (this.aiTradingInterval) {
            clearInterval(this.aiTradingInterval);
            this.aiTradingInterval = null;
            console.log('🤖 AI bot trading stopped for this round');
        }
    }
    
    // Execute AI bot trading based on personalities
    executeAIBotTrading() {
        if (!this.tradingActive) return;
        
        // Get current participants from the game state
        // This will be set by the module bridge
        if (!this.currentParticipants) {
            console.log('🤖 No participants available for AI trading');
            return;
        }
        
        const aiBots = this.currentParticipants.filter(p => !p.isHuman);
        if (aiBots.length === 0) {
            console.log('🤖 No AI bots available for trading');
            return;
        }
        
        console.log(`🤖 AI Trading Round: ${aiBots.length} bots active`);
        
        aiBots.forEach(bot => {
            this.executeBotTrading(bot);
        });
    }
    
    // Execute trading for a specific bot based on personality
    executeBotTrading(bot) {
        try {
            console.log('🔍 executeBotTrading called for bot:', bot.name, 'personality:', bot.personality);
            if (!bot.personality) {
                console.log('❌ Bot has no personality:', bot.name);
                return;
            }
            
            const personality = bot.personality;
            
            // Get cash from ledger, not from bot object
            console.log('🔍 Looking up ledger for bot:', bot.name, 'ID:', bot.id);
            const botLedger = this.getBotLedger(bot.id);
            const availableCash = botLedger ? botLedger.cash : 0;
            console.log('🔍 Bot cash from ledger:', bot.name, '$' + availableCash, 'ledger exists:', !!botLedger);
            
            // Only trade if bot has enough cash
            if (availableCash < 50) {
                console.log('❌ Bot has insufficient cash:', bot.name, '$' + availableCash);
                return;
            }
            
            // Bot ledger already retrieved above
            if (!botLedger) {
                console.log('❌ No ledger found for bot:', bot.name, bot.id);
                return;
            }
            console.log('🔍 Bot ledger confirmed:', bot.name, 'cash:', botLedger.cash);
            
            // Determine trading action based on personality
            const action = this.determineBotAction(bot, personality, botLedger);
            if (!action) {
                console.log('❌ No trading action determined for bot:', bot.name);
                return;
            }
            console.log('🔍 Bot trading action:', bot.name, action.type, action.shares, 'shares at $' + action.price);
            
            // Execute the trading action
            this.executeBotAction(bot, action);
        } catch (error) {
            console.error('❌ TradingModule: Error in executeBotTrading:', error);
            console.error('❌ Bot:', bot);
        }
    }
    
    // Get bot's ledger data
    getBotLedger(botId) {
        try {
            console.log('🔍 getBotLedger called for botId:', botId);
            console.log('🔍 ledgerModule exists:', !!this.ledgerModule);
            console.log('🔍 ledgerModule.ledgers exists:', !!this.ledgerModule?.ledgers);
            console.log('🔍 Available ledger IDs:', Array.from(this.ledgerModule?.ledgers?.keys() || []));
            
            // This will be provided by the module bridge
            if (this.ledgerModule && this.ledgerModule.ledgers) {
                const ledger = this.ledgerModule.ledgers.get(botId);
                console.log('🔍 Found ledger for bot:', botId, 'cash:', ledger?.cash);
                return ledger;
            }
            console.log('⚠️ TradingModule: No ledger module available for bot:', botId);
            return null;
        } catch (error) {
            console.error('❌ TradingModule: Error getting bot ledger:', error);
            return null;
        }
    }
    
    // Determine what action a bot should take
    determineBotAction(bot, personality, ledger) {
        const availableCash = ledger.cash || 0;
        const risk = personality.risk || 0.5;
        const concentration = personality.concentration || 0.5;
        
        // Scavenger Bot - always trading, looking for deals
        if (personality.bidStrategy === 'scavenger') {
            if (availableCash > 100) {
                const companies = Array.from(this.currentPrices.keys());
                const companyId = companies[Math.floor(Math.random() * companies.length)];
                const ipoPrice = this.currentPrices.get(companyId);
                const shares = Math.floor(Math.random() * 100) + 20;
                const price = ipoPrice * (0.9 + Math.random() * 0.2); // 90%-110% of IPO price
                
                return {
                    type: 'buy',
                    companyId,
                    shares,
                    price,
                    reason: 'scavenger_deal'
                };
            }
        }
        
        // Momentum Trader - aggressive, high risk
        if (personality.bidStrategy === 'momentum') {
            if (availableCash > 100 && risk > 0.7) {
                const companies = Array.from(this.currentPrices.keys());
                const companyId = companies[Math.floor(Math.random() * companies.length)];
                const ipoPrice = this.currentPrices.get(companyId);
                const shares = Math.floor(Math.random() * 50) + 10;
                const price = ipoPrice * (1.0 + Math.random() * 0.3); // 100%-130% of IPO price
                
                return {
                    type: 'buy',
                    companyId,
                    shares,
                    price,
                    reason: 'momentum_aggressive'
                };
            }
        }
        
        // Conservative Bot - low risk, careful
        if (personality.bidStrategy === 'conservative') {
            if (availableCash > 200 && risk < 0.4) {
                // Find "safe" companies (lower IPO prices)
                const safeCompanies = Array.from(this.currentPrices.entries())
                    .filter(([id, price]) => price <= 1.60)
                    .map(([id]) => id);
                
                if (safeCompanies.length > 0) {
                    const companyId = safeCompanies[Math.floor(Math.random() * safeCompanies.length)];
                    const ipoPrice = this.currentPrices.get(companyId);
                    const shares = Math.floor(Math.random() * 30) + 10;
                    const price = ipoPrice * 1.05; // Only 5% above IPO
                    
                    return {
                        type: 'buy',
                        companyId,
                        shares,
                        price,
                        reason: 'conservative_safe'
                    };
                }
            }
        }
        
        // Diversified Bot - spreads risk across multiple companies
        if (personality.bidStrategy === 'diversified') {
            if (availableCash > 150 && concentration < 0.6) {
                const companies = Array.from(this.currentPrices.keys());
                const companyId = companies[Math.floor(Math.random() * companies.length)];
                const ipoPrice = this.currentPrices.get(companyId);
                const shares = Math.floor(Math.random() * 40) + 15;
                const price = ipoPrice * (0.95 + Math.random() * 0.15); // 95%-110% of IPO price
                
                return {
                    type: 'buy',
                    companyId,
                    shares,
                    price,
                    reason: 'diversified_spread'
                };
            }
        }
        
        return null;
    }
    
    // Execute a bot's trading action
    executeBotAction(bot, action) {
        if (action.type === 'buy') {
            const result = this.submitBuyOrder(bot.id, action.companyId, action.shares, action.price);
            if (result.success) {
                console.log(`🤖 ${bot.name}: BUY ${action.shares} shares of ${action.companyId} at $${action.price.toFixed(2)} (${action.reason})`);
            }
        }
    }
    
    // Set current participants for AI trading
    setParticipants(participants) {
        this.currentParticipants = participants;
        console.log(`🤖 AI Trading: ${participants.length} participants available`);
    }

    // Generate unique order ID
    generateOrderId() {
        return 'order_' + Math.random().toString(36).substr(2, 9);
    }

    // Generate unique trade ID
    generateTradeId() {
        return 'trade_' + Math.random().toString(36).substr(2, 9);
    }

    // Get all current prices
    getAllPrices() {
        const prices = {};
        this.currentPrices.forEach((price, companyId) => {
            prices[companyId] = price;
        });
        return prices;
    }
}

module.exports = TradingModule;
