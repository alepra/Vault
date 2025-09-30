/**
 * Game State Module - Manages game state and participants
 * Modular design for better debugging and maintenance
 */

class GameStateModule {
  constructor() {
    this.currentGame = null;
    this.phaseTimer = null;
    this.phaseDurations = {
      lobby: 0,        // Manual start only
      ipo: 10000,      // 10 seconds - enough time to bid
      newspaper: 10000, // 10 seconds - show results
      trading: 10000,   // 10 seconds - trading activity
      break: 10000     // 10 seconds - between rounds
    };
    console.log('🔄 GameStateModule constructor - creating fresh game state');
    this.initializeGame();
  }

  /**
   * Initialize a new game
   */
  initializeGame() {
    this.currentGame = {
      id: this.generateGameId(),
      phase: 'lobby',
      turn: 0,
      maxTurns: 100,
      turnLength: 30,
      weather: 'normal',
      economy: 'normal',
      startTime: null,
      endTime: null,
      winnerId: null,
      participants: [],
      companies: this.createCompanies(),
      shares: {},
      trades: [],
      orders: [],
      news: []
    };

    console.log('🎮 New game initialized:', this.currentGame.id);
  }

  /**
   * Generate unique game ID
   */
  generateGameId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Create initial companies
   */
  createCompanies() {
    const companyNames = [
      'Sunny Side Lemonade',
      'Citrus Dreams Co.',
      'Golden Squeeze Inc.',
      'Fresh Squeeze Ltd.'
    ];

    return companyNames.map((name, index) => ({
      id: `company_${index + 1}`,
      name: name,
      shares: 1000,
      currentPrice: 10.00 + (Math.random() * 5.00),
      totalSharesAllocated: 0,
      ceoId: null,
      price: 1.00 + (Math.random() * 0.50),
      quality: 0.5 + (Math.random() * 0.5),
      marketing: 0.5 + (Math.random() * 0.5),
      reputation: 0.5 + (Math.random() * 0.5),
      revenue: 0,
      profit: 0,
      demand: 0
    }));
  }

  /**
   * Add participant to game
   */
  addParticipant(name, isHuman = true) {
    if (!this.currentGame) {
      console.error('No game available to add participant');
      return null;
    }

    const participant = {
      id: this.generateParticipantId(),
      name: name,
      isHuman: isHuman,
      personality: isHuman ? null : this.generateAIPersonality(),
      capital: 1000,
      remainingCapital: 1000,
      shares: {},
      isCEO: false,
      joinedAt: new Date()
    };

    this.currentGame.participants.push(participant);
    console.log(`👤 Participant added: ${name} (${isHuman ? 'Human' : 'AI'})`);
    
    return participant;
  }

  /**
   * Generate unique participant ID
   */
  generateParticipantId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate AI personality
   */
  generateAIPersonality() {
    const personalities = [
      { name: 'Aggressive', bidStrategy: 'high', riskTolerance: 0.8, concentration: 0.7 },
      { name: 'Conservative', bidStrategy: 'low', riskTolerance: 0.3, concentration: 0.9 },
      { name: 'Concentrated', bidStrategy: 'ceo', riskTolerance: 0.6, concentration: 0.95 },
      { name: 'Diversified', bidStrategy: 'medium', riskTolerance: 0.5, concentration: 0.4 },
      { name: 'Value Investor', bidStrategy: 'low', riskTolerance: 0.4, concentration: 0.6 },
      { name: 'Growth Focused', bidStrategy: 'high', riskTolerance: 0.7, concentration: 0.5 },
      { name: 'Momentum Trader', bidStrategy: 'high', riskTolerance: 0.8, concentration: 0.3 },
      { name: 'Short-term Trader', bidStrategy: 'scavenger', riskTolerance: 0.9, concentration: 0.2 },
      { name: 'Risk Averse', bidStrategy: 'low', riskTolerance: 0.2, concentration: 0.8 },
      { name: 'Opportunistic', bidStrategy: 'scavenger', riskTolerance: 0.6, concentration: 0.3 },
      { name: 'Quality Focused', bidStrategy: 'ceo', riskTolerance: 0.5, concentration: 0.7 },
      { name: 'Scavenger Bot 1', bidStrategy: 'scavenger', riskTolerance: 0.4, concentration: 0.1 },
      { name: 'Scavenger Bot 2', bidStrategy: 'scavenger', riskTolerance: 0.3, concentration: 0.15 },
      { name: 'Scavenger Bot 3', bidStrategy: 'scavenger', riskTolerance: 0.5, concentration: 0.2 }
    ];

    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  /**
   * Reset game to lobby phase
   */
  resetGame() {
    if (!this.currentGame) {
      console.error('No game to reset');
      return false;
    }

    console.log('🔄 Resetting game to lobby phase...');
    console.log('🔍 Current participants before reset:', this.currentGame.participants.length);
    
    // Reset game state
    this.currentGame.phase = 'lobby';
    this.currentGame.turn = 0;
    this.currentGame.startTime = null;
    this.currentGame.endTime = null;
    this.currentGame.winnerId = null;
    
    // Clear ALL participants (human and AI) for fresh start
    this.currentGame.participants = [];
    
    // Reset companies
    this.currentGame.companies.forEach(company => {
      company.totalSharesAllocated = 0;
      company.ceoId = null;
      company.currentPrice = 10.00 + (Math.random() * 5.00);
    });
    
    console.log('✅ Game reset completed');
    console.log('🔍 Participants after reset:', this.currentGame.participants.length);
    console.log('🔍 Companies reset:', this.currentGame.companies.map(c => ({ name: c.name, totalSharesAllocated: c.totalSharesAllocated, ceoId: c.ceoId })));
    return true;
  }

  /**
   * Get current game state
   */
  getGameState() {
    return this.currentGame;
  }

  /**
   * Start phase timer for automatic transitions
   */
  startPhaseTimer(io, moduleBridge) {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
    }

    const currentPhase = this.currentGame.phase;
    const duration = this.phaseDurations[currentPhase];
    
    // MANUAL CONTROL: Timers disabled - using Ready button system instead
    console.log(`🔧 MANUAL CONTROL: Phase timer disabled for ${currentPhase} - waiting for Ready button`);
    console.log(`📋 Use the Ready button to advance to the next phase`);
  }

  /**
   * Manual phase advancement via Ready button
   */
  manualAdvancePhase(io, moduleBridge) {
    console.log(`🚀 MANUAL ADVANCE: User clicked Ready button for ${this.currentGame.phase} phase`);
    this.advanceToNextPhase(io, moduleBridge);
  }

  /**
   * Advance to next phase in sequence
   */
  advanceToNextPhase(io, moduleBridge) {
    const currentPhase = this.currentGame.phase;
    let nextPhase = null;
    
    // Define phase sequence: lobby → ipo → newspaper → trading → newspaper → trading...
    switch (currentPhase) {
      case 'lobby':
        nextPhase = 'ipo';
        break;
      case 'ipo':
        // Manual advancement - go to newspaper phase
        nextPhase = 'newspaper';
        console.log('🚀 Manual advancement from IPO to newspaper phase');
        break;
      case 'newspaper':
        nextPhase = 'trading';
        break;
      case 'trading':
        nextPhase = 'newspaper'; // Cycle back to newspaper
        break;
      default:
        console.log('⚠️ Unknown phase, staying in current phase');
        return;
    }

    console.log(`🔄 Auto-advancing from ${currentPhase} to ${nextPhase}`);
    this.setPhase(nextPhase, io, moduleBridge);
  }

  /**
   * Check if IPO phase has completed successfully
   */
  isIPOComplete() {
    if (!this.currentGame.companies) return false;
    
    // Check if all companies have shares allocated and IPO prices set
    const allCompaniesComplete = this.currentGame.companies.every(company => {
      return company.totalSharesAllocated > 0 && company.ipoPrice > 0;
    });
    
    console.log(`🔍 IPO completion check: ${allCompaniesComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
    if (!allCompaniesComplete) {
      console.log('🔍 Companies status:', this.currentGame.companies.map(c => ({
        name: c.name,
        totalSharesAllocated: c.totalSharesAllocated,
        ipoPrice: c.ipoPrice
      })));
    }
    
    return allCompaniesComplete;
  }

  /**
   * Set game phase with proper transitions
   */
  setPhase(newPhase, io, moduleBridge) {
    try {
      const oldPhase = this.currentGame.phase;
      this.currentGame.phase = newPhase;
      
      console.log(`📊 Phase changed: ${oldPhase} → ${newPhase}`);
      
    // Notify all clients of phase change
    if (io) {
      // Clean the game state to prevent circular references
      const cleanGameState = {
        id: this.currentGame.id || 'unknown',
        phase: this.currentGame.phase || 'lobby',
        participants: (this.currentGame.participants || []).map(p => ({
          id: p.id || 'unknown',
          name: p.name || 'Unknown',
          isHuman: Boolean(p.isHuman),
          capital: Number(p.capital) || 1000,
          cash: Number(p.cash) || 1000,
          netWorth: Number(p.netWorth) || 1000,
          shares: p.shares ? JSON.parse(JSON.stringify(p.shares)) : {}
        })),
        companies: (this.currentGame.companies || []).map(c => ({
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
        turn: Number(this.currentGame.turn) || 0,
        maxTurns: Number(this.currentGame.maxTurns) || 100
      };
      io.emit('gameStateUpdate', cleanGameState);
    }
      
      // Handle phase-specific logic via module bridge
      if (moduleBridge) {
        moduleBridge.handlePhaseChange(newPhase, oldPhase);
      }
      
      // Start timer for next phase
      this.startPhaseTimer(io, moduleBridge);
    } catch (error) {
      console.error('❌ GameState: Error in phase transition:', error);
      console.error('❌ GameState: Stack trace:', error.stack);
    }
  }

  /**
   * Stop phase timer
   */
  stopPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
      console.log('⏰ Phase timer stopped');
    }
  }


  /**
   * Get game statistics
   */
  getStats() {
    if (!this.currentGame) return null;

    return {
      id: this.currentGame.id,
      phase: this.currentGame.phase,
      participants: this.currentGame.participants.length,
      companies: this.currentGame.companies.length,
      humanParticipants: this.currentGame.participants.filter(p => p.isHuman).length,
      aiParticipants: this.currentGame.participants.filter(p => !p.isHuman).length,
      turn: this.currentGame.turn,
      maxTurns: this.currentGame.maxTurns
    };
  }
}

module.exports = GameStateModule;


