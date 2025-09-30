/**
 * Bot Profile System - Defines bot behavior patterns and guardrails
 * Ensures consistent, realistic trading behavior with proper risk management
 */

class BotProfile {
  constructor(archetype, config = {}) {
    this.archetype = archetype;
    this.aggressiveness = config.aggressiveness || 0.5; // 0.0 to 1.0
    this.minPrice = config.minPrice || 0.50;
    this.maxPrice = config.maxPrice || 5.00;
    this.minQty = config.minQty || 10;
    this.maxQty = config.maxQty || 500;
    this.budget = config.budget || 1000;
    this.ownershipCapPct = config.ownershipCapPct || 0.25; // Max 25% of company by default
    this.rumorSensitivity = config.rumorSensitivity || 0.3;
    this.trendSensitivity = config.trendSensitivity || 0.4;
    
    // IPO-specific behavior
    this.ipoBidCount = config.ipoBidCount || 2; // 1-3 bids per company
    this.ipoPriceRange = config.ipoPriceRange || [1.00, 3.00];
    
    // Trading behavior
    this.tradingFrequency = config.tradingFrequency || 0.1; // 10% chance per tick
    this.liquidityMaintenance = config.liquidityMaintenance || false;
  }

  /**
   * Calculate IPO bid for a specific company
   */
  calculateIPOBid(company, weekNo, availableCash) {
    const bids = [];
    const bidCount = Math.max(1, this.ipoBidCount + (weekNo % 3) - 1); // 1-3 bids with week variability
    
    for (let i = 0; i < bidCount; i++) {
      const priceVariation = (Math.random() - 0.5) * 0.4; // ±20% variation
      const basePrice = this.ipoPriceRange[0] + (this.ipoPriceRange[1] - this.ipoPriceRange[0]) * this.aggressiveness;
      const bidPrice = Math.max(this.minPrice, Math.min(this.maxPrice, basePrice + priceVariation));
      
      // Calculate quantity based on budget and ownership cap
      const maxSharesByBudget = Math.floor(availableCash / bidPrice);
      const maxSharesByCap = Math.floor((company.shares * this.ownershipCapPct) / bidCount);
      const maxShares = Math.min(maxSharesByBudget, maxSharesByCap);
      
      if (maxShares >= this.minQty) {
        const quantity = Math.floor(maxShares * (0.7 + Math.random() * 0.3)); // 70-100% of max
        const cost = quantity * bidPrice;
        
        if (cost <= availableCash) {
          bids.push({
            price: Math.round(bidPrice * 4) / 4, // Round to nearest quarter
            shares: quantity,
            cost: cost
          });
        }
      }
    }
    
    return bids;
  }

  /**
   * Calculate trading order based on market conditions
   */
  calculateTradingOrder(company, currentPrice, trend, rumors, availableCash, currentShares) {
    if (Math.random() > this.tradingFrequency) {
      return null; // No trade this tick
    }
    
    const trendInfluence = trend * this.trendSensitivity;
    const rumorInfluence = rumors * this.rumorSensitivity;
    const combinedSignal = trendInfluence + rumorInfluence;
    
    let orderType = 'hold';
    let price = currentPrice;
    let quantity = 0;
    
    if (combinedSignal > 0.3) {
      // Bullish signal - consider buying
      orderType = 'buy';
      price = currentPrice * (1 + Math.random() * 0.05); // Slight premium
      const maxShares = Math.floor(availableCash / price);
      quantity = Math.min(this.maxQty, Math.floor(maxShares * this.aggressiveness));
    } else if (combinedSignal < -0.3 && currentShares > 0) {
      // Bearish signal - consider selling
      orderType = 'sell';
      price = currentPrice * (1 - Math.random() * 0.05); // Slight discount
      const maxShares = Math.floor(currentShares * this.aggressiveness);
      quantity = Math.min(this.maxQty, maxShares);
    } else if (this.liquidityMaintenance && currentPrice < 1.10 && availableCash > 100) {
      // Scavenger behavior - maintain liquidity near $1.00
      orderType = 'buy';
      price = 1.00 + Math.random() * 0.10;
      quantity = Math.min(100, Math.floor(availableCash / price));
    }
    
    if (quantity >= this.minQty && price >= this.minPrice && price <= this.maxPrice) {
      return {
        type: orderType,
        price: price,
        shares: quantity,
        reason: this.liquidityMaintenance ? 'liquidity' : (combinedSignal > 0 ? 'bullish' : 'bearish')
      };
    }
    
    return null;
  }

  /**
   * Check if bot can make a trade without exceeding caps
   */
  canTrade(company, orderType, shares, currentShares, totalShares) {
    if (orderType === 'buy') {
      const newOwnership = (currentShares + shares) / totalShares;
      return newOwnership <= this.ownershipCapPct;
    }
    return true; // Selling is always allowed
  }
}

/**
 * Predefined bot profiles for different archetypes
 */
const BotProfiles = {
  // Aggressive growth investors
  aggressive: new BotProfile('aggressive', {
    aggressiveness: 0.8,
    minPrice: 1.50,
    maxPrice: 4.00,
    ownershipCapPct: 0.20,
    ipoBidCount: 3,
    ipoPriceRange: [2.00, 3.50],
    tradingFrequency: 0.15,
    trendSensitivity: 0.6
  }),

  // Conservative value investors
  conservative: new BotProfile('conservative', {
    aggressiveness: 0.3,
    minPrice: 0.75,
    maxPrice: 2.50,
    ownershipCapPct: 0.15,
    ipoBidCount: 2,
    ipoPriceRange: [1.00, 2.00],
    tradingFrequency: 0.05,
    trendSensitivity: 0.2
  }),

  // CEO-focused concentrated investors
  ceo: new BotProfile('ceo', {
    aggressiveness: 0.9,
    minPrice: 2.00,
    maxPrice: 5.00,
    ownershipCapPct: 0.35, // Can own up to 35% to become CEO
    ipoBidCount: 2,
    ipoPriceRange: [2.50, 4.00],
    tradingFrequency: 0.1,
    trendSensitivity: 0.4
  }),

  // Scavenger bots for liquidity
  scavenger: new BotProfile('scavenger', {
    aggressiveness: 0.9,
    minPrice: 0.90,
    maxPrice: 1.25,
    ownershipCapPct: 0.34, // Never exceed 34% to avoid CEO
    ipoBidCount: 1,
    ipoPriceRange: [1.00, 1.20],
    tradingFrequency: 0.2,
    liquidityMaintenance: true,
    trendSensitivity: 0.1
  }),

  // Balanced diversified investors
  balanced: new BotProfile('balanced', {
    aggressiveness: 0.5,
    minPrice: 1.00,
    maxPrice: 3.00,
    ownershipCapPct: 0.25,
    ipoBidCount: 2,
    ipoPriceRange: [1.25, 2.50],
    tradingFrequency: 0.08,
    trendSensitivity: 0.4
  }),

  // Momentum traders
  momentum: new BotProfile('momentum', {
    aggressiveness: 0.7,
    minPrice: 1.25,
    maxPrice: 4.50,
    ownershipCapPct: 0.18,
    ipoBidCount: 2,
    ipoPriceRange: [1.50, 3.00],
    tradingFrequency: 0.12,
    trendSensitivity: 0.8,
    rumorSensitivity: 0.6
  })
};

module.exports = { BotProfile, BotProfiles };




