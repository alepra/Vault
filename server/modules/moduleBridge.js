/**
 * Module Bridge - Central Communication Hub for All Game Modules
 * This is the "mathematical coordinator" that ensures all modules work together
 */

const EventEmitter = require('events');

class ModuleBridge extends EventEmitter {
  constructor() {
    super();
    
    // Module references
    this.gameState = null;
    this.ipoModule = null;
    this.tradingModule = null;
    this.ledgerModule = null;
    this.botNameModule = null;
    this.io = null;
    
    // Communication state
    this.isInitialized = false;
    this.currentPhase = 'lobby';
    
    console.log('🌉 Module Bridge initialized - ready to coordinate modules');
  }

  /**
   * Initialize all modules with proper references
   */
  initializeModules(gameState, ipoModule, tradingModule, ledgerModule, botNameModule, io) {
    this.gameState = gameState;
    this.ipoModule = ipoModule;
    this.tradingModule = tradingModule;
    this.ledgerModule = ledgerModule;
    this.botNameModule = botNameModule;
    this.io = io;
    
    // Set up event listeners for module communication
    this.setupEventListeners();
    
    this.isInitialized = true;
    console.log('✅ All modules connected to Module Bridge');
  }

  /**
   * Set up event listeners for inter-module communication
   */
  setupEventListeners() {
    // Trading module events
    if (this.tradingModule) {
      this.tradingModule.on('tradesExecuted', (data) => {
        console.log('📈 Trading Bridge: Trades executed, updating ledger...');
        this.handleTradesExecuted(data);
      });
      
      this.tradingModule.on('tradingStarted', (data) => {
        console.log('🚀 Trading Bridge: Trading phase started');
        this.currentPhase = 'trading';
        this.emit('phaseChanged', { phase: 'trading', data });
      });
      
      this.tradingModule.on('tradingStopped', () => {
        console.log('⏹️ Trading Bridge: Trading phase stopped');
        this.currentPhase = 'newspaper';
        this.emit('phaseChanged', { phase: 'newspaper' });
      });
    }

    // IPO module events
    if (this.ipoModule) {
      // Listen for IPO completion
      this.on('ipoCompleted', (data) => {
        console.log('🎯 IPO Bridge: IPO completed, initializing trading...');
        this.initializeTradingAfterIPO(data);
      });
    }
  }

  /**
   * Handle phase changes from the game state module
   */
  handlePhaseChange(newPhase, oldPhase) {
    console.log(`🔄 Bridge: Handling phase change from ${oldPhase} to ${newPhase}`);
    
    switch (newPhase) {
      case 'ipo':
        console.log('🎯 Bridge: IPO phase started');
        break;
        
      case 'newspaper':
        console.log('📰 Bridge: Newspaper phase started');
        // If we just left IPO phase, process any remaining bids
        if (oldPhase === 'ipo' && this.ipoModule) {
          this.ipoModule.handleIPOPhaseEnd();
        }
        break;
        
      case 'trading':
        console.log('📈 Bridge: Trading phase started');
        this.initializeTradingPhase();
        break;
        
      default:
        console.log(`🔄 Bridge: Unknown phase ${newPhase}`);
    }
  }

  /**
   * Initialize trading phase
   */
  initializeTradingPhase() {
    try {
      if (!this.tradingModule || !this.gameState) {
        console.error('❌ Bridge: Cannot initialize trading - modules not available');
        return;
      }

      const gameState = this.gameState.getGameState();
      const companies = gameState.companies;
      
      if (companies && Array.isArray(companies) && companies.length > 0) {
        console.log('🔍 Bridge: Starting trading with companies:', companies.length);
        
        // Connect trading module to ledger and participants
        this.tradingModule.ledgerModule = this.ledgerModule;
        this.tradingModule.setParticipants(gameState.participants);
        
        // Clean companies array to prevent circular references
        const cleanCompanies = companies.map(company => ({
          id: company.id,
          name: company.name,
          shares: company.shares,
          currentPrice: company.currentPrice,
          totalSharesAllocated: company.totalSharesAllocated,
          ceoId: company.ceoId,
          price: company.price,
          quality: company.quality,
          marketing: company.marketing,
          reputation: company.reputation,
          revenue: company.revenue,
          profit: company.profit,
          demand: company.demand,
          ipoPrice: company.ipoPrice
        }));
        
        // Start trading phase with clean companies data
        this.tradingModule.startTrading(cleanCompanies);
        
    console.log('✅ Bridge: Trading phase initialized successfully');
      } else {
        console.error('❌ Bridge: No companies available for trading');
      }
    } catch (error) {
      console.error('❌ Bridge: Error initializing trading phase:', error);
      console.error('❌ Bridge: Stack trace:', error.stack);
    }
  }

  /**
   * Handle IPO completion and transition to trading
   */
  initializeTradingAfterIPO(ipoData) {
    if (!this.isInitialized) {
      console.error('❌ Module Bridge not initialized');
      return false;
    }

    console.log('🔄 Bridge: Initializing trading after IPO completion...');
    console.log('🔍 Bridge: IPO data received:', ipoData);
    
    // Use the companies data from the IPO event, not from game state
    const companies = ipoData ? ipoData.companies : null;
    const participants = ipoData ? ipoData.participants : null;
    
    console.log('🔍 Bridge: Event companies:', companies);
    console.log('🔍 Bridge: Companies is array:', Array.isArray(companies));
    console.log('🔍 Bridge: Companies length:', companies ? companies.length : 'undefined');
    
    // Initialize trading module with IPO results
    if (this.tradingModule && companies && Array.isArray(companies) && companies.length > 0) {
      console.log('🔍 Bridge: Starting trading with companies:', companies.length);
      
      // Connect trading module to ledger and participants
      this.tradingModule.ledgerModule = this.ledgerModule;
      // FIX: Use the correct gameState reference; this.gameStateModule is undefined
      // Prefer participants from IPO data when available; otherwise fall back to current game state
      const gsParticipants = this.gameState && this.gameState.getGameState ? (this.gameState.getGameState().participants || []) : [];
      this.tradingModule.setParticipants(participants && Array.isArray(participants) && participants.length ? participants : gsParticipants);
      
      // Start trading phase with IPO prices
      this.tradingModule.startTrading(companies);
      
      // Initialize each company's trading with IPO price
      companies.forEach(company => {
        if (company.ipoPrice) {
          this.tradingModule.initializeCompany(company.id, company.ipoPrice);
          console.log(`📈 Trading initialized for ${company.name} at $${company.ipoPrice}`);
        }
      });
      
      // Update game state phase to trading
      if (this.gameState) {
        this.gameState.phase = 'trading';
        console.log('📊 Phase changed to: trading');
        
        // CRITICAL FIX: Update game state with IPO results
        if (companies && Array.isArray(companies)) {
          this.gameState.currentGame.companies = companies;
          console.log('🔧 Bridge: Updated game state companies with IPO results');
        }
        if (participants && Array.isArray(participants)) {
          this.gameState.currentGame.participants = participants;
          console.log('🔧 Bridge: Updated game state participants with IPO results');
        }
        
        // Sync with ledger
        this.syncGameStateWithLedger(); // Re-enabled with circular reference fix
        
        // Emit updated game state to all clients - RE-ENABLED WITH CIRCULAR REFERENCE FIX
        console.log('🔍 Bridge: Emitting game state update to clients');
        const cleanGameState = this.cleanGameStateForSocket(this.gameState.getGameState());
        if (this.io && this.io.to) {
          this.io.to(this.sessionId).emit('gameStateUpdate', cleanGameState);
        } else if (this.io && this.io.emit) {
          this.io.emit('gameStateUpdate', cleanGameState);
        }
      }
      
      console.log('✅ Bridge: Trading phase fully initialized');
      return true;
    } else {
      console.error('❌ Bridge: Trading module or companies data not available for initialization.');
      console.error('❌ Bridge: Trading module exists:', !!this.tradingModule);
      console.error('❌ Bridge: Companies exists:', !!companies);
      console.error('❌ Bridge: Companies is array:', Array.isArray(companies));
      console.error('❌ Bridge: Companies length:', companies ? companies.length : 'undefined');
      return false;
    }
  }

  /**
   * Handle trades executed by trading module
   */
  handleTradesExecuted(tradeData) {
    if (!this.ledgerModule || !tradeData.trades) {
      console.error('❌ Bridge: Cannot process trades - missing ledger module or trade data');
      return;
    }

    console.log(`📊 Bridge: Processing ${tradeData.trades.length} trades...`);
    
    // Process each trade through the ledger
    tradeData.trades.forEach(trade => {
      let saleResult = true; // Default to true for market maker
      let purchaseResult = true; // Default to true for market maker
      
      // Only process ledger entries for real participants (not market maker)
      if (trade.sellerId !== 'marketmaker') {
        saleResult = this.ledgerModule.recordSale(
          trade.sellerId,
          trade.companyId,
          trade.shares,
          trade.price
        );
      } else {
        console.log(`📊 Market maker sold ${trade.shares} shares (no ledger entry needed)`);
      }
      
      if (trade.buyerId !== 'marketmaker') {
        purchaseResult = this.ledgerModule.recordPurchase(
          trade.buyerId,
          trade.companyId,
          null, // company name will be filled by ledger
          trade.shares,
          trade.price,
          'trading'
        );
      } else {
        console.log(`📊 Market maker bought ${trade.shares} shares (no ledger entry needed)`);
      }
      
      if (saleResult && purchaseResult) {
        console.log(`✅ Bridge: Trade processed - ${trade.shares} shares at $${trade.price}`);
      } else {
        console.error(`❌ Bridge: Failed to process trade - Sale: ${!!saleResult}, Purchase: ${!!purchaseResult}`);
      }
    });
    
    // Update game state with new financial data
    this.syncGameStateWithLedger();
    
    // Emit trade update to clients - FIXED: Send minimal trade data to prevent crashes
    console.log('🔍 Bridge: Emitting trade updates to clients');
    this.emit('tradesProcessed', {
      trades: tradeData.trades,
      companyId: tradeData.companyId
    });
  }

  /**
   * Clean game state data to prevent circular references
   */
  cleanGameStateForSocket(gameState) {
    try {
      // Create a completely clean copy without any circular references
      const cleanState = {
        id: gameState.id || 'unknown',
        phase: gameState.phase || 'lobby',
        participants: (gameState.participants || []).map(p => ({
          id: p.id || 'unknown',
          name: p.name || 'Unknown',
          isHuman: Boolean(p.isHuman),
          capital: Number(p.capital) || 1000,
          cash: Number(p.cash) || 1000,
          netWorth: Number(p.netWorth) || 1000,
          shares: p.shares ? JSON.parse(JSON.stringify(p.shares)) : {}
        })),
        companies: (gameState.companies || []).map(c => ({
          id: c.id || 'unknown',
          name: c.name || 'Unknown Company',
          shares: Number(c.shares) || 1000,
          currentPrice: Number(c.currentPrice) || 1,
          ipoPrice: Number(c.ipoPrice) || 1,
          totalSharesAllocated: Number(c.totalSharesAllocated) || 0,
          ceoId: c.ceoId || null,
          price: Number(c.price) || 1,
          quality: Number(c.quality) || 0.5,
          marketing: Number(c.marketing) || 0.5,
          reputation: Number(c.reputation) || 0.5,
          revenue: Number(c.revenue) || 0,
          profit: Number(c.profit) || 0,
          demand: Number(c.demand) || 0
        })),
        turn: Number(gameState.turn) || 0,
        maxTurns: Number(gameState.maxTurns) || 100
      };

      return cleanState;
    } catch (error) {
      console.error('❌ Bridge: Error cleaning game state:', error);
      // Return minimal safe state if cleaning fails
      return {
        id: 'error',
        phase: 'lobby',
        participants: [],
        companies: [],
        turn: 0,
        maxTurns: 100
      };
    }
  }

  /**
   * Sync game state with ledger data (the "door out" process)
   * FIXED: Creates clean copy instead of modifying original to prevent circular references
   */
  syncGameStateWithLedger() {
    console.log('🔄 Bridge: Syncing game state with ledger data...');
    
    // Get current game state
    const currentGame = this.gameState.getGameState();
    if (!currentGame || !currentGame.participants) {
      console.log('⚠️ Bridge: No participants in game state to sync');
      return;
    }
    
    // Create clean copy of participants with ledger data
    const syncedParticipants = currentGame.participants.map(participant => {
      const ledger = this.ledgerModule.ledgers.get(participant.id);
      if (ledger) {
        // Create clean participant object with ledger data
        const cleanParticipant = {
          id: participant.id,
          name: participant.name,
          isHuman: participant.isHuman,
          capital: participant.capital || 1000,
          cash: ledger.cash,
          remainingCapital: ledger.cash,
          totalSpent: 1000 - ledger.cash,
          netWorth: ledger.totalNetWorth,
          isCEO: ledger.isCEO,
          ceoCompanyId: ledger.ceoCompany,
          shares: {}
        };
        
        // Build shares object from ledger positions
        for (const [companyId, positions] of ledger.stockPositions) {
          const totalShares = positions.reduce((sum, lot) => sum + lot.shares, 0);
          if (totalShares > 0) {
            cleanParticipant.shares[companyId] = totalShares;
          }
        }
        
        console.log(`💰 ${participant.name}: $${ledger.cash.toFixed(2)} cash, $${ledger.totalNetWorth.toFixed(2)} net worth`);
        return cleanParticipant;
      }
      
      // Return original participant if no ledger found
      return participant;
    });
    
    // Update game state with synced participants (this is safe - no circular references)
    currentGame.participants = syncedParticipants;
    
    console.log('✅ Bridge: Game state synced with ledger (clean copy created)');
  }

  /**
   * Submit trading order through the bridge
   */
  submitTradingOrder(participantId, companyId, orderType, shares, price) {
    if (!this.tradingModule || !this.isInitialized) {
      console.error('❌ Bridge: Trading module not available');
      return { success: false, error: 'Trading module not available' };
    }

    if (this.currentPhase !== 'trading') {
      console.error('❌ Bridge: Not in trading phase');
      return { success: false, error: 'Not in trading phase' };
    }

    // Validate participant has enough shares/cash
    console.log('🔍 Bridge: Looking for participant ID:', participantId);
    console.log('🔍 Bridge: Ledger module exists:', !!this.ledgerModule);
    console.log('🔍 Bridge: Ledgers map exists:', !!this.ledgerModule?.ledgers);
    console.log('🔍 Bridge: Ledgers map size:', this.ledgerModule?.ledgers?.size);
    console.log('🔍 Bridge: Available participant IDs:', Array.from(this.ledgerModule?.ledgers?.keys() || []));
    
    // Also check game state participants
    const gameState = this.gameState?.getGameState();
    console.log('🔍 Bridge: Game state participants:', gameState?.participants?.map(p => ({ id: p.id, name: p.name, isHuman: p.isHuman })));
    
    const ledger = this.ledgerModule.ledgers.get(participantId);
    if (!ledger) {
      console.log('❌ Bridge: Participant not found in ledger:', participantId);
      console.log('🔍 Bridge: Available ledger participants:', Array.from(this.ledgerModule.ledgers.keys()));
      console.log('🔍 Bridge: Game state participants:', gameState?.participants?.map(p => ({ id: p.id, name: p.name, isHuman: p.isHuman })));
      return { success: false, error: 'Participant not found in ledger' };
    }
    
    // Additional debug info for the ledger
    console.log('🔍 Bridge: Ledger details for participant:', {
      participantName: ledger.participantName,
      cash: ledger.cash,
      stockPositions: Array.from(ledger.stockPositions.keys()),
      totalPositions: ledger.stockPositions.size
    });

    if (orderType === 'sell') {
      const availableShares = this.ledgerModule.getTotalShares(participantId, companyId);
      console.log('🔍 Bridge: Checking sell order - participant:', participantId, 'company:', companyId);
      console.log('🔍 Bridge: Available shares from ledger:', availableShares);
      console.log('🔍 Bridge: Requested shares:', shares);
      console.log('🔍 Bridge: Ledger stock positions:', ledger.stockPositions);
      console.log('🔍 Bridge: Company positions:', ledger.stockPositions.get(companyId));
      console.log('🔍 Bridge: All ledger participants:', Array.from(this.ledgerModule.ledgers.keys()));
      
      if (availableShares < shares) {
        const errorMsg = availableShares === 0 
          ? `You don't own any shares of this company. You need to buy shares first before you can sell them.`
          : `You only own ${availableShares} shares of this company, but you're trying to sell ${shares} shares.`;
        console.log('❌ Bridge: Sell order rejected:', errorMsg);
        return { success: false, error: errorMsg };
      }
    } else if (orderType === 'buy') {
      const totalCost = shares * price;
      if (ledger.cash < totalCost) {
        return { success: false, error: `Insufficient cash: need $${totalCost}, have $${ledger.cash.toFixed(2)}` };
      }
    }

    // Submit order to trading module
    let result;
    if (orderType === 'buy') {
      result = this.tradingModule.submitBuyOrder(participantId, companyId, shares, price, 'limit');
    } else {
      result = this.tradingModule.submitSellOrder(participantId, companyId, shares, price, 'limit');
    }

    if (result.success) {
      console.log(`📝 Bridge: ${orderType} order submitted for ${shares} shares at $${price}`);
    }

    return result;
  }

  /**
   * Get current market data through the bridge
   */
  getMarketData(companyId) {
    if (!this.tradingModule) return null;
    return this.tradingModule.getMarketData(companyId);
  }

  /**
   * Get all current prices
   */
  getAllPrices() {
    if (!this.tradingModule) return {};
    return this.tradingModule.getAllPrices();
  }

  /**
   * Get comprehensive game state for clients
   */
  getGameStateForClients() {
    if (!this.gameState) return null;

    // Get the current game state
    const currentGameState = this.gameState.getGameState();
    if (!currentGameState) return null;

    // Sync with ledger before sending to clients
    this.syncGameStateWithLedger(); // Re-enabled with circular reference fix

    // Ensure the phase is properly set
    const gameStateForClient = {
      ...currentGameState,
      phase: currentGameState.phase || this.currentPhase, // Ensure phase is set correctly
      marketData: this.getAllPrices(),
      ledgerData: this.ledgerModule ? this.ledgerModule.getAllLedgers() : [],
      ceoData: this.ledgerModule ? this.ledgerModule.getAllCEOs() : []
    };

    console.log('🔍 Bridge: Sending game state to clients - phase:', gameStateForClient.phase);
    return gameStateForClient;
  }

  /**
   * Handle phase transitions
   */
  setPhase(phase) {
    console.log(`📊 Bridge: Phase transition to ${phase}`);
    this.currentPhase = phase;
    
    if (this.gameState) {
      this.gameState.phase = phase;
    }
    
    this.emit('phaseChanged', { phase, gameState: this.gameState });
  }

  /**
   * Get bridge status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentPhase: this.currentPhase,
      modules: {
        gameState: !!this.gameState,
        ipoModule: !!this.ipoModule,
        tradingModule: !!this.tradingModule,
        ledgerModule: !!this.ledgerModule,
        botNameModule: !!this.botNameModule,
        io: !!this.io
      }
    };
  }

  /**
   * Start manual trading - activate bot trading and enable live order processing
   */
  startManualTrading() {
    console.log('🚀 Bridge: Starting manual trading...');
    
    if (!this.tradingModule) {
      console.error('❌ Bridge: Trading module not available');
      return;
    }

    // Enable bot trading
    this.tradingModule.startAIBotTrading();
    
    // Ensure trading is active
    this.tradingModule.tradingActive = true;
    this.tradingModule.weeklyTrading = true;
    
    // Initialize trading for all companies
    if (this.gameState) {
      const currentGame = this.gameState.getGameState();
      if (currentGame && currentGame.companies) {
        currentGame.companies.forEach(company => {
          if (company.ipoPrice || company.currentPrice) {
            const price = company.ipoPrice || company.currentPrice;
            this.tradingModule.initializeCompany(company.id, price);
          }
        });
      }
    }
    
    console.log('✅ Bridge: Manual trading started - bots active, order processing enabled');
  }

  /**
   * Stop manual trading - deactivate bot trading and disable order processing
   */
  stopManualTrading() {
    console.log('⏹️ Bridge: Stopping manual trading...');
    
    if (!this.tradingModule) {
      console.error('❌ Bridge: Trading module not available');
      return;
    }

    // Stop bot trading
    this.tradingModule.stopAIBotTrading();
    
    // Disable order processing
    this.tradingModule.weeklyTrading = false;
    
    console.log('✅ Bridge: Manual trading stopped - bots inactive, order processing disabled');
  }

  /**
   * Get participant's current share holdings for all companies
   */
  getParticipantShares(participantId) {
    if (!this.ledgerModule) {
      console.error('❌ Bridge: Ledger module not available');
      return null;
    }

    const ledger = this.ledgerModule.ledgers.get(participantId);
    if (!ledger) {
      console.error('❌ Bridge: Participant not found in ledger:', participantId);
      return null;
    }

    const shareHoldings = {};
    for (const [companyId, positions] of ledger.stockPositions) {
      const totalShares = positions.reduce((sum, lot) => sum + lot.shares, 0);
      if (totalShares > 0) {
        shareHoldings[companyId] = totalShares;
      }
    }

    return {
      participantId,
      participantName: ledger.participantName,
      shareHoldings,
      cash: ledger.cash,
      totalNetWorth: ledger.totalNetWorth
    };
  }
}

module.exports = ModuleBridge;
