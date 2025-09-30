/**
 * Ledger Module - Comprehensive Financial Tracking System
 * Handles FIFO stock tracking, P&L calculations, and CEO status management
 */

class LedgerModule {
  constructor() {
    this.ledgers = new Map(); // participantId -> ledger data
    this.ceoStatus = new Map(); // companyId -> { participantId, participantName, ownership }
    this.tradingModule = null; // Reference to trading module for real-time prices
  }

  /**
   * Reset all ledger data for fresh game start
   */
  resetAllLedgers() {
    console.log('🔄 Resetting all ledger data for fresh game start');
    this.ledgers.clear();
    this.ceoStatus.clear();
    console.log('✅ All ledger data cleared');
  }

  /**
   * Initialize a new participant ledger
   */
  initializeParticipant(participantId, participantName, isHuman = false, startingCapital = 1000) {
    // CRITICAL FIX: Only create ledger if one doesn't exist
    if (this.ledgers.has(participantId)) {
      console.log(`📊 Ledger already exists for ${participantName} (${participantId}) - preserving existing data`);
      return this.ledgers.get(participantId);
    }
    
    const ledger = {
      participantId,
      participantName,
      isHuman,
      cash: startingCapital,
      stockPositions: new Map(), // companyId -> array of purchase lots
      totalNetWorth: startingCapital,
      isCEO: false,
      ceoCompany: null
    };
    
    this.ledgers.set(participantId, ledger);
    console.log(`📊 Ledger initialized for ${participantName} (${participantId}) with $${startingCapital}`);
    return ledger;
  }

  /**
   * Initialize ledgers for all participants
   */
  initializeLedgers(participants) {
    console.log(`📊 Initializing ledgers for ${participants.length} participants`);
    let newLedgersCreated = 0;
    let existingLedgersPreserved = 0;
    
    participants.forEach(participant => {
      if (this.ledgers.has(participant.id)) {
        console.log(`📊 Preserving existing ledger for ${participant.name} (${participant.id})`);
        existingLedgersPreserved++;
      } else {
        this.initializeParticipant(participant.id, participant.name, participant.isHuman, participant.capital || 1000);
        newLedgersCreated++;
      }
    });
    
    console.log(`✅ Ledger initialization complete: ${newLedgersCreated} new, ${existingLedgersPreserved} preserved`);
  }

  /**
   * Ensure a participant has a ledger (create if missing)
   */
  ensureParticipantLedger(participantId, participantName, isHuman = false, startingCapital = 1000) {
    if (!this.ledgers.has(participantId)) {
      console.log(`📊 Creating missing ledger for ${participantName} (${participantId})`);
      return this.initializeParticipant(participantId, participantName, isHuman, startingCapital);
    }
    return this.ledgers.get(participantId);
  }

  /**
   * Record a stock purchase (IPO or trading)
   * BULLETPROOF: NEVER allow negative cash, ALWAYS maintain $1000 net worth
   */
  recordPurchase(participantId, companyId, companyName, shares, pricePerShare, transactionType = 'purchase') {
    console.log(`🔍 Ledger: recordPurchase called - participant: ${participantId}, company: ${companyId}, shares: ${shares}, price: ${pricePerShare}`);
    
    // Ensure participant has a ledger
    let ledger = this.ledgers.get(participantId);
    if (!ledger) {
      console.log(`📊 Creating missing ledger for participant ${participantId}`);
      ledger = this.ensureParticipantLedger(participantId, `Participant ${participantId}`, false, 1000);
    }
    console.log(`🔍 Ledger: Found ledger for ${ledger.participantName}, current cash: ${ledger.cash}`);

    const totalCost = shares * pricePerShare;
    
    // BULLETPROOF CHECK: Never allow spending more than available cash
    if (ledger.cash < totalCost) {
      console.error(`❌ BLOCKED: ${ledger.participantName} cannot afford $${totalCost} (has $${ledger.cash})`);
      return false;
    }

    // Deduct cash - this is safe because we checked above
    ledger.cash -= totalCost;
    
    // BULLETPROOF VERIFICATION: Cash should never be negative
    if (ledger.cash < 0) {
      console.error(`❌ CRITICAL ERROR: Cash went negative! ${ledger.participantName} has $${ledger.cash}`);
      console.error(`❌ This indicates a mathematical error in the purchase logic - investigate immediately!`);
      return false;
    }

    // Add stock position (FIFO - new purchases go to end of array)
    if (!ledger.stockPositions.has(companyId)) {
      ledger.stockPositions.set(companyId, []);
      console.log(`🔍 Ledger: Created new stock position for ${companyId}`);
    }

    const purchaseLot = {
      shares,
      pricePerShare,
      totalCost,
      transactionType,
      timestamp: Date.now(),
      companyName
    };

    ledger.stockPositions.get(companyId).push(purchaseLot);
    console.log(`🔍 Ledger: Added purchase lot for ${companyName}: ${shares} shares at $${pricePerShare}`);
    console.log(`🔍 Ledger: Total shares now: ${this.getTotalShares(participantId, companyId)}`);

    // Update net worth
    this.updateNetWorth(participantId);

    // Check for CEO status
    this.checkCEOStatus(participantId, companyId);

    console.log(`📈 ${ledger.participantName} purchased ${shares} shares of ${companyName} at $${pricePerShare} (Total: $${totalCost})`);
    console.log(`💰 Remaining cash: $${ledger.cash.toFixed(2)}`);
    
    return true;
  }

  /**
   * Record a stock sale (FIFO)
   */
  recordSale(participantId, companyId, shares, pricePerShare) {
    // Ensure participant has a ledger
    let ledger = this.ledgers.get(participantId);
    if (!ledger) {
      console.log(`📊 Creating missing ledger for participant ${participantId}`);
      ledger = this.ensureParticipantLedger(participantId, `Participant ${participantId}`, false, 1000);
    }

    const positions = ledger.stockPositions.get(companyId);
    if (!positions || positions.length === 0) {
      console.error(`${ledger.participantName} has no shares of ${companyId} to sell`);
      return false;
    }

    let sharesToSell = shares;
    let totalProceeds = 0;
    let totalCostBasis = 0;
    const sales = [];

    // FIFO - sell from oldest purchases first
    while (sharesToSell > 0 && positions.length > 0) {
      const lot = positions[0];
      
      if (lot.shares <= sharesToSell) {
        // Sell entire lot
        const proceeds = lot.shares * pricePerShare;
        totalProceeds += proceeds;
        totalCostBasis += lot.totalCost;
        
        sales.push({
          shares: lot.shares,
          costBasis: lot.pricePerShare,
          salePrice: pricePerShare,
          profit: proceeds - lot.totalCost
        });

        sharesToSell -= lot.shares;
        positions.shift(); // Remove the lot
      } else {
        // Sell partial lot
        const proceeds = sharesToSell * pricePerShare;
        const costBasis = sharesToSell * lot.pricePerShare;
        totalProceeds += proceeds;
        totalCostBasis += costBasis;
        
        sales.push({
          shares: sharesToSell,
          costBasis: lot.pricePerShare,
          salePrice: pricePerShare,
          profit: proceeds - costBasis
        });

        // Update the remaining lot
        lot.shares -= sharesToSell;
        lot.totalCost -= costBasis;
        sharesToSell = 0;
      }
    }

    if (sharesToSell > 0) {
      console.error(`Not enough shares to sell: requested ${shares}, available ${shares - sharesToSell}`);
      return false;
    }

    // Add cash from sale
    ledger.cash += totalProceeds;

    // Update net worth
    this.updateNetWorth(participantId);

    // Check CEO status (might lose CEO if selling reduces ownership)
    this.checkCEOStatus(participantId, companyId);

    const totalProfit = totalProceeds - totalCostBasis;
    console.log(`📉 ${ledger.participantName} sold ${shares} shares for $${totalProceeds.toFixed(2)} (Profit: $${totalProfit.toFixed(2)})`);
    console.log(`💰 Cash after sale: $${ledger.cash.toFixed(2)}`);

    return {
      totalProceeds,
      totalCostBasis,
      totalProfit,
      sales
    };
  }

  /**
   * Update net worth calculation
   * BULLETPROOF: ALWAYS maintain exactly $1000 net worth
   */
  updateNetWorth(participantId) {
    const ledger = this.ledgers.get(participantId);
    if (!ledger) return;

    let totalStockValue = 0;
    
    // Calculate current value of all stock positions at current market prices
    for (const [companyId, positions] of ledger.stockPositions) {
      // Get current market price for this company
      const currentMarketPrice = this.getCurrentMarketPrice(companyId);
      
      for (const lot of positions) {
        // Use current market price for valuation (not purchase price)
        totalStockValue += lot.shares * currentMarketPrice;
      }
    }

    ledger.totalNetWorth = ledger.cash + totalStockValue;
    
    console.log(`💰 ${ledger.participantName} net worth: $${ledger.cash.toFixed(2)} cash + $${totalStockValue.toFixed(2)} stocks = $${ledger.totalNetWorth.toFixed(2)}`);
  }

  // Set trading module reference for real-time price updates
  setTradingModule(tradingModule) {
    this.tradingModule = tradingModule;
    console.log('📊 Ledger module connected to trading module for real-time prices');
  }

  // Get current market price for a company from trading module
  getCurrentMarketPrice(companyId) {
    if (this.tradingModule && this.tradingModule.currentPrices) {
      // Try both numeric and string versions of the ID
      let currentPrice = this.tradingModule.currentPrices.get(companyId);
      if (currentPrice) {
        return currentPrice;
      }
      
      // Try string version if numeric didn't work
      const stringId = `company_${companyId}`;
      currentPrice = this.tradingModule.currentPrices.get(stringId);
      if (currentPrice) {
        return currentPrice;
      }
    }
    
    // Fallback to default prices if trading module not available
    const defaultPrices = {
      'company_1': 1.55,
      'company_2': 1.57, 
      'company_3': 1.33,
      'company_4': 1.26,
      1: 1.55,
      2: 1.57,
      3: 1.33,
      4: 1.26
    };
    return defaultPrices[companyId] || 1.50;
  }

  /**
   * Check and update CEO status - SIMPLIFIED VERSION
   * Only one CEO per participant, only one CEO per company
   */
  checkCEOStatus(participantId, companyId) {
    const ledger = this.ledgers.get(participantId);
    if (!ledger) return;

    const totalShares = this.getTotalShares(participantId, companyId);
    const ownershipPercentage = (totalShares / 1000) * 100; // Assuming 1000 total shares per company

    // STRICT RULE: If you own 35%+ and you're not already CEO of ANY company
    if (ownershipPercentage >= 35 && !ledger.isCEO) {
      // Check if this company already has a CEO
      const existingCEO = Array.from(this.ceoStatus.values()).find(ceo => ceo.companyId === companyId);
      if (existingCEO) {
        console.log(`👑 ${companyId} already has CEO: ${existingCEO.participantName}`);
        return;
      }
      
      // Become CEO - ONLY if not already CEO of another company
      ledger.isCEO = true;
      ledger.ceoCompany = companyId;
      this.ceoStatus.set(companyId, {
        participantId,
        participantName: ledger.participantName,
        companyId,
        ownership: ownershipPercentage
      });
      console.log(`👑 ${ledger.participantName} is now CEO of ${companyId} (${ownershipPercentage.toFixed(1)}% ownership)`);
    } else if (ledger.ceoCompany === companyId && ownershipPercentage < 35) {
      // Lose CEO status if ownership drops below 35%
      ledger.isCEO = false;
      ledger.ceoCompany = null;
      this.ceoStatus.delete(companyId);
      console.log(`👑 ${ledger.participantName} lost CEO status of ${companyId} (${ownershipPercentage.toFixed(1)}% ownership)`);
    }
  }

  /**
   * Get total shares owned of a specific company
   */
  getTotalShares(participantId, companyId) {
    console.log(`🔍 Ledger: getTotalShares called - participant: ${participantId}, company: ${companyId}`);
    const ledger = this.ledgers.get(participantId);
    if (!ledger) {
      console.log(`🔍 Ledger: No ledger found for participant ${participantId}`);
      return 0;
    }

    const positions = ledger.stockPositions.get(companyId);
    if (!positions) {
      console.log(`🔍 Ledger: No stock positions found for ${companyId} in ${ledger.participantName}'s ledger`);
      console.log(`🔍 Ledger: Available stock positions:`, Array.from(ledger.stockPositions.keys()));
      return 0;
    }

    const totalShares = positions.reduce((total, lot) => total + lot.shares, 0);
    console.log(`🔍 Ledger: ${ledger.participantName} has ${totalShares} shares of ${companyId}`);
    return totalShares;
  }

  /**
   * Get detailed ledger information for display
   */
  getLedgerSummary(participantId) {
    const ledger = this.ledgers.get(participantId);
    if (!ledger) return null;

    const stockPositions = [];
    let totalStockValue = 0;
    let totalCostBasis = 0;

    for (const [companyId, positions] of ledger.stockPositions) {
      if (positions.length > 0) {
        const totalShares = positions.reduce((sum, lot) => sum + lot.shares, 0);
        const costBasis = positions.reduce((sum, lot) => sum + lot.totalCost, 0);
        const currentValue = totalShares * this.getCurrentMarketPrice(companyId); // Use current market price
        
        stockPositions.push({
          companyId,
          companyName: positions[0].companyName,
          totalShares,
          costBasis,
          currentValue,
          profitLoss: currentValue - costBasis,
          lots: positions.map(lot => ({
            shares: lot.shares,
            pricePerShare: lot.pricePerShare,
            totalCost: lot.totalCost,
            transactionType: lot.transactionType
          }))
        });

        totalStockValue += currentValue;
        totalCostBasis += costBasis;
      }
    }

    return {
      participantId: ledger.participantId,
      participantName: ledger.participantName,
      isHuman: ledger.isHuman,
      cash: ledger.cash,
      stockPositions,
      totalStockValue,
      totalCostBasis,
      totalNetWorth: ledger.cash + totalStockValue,
      isCEO: ledger.isCEO,
      ceoCompany: ledger.ceoCompany,
      totalProfitLoss: (ledger.cash + totalStockValue) - 1000 // Starting capital was $1000
    };
  }

  /**
   * Get all ledgers for game display
   */
  getAllLedgers() {
    const allLedgers = [];
    for (const [participantId, ledger] of this.ledgers) {
      allLedgers.push(this.getLedgerSummary(participantId));
    }
    return allLedgers;
  }

  /**
   * Update current stock prices (called by trading module)
   */
  updateStockPrices(companyPrices) {
    for (const [participantId, ledger] of this.ledgers) {
      this.updateNetWorth(participantId);
    }
  }

  /**
   * Get CEO information for a company
   */
  getCEO(companyId) {
    return this.ceoStatus.get(companyId) || null;
  }

  /**
   * Get all CEOs
   */
  getAllCEOs() {
    return Array.from(this.ceoStatus.entries()).map(([companyId, ceo]) => ({
      companyId,
      ...ceo
    }));
  }
}

module.exports = LedgerModule;
