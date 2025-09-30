/**
 * Clean Architecture - IPO Module
 * Dutch auction IPO system with all your original features
 */

class IPO {
  constructor(gameState) {
    this.gameState = gameState;
    this.isProcessing = false;
    this.ipoStartTime = null;
    this.ipoDuration = 120000; // 2 minutes
    this.ipoTimeoutId = null;
  }

  /**
   * Start IPO phase - sets up the bidding environment
   */
  startIPO() {
    if (this.gameState.state.phase !== 'lobby' && this.gameState.state.phase !== 'starting') {
      console.error('Cannot start IPO - game not in lobby or starting phase');
      return false;
    }

    console.log('🎯 Starting IPO Phase...');
    
    // Set phase to IPO
    this.gameState.setPhase('ipo');
    this.gameState.state.startTime = new Date();
    this.ipoStartTime = Date.now();
    this.isProcessing = false;

    // Initialize all participants
    this.initializeParticipants();

    // Ensure we have scavenger bots for liquidity
    this.ensureScavengerBots();

    console.log(`👥 All participants:`, Array.from(this.gameState.state.participants.values()).map(p => `${p.name} (${p.isHuman ? 'Human' : 'AI'})`));
    console.log(`👥 IPO will wait for human input before processing any bids`);
    
    return true;
  }

  /**
   * Initialize all participants
   */
  initializeParticipants() {
    for (const [id, participant] of this.gameState.state.participants) {
      // Reset participant to starting state
      participant.cash = this.gameState.state.startingCapital;
      participant.shares = new Map();
      participant.netWorth = this.gameState.state.startingCapital;
      participant.isCEO = false;
      participant.ceoCompanyId = null;
      
      console.log(`📊 Initialized ${participant.name}: $${participant.cash} cash, 0 shares`);
    }
    console.log(`📊 Initialized ${this.gameState.state.participants.size} participants`);
  }

  /**
   * Ensure we have scavenger bots for liquidity
   */
  ensureScavengerBots() {
    const existingScavengers = Array.from(this.gameState.state.participants.values()).filter(p => 
      !p.isHuman && p.personality && p.personality.bidStrategy === 'scavenger'
    );

    // Create more scavenger bots to ensure oversubscription
    const minScavengers = Math.max(5, this.gameState.state.companies.size * 2);
    if (existingScavengers.length < minScavengers) {
      console.log(`🔄 Creating ${minScavengers - existingScavengers.length} scavenger bots for oversubscription...`);
      
      for (let i = existingScavengers.length; i < minScavengers; i++) {
        const scavengerBot = {
          name: `Scavenger Bot #${i + 1}`,
          isHuman: false,
          personality: {
            bidStrategy: 'scavenger',
            riskTolerance: 0.9,
            concentration: 1.0,
            bidMultiplier: 0.4
          }
        };
        
        this.gameState.addParticipant(scavengerBot);
        console.log(`✅ Created ${scavengerBot.name} with $${this.gameState.state.startingCapital}`);
      }
    }
  }

  /**
   * Process human IPO bids
   */
  async processHumanBids(humanBids, participantId) {
    console.log('🔍 processHumanBids called with:', { humanBids, participantId });
    
    if (this.gameState.state.phase !== 'ipo') {
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
    const humanParticipant = this.gameState.state.participants.get(participantId);
    if (!humanParticipant || !humanParticipant.isHuman) {
      console.error('Human participant not found');
      return false;
    }

    let totalBidAmount = 0;
    const processedBids = [];

    // Validate and process each bid
    for (const bid of humanBids) {
      const company = this.gameState.state.companies.get(bid.companyId);
      if (!company) {
        console.warn(`Company ${bid.companyId} not found - skipping bid`);
        continue;
      }

      const bidAmount = bid.shares * bid.price;
      
      // Check if participant has enough capital
      if (bidAmount <= humanParticipant.cash) {
        // Check if company has enough shares
        const availableShares = company.totalShares - company.sharesAllocated;
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
        console.warn(`Insufficient capital for bid on ${company.name} - required: $${bidAmount}, available: $${humanParticipant.cash}`);
      }
    }

    // Store human bids for Dutch auction processing
    if (processedBids.length > 0) {
      // Store human bids in the company objects for Dutch auction processing
      for (const bid of processedBids) {
        const company = this.gameState.state.companies.get(bid.companyId);
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
  }

  /**
   * Process AI bot bids automatically
   */
  async processAIBids() {
    console.log('🔍 processAIBids() called - checking game state...');
    
    if (this.gameState.state.phase !== 'ipo') {
      console.log('🔧 processAIBids() ignored - not in IPO phase');
      return;
    }

    if (this.isProcessing) {
      console.log('🔧 processAIBids() ignored - already processing IPO');
      return;
    }
    
    console.log('🤖 Processing AI bot bids...');
    this.isProcessing = true;

    // Generate bids for each company
    for (const [companyId, company] of this.gameState.state.companies) {
      console.log(`🔍 Processing company: ${company.name} (${companyId})`);
      const bids = [];
      
      for (const [participantId, participant] of this.gameState.state.participants) {
        if (participant.isHuman) continue; // Skip human participants
        
        if (participant.personality) {
          const personality = participant.personality;
          
          // PERSONALITY-BASED BIDDING: Each bot type behaves according to their personality
          let shouldBid = false;
          
          if (personality.bidStrategy === 'scavenger') {
            // Scavenger bots ALWAYS bid on ALL companies for liquidity
            shouldBid = true;
            console.log(`🔍 Scavenger ${participant.name} will bid on ${company.name} (scavenger strategy)`);
          } else if (personality.bidStrategy === 'ceo') {
            // CEO/Concentrated bots bid on fewer companies but with high share counts
            const companiesToBidOn = Math.max(1, Math.min(2, Math.ceil(personality.concentration * 2)));
            const bidProbability = 1.0 / companiesToBidOn;
            shouldBid = Math.random() < bidProbability;
          } else if (personality.bidStrategy === 'low') {
            // Conservative/Low strategy bots bid less frequently
            const companiesToBidOn = Math.max(1, Math.min(3, Math.ceil(personality.concentration * 3)));
            const bidProbability = (0.4 + (personality.riskTolerance * 0.2)) / companiesToBidOn;
            shouldBid = Math.random() < bidProbability;
          } else if (personality.bidStrategy === 'high') {
            // Aggressive/High strategy bots bid on multiple companies
            const companiesToBidOn = Math.max(2, Math.min(4, Math.ceil((1 - personality.concentration) * 4)));
            const bidProbability = (0.7 + (personality.riskTolerance * 0.2)) / companiesToBidOn;
            shouldBid = Math.random() < bidProbability;
          } else {
            // Default/Medium strategy bots
            const companiesToBidOn = Math.max(1, Math.min(3, Math.ceil(personality.concentration * 3)));
            const bidProbability = (0.6 + (personality.riskTolerance * 0.2)) / companiesToBidOn;
            shouldBid = Math.random() < bidProbability;
          }
          
          if (shouldBid) {
            let bidPrice = this.calculateBidPrice(personality);
            const sharesToBid = this.calculateSharesToBid(participant, personality, bidPrice);
            const bidAmount = sharesToBid * bidPrice;
            
            if (bidAmount <= participant.cash && sharesToBid > 0) {
              bids.push({
                participantId: participant.id,
                shares: sharesToBid,
                price: bidPrice,
                total: bidAmount
              });
              console.log(`🤖 ${participant.name} bidding ${sharesToBid} shares at $${bidPrice} (Total: $${bidAmount}, Cash: $${participant.cash.toFixed(2)})`);
            } else {
              console.log(`⚠️ ${participant.name} cannot afford bid: needs $${bidAmount}, has $${participant.cash.toFixed(2)}`);
            }
          } else {
            console.log(`🤖 ${participant.name} chose not to bid on ${company.name} (${personality.bidStrategy})`);
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
      
      // If not all shares were sold, add scavenger bots to buy remaining shares
      const remainingShares = company.totalShares - company.sharesAllocated;
      if (remainingShares > 0) {
        console.log(`⚠️ ${company.name} has ${remainingShares} unsold shares - adding scavenger bids`);
        await this.addScavengerBids(company, remainingShares);
      }
      
      console.log(`✅ Completed processing: ${company.name}`);
    }

    console.log('✅ AI bot bidding completed');
    this.isProcessing = false;
    
    // Complete the IPO and move to newspaper phase
    this.completeIPO();
    
    return true;
  }

  /**
   * Calculate bid price based on personality
   */
  calculateBidPrice(personality) {
    const normalPrices = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    
    if (personality.bidStrategy === 'scavenger') {
      return normalPrices[Math.floor(Math.random() * 3)]; // $1.00, $1.25, $1.50
    } else if (personality.bidStrategy === 'ceo') {
      return normalPrices[Math.floor(Math.random() * 3) + 5]; // $2.50, $2.75, $3.00
    } else if (personality.bidStrategy === 'low') {
      return normalPrices[Math.floor(Math.random() * 3)]; // $1.00, $1.25, $1.50
    } else if (personality.bidStrategy === 'high') {
      return normalPrices[Math.floor(Math.random() * 3) + 4]; // $2.00, $2.25, $2.50
    } else {
      return normalPrices[Math.floor(Math.random() * 3) + 2]; // $1.50, $1.75, $2.00
    }
  }

  /**
   * Calculate shares to bid based on personality and capital
   */
  calculateSharesToBid(participant, personality, bidPrice) {
    if (personality.bidStrategy === 'scavenger') {
      const capitalToUse = participant.cash * 0.8;
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.min(maxShares, 1000);
    } else if (personality.bidStrategy === 'ceo') {
      const capitalToUse = participant.cash * (0.6 + (personality.riskTolerance * 0.3));
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(200, Math.min(maxShares, 800));
    } else if (personality.bidStrategy === 'low') {
      const capitalToUse = participant.cash * (0.2 + (personality.riskTolerance * 0.2));
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(50, Math.min(maxShares, 300));
    } else if (personality.bidStrategy === 'high') {
      const capitalToUse = participant.cash * (0.4 + (personality.riskTolerance * 0.3));
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(100, Math.min(maxShares, 600));
    } else {
      const capitalToUse = participant.cash * (0.3 + (personality.riskTolerance * 0.2));
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(75, Math.min(maxShares, 400));
    }
  }

  /**
   * Process all bids for a specific company using proper Dutch auction
   */
  async processCompanyBids(company, bids) {
    try {
      if (!bids || bids.length === 0) {
        console.error(`❌ No bids for ${company.name} - this should not happen with oversubscription`);
        await this.addScavengerBids(company, company.totalShares);
        return;
      }

      const availableShares = company.totalShares - company.sharesAllocated;
      
      // Sort bids by price (highest first) for Dutch auction
      bids.sort((a, b) => b.price - a.price);

      // Verify oversubscription
      const totalBidShares = bids.reduce((sum, bid) => sum + bid.shares, 0);
      if (totalBidShares < availableShares) {
        console.error(`❌ UNDERSOLD: ${company.name} has ${availableShares} shares but only ${totalBidShares} bid shares`);
        await this.addScavengerBids(company, availableShares - totalBidShares);
        return;
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

      // Allocate shares at the clearing price
      let sharesAllocated = 0;
      for (const bid of bids) {
        if (sharesAllocated >= availableShares) break;

        const participant = this.gameState.state.participants.get(bid.participantId);
        if (!participant) continue;

        const sharesToAllocate = Math.min(bid.shares, availableShares - sharesAllocated);
        
        if (sharesToAllocate > 0) {
          // Create transaction for this purchase
          const transaction = {
            id: this.gameState.generateTransactionId(),
            type: 'ipo_purchase',
            operations: [{
              participantId: participant.id,
              type: 'trade',
              companyId: company.id,
              cashChange: -sharesToAllocate * clearingPrice,
              sharesChange: sharesToAllocate
            }],
            timestamp: Date.now()
          };

          // Apply transaction
          const result = this.gameState.updateState(transaction);
          if (result.success) {
            // Update company
            company.sharesAllocated += sharesToAllocate;
            sharesAllocated += sharesToAllocate;
            
            console.log(`🤖 ${participant.name}: ${sharesToAllocate} shares of ${company.name} at $${clearingPrice} each (bid was $${bid.price})`);
          } else {
            console.error(`Failed to process IPO purchase for ${participant.name}`);
          }
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
      this.gameState.state.currentPrices.set(company.id, clearingPrice);

      // Determine CEO
      this.determineCEO(company);
    } catch (error) {
      console.error('❌ IPO Module: Error in processCompanyBids:', error);
    }
  }

  /**
   * Add scavenger bids for remaining unsold shares
   */
  async addScavengerBids(company, remainingShares) {
    console.log(`🔄 Adding scavenger bids for ${remainingShares} remaining shares of ${company.name}`);
    
    const scavengerBots = Array.from(this.gameState.state.participants.values()).filter(p => 
      !p.isHuman && p.personality && p.personality.bidStrategy === 'scavenger'
    );
    
    if (scavengerBots.length === 0) {
      console.error('❌ CRITICAL ERROR: No scavenger bots found!');
      return;
    }
    
    // Distribute remaining shares among scavenger bots
    let sharesToAllocate = remainingShares;
    const scavengerPrice = 1.00; // Minimum price for scavenger bots
    
    // Sort scavenger bots by remaining cash (highest first)
    scavengerBots.sort((a, b) => b.cash - a.cash);
    
    for (const bot of scavengerBots) {
      if (sharesToAllocate <= 0) break;
      
      // Calculate how many shares this bot can afford
      const maxAffordableShares = Math.floor(bot.cash / scavengerPrice);
      const sharesForThisBot = Math.min(maxAffordableShares, sharesToAllocate);
      
      if (sharesForThisBot > 0) {
        const totalCost = sharesForThisBot * scavengerPrice;
        
        if (totalCost <= bot.cash) {
          // Create transaction for this purchase
          const transaction = {
            id: this.gameState.generateTransactionId(),
            type: 'scavenger_purchase',
            operations: [{
              participantId: bot.id,
              type: 'trade',
              companyId: company.id,
              cashChange: -totalCost,
              sharesChange: sharesForThisBot
            }],
            timestamp: Date.now()
          };

          // Apply transaction
          const result = this.gameState.updateState(transaction);
          if (result.success) {
            company.sharesAllocated += sharesForThisBot;
            sharesToAllocate -= sharesForThisBot;
            
            console.log(`🔄 Scavenger ${bot.name} bought ${sharesForThisBot} shares of ${company.name} at $${scavengerPrice} (remaining capital: $${bot.cash.toFixed(2)})`);
          } else {
            console.error(`Failed to process scavenger purchase for ${bot.name}`);
          }
        } else {
          console.log(`⚠️ Scavenger ${bot.name} cannot afford ${sharesForThisBot} shares at $${scavengerPrice}`);
        }
      }
    }
    
    // If there are still shares left, this is a CRITICAL ERROR
    if (sharesToAllocate > 0) {
      console.error(`❌ CRITICAL ERROR: ${sharesToAllocate} shares still unsold for ${company.name}!`);
    } else {
      console.log(`✅ All shares of ${company.name} have been allocated!`);
    }
    
    if (!company.ipoPrice) {
      company.ipoPrice = scavengerPrice;
      company.currentPrice = scavengerPrice;
      this.gameState.state.currentPrices.set(company.id, scavengerPrice);
    }
  }

  /**
   * Determine CEO based on share ownership
   */
  determineCEO(company) {
    let maxShares = 0;
    let ceoId = null;
    
    for (const [participantId, participant] of this.gameState.state.participants) {
      const shares = participant.shares?.get(company.id) || 0;
      if (shares > maxShares) {
        maxShares = shares;
        ceoId = participantId;
      }
    }
    
    // Check if CEO threshold is met
    if (maxShares >= company.totalShares * this.gameState.state.ceoThreshold) {
      const ceo = this.gameState.state.participants.get(ceoId);
      if (ceo) {
        ceo.isCEO = true;
        ceo.ceoCompanyId = company.id;
        company.ceoId = ceoId;
        company.ceoName = ceo.name;
        console.log(`👑 ${ceo.name} is CEO of ${company.name} (${(maxShares / company.totalShares * 100).toFixed(1)}% ownership)`);
      }
    } else {
      console.log(`👑 No CEO found for ${company.name} - no participant has 35%+ ownership`);
    }
  }

  /**
   * Complete IPO and move to newspaper phase
   */
  completeIPO() {
    console.log('🔍 completeIPO() called - checking game state...');
    
    if (this.gameState.state.phase !== 'ipo') {
      console.error('❌ Cannot complete IPO - not in IPO phase');
      return false;
    }

    console.log('🎉 IPO Phase completed - setting final prices and moving to newspaper phase');
    
    // All companies should be processed by now
    this.gameState.state.companies.forEach(company => {
      if (company.ipoPrice) {
        console.log(`📊 ${company.name} final IPO price: $${company.ipoPrice.toFixed(2)}`);
      } else {
        console.error(`❌ ${company.name} has no IPO price set`);
      }
    });
    
    // Move to newspaper phase
    this.gameState.setPhase('newspaper');
    this.isProcessing = false;
    
    console.log('✅ IPO completed, phase set to newspaper');
    
    return true;
  }
}

module.exports = IPO;
