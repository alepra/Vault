/**
 * Clean Architecture - Trading Module
 * Real-time order matching and execution system
 */

class Trading {
  constructor(gameState) {
    this.gameState = gameState;
    this.tradingActive = false;
    this.aiTradingInterval = null;
    this.marketMakers = new Map(); // companyId -> market maker data
    this.priceMovementParams = {
      baseRatio: 6, // 6:1 ratio = 0.5% movement
      baseMovement: 0.005, // 0.5% base movement
      maxMovement: 0.03, // 3% maximum movement per turn
      volatilityMultiplier: 1.0
    };
  }

  /**
   * Start trading phase
   */
  startTrading() {
    console.log('🚀 Starting Trading Phase...');
    this.tradingActive = true;
    
    // Initialize trading for all companies
    for (const [companyId, company] of this.gameState.state.companies) {
      this.initializeCompany(companyId, company.currentPrice);
    }
    
    // Start AI bot trading
    this.startAIBotTrading();
    
    console.log('✅ Trading phase started for all companies');
    return true;
  }

  /**
   * Initialize trading for a company
   */
  initializeCompany(companyId, ipoPrice) {
    // Initialize order book
    this.gameState.state.orders.set(companyId, {
      buyOrders: [],
      sellOrders: []
    });
    
    // Initialize trades
    this.gameState.state.trades.set(companyId, []);
    
    // Set current price
    this.gameState.state.currentPrices.set(companyId, ipoPrice);
    
    // Initialize market maker for liquidity
    this.initializeMarketMaker(companyId, ipoPrice);
    
    console.log(`📈 Trading initialized for company ${companyId} at $${ipoPrice}`);
  }

  /**
   * Initialize market maker to provide liquidity
   */
  initializeMarketMaker(companyId, ipoPrice) {
    const spread = ipoPrice * 0.02; // 2% spread
    this.marketMakers.set(companyId, {
      bidPrice: ipoPrice - (spread / 2),
      askPrice: ipoPrice + (spread / 2),
      maxSpread: ipoPrice * 0.05, // Max 5% spread
      minSpread: ipoPrice * 0.01, // Min 1% spread
      liquidity: 100, // Shares available for market making
      lastUpdate: Date.now()
    });
    
    // Create initial market maker orders for liquidity
    this.createMarketMakerOrders(companyId, ipoPrice);
  }

  /**
   * Create market maker orders to provide liquidity
   */
  createMarketMakerOrders(companyId, ipoPrice) {
    const marketMaker = this.marketMakers.get(companyId);
    if (!marketMaker) return;
    
    const orderBook = this.gameState.state.orders.get(companyId);
    if (!orderBook) return;
    
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
    
    orderBook.sellOrders.push(sellOrder);
    
    // Sort sell orders by price (ascending - best price first)
    orderBook.sellOrders.sort((a, b) => a.price - b.price);
    
    console.log(`📊 Market maker created sell order: ${sellOrder.shares} shares at $${sellOrder.price.toFixed(2)} for ${companyId}`);
  }

  /**
   * Submit a buy order
   */
  submitBuyOrder(participantId, companyId, shares, price, orderType = 'limit') {
    if (!this.tradingActive) {
      console.log('❌ Trading not active - rejecting buy order');
      return { success: false, error: 'Trading not active' };
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

    // Process order immediately
    this.processImmediateOrder(companyId, order);
    return { success: true, orderId: order.id };
  }

  /**
   * Submit a sell order
   */
  submitSellOrder(participantId, companyId, shares, price, orderType = 'limit') {
    if (!this.tradingActive) {
      console.log('❌ Trading not active - rejecting sell order');
      return { success: false, error: 'Trading not active' };
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

    // Process order immediately
    this.processImmediateOrder(companyId, order);
    return { success: true, orderId: order.id };
  }

  /**
   * Process individual order immediately for real-time trading
   */
  processImmediateOrder(companyId, order) {
    console.log('🔍 Processing order:', order.type, order.shares, 'shares at $', order.price);
    
    const orderBook = this.gameState.state.orders.get(companyId);
    if (!orderBook) {
      console.log('❌ No order book found for company:', companyId);
      return;
    }

    if (order.orderType === 'market') {
      // Market orders execute immediately at best available price
      console.log('📈 Processing market order - executing immediately');
      const trades = this.executeMarketOrder(companyId, order);
      
      if (trades && trades.length > 0) {
        console.log(`✅ Market order executed: ${trades.length} trades`);
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
        this.replenishMarketMakerOrders(companyId);
      }
    }
  }

  /**
   * Execute a market order immediately at best available price
   */
  executeMarketOrder(companyId, order) {
    const orderBook = this.gameState.state.orders.get(companyId);
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
        
        const trade = this.createTrade(order.participantId, sellOrder.participantId, companyId, tradeShares, tradePrice);
        trades.push(trade);
        
        remainingShares -= tradeShares;
        sellOrder.shares -= tradeShares;
        
        // Remove fully filled sell orders
        if (sellOrder.shares <= 0) {
          const index = orderBook.sellOrders.indexOf(sellOrder);
          if (index > -1) orderBook.sellOrders.splice(index, 1);
        }
      }
    } else {
      // Market sell order - match against buy orders (highest price first)
      const buyOrders = orderBook.buyOrders.sort((a, b) => b.price - a.price);
      
      for (const buyOrder of buyOrders) {
        if (remainingShares <= 0) break;
        
        const tradeShares = Math.min(remainingShares, buyOrder.shares);
        const tradePrice = buyOrder.price; // Market sell takes the bid price
        
        const trade = this.createTrade(buyOrder.participantId, order.participantId, companyId, tradeShares, tradePrice);
        trades.push(trade);
        
        remainingShares -= tradeShares;
        buyOrder.shares -= tradeShares;
        
        // Remove fully filled buy orders
        if (buyOrder.shares <= 0) {
          const index = orderBook.buyOrders.indexOf(buyOrder);
          if (index > -1) orderBook.buyOrders.splice(index, 1);
        }
      }
    }

    // Update current price based on trades
    if (trades.length > 0) {
      const lastTrade = trades[trades.length - 1];
      this.gameState.state.currentPrices.set(companyId, lastTrade.price);
      this.updateMarketMaker(companyId);
    }

    return trades;
  }

  /**
   * Process orders and match them
   */
  processOrders(companyId) {
    const orderBook = this.gameState.state.orders.get(companyId);
    if (!orderBook) return [];

    console.log('🔍 Processing orders for:', companyId);
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
        const trade = this.createTrade(bestBuy.participantId, bestSell.participantId, companyId, tradeShares, tradePrice);
        trades.push(trade);
        console.log('✅ Trade created:', tradeShares, 'shares at $' + tradePrice);

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
        this.gameState.state.currentPrices.set(companyId, tradePrice);
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

    return trades;
  }

  /**
   * Create a trade and update participant balances
   */
  createTrade(buyerId, sellerId, companyId, shares, price) {
    const trade = {
      id: this.generateTradeId(),
      buyerId,
      sellerId,
      companyId,
      shares,
      price,
      timestamp: Date.now()
    };

    // Add trade to company's trade history
    const companyTrades = this.gameState.state.trades.get(companyId) || [];
    companyTrades.push(trade);
    this.gameState.state.trades.set(companyId, companyTrades);

    // Create transaction to update participant balances
    const totalCost = shares * price;
    const transaction = {
      id: this.gameState.generateTransactionId(),
      type: 'trade_execution',
      operations: [
        {
          participantId: buyerId,
          type: 'trade',
          companyId,
          cashChange: -totalCost,
          sharesChange: shares
        },
        {
          participantId: sellerId,
          type: 'trade',
          companyId,
          cashChange: totalCost,
          sharesChange: -shares
        }
      ],
      timestamp: Date.now()
    };

    // Apply transaction
    const result = this.gameState.updateState(transaction);
    if (result.success) {
      console.log(`💰 Trade executed: ${shares} shares at $${price} between ${buyerId} and ${sellerId}`);
    } else {
      console.error(`❌ Failed to execute trade: ${result.error}`);
    }

    return trade;
  }

  /**
   * Calculate trade price (mid-point for now)
   */
  calculateTradePrice(buyOrder, sellOrder) {
    return (buyOrder.price + sellOrder.price) / 2;
  }

  /**
   * Update market maker prices based on recent trading activity
   */
  updateMarketMaker(companyId) {
    const marketMaker = this.marketMakers.get(companyId);
    const currentPrice = this.gameState.state.currentPrices.get(companyId);
    
    if (!marketMaker || !currentPrice) return;

    // Adjust market maker prices to stay close to current market price
    const spread = Math.max(marketMaker.minSpread, Math.min(marketMaker.maxSpread, currentPrice * 0.02));
    
    marketMaker.bidPrice = currentPrice - (spread / 2);
    marketMaker.askPrice = currentPrice + (spread / 2);
    marketMaker.lastUpdate = Date.now();

    console.log(`📊 Market maker updated for ${companyId}: Bid $${marketMaker.bidPrice.toFixed(2)}, Ask $${marketMaker.askPrice.toFixed(2)}`);
  }

  /**
   * Replenish market maker orders when they get filled
   */
  replenishMarketMakerOrders(companyId) {
    const marketMaker = this.marketMakers.get(companyId);
    const orderBook = this.gameState.state.orders.get(companyId);
    
    if (!marketMaker || !orderBook) return;
    
    // Check if market maker sell orders are running low
    const marketMakerSellOrders = orderBook.sellOrders.filter(order => order.participantId === 'marketmaker');
    const totalMarketMakerShares = marketMakerSellOrders.reduce((sum, order) => sum + order.shares, 0);
    
    // If less than 50 shares available, replenish
    if (totalMarketMakerShares < 50) {
      const currentPrice = this.gameState.state.currentPrices.get(companyId);
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
        
        orderBook.sellOrders.push(newSellOrder);
        orderBook.sellOrders.sort((a, b) => a.price - b.price);
        
        console.log(`📊 Market maker replenished: ${newSellOrder.shares} shares at $${newSellOrder.price.toFixed(2)} for ${companyId}`);
      }
    }
  }

  /**
   * Start AI bot trading system
   */
  startAIBotTrading() {
    console.log('🤖 Starting AI bot trading system...');
    
    // Start AI bot trading with random intervals
    this.aiTradingInterval = setInterval(() => {
      this.executeAIBotTrading();
    }, 3000 + Math.random() * 2000); // Random interval between 3-5 seconds
    
    console.log('✅ AI bot trading started - bots will trade every 3-5 seconds');
  }

  /**
   * Stop AI bot trading
   */
  stopAIBotTrading() {
    if (this.aiTradingInterval) {
      clearInterval(this.aiTradingInterval);
      this.aiTradingInterval = null;
      console.log('🤖 AI bot trading stopped');
    }
  }

  /**
   * Execute AI bot trading based on personalities
   */
  executeAIBotTrading() {
    if (!this.tradingActive) return;
    
    const aiBots = Array.from(this.gameState.state.participants.values()).filter(p => !p.isHuman);
    if (aiBots.length === 0) {
      console.log('🤖 No AI bots available for trading');
      return;
    }
    
    console.log(`🤖 AI Trading Round: ${aiBots.length} bots active`);
    
    aiBots.forEach(bot => {
      this.executeBotTrading(bot);
    });
  }

  /**
   * Execute trading for a specific bot based on personality
   */
  executeBotTrading(bot) {
    try {
      if (!bot.personality) {
        console.log('❌ Bot has no personality:', bot.name);
        return;
      }
      
      const personality = bot.personality;
      const availableCash = bot.cash;
      
      // Only trade if bot has enough cash
      if (availableCash < 50) {
        console.log('❌ Bot has insufficient cash:', bot.name, '$' + availableCash);
        return;
      }
      
      // Determine trading action based on personality
      const action = this.determineBotAction(bot, personality, availableCash);
      if (!action) {
        console.log('❌ No trading action determined for bot:', bot.name);
        return;
      }
      
      console.log('🔍 Bot trading action:', bot.name, action.type, action.shares, 'shares at $' + action.price);
      
      // Execute the trading action
      this.executeBotAction(bot, action);
    } catch (error) {
      console.error('❌ TradingModule: Error in executeBotTrading:', error);
    }
  }

  /**
   * Determine what action a bot should take
   */
  determineBotAction(bot, personality, availableCash) {
    const risk = personality.riskTolerance || 0.5;
    const concentration = personality.concentration || 0.5;
    
    // Scavenger Bot - always trading, looking for deals
    if (personality.bidStrategy === 'scavenger') {
      if (availableCash > 100) {
        const companies = Array.from(this.gameState.state.currentPrices.keys());
        const companyId = companies[Math.floor(Math.random() * companies.length)];
        const currentPrice = this.gameState.state.currentPrices.get(companyId);
        const shares = Math.floor(Math.random() * 100) + 20;
        const price = currentPrice * (0.9 + Math.random() * 0.2); // 90%-110% of current price
        
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
        const companies = Array.from(this.gameState.state.currentPrices.keys());
        const companyId = companies[Math.floor(Math.random() * companies.length)];
        const currentPrice = this.gameState.state.currentPrices.get(companyId);
        const shares = Math.floor(Math.random() * 50) + 10;
        const price = currentPrice * (1.0 + Math.random() * 0.3); // 100%-130% of current price
        
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
    if (personality.bidStrategy === 'low') {
      if (availableCash > 200 && risk < 0.4) {
        // Find "safe" companies (lower prices)
        const safeCompanies = Array.from(this.gameState.state.currentPrices.entries())
          .filter(([id, price]) => price <= 1.60)
          .map(([id]) => id);
        
        if (safeCompanies.length > 0) {
          const companyId = safeCompanies[Math.floor(Math.random() * safeCompanies.length)];
          const currentPrice = this.gameState.state.currentPrices.get(companyId);
          const shares = Math.floor(Math.random() * 30) + 10;
          const price = currentPrice * 1.05; // Only 5% above current price
          
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
        const companies = Array.from(this.gameState.state.currentPrices.keys());
        const companyId = companies[Math.floor(Math.random() * companies.length)];
        const currentPrice = this.gameState.state.currentPrices.get(companyId);
        const shares = Math.floor(Math.random() * 40) + 15;
        const price = currentPrice * (0.95 + Math.random() * 0.15); // 95%-110% of current price
        
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

  /**
   * Execute a bot's trading action
   */
  executeBotAction(bot, action) {
    if (action.type === 'buy') {
      const result = this.submitBuyOrder(bot.id, action.companyId, action.shares, action.price);
      if (result.success) {
        console.log(`🤖 ${bot.name}: BUY ${action.shares} shares of ${action.companyId} at $${action.price.toFixed(2)} (${action.reason})`);
      }
    }
  }

  /**
   * Stop trading
   */
  stopTrading() {
    this.tradingActive = false;
    this.stopAIBotTrading();
    console.log('⏹️ Trading phase stopped');
  }

  /**
   * Generate unique order ID
   */
  generateOrderId() {
    return 'order_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate unique trade ID
   */
  generateTradeId() {
    return 'trade_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current market data for a company
   */
  getMarketData(companyId) {
    const orderBook = this.gameState.state.orders.get(companyId);
    const currentPrice = this.gameState.state.currentPrices.get(companyId);
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
}

module.exports = Trading;
