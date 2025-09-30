/**
 * IPO Module - Handles Initial Public Offering functionality
 * Modular design for better debugging and maintenance
 */

const BotNameModule = require('./botNameModule');

class IPOModule {
  constructor(gameState, io, sessionId = 'shared_game', ledgerModule = null) {
    this.gameState = gameState;
    this.io = io;
    this.sessionId = sessionId;
    this.isProcessing = false;
    this.ipoStartTime = null;
    this.ipoDuration = 300000; // 5 minutes for IPO bidding - gives human time to submit
    this.ipoTimeoutId = null; // Store timeout ID so we can cancel it when human bids are submitted
    
    // Use provided ledger module or create a minimal one
    this.ledger = ledgerModule || { getLedgerSummary: () => ({ cash: 10000, netWorth: 10000 }) };
    this.botNames = new BotNameModule();
  }

  /**
   * Start IPO phase - sets up the bidding environment
   */
  startIPO() {
    if (!this.gameState || (this.gameState.phase !== 'lobby' && this.gameState.phase !== 'starting')) {
      console.error('Cannot start IPO - game not in lobby or starting phase, current phase:', this.gameState?.phase);
      return false;
    }

    console.log('🎯 Starting IPO Phase...');
    
    // Set phase to IPO
    this.gameState.phase = 'ipo';
    this.gameState.startTime = new Date();
    this.ipoStartTime = Date.now();
    this.isProcessing = false;

    // Initialize all participants in the ledger system
    this.initializeParticipantsInLedger();

    // Ensure we have scavenger bots for liquidity
    this.ensureScavengerBots();

    // Emit game state update
    this.io.emit('gameStateUpdate', this.gameState);
    
    // ALWAYS wait for human input - don't process AI bids immediately
    // Both human and AI participants should be treated equally - they're just providing bids
    console.log(`👥 All participants:`, this.gameState.participants.map(p => `${p.name} (${p.isHuman ? 'Human' : 'AI'})`));
    console.log(`👥 IPO will wait for human input before processing any bids`);
    
    // IPO phase is now controlled by game state timer (20 seconds)
    // No separate IPO timer - let game state handle phase transitions
    console.log(`⏰ IPO phase started - controlled by game state timer (20 seconds)`);
    
    console.log(`IPO Phase started - waiting for human bids (${this.ipoDuration/1000} second limit)`);
    return true;
  }

  /**
   * Initialize all participants in the ledger system
   */
  initializeParticipantsInLedger() {
    for (const participant of this.gameState.participants) {
      // Update bot names with personality-based names
      this.botNames.updateBotName(participant);
      
      // Initialize in ledger with EXACTLY $1000 cash and NO shares
      this.ledger.initializeParticipant(
        participant.id,
        participant.name,
        participant.isHuman,
        1000 // Always start with exactly $1000 cash
      );
      
      // Ensure participant starts with clean state
      participant.capital = 1000;
      participant.remainingCapital = 1000;
      participant.totalSpent = 0;
      participant.shares = {};
      
      console.log(`📊 Initialized ${participant.name}: $1000 cash, 0 shares`);
    }
    console.log(`📊 Initialized ${this.gameState.participants.length} participants in ledger system`);
    
    // DEBUG: Show all participants' starting state
    console.log('\n🔍 DEBUG: All participants starting state:');
    for (const participant of this.gameState.participants) {
      console.log(`  ${participant.name}: $${participant.remainingCapital} cash, ${Object.keys(participant.shares).length} companies, totalSpent: $${participant.totalSpent}`);
    }
  }

  /**
   * Ensure a participant is initialized in the ledger system
   */
  ensureParticipantInLedger(participant) {
    if (!this.ledger.ledgers.has(participant.id)) {
      // Update bot name if it's a bot
      this.botNames.updateBotName(participant);
      
      // Initialize in ledger
      this.ledger.initializeParticipant(
        participant.id,
        participant.name,
        participant.isHuman,
        participant.capital || 1000
      );
      console.log(`📊 Late initialization: ${participant.name} added to ledger system`);
    }
  }

  /**
   * Ensure we have scavenger bots for liquidity
   */
  ensureScavengerBots() {
    const existingScavengers = this.gameState.participants.filter(p => 
      !p.isHuman && p.personality && p.personality.bidStrategy === 'scavenger'
    );

    // Create more scavenger bots to ensure oversubscription
    const minScavengers = Math.max(5, this.gameState.companies.length * 2);
    if (existingScavengers.length < minScavengers) {
      console.log(`🔄 Creating ${minScavengers - existingScavengers.length} scavenger bots for oversubscription...`);
      
      // Create enough scavenger bots to ensure oversubscription
      for (let i = existingScavengers.length; i < minScavengers; i++) {
        const scavengerBot = {
          id: `scavenger_${Date.now()}_${i}`,
          name: `Scavenger ${i + 1}`,
          isHuman: false,
          capital: 1000,
          remainingCapital: 1000,
          shares: {},
          personality: {
            bidStrategy: 'scavenger',
            riskTolerance: 0.9,
            concentration: 1.0,
            bidMultiplier: 0.4
          }
        };
        this.gameState.participants.push(scavengerBot);
        
        // Initialize in ledger system
        this.ledger.initializeParticipant(
          scavengerBot.id,
          scavengerBot.name,
          scavengerBot.isHuman,
          scavengerBot.capital
        );
        
        console.log(`✅ Created ${scavengerBot.name} with $${scavengerBot.capital}`);
      }
    }
  }

  /**
   * Process human IPO bids
   * @param {Array} humanBids - Array of bid objects
   * @param {string} participantId - ID of the human participant
   */
  async processHumanBids(humanBids, participantId) {
    try {
      console.log('🔍 processHumanBids called with:', { humanBids, participantId });
      console.log('🔍 Current game state phase:', this.gameState?.phase);
      console.log('🔍 Is processing:', this.isProcessing);
      
      if (!this.gameState || this.gameState.phase !== 'ipo') {
        console.error('Cannot process bids - not in IPO phase');
        return false;
      }

      if (this.isProcessing) {
        console.log('IPO already processing - ignoring duplicate bids');
        return false;
      }

    console.log('📝 Processing human IPO bids:', humanBids);

    // Cancel the IPO timeout since human bids are being submitted
    if (this.ipoTimeoutId) {
      console.log('⏰ Cancelling IPO timeout - human bids submitted');
      clearTimeout(this.ipoTimeoutId);
      this.ipoTimeoutId = null;
    }

    // Find the human participant
    const humanParticipant = this.gameState.participants.find(p => p.id === participantId && p.isHuman);
    if (!humanParticipant) {
      console.error('Human participant not found');
      return false;
    }

    // Ensure human participant is in ledger system
    this.ensureParticipantInLedger(humanParticipant);

    let totalBidAmount = 0;
    const processedBids = [];

    // Validate and process each bid
    for (const bid of humanBids) {
      const company = this.gameState.companies.find(c => c.id === bid.companyId);
      if (!company) {
        console.warn(`Company ${bid.companyId} not found - skipping bid`);
        continue;
      }

      const bidAmount = bid.shares * bid.price;
      
      // Check if participant has enough capital
      if (bidAmount <= humanParticipant.capital) {
        // Check if company has enough shares
        const availableShares = company.shares - (company.totalSharesAllocated || 0);
        if (bid.shares <= availableShares) {
          processedBids.push({
            companyId: bid.companyId,
            companyName: company.name,
            shares: bid.shares,
            price: bid.price,
            total: bidAmount
          });

          totalBidAmount += bidAmount;
        } else {
          console.warn(`Not enough shares available for ${company.name} - requested: ${bid.shares}, available: ${availableShares}`);
        }
      } else {
        console.warn(`Insufficient capital for bid on ${company.name} - required: $${bidAmount}, available: $${humanParticipant.capital}`);
      }
    }

    // Store human bids for Dutch auction processing (don't record purchases yet)
    if (processedBids.length > 0) {
      // Store human bids in the company objects for Dutch auction processing
      for (const bid of processedBids) {
        const company = this.gameState.companies.find(c => c.id === bid.companyId);
        if (company) {
          // Store the bid for Dutch auction processing
          if (!company.humanBids) company.humanBids = [];
          company.humanBids.push({
            participantId: humanParticipant.id,
            shares: bid.shares,
            price: bid.price,
            total: bid.total
          });
          
          // Store the bid price for this company
          if (!company.bidPrices) company.bidPrices = [];
          company.bidPrices.push(bid.price);
          
          console.log(`📝 Human bid stored for Dutch auction: ${bid.shares} shares of ${bid.companyName} at $${bid.price} each`);
        }
      }

      console.log(`💰 Total human bids stored: $${totalBidAmount}`);
      
      // Reset processing flag so AI bids can be processed
      this.isProcessing = false;
      
      // Process ALL bids together in Dutch auction (human + AI)
      console.log('🤖 Processing all bids together in Dutch auction...');
      this.processAIBids();
      
      return true;
    } else {
      console.log('No valid bids to process');
      return false;
    }
    } catch (error) {
      console.error('❌ Error in processHumanBids:', error);
      console.error('❌ Stack trace:', error.stack);
      return false;
    }
  }

  /**
   * Process AI bot bids automatically
   */
  async processAIBids() {
    console.log('🔍 processAIBids() called - checking game state...');
    console.log('🔍 Game state exists:', !!this.gameState);
    console.log('🔍 Current phase:', this.gameState?.phase);
    
    // CRITICAL FIX: Prevent multiple calls to processAIBids() after IPO is completed
    if (this.gameState.phase !== 'ipo') {
      console.log('🔧 processAIBids() ignored - not in IPO phase (current phase:', this.gameState.phase, ')');
      return;
    }

    // CRITICAL FIX: Prevent multiple processing of the same IPO
    if (this.isProcessing) {
      console.log('🔧 processAIBids() ignored - already processing IPO');
      return;
    }
    console.log('🔍 Session ID:', this.sessionId);
    
    if (!this.gameState || this.gameState.phase !== 'ipo') {
      console.error('❌ Cannot process AI bids - not in IPO phase. Current phase:', this.gameState?.phase);
      return false;
    }

    console.log('🤖 Processing AI bot bids...');
    this.isProcessing = true;

    // Ensure all participants are in ledger system
    for (const participant of this.gameState.participants) {
      this.ensureParticipantInLedger(participant);
    }

    // Generate bids for each company
    console.log(`🔍 DEBUG: Starting IPO loop for ${this.gameState.companies.length} companies`);
    for (const company of this.gameState.companies) {
      console.log(`🔍 Processing company: ${company.name} (${company.id})`);
      console.log(`🔍 DEBUG: ${company.name} - shares: ${company.shares}, totalSharesAllocated: ${company.totalSharesAllocated || 0}, available: ${company.shares - (company.totalSharesAllocated || 0)}`);
      const bids = [];
      
      for (const participant of this.gameState.participants) {
        if (participant.isHuman) continue; // Skip human participants
        
        if (participant.personality) {
          const personality = participant.personality;
          const companiesToBidOn = Math.max(1, Math.min(4, Math.ceil(personality.concentration * 4)));
          
          // PERSONALITY-BASED BIDDING: Each bot type behaves according to their personality
          let shouldBid = false;
          
          if (personality.bidStrategy === 'scavenger') {
            // Scavenger bots ALWAYS bid on ALL companies for liquidity
            shouldBid = true;
            console.log(`🔍 Scavenger ${participant.name} will bid on ${company.name} (scavenger strategy)`);
          } else if (personality.bidStrategy === 'ceo') {
            // CEO/Concentrated bots bid on fewer companies but with high share counts
            // They focus on 1-2 companies to become CEO
            const companiesToBidOn = Math.max(1, Math.min(2, Math.ceil(personality.concentration * 2)));
            const bidProbability = 1.0 / companiesToBidOn; // Higher chance for fewer companies
            shouldBid = Math.random() < bidProbability;
          } else if (personality.bidStrategy === 'low') {
            // Conservative/Low strategy bots ALWAYS bid on all 4 companies with low shares/prices
            shouldBid = true;
            console.log(`🔍 Conservative ${participant.name} will bid on ${company.name} (conservative strategy)`);
          } else if (personality.bidStrategy === 'high') {
            // Aggressive/High strategy bots bid on multiple companies at higher prices
            const companiesToBidOn = Math.max(2, Math.min(4, Math.ceil((1 - personality.concentration) * 4)));
            const bidProbability = (0.7 + (personality.riskTolerance * 0.2)) / companiesToBidOn; // 70-90% chance
            shouldBid = Math.random() < bidProbability;
          } else {
            // Default/Medium strategy bots - Diversified ALWAYS bid on all 4 companies
            shouldBid = true;
            console.log(`🔍 Diversified ${participant.name} will bid on ${company.name} (diversified strategy)`);
          }
          
          if (shouldBid) {
            let bidPrice = this.calculateBidPrice(personality);
            const sharesToBid = this.calculateSharesToBid(participant, personality, bidPrice);
            const bidAmount = sharesToBid * bidPrice;
            
            // BULLETPROOF CHECK: Verify participant has enough cash
            const ledger = this.ledger.ledgers.get(participant.id);
            const availableCash = ledger ? ledger.cash : participant.capital;
            
            if (bidAmount <= availableCash && sharesToBid > 0) {
              bids.push({
                participantId: participant.id,
                shares: sharesToBid,
                price: bidPrice,
                total: bidAmount
              });
              console.log(`🤖 ${participant.name} bidding ${sharesToBid} shares at $${bidPrice} (Total: $${bidAmount}, Cash: $${availableCash.toFixed(2)})`);
            } else {
              console.log(`⚠️ ${participant.name} cannot afford bid: needs $${bidAmount}, has $${availableCash.toFixed(2)}`);
            }
          } else {
            console.log(`🤖 ${participant.name} chose not to bid on ${company.name} (${personality.bidStrategy}, risk: ${personality.riskTolerance}, concentration: ${personality.concentration})`);
          }
        }
      }

      // Combine AI bids with human bids for Dutch auction
      const allBids = [...bids]; // Start with AI bids
      
      // Add human bids if they exist
      if (company.humanBids && company.humanBids.length > 0) {
        console.log(`👤 Adding ${company.humanBids.length} human bids to Dutch auction for ${company.name}`);
        allBids.push(...company.humanBids);
      }
      
      // Process all bids together in Dutch auction
      console.log(`🔍 ${company.name}: Processing ${allBids.length} bids in Dutch auction`);
      
      
      await this.processCompanyBids(company, allBids);
      
      // If not all shares were sold, this indicates a problem with the bidding logic
      const remainingShares = company.shares - (company.totalSharesAllocated || 0);
      if (remainingShares > 0) {
        console.log(`⚠️ ${company.name} has ${remainingShares} unsold shares - this should not happen with proper scavenger bot bidding`);
        // Don't add emergency bids - this indicates a bug in the bidding logic
      }
      
      console.log(`✅ Completed processing: ${company.name}`);
    }

    console.log('✅ AI bot bidding completed');
    this.isProcessing = false;
    
    // Complete the IPO and move to newspaper phase
    this.completeIPO();
    
    this.io.emit('gameStateUpdate', this.gameState);
    
    return true;
  }

  /**
   * Calculate bid price based on personality
   */
  calculateBidPrice(personality) {
    // Use predefined normal prices instead of random calculations
    const normalPrices = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    
    if (personality.bidStrategy === 'scavenger') {
      // Scavenger bots always bid $1.00
      return 1.00; // Always $1.00 for scavengers
    } else if (personality.bidStrategy === 'ceo') {
      // CEO bots bid high
      return normalPrices[Math.floor(Math.random() * 3) + 5]; // $2.50, $2.75, $3.00
    } else if (personality.bidStrategy === 'low') {
      // Low strategy bots
      return normalPrices[Math.floor(Math.random() * 3)]; // $1.00, $1.25, $1.50
    } else if (personality.bidStrategy === 'high') {
      // High strategy bots
      return normalPrices[Math.floor(Math.random() * 3) + 4]; // $2.00, $2.25, $2.50
    } else {
      // Default strategy bots
      return normalPrices[Math.floor(Math.random() * 3) + 2]; // $1.50, $1.75, $2.00
    }
  }

  /**
   * Calculate shares to bid based on personality and capital
   * BULLETPROOF: Never allow spending more than available cash
   */
  calculateSharesToBid(participant, personality, bidPrice) {
    // Get current cash from ledger (source of truth)
    const ledger = this.ledger.ledgers.get(participant.id);
    const availableCash = ledger ? ledger.cash : participant.capital;
    
    if (personality.bidStrategy === 'scavenger') {
      // Scavenger bots bid 250 shares at $1 on ALL four companies
      // This ensures 3 scavengers × 250 shares = 750+ shares per company
      const capitalToUse = availableCash * 0.25; // 25% per company (4 companies = 100% total)
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(250, Math.min(maxShares, 250)); // Always 250 shares for scavengers
    } else if (personality.bidStrategy === 'ceo') {
      // CEO/Concentrated bots bid high share counts to become CEO
      const capitalToUse = availableCash * (0.6 + (personality.riskTolerance * 0.3)); // 60-90% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(200, Math.min(maxShares, 800)); // High share counts for CEO potential
    } else if (personality.bidStrategy === 'low') {
      // Conservative/Low strategy bots ALWAYS bid on all 4 companies with low shares/prices
      const capitalToUse = availableCash * 0.2; // 20% per company (4 companies = 80% total)
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(50, Math.min(maxShares, 200)); // Low share counts but consistent participation
    } else if (personality.bidStrategy === 'high') {
      // Aggressive/High strategy bots bid on multiple companies with high share counts
      const capitalToUse = availableCash * (0.6 + (personality.riskTolerance * 0.3)); // 60-90% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(200, Math.min(maxShares, 700)); // High share counts for aggressive bidding
    } else {
      // Default/Medium strategy bots - Diversified ALWAYS bid on all 4 companies
      const capitalToUse = availableCash * 0.25; // 25% per company (4 companies = 100% total)
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(100, Math.min(maxShares, 300)); // Moderate share counts for all 4 companies
    }
  }

  /**
   * Add scavenger bids for remaining unsold shares
   */
  async addScavengerBids(company, remainingShares) {
    console.log(`🔄 Adding scavenger bids for ${remainingShares} remaining shares of ${company.name}`);
    
    // Find participants with scavenger personality
    const scavengerBots = this.gameState.participants.filter(p => 
      !p.isHuman && p.personality && p.personality.bidStrategy === 'scavenger'
    );
    
    if (scavengerBots.length === 0) {
      console.error('❌ CRITICAL ERROR: No scavenger bots found!');
      console.error('❌ This indicates a failure in the bot creation logic - investigate immediately!');
      // Instead of crashing, create emergency scavenger bids
      console.log('🚨 Creating emergency scavenger bids to prevent undersubscription');
      await this.addEmergencyBids(company, remainingShares, []);
      return;
    }
    
    // Distribute remaining shares among scavenger bots
    let sharesToAllocate = remainingShares;
    const scavengerPrice = 1.00; // Minimum price for scavenger bots
    
    // Sort scavenger bots by remaining capital (highest first)
    scavengerBots.sort((a, b) => b.remainingCapital - a.remainingCapital);
    
    for (const bot of scavengerBots) {
      if (sharesToAllocate <= 0) break;
      
      // Get current cash from ledger (source of truth)
      const ledger = this.ledger.ledgers.get(bot.id);
      const availableCash = ledger ? ledger.cash : bot.remainingCapital;
      
      // Calculate how many shares this bot can afford
      const maxAffordableShares = Math.floor(availableCash / scavengerPrice);
      const sharesForThisBot = Math.min(maxAffordableShares, sharesToAllocate);
      
      if (sharesForThisBot > 0) {
        const totalCost = sharesForThisBot * scavengerPrice;
        
        // BULLETPROOF CHECK: Verify bot can afford this purchase
        if (totalCost <= availableCash) {
          // Record purchase in ledger
          const success = this.ledger.recordPurchase(
            bot.id,
            company.id,
            company.name,
            sharesForThisBot,
            scavengerPrice,
            'scavenger'
          );
          
          if (success) {
            // Get current ledger state and sync participant data
            const ledger = this.ledger.ledgers.get(bot.id);
            if (ledger) {
              bot.remainingCapital = ledger.cash;
              bot.totalSpent = 1000 - ledger.cash; // What they spent = starting capital - remaining cash
              
              console.log(`💰 Scavenger ${bot.name} ledger sync: $${ledger.cash.toFixed(2)} cash, $${bot.totalSpent.toFixed(2)} spent`);
            }
            
            // Allocate shares (legacy format)
            if (!bot.shares) bot.shares = {};
            if (!bot.shares[company.id]) bot.shares[company.id] = 0;
            bot.shares[company.id] += sharesForThisBot;
            
            // Update company
            if (!company.totalSharesAllocated) company.totalSharesAllocated = 0;
            company.totalSharesAllocated += sharesForThisBot;
            
            sharesToAllocate -= sharesForThisBot;
            
            console.log(`🔄 Scavenger ${bot.name} bought ${sharesForThisBot} shares of ${company.name} at $${scavengerPrice} (remaining capital: $${bot.remainingCapital.toFixed(2)})`);
          } else {
            console.error(`Failed to record scavenger purchase in ledger for ${bot.name}`);
          }
        } else {
          console.log(`⚠️ Scavenger ${bot.name} cannot afford ${sharesForThisBot} shares at $${scavengerPrice} (needs $${totalCost}, has $${availableCash.toFixed(2)})`);
        }
      }
    }
    
    // If there are still shares left, this is a CRITICAL ERROR
    if (sharesToAllocate > 0) {
      console.error(`❌ CRITICAL ERROR: ${sharesToAllocate} shares still unsold for ${company.name}!`);
      console.error(`❌ This indicates a failure in the scavenger bot logic - investigate immediately!`);
      console.error(`❌ Expected: All shares sold through proper scavenger bot distribution`);
      console.error(`❌ Actual: ${sharesToAllocate} shares remaining unsold`);
      throw new Error(`IPO system failure: ${company.name} has ${sharesToAllocate} unsold shares after scavenger bot allocation`);
    }
    
    console.log(`✅ All shares of ${company.name} have been allocated!`);
    
    if (!company.ipoPrice) {
      company.ipoPrice = scavengerPrice;
      company.currentPrice = scavengerPrice;
    }
  }

  /**
   * Process all bids for a specific company using proper Dutch auction
   * BULLETPROOF: Oversubscription guaranteed, everyone pays same clearing price
   */
  async processCompanyBids(company, bids) {
    try {
      if (!bids || bids.length === 0) {
        console.error(`❌ No bids for ${company.name} - this should not happen with oversubscription`);
        await this.addScavengerBids(company, company.shares);
        return;
      }

    const availableShares = company.shares - (company.totalSharesAllocated || 0);
    
    // Sort bids by price (highest first) for Dutch auction
    bids.sort((a, b) => b.price - a.price);

    // Verify oversubscription (total bid shares > available shares)
    const totalBidShares = bids.reduce((sum, bid) => sum + bid.shares, 0);
    if (totalBidShares < availableShares) {
      console.error(`❌ UNDERSOLD: ${company.name} has ${availableShares} shares but only ${totalBidShares} bid shares`);
      console.error(`❌ This indicates scavenger bots are not bidding properly - investigate bidding logic`);
      // Don't add emergency bids - fix the root cause instead
    }

    // Calculate the clearing price (lowest price that sells all shares)
    let sharesNeeded = availableShares;
    let clearingPrice = 0;

    // Find the clearing price by working backwards from highest bid
    for (const bid of bids) {
      if (sharesNeeded <= 0) break;
      clearingPrice = bid.price;
      sharesNeeded -= bid.shares;
    }

    // Ensure minimum price
    clearingPrice = Math.max(1.00, clearingPrice);
    
    console.log(`📊 ${company.name} Dutch auction: ${totalBidShares} shares bid for ${availableShares} shares, clearing price: $${clearingPrice.toFixed(2)}`);
    
    // DEBUG: Show all bids for this company
    console.log(`🔍 DEBUG: Bids for ${company.name}:`);
    bids.forEach(bid => {
      const participant = this.gameState.participants.find(p => p.id === bid.participantId);
      console.log(`  ${participant?.name || bid.participantId}: ${bid.shares} shares at $${bid.price.toFixed(2)}`);
    });

    // Allocate shares at the clearing price
    let sharesAllocated = 0;
    for (const bid of bids) {
      if (sharesAllocated >= availableShares) break;

      const participant = this.gameState.participants.find(p => p.id === bid.participantId);
      if (!participant) continue;

      const sharesToAllocate = Math.min(bid.shares, availableShares - sharesAllocated);
      
      if (sharesToAllocate > 0) {
        // Record purchase in ledger at CLEARING PRICE (not bid price)
        const success = this.ledger.recordPurchase(
          participant.id,
          company.id,
          company.name,
          sharesToAllocate,
          clearingPrice, // Use clearing price, not bid price
          'ipo'
        );
        
        if (success) {
          // FIXED: In Dutch auction, participants pay the clearing price, not their bid price
          const actualCost = sharesToAllocate * clearingPrice;
          
          // Get current ledger state
          const ledger = this.ledger.ledgers.get(participant.id);
          if (ledger) {
            // LEDGER IS THE SOURCE OF TRUTH - sync participant data from ledger
            participant.remainingCapital = ledger.cash;
            participant.totalSpent = 1000 - ledger.cash; // What they spent = starting capital - remaining cash
            
            console.log(`💰 ${participant.name} paid $${actualCost.toFixed(2)} for ${sharesToAllocate} shares at clearing price $${clearingPrice.toFixed(2)}`);
            console.log(`💰 ${participant.name} ledger sync: $${ledger.cash.toFixed(2)} cash, $${participant.totalSpent.toFixed(2)} spent`);
          }
          
          // Allocate shares (legacy format)
          if (!participant.shares) participant.shares = {};
          if (!participant.shares[company.id]) participant.shares[company.id] = 0;
          participant.shares[company.id] += sharesToAllocate;
        } else {
          console.error(`Failed to record AI purchase in ledger for ${participant.name}`);
        }
        
        // Update company
        if (!company.totalSharesAllocated) company.totalSharesAllocated = 0;
        company.totalSharesAllocated += sharesToAllocate;
        
        sharesAllocated += sharesToAllocate;
        
        console.log(`🤖 ${participant.name}: ${sharesToAllocate} shares of ${company.name} at $${clearingPrice} each (bid was $${bid.price})`);
      }
    }

    // Verify all shares were sold
    if (sharesAllocated !== availableShares) {
      console.error(`❌ CRITICAL: ${company.name} only sold ${sharesAllocated} of ${availableShares} shares!`);
    } else {
      console.log(`✅ ${company.name}: All ${availableShares} shares sold at $${clearingPrice}`);
    }

    // Store the clearing price for this company
    company.ipoPrice = clearingPrice;
    company.currentPrice = clearingPrice;

    // Determine CEO
    this.determineCEO(company);
    } catch (error) {
      console.error('❌ IPO Module: Error in processCompanyBids:', error);
      console.error('❌ IPO Module: Stack trace:', error.stack);
    }
  }

  /**
   * Emergency function to add bids when undersubscription occurs
   */
  async addEmergencyBids(company, sharesNeeded, existingBids) {
    console.error(`❌ Undersubscription detected for ${company.name} - ${sharesNeeded} shares undersold`);
    console.log('🚨 Creating emergency bids to prevent undersubscription');
    
    // Create emergency bids from any available participants
    const availableParticipants = this.gameState.participants.filter(p => !p.isHuman);
    const emergencyPrice = 1.00; // Minimum price
    
    for (const participant of availableParticipants) {
      if (sharesNeeded <= 0) break;
      
      // Get current cash from ledger
      const ledger = this.ledger.ledgers.get(participant.id);
      const availableCash = ledger ? ledger.cash : participant.remainingCapital || 0;
      
      if (availableCash >= emergencyPrice) {
        const maxShares = Math.floor(availableCash / emergencyPrice);
        const sharesToBid = Math.min(maxShares, sharesNeeded);
        
        if (sharesToBid > 0) {
          existingBids.push({
            participantId: participant.id,
            shares: sharesToBid,
            price: emergencyPrice,
            total: sharesToBid * emergencyPrice
          });
          
          sharesNeeded -= sharesToBid;
          console.log(`🚨 Emergency bid: ${participant.name} bidding ${sharesToBid} shares at $${emergencyPrice}`);
        }
      }
    }
    
    if (sharesNeeded > 0) {
      console.error(`❌ Still undersold by ${sharesNeeded} shares after emergency bids`);
    } else {
      console.log('✅ Emergency bids created successfully');
    }
  }

  /**
   * Determine CEO based on share ownership using ledger module
   * BULLETPROOF: Only one CEO per participant, only one CEO per company
   */
  determineCEO(company) {
    // Let the ledger module handle CEO determination for all participants
    // This ensures consistent CEO logic across the system
    for (const participant of this.gameState.participants) {
      const shares = participant.shares?.[company.id] || 0;
      if (shares > 0) {
        this.ledger.checkCEOStatus(participant.id, company.id);
      }
    }
    
    // Update company CEO from ledger
    const ceoInfo = this.ledger.getCEO(company.id);
    if (ceoInfo) {
      company.ceoId = ceoInfo.participantId;
      const ceo = this.gameState.participants.find(p => p.id === ceoInfo.participantId);
      if (ceo) {
        ceo.isCEO = true;
        ceo.ceoCompanyId = company.id;
        console.log(`👑 ${ceo.name} is CEO of ${company.name} (${ceoInfo.ownership.toFixed(1)}% ownership)`);
      }
    } else {
      console.log(`👑 No CEO found for ${company.name} - no participant has 35%+ ownership`);
    }
  }

  /**
   * Store human bids without processing them
   * Called when human submits bids - wait for timer to expire
   */
  async storeHumanBids(bids, participantId) {
    try {
      console.log('📝 Storing human bids for participant:', participantId);
      console.log('📝 Number of bids:', bids.length);
      
      // Store bids for later processing
      this.humanBids = bids;
      this.humanParticipantId = participantId;
      
      console.log('✅ Human bids stored - will process when timer expires');
      return true;
    } catch (error) {
      console.error('❌ Error storing human bids:', error);
      return false;
    }
  }

  /**
   * Process all bids (human + AI) when timer expires
   */
  async processAllBids() {
    try {
      console.log('🔄 Processing all bids - timer expired');
      
      // Process human bids if they exist
      if (this.humanBids && this.humanParticipantId) {
        console.log('👤 Processing stored human bids');
        await this.processHumanBids(this.humanBids, this.humanParticipantId);
        
        // processHumanBids() already calls processAIBids() which calls completeIPO()
        // No need to call completeIPO() again
        console.log('🤖 IPO already completed by processHumanBids() -> processAIBids() -> completeIPO()');
      } else {
        // No human bids - process AI bids directly
        console.log('🤖 No human bids - processing AI bids directly');
        await this.processAIBids();
        // processAIBids() calls completeIPO() automatically
      }
      
    } catch (error) {
      console.error('❌ Error processing all bids:', error);
    }
  }

  /**
   * Handle phase transition from IPO to newspaper
   * Called by game state when IPO timer expires
   */
  handleIPOPhaseEnd() {
    console.log('⏰ IPO phase timer expired - processing all bids now');
    if (!this.isProcessing) {
      this.processAllBids();
    }
  }

  /**
   * Complete IPO and move to trading phase
   */
  completeIPO() {
    console.log('🔍 completeIPO() called - checking game state...');
    console.log('🔍 Game state exists:', !!this.gameState);
    console.log('🔍 Current phase:', this.gameState?.phase);
    console.log('🔍 Session ID:', this.sessionId);
    
    if (!this.gameState || this.gameState.phase !== 'ipo') {
      console.error('❌ Cannot complete IPO - not in IPO phase. Current phase:', this.gameState?.phase);
      return false;
    }

    console.log('🎉 IPO Phase completed - setting final prices and moving to newspaper phase');
    
    // All companies should be processed by now - no emergency processing needed
    
    // IPO prices are already set correctly in processCompanyBids() - no need to recalculate
    this.gameState.companies.forEach(company => {
      if (company.ipoPrice) {
        console.log(`📊 ${company.name} final IPO price: $${company.ipoPrice.toFixed(2)}`);
      } else {
        console.error(`❌ ${company.name} has no IPO price set - this should not happen`);
      }
      
      // Don't set totalSharesAllocated to company.shares - this should only be set when shares are actually sold
      // if (!company.totalSharesAllocated || company.totalSharesAllocated === 0) {
      //   company.totalSharesAllocated = company.shares;
      // }
      
      if (company.ipoPrice && company.currentPrice !== company.ipoPrice) {
        company.currentPrice = company.ipoPrice;
      }
    });
    
    // Ensure all participants have correct financial data from ledger
    this.syncParticipantDataWithLedger();
    
    this.gameState.phase = 'newspaper';
    this.isProcessing = false;
    
    // Emit game state update to all clients in this session
    if (this.io && this.io.to) {
      this.io.to(this.sessionId).emit('gameStateUpdate', this.gameState);
    } else if (this.io && this.io.emit) {
      // Fallback for mock IO objects
      this.io.emit('gameStateUpdate', this.gameState);
    }
    console.log('✅ IPO completed, phase set to newspaper, game state updated for session:', this.sessionId);
    
    // CRITICAL: Sync IPO ledger data with main ledger module for trading
    this.syncLedgerDataWithMainModule();
    
    return true;
  }

  /**
   * Sync IPO ledger data with the main ledger module for trading phase
   * This ensures the trading system has access to all participant data
   */
  syncLedgerDataWithMainModule() {
    try {
      console.log('🔄 Syncing IPO ledger data with main ledger module...');
      
      // The IPO module uses the main ledger directly, but we need to ensure
      // the shares are in the correct format for the trading module
      if (this.ledger && this.ledger.ledgers) {
        for (const [participantId, ledgerData] of this.ledger.ledgers) {
          console.log(`📊 Ensuring shares format for ${ledgerData.participantName} (${participantId})`);
          
          // Ensure shares Map exists for trading module compatibility
          if (!ledgerData.shares) {
            ledgerData.shares = new Map();
          }
          
          // Convert stockPositions to shares format if needed
          if (ledgerData.stockPositions) {
            for (const [companyId, position] of ledgerData.stockPositions) {
              const totalShares = position.purchaseLots.reduce((sum, lot) => sum + lot.shares, 0);
              ledgerData.shares.set(companyId, totalShares);
              console.log(`📊 Converted ${totalShares} shares of ${companyId} for ${ledgerData.participantName}`);
            }
          }
        }
        
        console.log('✅ IPO ledger data synced with main ledger module');
      } else {
        console.log('⚠️ IPO ledger not available for sync');
      }
    } catch (error) {
      console.error('❌ IPO Module: Error syncing ledger data:', error);
      console.error('❌ IPO Module: Stack trace:', error.stack);
    }
  }

  /**
   * Skip IPO (AI bots only)
   */
  async skipIPO() {
    if (!this.gameState || this.gameState.phase !== 'ipo') {
      console.error('Cannot skip IPO - not in IPO phase');
      return false;
    }

    console.log('⏭️ Skipping human IPO - processing AI bots only');
    
    await this.processAIBids();
    this.completeIPO();
    
    this.io.emit('gameStateUpdate', this.gameState);
    
    return true;
  }

  /**
   * Get IPO status
   */
  getStatus() {
    return {
      phase: this.gameState?.phase || 'unknown',
      isProcessing: this.isProcessing,
      companies: this.gameState?.companies?.length || 0,
      participants: this.gameState?.participants?.length || 0
    };
  }

  /**
   * Get ledger data for all participants
   */
  getLedgerData() {
    return this.ledger.getAllLedgers();
  }

  /**
   * Get CEO information
   */
  getCEOData() {
    return this.ledger.getAllCEOs();
  }

  /**
   * Update all participant purchases to use the final IPO prices
   * This ensures everyone pays the same clearing price in the Dutch auction
   */
  updateParticipantPricesToIPO() {
    console.log('🔄 Updating participant prices to final IPO prices...');
    
    for (const company of this.gameState.companies) {
      if (company.ipoPrice && company.ipoPrice > 0) {
        // Update all participants who own shares of this company
        for (const participant of this.gameState.participants) {
          if (participant.shares && participant.shares[company.id] > 0) {
            const shares = participant.shares[company.id];
            
            // Calculate what they should have paid at the final IPO price
            const correctCost = shares * company.ipoPrice;
            
            // Calculate what they actually paid (from their current totalSpent)
            const currentTotalSpent = participant.totalSpent || 0;
            const currentCash = participant.remainingCapital || participant.capital || 1000;
            const actualCost = 1000 - currentCash; // What they actually spent
            
            // Find the cost for this specific company (this is approximate)
            const companyCost = actualCost * (shares / Object.values(participant.shares).reduce((sum, s) => sum + s, 0));
            const priceDifference = correctCost - companyCost;
            
            // Update participant's financial data
            if (participant.totalSpent !== undefined) {
              participant.totalSpent += priceDifference;
            }
            if (participant.remainingCapital !== undefined) {
              participant.remainingCapital -= priceDifference;
            }
            
            // Update ledger if it exists
            const ledger = this.ledger.ledgers.get(participant.id);
            if (ledger) {
              ledger.cash -= priceDifference;
              this.ledger.updateNetWorth(participant.id);
              
              // DEBUG: Check if shares are being recorded
              console.log(`🔍 DEBUG: ${participant.name} ledger after IPO:`, {
                cash: ledger.cash,
                shares: Object.fromEntries(ledger.shares || new Map()),
                stockPositions: Object.fromEntries(ledger.stockPositions || new Map())
              });
            }
            
            console.log(`💰 ${participant.name}: ${shares} shares of ${company.name} at $${company.ipoPrice.toFixed(2)} each = $${correctCost.toFixed(2)}`);
          }
        }
      }
    }
    
    console.log('✅ All participant prices updated to final IPO prices');
  }


  /**
   * Sync participant data with ledger to ensure consistency
   * This is the simple door in/door out process you described
   * LEDGER IS THE SOURCE OF TRUTH - NO RECALCULATION
   */
  syncParticipantDataWithLedger() {
    console.log('🔄 Syncing participant data with ledger (IPO door out process)...');
    
    // Simple process: Everyone walks out of IPO room with final results
    // LEDGER IS THE SOURCE OF TRUTH - just copy from ledger to participant data
    for (const participant of this.gameState.participants) {
      const ledger = this.ledger.ledgers.get(participant.id);
      if (ledger) {
        // LEDGER IS THE SOURCE OF TRUTH - just copy the values
        participant.remainingCapital = ledger.cash;
        participant.totalSpent = 1000 - ledger.cash; // What they spent = starting capital - remaining cash
        
        // Ensure net worth is calculated correctly
        this.ledger.updateNetWorth(participant.id);
        
        console.log(`💰 ${participant.name}: Cash $${ledger.cash.toFixed(2)}, Stock Value $${(ledger.totalNetWorth - ledger.cash).toFixed(2)}, Net Worth $${ledger.totalNetWorth.toFixed(2)}`);
        
      }
    }
    
    console.log('✅ IPO door out process completed - all participants have final results');
  }
}

module.exports = IPOModule;



