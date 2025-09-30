/**
 * Bot Manager - Handles AI bot behavior and strategies
 */

class BotManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.botNames = [
      'Alex', 'Blake', 'Casey', 'Drew', 'Emery', 'Finley', 'Gray', 'Hayden',
      'Indigo', 'Jordan', 'Kai', 'Lane', 'Morgan', 'Nova', 'Ocean', 'Parker',
      'Quinn', 'River', 'Sage', 'Taylor', 'Unity', 'Vale', 'Winter', 'Xander'
    ];
    this.strategies = ['conservative', 'aggressive', 'momentum'];
  }

  // Create AI bots with scavenger bots for IPO liquidity
  createBots(count = 8) {
    const bots = [];
    
    // Create regular strategy bots (70% of total)
    const regularCount = Math.floor(count * 0.7);
    for (let i = 0; i < regularCount; i++) {
      const name = this.botNames[i % this.botNames.length];
      const strategy = this.strategies[i % this.strategies.length];
      
      const botId = this.gameEngine.addParticipant({
        name: `${name} (${strategy})`,
        isBot: true,
        botStrategy: strategy,
        cash: 1000
      });

      bots.push({
        id: botId,
        name: `${name} (${strategy})`,
        strategy
      });
    }

    // Create scavenger bots (30% of total) for IPO liquidity
    const scavengerCount = count - regularCount;
    for (let i = 0; i < scavengerCount; i++) {
      const name = this.botNames[(regularCount + i) % this.botNames.length];
      
      const botId = this.gameEngine.addParticipant({
        name: `Scavenger ${i + 1}`,
        isBot: true,
        botStrategy: 'scavenger',
        cash: 1000
      });

      bots.push({
        id: botId,
        name: `Scavenger ${i + 1}`,
        strategy: 'scavenger'
      });
    }

    console.log(`🤖 Created ${bots.length} AI bots (${regularCount} regular, ${scavengerCount} scavenger)`);
    return bots;
  }

  // Make trading decisions for bots
  makeTradingDecisions() {
    const decisions = [];

    for (const [participantId, participant] of this.gameEngine.state.participants) {
      if (participant.isBot && this.gameEngine.state.phase === 'trading') {
        const decision = this.makeBotDecision(participant);
        if (decision) {
          decisions.push(decision);
        }
      }
    }

    return decisions;
  }

  // Make decision for a single bot
  makeBotDecision(participant) {
    const companies = Array.from(this.gameEngine.state.companies.values());
    const company = companies[Math.floor(Math.random() * companies.length)];
    
    if (!company) return null;

    const strategy = participant.botStrategy;
    const currentShares = participant.shares?.get(company.id) || 0;
    const decision = Math.random();

    // 30% chance to trade
    if (decision > 0.7) return null;

    if (currentShares === 0) {
      // Bot has no shares, decide whether to buy
      return this.generateBuyDecision(participant, company, strategy);
    } else {
      // Bot has shares, decide whether to sell
      return this.generateSellDecision(participant, company, strategy);
    }
  }

  // Generate buy decision
  generateBuyDecision(participant, company, strategy) {
    const strategies = {
      conservative: {
        maxPriceMultiplier: 0.95,
        maxSharesPercent: 0.1,
        probability: 0.3
      },
      aggressive: {
        maxPriceMultiplier: 1.1,
        maxSharesPercent: 0.3,
        probability: 0.6
      },
      momentum: {
        maxPriceMultiplier: 1.05,
        maxSharesPercent: 0.2,
        probability: 0.4
      }
    };

    const config = strategies[strategy];
    if (Math.random() > config.probability) return null;

    const maxPrice = company.currentPrice * config.maxPriceMultiplier;
    const maxShares = Math.floor(participant.cash * config.maxSharesPercent / maxPrice);
    
    if (maxShares > 0) {
      const shares = Math.floor(maxShares * (0.5 + Math.random() * 0.5));
      return {
        participantId: participant.id,
        companyId: company.id,
        action: 'buy',
        shares,
        price: maxPrice
      };
    }

    return null;
  }

  // Generate sell decision
  generateSellDecision(participant, company, strategy) {
    const strategies = {
      conservative: {
        minPriceMultiplier: 1.05,
        sellPercent: 0.3,
        probability: 0.4
      },
      aggressive: {
        minPriceMultiplier: 0.95,
        sellPercent: 0.6,
        probability: 0.5
      },
      momentum: {
        minPriceMultiplier: 1.02,
        sellPercent: 0.4,
        probability: 0.3
      }
    };

    const config = strategies[strategy];
    if (Math.random() > config.probability) return null;

    const currentShares = participant.shares?.get(company.id) || 0;
    const sharesToSell = Math.floor(currentShares * config.sellPercent);
    
    if (sharesToSell > 0) {
      const minPrice = company.currentPrice * config.minPriceMultiplier;
      return {
        participantId: participant.id,
        companyId: company.id,
        action: 'sell',
        shares: sharesToSell,
        price: minPrice
      };
    }

    return null;
  }

  // Execute bot decisions
  executeBotDecisions(decisions, tradingManager) {
    for (const decision of decisions) {
      try {
        if (decision.action === 'buy') {
          tradingManager.placeBuyOrder(
            decision.participantId,
            decision.companyId,
            decision.shares,
            decision.price
          );
        } else if (decision.action === 'sell') {
          tradingManager.placeSellOrder(
            decision.participantId,
            decision.companyId,
            decision.shares,
            decision.price
          );
        }
      } catch (error) {
        console.error(`❌ Bot decision execution failed:`, error);
      }
    }
  }

  // Get bot statistics
  getBotStats() {
    const bots = Array.from(this.gameEngine.state.participants.values())
      .filter(p => p.isBot);

    const stats = {
      totalBots: bots.length,
      byStrategy: {},
      totalNetWorth: 0,
      avgNetWorth: 0
    };

    for (const bot of bots) {
      const strategy = bot.botStrategy;
      if (!stats.byStrategy[strategy]) {
        stats.byStrategy[strategy] = { count: 0, totalNetWorth: 0 };
      }
      
      stats.byStrategy[strategy].count++;
      stats.byStrategy[strategy].totalNetWorth += bot.netWorth;
      stats.totalNetWorth += bot.netWorth;
    }

    stats.avgNetWorth = stats.totalNetWorth / stats.totalBots;

    return stats;
  }
}

module.exports = BotManager;
