/**
 * IPO Manager - Handles Dutch auctions and share allocation
 */

class IPOManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
  }

  // Start IPO for a company
  startIPO(companyId, startingPrice = 1.00) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    // Set IPO price
    company.ipoPrice = startingPrice;
    company.currentPrice = startingPrice;
    company.sharesAllocated = 0;

    console.log(`🎯 IPO started for ${company.name} at $${startingPrice}`);

    return { success: true, company };
  }

  // Process Dutch auction bids - using proven logic from working game
  processDutchAuction(companyId, bids) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    if (!bids || bids.length === 0) {
      console.error(`❌ No bids for ${company.name} - this should not happen with oversubscription`);
      return { success: false, error: 'No bids found' };
    }

    const availableShares = company.totalShares;
    
    // Sort bids by price (highest first) for Dutch auction
    bids.sort((a, b) => b.price - a.price);

    // Verify oversubscription (total bid shares > available shares)
    const totalBidShares = bids.reduce((sum, bid) => sum + bid.shares, 0);
    if (totalBidShares < availableShares) {
      console.error(`❌ UNDERSOLD: ${company.name} has ${availableShares} shares but only ${totalBidShares} bid shares`);
      // Add emergency bids to ensure oversubscription
      this.addEmergencyBids(company, availableShares - totalBidShares, bids);
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
      const participant = this.gameEngine.state.participants.get(bid.participantId);
      console.log(`  ${participant?.name || bid.participantId}: ${bid.shares} shares at $${bid.price.toFixed(2)}`);
    });

    // Allocate shares at the clearing price
    let sharesAllocated = 0;
    const transactions = [];
    
    for (const bid of bids) {
      if (sharesAllocated >= availableShares) break;

      const participant = this.gameEngine.state.participants.get(bid.participantId);
      if (!participant) continue;

      const sharesToAllocate = Math.min(bid.shares, availableShares - sharesAllocated);
      
      if (sharesToAllocate > 0) {
        // Create transaction for this allocation
        const transaction = {
          id: this.gameEngine.generateId(),
          type: 'ipo_allocation',
          operations: [{
            participantId: bid.participantId,
            type: 'trade',
            companyId: companyId,
            cashChange: -sharesToAllocate * clearingPrice, // Use clearing price, not bid price
            sharesChange: sharesToAllocate
          }],
          timestamp: Date.now()
        };
        transactions.push(transaction);
        
        sharesAllocated += sharesToAllocate;
        
        console.log(`💰 ${participant.name}: ${sharesToAllocate} shares of ${company.name} at $${clearingPrice} each (bid was $${bid.price})`);
      }
    }

    // Verify all shares were sold
    if (sharesAllocated !== availableShares) {
      console.error(`❌ CRITICAL: ${company.name} only sold ${sharesAllocated} of ${availableShares} shares!`);
    } else {
      console.log(`✅ ${company.name}: All ${availableShares} shares sold at $${clearingPrice}`);
    }

    // Create a transaction to update company data
    const companyUpdateTransaction = {
      id: this.gameEngine.generateId(),
      type: 'company_update',
      operations: [{
        type: 'company_update',
        companyId: companyId,
        ipoPrice: clearingPrice,
        currentPrice: clearingPrice,
        sharesAllocated: sharesAllocated
      }],
      timestamp: Date.now()
    };
    transactions.push(companyUpdateTransaction);

    console.log(`✅ IPO completed for ${company.name}: ${sharesAllocated} shares at $${clearingPrice}`);

    return { 
      success: true, 
      clearingPrice, 
      totalShares: sharesAllocated, 
      transactions 
    };
  }

  // Add emergency bids to ensure oversubscription
  addEmergencyBids(company, neededShares, existingBids) {
    console.log(`🚨 Adding emergency bids for ${neededShares} shares of ${company.name}`);
    
    // Create emergency bids at minimum price
    const emergencyBid = {
      participantId: 'emergency_bot',
      companyId: company.id,
      price: 1.00, // Minimum price
      shares: neededShares + 100 // Add extra to ensure oversubscription
    };
    
    existingBids.push(emergencyBid);
    console.log(`🚨 Emergency bid added: ${emergencyBid.shares} shares at $${emergencyBid.price}`);
  }

  // Generate AI bot bids - using proven logic from working game
  generateAIBids(companyId, participantCount) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    const bids = [];
    // No base price - bots bid what they think is appropriate
    const basePrice = 1.00; // Just a reference point for calculations
    
    // Generate bids for each bot participant
    for (const [participantId, participant] of this.gameEngine.state.participants) {
      if (participant.isBot) {
        const bid = this.generateBotBid(participant, company, basePrice);
        if (bid) {
          bids.push(bid);
        }
      }
    }

    console.log(`🤖 Generated ${bids.length} AI bids for ${company.name}`);
    return { success: true, bids };
  }

  // Generate bid for a bot - using WORKING personality-based logic from original game
  generateBotBid(participant, company, basePrice) {
    // Use the WORKING bid strategies from the original game
    const personalities = {
      conservative: {
        bidStrategy: 'low',
        riskTolerance: 0.3,
        concentration: 0.4,
        bidProbability: 0.7
      },
      aggressive: {
        bidStrategy: 'high', 
        riskTolerance: 0.8,
        concentration: 0.7,
        bidProbability: 0.9
      },
      momentum: {
        bidStrategy: 'default',
        riskTolerance: 0.6,
        concentration: 0.5,
        bidProbability: 0.8
      }
    };

    const personality = personalities[participant.botStrategy] || personalities.conservative;
    
    // Check if bot should bid based on probability
    if (Math.random() > personality.bidProbability) {
      return null; // Bot chooses not to bid
    }

    // Calculate bid price using WORKING logic from original game
    const bidPrice = this.calculateBidPrice(personality);
    
    // Calculate shares to bid using WORKING logic from original game
    const shares = this.calculateSharesToBid(participant, personality, bidPrice);
    
    if (shares > 0) {
      console.log(`🤖 ${participant.name} (${personality.bidStrategy}): bidding ${shares} shares at $${bidPrice.toFixed(2)} for ${company.name}`);
      return {
        participantId: participant.id,
        companyId: company.id,
        price: bidPrice,
        shares: shares
      };
    }

    return null;
  }

  // Calculate bid price based on personality - WORKING logic from original game
  calculateBidPrice(personality) {
    // Use predefined normal prices instead of random calculations
    const normalPrices = [1.00, 1.25, 1.50, 1.75, 2.00, 2.25, 2.50, 2.75, 3.00];
    
    if (personality.bidStrategy === 'scavenger') {
      // Scavenger bots bid low
      return normalPrices[Math.floor(Math.random() * 3)]; // $1.00, $1.25, $1.50
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

  // Calculate shares to bid based on personality and capital - WORKING logic from original game
  calculateSharesToBid(participant, personality, bidPrice) {
    const availableCash = participant.cash;
    
    if (personality.bidStrategy === 'scavenger') {
      // Scavenger bots use most of their capital to ensure liquidity
      const capitalToUse = availableCash * 0.8;
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.min(maxShares, 1000);
    } else if (personality.bidStrategy === 'ceo') {
      // CEO/Concentrated bots bid high share counts to become CEO
      const capitalToUse = availableCash * (0.6 + (personality.riskTolerance * 0.3)); // 60-90% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(200, Math.min(maxShares, 800)); // High share counts for CEO potential
    } else if (personality.bidStrategy === 'low') {
      // Conservative/Low strategy bots bid conservatively
      const capitalToUse = availableCash * (0.2 + (personality.riskTolerance * 0.2)); // 20-40% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(50, Math.min(maxShares, 300)); // Conservative share counts
    } else if (personality.bidStrategy === 'high') {
      // Aggressive/High strategy bots bid on multiple companies with moderate share counts
      const capitalToUse = availableCash * (0.4 + (personality.riskTolerance * 0.3)); // 40-70% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(100, Math.min(maxShares, 600)); // Moderate to high share counts
    } else {
      // Default/Medium strategy bots
      const capitalToUse = availableCash * (0.3 + (personality.riskTolerance * 0.2)); // 30-50% of available cash
      const maxShares = Math.floor(capitalToUse / bidPrice);
      return Math.max(75, Math.min(maxShares, 400)); // Moderate share counts
    }
  }

  // Determine CEO after IPO
  determineCEO(companyId) {
    const company = this.gameEngine.state.companies.get(companyId);
    if (!company) {
      return { success: false, error: 'Company not found' };
    }

    let maxShares = 0;
    let ceo = null;

    // Find participant with most shares
    for (const [participantId, participant] of this.gameEngine.state.participants) {
      const shares = participant.shares?.get(companyId) || 0;
      if (shares > maxShares) {
        maxShares = shares;
        ceo = participant;
      }
    }

    // CEO needs at least 35% of shares
    const requiredShares = Math.ceil(company.totalShares * 0.35);
    if (maxShares >= requiredShares) {
      company.ceo = ceo.id;
      console.log(`👑 ${ceo.name} is now CEO of ${company.name} (${maxShares} shares)`);
      return { success: true, ceo: ceo.id, shares: maxShares };
    }

    return { success: false, error: 'No participant owns enough shares to be CEO' };
  }
}

module.exports = IPOManager;
