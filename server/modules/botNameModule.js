/**
 * Bot Name Module - Generates personality-based names for AI bots
 */

class BotNameModule {
  constructor() {
    this.personalityNames = {
      'aggressive': 'Aggressive Bot',
      'conservative': 'Conservative Bot', 
      'concentrated': 'Concentrated Bot',
      'diversified': 'Diversified Bot',
      'value': 'Value Bot',
      'growth': 'Growth Bot',
      'momentum': 'Momentum Bot',
      'short-term': 'Quick Trade Bot',
      'risk-averse': 'Safe Bet Bot',
      'opportunistic': 'Opportunist Bot',
      'quality': 'Quality Bot',
      'price-sensitive': 'Bargain Bot',
      'marketing': 'Marketing Bot',
      'scavenger': 'Scavenger Bot',
      'long-term': 'Long Term Bot',
      'contrarian': 'Contrarian Bot'
    };

    this.scavengerCounters = {
      'scavenger': 1
    };
  }

  /**
   * Generate a name for a bot based on its personality
   */
  generateBotName(personality) {
    if (!personality) {
      return 'Unknown Bot';
    }

    // Use the personality name directly if it exists
    if (personality.name) {
      return personality.name;
    }

    // Fallback to bidStrategy mapping for scavenger bots
    if (personality.bidStrategy === 'scavenger') {
      const count = this.scavengerCounters.scavenger++;
      return `Scavenger Bot #${count}`;
    }

    // Fallback to generic name
    return 'Generic Bot';
  }

  /**
   * Update participant name if it's a bot
   */
  updateBotName(participant) {
    if (!participant.isHuman && participant.personality) {
      participant.name = this.generateBotName(participant.personality);
    }
    return participant;
  }

  /**
   * Get CEO display name with company
   */
  getCEODisplayName(participant, companyName) {
    if (participant.isHuman) {
      return `${participant.name} CEO of ${companyName}`;
    } else {
      return `${participant.name} CEO of ${companyName}`;
    }
  }

  /**
   * Get all personality types for reference
   */
  getPersonalityTypes() {
    return Object.keys(this.personalityNames);
  }
}

module.exports = BotNameModule;
