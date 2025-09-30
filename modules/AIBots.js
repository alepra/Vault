/**
 * Clean Architecture - AI Bot Personalities Module
 * 15 different bot personality types with unique trading strategies
 */

class AIBots {
  constructor() {
    this.personalityTypes = {
      'aggressive': {
        name: 'Aggressive Bot',
        bidStrategy: 'high',
        riskTolerance: 0.9,
        concentration: 0.3,
        bidMultiplier: 1.2,
        tradingFrequency: 0.8,
        description: 'High risk, likely to collude, aggressive bidding'
      },
      'conservative': {
        name: 'Conservative Bot',
        bidStrategy: 'low',
        riskTolerance: 0.2,
        concentration: 0.7,
        bidMultiplier: 0.8,
        tradingFrequency: 0.3,
        description: 'Low risk, strategic collusion for CEO positions'
      },
      'concentrated': {
        name: 'Concentrated Bot',
        bidStrategy: 'ceo',
        riskTolerance: 0.6,
        concentration: 0.9,
        bidMultiplier: 1.1,
        tradingFrequency: 0.6,
        description: 'Focus on 1-2 companies for controlling interest'
      },
      'diversified': {
        name: 'Diversified Bot',
        bidStrategy: 'medium',
        riskTolerance: 0.5,
        concentration: 0.3,
        bidMultiplier: 0.9,
        tradingFrequency: 0.7,
        description: 'Spread investments across multiple companies'
      },
      'value': {
        name: 'Value Bot',
        bidStrategy: 'low',
        riskTolerance: 0.4,
        concentration: 0.6,
        bidMultiplier: 0.85,
        tradingFrequency: 0.4,
        description: 'Look for undervalued companies'
      },
      'growth': {
        name: 'Growth Bot',
        bidStrategy: 'high',
        riskTolerance: 0.7,
        concentration: 0.5,
        bidMultiplier: 1.1,
        tradingFrequency: 0.8,
        description: 'Prioritize companies with growth potential'
      },
      'momentum': {
        name: 'Momentum Bot',
        bidStrategy: 'high',
        riskTolerance: 0.8,
        concentration: 0.4,
        bidMultiplier: 1.15,
        tradingFrequency: 0.9,
        description: 'Follow market trends aggressively'
      },
      'contrarian': {
        name: 'Contrarian Bot',
        bidStrategy: 'low',
        riskTolerance: 0.6,
        concentration: 0.5,
        bidMultiplier: 0.9,
        tradingFrequency: 0.5,
        description: 'Go against market sentiment'
      },
      'quality': {
        name: 'Quality Bot',
        bidStrategy: 'medium',
        riskTolerance: 0.5,
        concentration: 0.6,
        bidMultiplier: 1.0,
        tradingFrequency: 0.6,
        description: 'Prioritize high-quality companies'
      },
      'price-sensitive': {
        name: 'Bargain Bot',
        bidStrategy: 'scavenger',
        riskTolerance: 0.3,
        concentration: 0.8,
        bidMultiplier: 0.7,
        tradingFrequency: 0.8,
        description: 'Focus on low-cost opportunities'
      },
      'marketing': {
        name: 'Marketing Bot',
        bidStrategy: 'medium',
        riskTolerance: 0.6,
        concentration: 0.4,
        bidMultiplier: 1.05,
        tradingFrequency: 0.7,
        description: 'Value companies with strong marketing'
      },
      'risk-averse': {
        name: 'Safe Bet Bot',
        bidStrategy: 'low',
        riskTolerance: 0.1,
        concentration: 0.8,
        bidMultiplier: 0.75,
        tradingFrequency: 0.2,
        description: 'Conservative investment strategies'
      },
      'opportunistic': {
        name: 'Opportunist Bot',
        bidStrategy: 'medium',
        riskTolerance: 0.7,
        concentration: 0.5,
        bidMultiplier: 1.0,
        tradingFrequency: 0.8,
        description: 'Adapt strategies based on market conditions'
      },
      'scavenger': {
        name: 'Scavenger Bot',
        bidStrategy: 'scavenger',
        riskTolerance: 0.9,
        concentration: 1.0,
        bidMultiplier: 0.4,
        tradingFrequency: 0.9,
        description: 'Always bid on ALL companies for liquidity'
      },
      'long-term': {
        name: 'Long Term Bot',
        bidStrategy: 'medium',
        riskTolerance: 0.4,
        concentration: 0.7,
        bidMultiplier: 0.95,
        tradingFrequency: 0.3,
        description: 'Hold positions for extended periods'
      }
    };
  }

  /**
   * Generate a random bot with personality
   */
  generateRandomBot() {
    const personalityKeys = Object.keys(this.personalityTypes);
    const randomPersonality = personalityKeys[Math.floor(Math.random() * personalityKeys.length)];
    const personality = this.personalityTypes[randomPersonality];
    
    return {
      name: personality.name,
      isHuman: false,
      personality: {
        ...personality,
        bidStrategy: personality.bidStrategy,
        riskTolerance: personality.riskTolerance + (Math.random() - 0.5) * 0.2, // Add some variation
        concentration: personality.concentration + (Math.random() - 0.5) * 0.2,
        bidMultiplier: personality.bidMultiplier + (Math.random() - 0.5) * 0.1,
        tradingFrequency: personality.tradingFrequency + (Math.random() - 0.5) * 0.2
      }
    };
  }

  /**
   * Generate a specific bot type
   */
  generateBotOfType(type) {
    if (!this.personalityTypes[type]) {
      console.warn(`Unknown bot type: ${type}, using random`);
      return this.generateRandomBot();
    }
    
    const personality = this.personalityTypes[type];
    
    return {
      name: personality.name,
      isHuman: false,
      personality: {
        ...personality,
        bidStrategy: personality.bidStrategy,
        riskTolerance: personality.riskTolerance + (Math.random() - 0.5) * 0.2,
        concentration: personality.concentration + (Math.random() - 0.5) * 0.2,
        bidMultiplier: personality.bidMultiplier + (Math.random() - 0.5) * 0.1,
        tradingFrequency: personality.tradingFrequency + (Math.random() - 0.5) * 0.2
      }
    };
  }

  /**
   * Generate multiple bots for a game
   */
  generateBotsForGame(count = 8) {
    const bots = [];
    const personalityKeys = Object.keys(this.personalityTypes);
    
    // Ensure we have at least 2 scavenger bots for liquidity
    bots.push(this.generateBotOfType('scavenger'));
    bots.push(this.generateBotOfType('scavenger'));
    
    // Fill the rest with random personalities
    for (let i = 2; i < count; i++) {
      bots.push(this.generateRandomBot());
    }
    
    return bots;
  }

  /**
   * Get bot display name with personality
   */
  getBotDisplayName(bot) {
    if (bot.isHuman) {
      return bot.name;
    }
    
    const personality = bot.personality;
    if (personality && personality.name) {
      return personality.name;
    }
    
    return 'Unknown Bot';
  }

  /**
   * Get CEO display name with company
   */
  getCEODisplayName(bot, companyName) {
    const displayName = this.getBotDisplayName(bot);
    return `${displayName} CEO of ${companyName}`;
  }

  /**
   * Get all personality types for reference
   */
  getPersonalityTypes() {
    return this.personalityTypes;
  }

  /**
   * Get personality description
   */
  getPersonalityDescription(type) {
    return this.personalityTypes[type]?.description || 'Unknown personality';
  }

  /**
   * Create a bot with specific characteristics
   */
  createCustomBot(name, personalityType, customTraits = {}) {
    const basePersonality = this.personalityTypes[personalityType] || this.personalityTypes['diversified'];
    
    return {
      name: name || basePersonality.name,
      isHuman: false,
      personality: {
        ...basePersonality,
        ...customTraits,
        bidStrategy: customTraits.bidStrategy || basePersonality.bidStrategy,
        riskTolerance: customTraits.riskTolerance || basePersonality.riskTolerance,
        concentration: customTraits.concentration || basePersonality.concentration,
        bidMultiplier: customTraits.bidMultiplier || basePersonality.bidMultiplier,
        tradingFrequency: customTraits.tradingFrequency || basePersonality.tradingFrequency
      }
    };
  }
}

module.exports = AIBots;
