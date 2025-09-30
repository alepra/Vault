/**
 * Clean Architecture - Centralized Game State
 * Single source of truth for all game data
 * Based on your original requirements
 */

class GameState {
  constructor() {
    this.state = {
      // Core game data
      phase: 'lobby',
      sessionId: 'shared_game',
      startTime: null,
      currentTurn: 0,
      maxTurns: 20, // Summer season
      turnDuration: 30000, // 30 seconds per turn
      
      // Participants (humans + AI bots)
      participants: new Map(),
      
      // Companies (4 lemonade stands)
      companies: new Map(),
      
      // Trading data
      orders: new Map(), // companyId -> { buyOrders: [], sellOrders: [] }
      trades: new Map(), // companyId -> [trades]
      currentPrices: new Map(), // companyId -> current price
      
      // Market simulation
      weather: 'normal',
      economicConditions: 'good',
      marketEvents: [],
      
      // Game settings
      startingCapital: 1000,
      ceoThreshold: 0.35, // 35% ownership
      ipoDuration: 120000, // 2 minutes
      
      // Timestamps
      timestamp: Date.now()
    };
    
    this.listeners = new Map();
    this.transactionId = 0;
  }

  // Get current state (immutable copy)
  getState() {
    const participants = {};
    for (const [id, participant] of this.state.participants) {
      participants[id] = {
        ...participant,
        shares: participant.shares ? Object.fromEntries(participant.shares) : {},
        netWorth: this.calculateNetWorth(participant)
      };
    }

    return {
      phase: this.state.phase,
      sessionId: this.state.sessionId,
      participants,
      companies: Object.fromEntries(this.state.companies),
      orders: Object.fromEntries(this.state.orders),
      trades: Object.fromEntries(this.state.trades),
      currentPrices: Object.fromEntries(this.state.currentPrices),
      weather: this.state.weather,
      economicConditions: this.state.economicConditions,
      marketEvents: this.state.marketEvents,
      currentTurn: this.state.currentTurn,
      maxTurns: this.state.maxTurns,
      timestamp: this.state.timestamp
    };
  }

  // Update state through transactions only
  updateState(transaction) {
    console.log(`🔄 State: Processing transaction ${transaction.id}`);
    
    try {
      // Validate transaction
      if (!this.validateTransaction(transaction)) {
        throw new Error(`Invalid transaction: ${transaction.id}`);
      }

      // Apply transaction
      this.applyTransaction(transaction);
      
      // Update timestamp
      this.state.timestamp = Date.now();
      
      // Notify listeners
      this.notifyListeners('stateChanged', this.getState());
      
      console.log(`✅ State: Transaction ${transaction.id} applied successfully`);
      return { success: true, transaction };
      
    } catch (error) {
      console.error(`❌ State: Transaction ${transaction.id} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Validate transaction before applying
  validateTransaction(transaction) {
    if (!transaction.id || !transaction.type || !transaction.operations) {
      return false;
    }

    if (transaction.operations.length === 0) {
      return false;
    }

    // Validate all operations
    for (const operation of transaction.operations) {
      if (!this.validateOperation(operation)) {
        return false;
      }
    }

    return true;
  }

  // Validate individual operation
  validateOperation(operation) {
    if (!operation.participantId || !operation.type) {
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

  // Apply transaction to state
  applyTransaction(transaction) {
    for (const operation of transaction.operations) {
      this.applyOperation(operation);
    }
  }

  // Apply individual operation
  applyOperation(operation) {
    const participant = this.state.participants.get(operation.participantId);
    
    if (operation.type === 'trade') {
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
    } else if (operation.type === 'company_update') {
      // Update company price
      const company = this.state.companies.get(operation.companyId);
      if (company) {
        company.currentPrice += operation.priceChange;
        this.state.currentPrices.set(operation.companyId, company.currentPrice);
      }
    } else if (operation.type === 'phase_change') {
      // Change game phase
      this.state.phase = operation.newPhase;
    }
  }

  // Calculate net worth for participant
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
  addParticipant(participant) {
    const id = participant.id || this.generateId();
    this.state.participants.set(id, {
      id,
      name: participant.name,
      isHuman: participant.isHuman || false,
      cash: this.state.startingCapital,
      shares: new Map(),
      netWorth: this.state.startingCapital,
      personality: participant.personality || null,
      isCEO: false,
      ceoCompanyId: null,
      ...participant
    });
    
    this.notifyListeners('participantAdded', { id, participant: this.state.participants.get(id) });
    return id;
  }

  // Add company
  addCompany(company) {
    const id = company.id || this.generateId();
    this.state.companies.set(id, {
      id,
      name: company.name,
      currentPrice: company.currentPrice || 0,
      ipoPrice: company.ipoPrice || 0,
      totalShares: 1000,
      sharesAllocated: 0,
      ceoId: null,
      ceoName: null,
      ...company
    });
    
    this.state.currentPrices.set(id, company.currentPrice || 0);
    this.notifyListeners('companyAdded', { id, company: this.state.companies.get(id) });
    return id;
  }

  // Change phase
  setPhase(phase) {
    const oldPhase = this.state.phase;
    this.state.phase = phase;
    this.state.timestamp = Date.now();
    
    this.notifyListeners('phaseChanged', { phase, oldPhase });
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
          console.error(`❌ State: Listener error for ${event}:`, error);
        }
      });
    }
  }

  // Generate unique ID
  generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  // Generate transaction ID
  generateTransactionId() {
    return 'txn_' + (++this.transactionId).toString().padStart(6, '0');
  }
}

module.exports = GameState;
