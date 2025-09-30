/**
 * Trading Manager - Handles order matching and trade execution
 */

class TradingManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  // Place buy order
  placeBuyOrder(participantId, companyId, shares, maxPrice) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    const participant = this.gameEngine.state.participants.get(participantId);
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const totalCost = shares * maxPrice;
    if (participant.cash < totalCost) {
      return { success: false, error: 'Insufficient funds' };
    }

    // Create order
    const orderId = this.gameEngine.generateId();
    const transaction = {
      id: this.gameEngine.generateId(),
      type: 'order_placement',
      operations: [{
        participantId,
        type: 'order_placement',
        orderId,
        companyId,
        orderType: 'buy',
        shares,
        price: maxPrice
      }],
      timestamp: Date.now()
    };

    // Execute transaction
    const result = this.gameEngine.executeTransaction(transaction);
    if (result.success) {
      // Try to match with existing sell orders
      this.matchOrders(companyId);
      return { success: true, orderId };
    }

    return result;
  }

  // Place sell order
  placeSellOrder(participantId, companyId, shares, minPrice) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    const participant = this.gameEngine.state.participants.get(participantId);
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const currentShares = participant.shares?.get(companyId) || 0;
    if (currentShares < shares) {
      return { success: false, error: 'Insufficient shares' };
    }

    // Create order
    const orderId = this.gameEngine.generateId();
    const transaction = {
      id: this.gameEngine.generateId(),
      type: 'order_placement',
      operations: [{
        participantId,
        type: 'order_placement',
        orderId,
        companyId,
        orderType: 'sell',
        shares,
        price: minPrice
      }],
      timestamp: Date.now()
    };

    // Execute transaction
    const result = this.gameEngine.executeTransaction(transaction);
    if (result.success) {
      // Try to match with existing buy orders
      this.matchOrders(companyId);
      return { success: true, orderId };
    }

    return result;
  }

  // Match orders for a company
  matchOrders(companyId) {
    const orderBook = this.gameEngine.getOrderBook(companyId);
    const buyOrders = orderBook.buyOrders;
    const sellOrders = orderBook.sellOrders;

    let matched = true;
    while (matched && buyOrders.length > 0 && sellOrders.length > 0) {
      matched = false;
      
      const bestBuy = buyOrders[0];
      const bestSell = sellOrders[0];

      // Check if orders can match
      if (bestBuy.price >= bestSell.price) {
        const tradeShares = Math.min(bestBuy.shares, bestSell.shares);
        const tradePrice = (bestBuy.price + bestSell.price) / 2; // Mid-price execution

        // Execute the trade
        this.executeTrade(bestBuy, bestSell, tradeShares, tradePrice);

        // Update or remove orders
        if (bestBuy.shares === tradeShares) {
          buyOrders.shift();
        } else {
          bestBuy.shares -= tradeShares;
        }

        if (bestSell.shares === tradeShares) {
          sellOrders.shift();
        } else {
          bestSell.shares -= tradeShares;
        }

        matched = true;
      }
    }
  }

  // Execute a trade between two orders
  executeTrade(buyOrder, sellOrder, shares, price) {
    const totalValue = shares * price;

    // Create trade record
    const tradeId = this.gameEngine.generateId();
    const trade = {
      id: tradeId,
      buyerId: buyOrder.participantId,
      sellerId: sellOrder.participantId,
      companyId: buyOrder.companyId,
      shares,
      price,
      timestamp: Date.now()
    };

    this.gameEngine.state.trades.set(tradeId, trade);

    // Create transaction to update participant balances
    const transaction = {
      id: this.gameEngine.generateId(),
      type: 'trade_execution',
      operations: [
        {
          participantId: buyOrder.participantId,
          type: 'trade',
          companyId: buyOrder.companyId,
          cashChange: -totalValue,
          sharesChange: shares
        },
        {
          participantId: sellOrder.participantId,
          type: 'trade',
          companyId: sellOrder.companyId,
          cashChange: totalValue,
          sharesChange: -shares
        }
      ],
      timestamp: Date.now()
    };

    // Execute transaction
    this.gameEngine.executeTransaction(transaction);

    console.log(`💹 Trade executed: ${shares} shares at $${price} between ${buyOrder.participantId} and ${sellOrder.participantId}`);
  }

  // Create market maker orders
  createMarketMakerOrders(companyId) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    const currentPrice = company.currentPrice;
    const orders = [];

    // Create sell orders at various price levels
    const sellPrices = [currentPrice * 1.05, currentPrice * 1.10, currentPrice * 1.15];
    const sellShares = [20, 30, 25];

    for (let i = 0; i < sellPrices.length; i++) {
      const orderId = this.gameEngine.generateId();
      orders.push({
        id: orderId,
        participantId: 'market_maker',
        companyId,
        type: 'sell',
        shares: sellShares[i],
        price: sellPrices[i],
        timestamp: Date.now(),
        status: 'pending'
      });
    }

    // Create buy orders at various price levels
    const buyPrices = [currentPrice * 0.95, currentPrice * 0.90, currentPrice * 0.85];
    const buyShares = [25, 30, 20];

    for (let i = 0; i < buyPrices.length; i++) {
      const orderId = this.gameEngine.generateId();
      orders.push({
        id: orderId,
        participantId: 'market_maker',
        companyId,
        type: 'buy',
        shares: buyShares[i],
        price: buyPrices[i],
        timestamp: Date.now(),
        status: 'pending'
      });
    }

    // Add orders to state
    for (const order of orders) {
      this.gameEngine.state.orders.set(order.id, order);
    }

    console.log(`📊 Market maker orders created for ${company.name}`);
    return { success: true, orders };
  }

  // Get trading statistics
  getTradingStats(companyId) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    const trades = Array.from(this.gameEngine.state.trades.values())
      .filter(trade => trade.companyId === companyId);

    const totalVolume = trades.reduce((sum, trade) => sum + trade.shares, 0);
    const totalValue = trades.reduce((sum, trade) => sum + (trade.shares * trade.price), 0);
    const avgPrice = totalVolume > 0 ? totalValue / totalVolume : company.currentPrice;

    return {
      success: true,
      stats: {
        totalTrades: trades.length,
        totalVolume,
        totalValue,
        avgPrice,
        currentPrice: company.currentPrice,
        priceChange: company.currentPrice - company.ipoPrice,
        priceChangePercent: ((company.currentPrice - company.ipoPrice) / company.ipoPrice) * 100
      }
    };
  }
}

module.exports = TradingManager;
