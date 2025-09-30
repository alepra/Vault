/**
 * Robust Stock Exchange Game Engine
 * Central game state management with clean architecture
 */

const { v4: uuidv4 } = require('uuid');

class GameEngine {
  constructor() {
    this.state = {
      gameId: uuidv4(),
      phase: 'lobby',
      participants: new Map(),
      companies: new Map(),
      orders: new Map(),
      trades: new Map(),
      marketData: new Map(),
      phaseTimer: null,
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
    
    this.listeners = new Map();
    this.phaseDurations = {
      lobby: 0,      // Manual start
      ipo: 120000,   // 2 minutes
      newspaper: 30000, // 30 seconds
      trading: 300000,  // 5 minutes
      results: 60000   // 1 minute
    };
  }

  // Get current state (immutable copy) - bulletproof serialization
  getState() {
    // Create a completely clean state object to avoid any circular references
    const cleanState = {
      gameId: this.state.gameId,
      phase: this.state.phase,
      participants: {},
      companies: {},
      orders: {},
      trades: {},
      marketData: {},
      phaseTimer: this.state.phaseTimer,
      createdAt: this.state.createdAt,
      lastUpdated: this.state.lastUpdated
    };

    // Serialize participants with only essential data
    for (const [id, participant] of this.state.participants) {
      // Calculate net worth safely without circular references
      let netWorth = participant.cash;
      if (participant.shares) {
        for (const [companyId, shares] of participant.shares) {
          const company = this.state.companies.get(companyId);
          if (company) {
            netWorth += shares * (company.currentPrice || 0);
          }
        }
      }

      // Safely convert shares Map to object
      let sharesObj = {};
      if (participant.shares && participant.shares instanceof Map) {
        for (const [companyId, shares] of participant.shares) {
          sharesObj[companyId] = shares;
        }
      }

      cleanState.participants[id] = {
        id: participant.id,
        name: participant.name,
        cash: participant.cash,
        isBot: participant.isBot || false,
        botStrategy: participant.botStrategy || null,
        shares: sharesObj,
        netWorth: netWorth
      };
    }

    // Serialize companies with only essential data
    for (const [id, company] of this.state.companies) {
      cleanState.companies[id] = {
        id: company.id,
        name: company.name,
        totalShares: company.totalShares,
        currentPrice: company.currentPrice,
        ipoPrice: company.ipoPrice,
        sharesAllocated: company.sharesAllocated || 0,
        ceo: company.ceo || null,
        marketCap: company.totalShares * company.currentPrice
      };
    }

    // Serialize orders with only essential data
    for (const [id, order] of this.state.orders) {
      cleanState.orders[id] = {
        id: order.id,
        participantId: order.participantId,
        companyId: order.companyId,
        type: order.type,
        price: order.price,
        shares: order.shares,
        status: order.status,
        timestamp: order.timestamp
      };
    }

    // Serialize trades with only essential data
    for (const [id, trade] of this.state.trades) {
      cleanState.trades[id] = {
        id: trade.id,
        buyerId: trade.buyerId,
        sellerId: trade.sellerId,
        companyId: trade.companyId,
        price: trade.price,
        shares: trade.shares,
        timestamp: trade.timestamp
      };
    }

    return cleanState;
  }


  // Execute transaction (atomic operation)
  executeTransaction(transaction) {
    console.log(`🔄 GameEngine: Executing transaction ${transaction.id}`);
    
    try {
      // Validate transaction
      if (!this.validateTransaction(transaction)) {
        throw new Error(`Invalid transaction: ${transaction.id}`);
      }

      // Apply transaction
      this.applyTransaction(transaction);
      
      // Update timestamp
      this.state.lastUpdated = Date.now();
      
      // Notify listeners - but catch circular reference errors
      try {
        this.notifyListeners('stateChanged', this.getState());
      } catch (error) {
        console.error(`❌ GameEngine: Listener error for stateChanged:`, error.message);
        // Don't throw - continue with transaction execution
      }
      
      console.log(`✅ GameEngine: Transaction ${transaction.id} executed successfully`);
      return { success: true, transaction };
      
    } catch (error) {
      console.error(`❌ GameEngine: Transaction ${transaction.id} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Validate transaction
  validateTransaction(transaction) {
    if (!transaction.id || !transaction.type || !transaction.operations) {
      return false;
    }

    if (transaction.operations.length === 0) {
      return false;
    }

    for (const operation of transaction.operations) {
      if (!this.validateOperation(operation)) {
        return false;
      }
    }

    return true;
  }

  // Validate individual operation
  validateOperation(operation) {
    if (!operation.type) {
      return false;
    }

    // For company_update operations, only require companyId
    if (operation.type === 'company_update') {
      return operation.companyId && this.state.companies.has(operation.companyId);
    }

    // For other operations, require participantId
    if (!operation.participantId) {
      return false;
    }

    // Check participant exists
    if (!this.state.participants.has(operation.participantId)) {
      return false;
    }

    // Check financial constraints
    if (operation.type === 'trade' && operation.cashChange < 0) {
      const participant = this.state.participants.get(operation.participantId);
      if (participant.cash + operation.cashChange < 0) {
        return false; // Insufficient funds
      }
    }

    return true;
  }

  // Apply transaction
  applyTransaction(transaction) {
    for (const operation of transaction.operations) {
      this.applyOperation(operation);
    }
  }

  // Apply individual operation
  applyOperation(operation) {
    const participant = this.state.participants.get(operation.participantId);
    
    switch (operation.type) {
      case 'trade':
        this.executeTrade(participant, operation);
        break;
      case 'company_update':
        this.updateCompany(operation);
        break;
      case 'order_placement':
        this.placeOrder(operation);
        break;
      case 'order_execution':
        this.executeOrder(operation);
        break;
    }
  }

  // Execute trade
  executeTrade(participant, operation) {
    // Update cash
    participant.cash += operation.cashChange;
    
    // Update shares
    if (operation.sharesChange) {
      if (!participant.shares) {
        participant.shares = new Map();
      }
      const currentShares = participant.shares.get(operation.companyId) || 0;
      participant.shares.set(operation.companyId, currentShares + operation.sharesChange);
    }
    
    // Update net worth
    participant.netWorth = this.calculateNetWorth(participant);
  }

  // Update company
  updateCompany(operation) {
    console.log(`🏢 Updating company ${operation.companyId}:`, operation);
    const company = this.state.companies.get(operation.companyId);
    if (company) {
      console.log(`🏢 Company before update:`, {
        ipoPrice: company.ipoPrice,
        currentPrice: company.currentPrice,
        sharesAllocated: company.sharesAllocated
      });
      
      if (operation.priceChange !== undefined) {
        company.currentPrice += operation.priceChange;
      }
      if (operation.sharesChange !== undefined) {
        company.totalShares += operation.sharesChange;
      }
      if (operation.ipoPrice !== undefined) {
        company.ipoPrice = operation.ipoPrice;
      }
      if (operation.currentPrice !== undefined) {
        company.currentPrice = operation.currentPrice;
      }
      if (operation.sharesAllocated !== undefined) {
        company.sharesAllocated = operation.sharesAllocated;
      }
      
      console.log(`🏢 Company after update:`, {
        ipoPrice: company.ipoPrice,
        currentPrice: company.currentPrice,
        sharesAllocated: company.sharesAllocated
      });
    } else {
      console.log(`❌ Company ${operation.companyId} not found!`);
    }
  }

  // Place order
  placeOrder(operation) {
    const order = {
      id: operation.orderId,
      participantId: operation.participantId,
      companyId: operation.companyId,
      type: operation.orderType, // 'buy' or 'sell'
      shares: operation.shares,
      price: operation.price,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.state.orders.set(order.id, order);
  }

  // Execute order
  executeOrder(operation) {
    const order = this.state.orders.get(operation.orderId);
    if (order) {
      order.status = 'executed';
      order.executedAt = Date.now();
      order.executedPrice = operation.executedPrice;
    }
  }

  // Calculate net worth
  calculateNetWorth(participant) {
    let netWorth = participant.cash;
    
    if (participant.shares) {
      for (const [companyId, shares] of participant.shares) {
        const company = this.state.companies.get(companyId);
        if (company) {
          netWorth += shares * company.currentPrice;
        }
      }
    }
    
    return netWorth;
  }


  // Add participant
  addParticipant(participantData) {
    const id = participantData.id || uuidv4();
    const participant = {
      id,
      name: participantData.name,
      cash: 1000,
      shares: new Map(),
      netWorth: 1000,
      isBot: participantData.isBot || false,
      botStrategy: participantData.botStrategy || 'conservative',
      ...participantData
    };
    
    this.state.participants.set(id, participant);
    this.notifyListeners('participantAdded', { id, participant });
    this.notifyListeners('stateChanged', this.getState());
    
    return id;
  }

  // Add company
  addCompany(companyData) {
    const id = companyData.id || uuidv4();
    const company = {
      id,
      name: companyData.name,
      currentPrice: companyData.currentPrice || 0,
      ipoPrice: companyData.ipoPrice || 0,
      totalShares: 1000,
      sharesAllocated: 0,
      ceo: null,
      ...companyData
    };
    
    this.state.companies.set(id, company);
    this.notifyListeners('companyAdded', { id, company });
    
    return id;
  }

  // Change phase
  setPhase(phase) {
    const oldPhase = this.state.phase;
    this.state.phase = phase;
    this.state.lastUpdated = Date.now();
    
    // Clear phase timer
    if (this.state.phaseTimer) {
      clearTimeout(this.state.phaseTimer);
      this.state.phaseTimer = null;
    }
    
    // Set new phase timer if needed
    if (this.phaseDurations[phase] > 0) {
      this.state.phaseTimer = setTimeout(() => {
        this.advanceToNextPhase();
      }, this.phaseDurations[phase]);
    }
    
    this.notifyListeners('phaseChanged', { phase, oldPhase });
    this.notifyListeners('stateChanged', this.getState());
  }

  // Advance to next phase
  advanceToNextPhase() {
    const phases = ['lobby', 'ipo', 'newspaper', 'trading', 'results'];
    const currentIndex = phases.indexOf(this.state.phase);
    
    if (currentIndex < phases.length - 1) {
      this.setPhase(phases[currentIndex + 1]);
    }
  }

  // Add event listener
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Notify listeners
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ GameEngine: Listener error for ${event}:`, error);
        }
      });
    }
  }

  // Generate unique ID
  generateId() {
    return uuidv4();
  }
}

module.exports = GameEngine;
