/**
 * STANDALONE DUTCH AUCTION TEST
 * This isolates the Dutch auction logic to debug the money flow issue
 */

console.log('🍋 STANDALONE DUTCH AUCTION TEST STARTING...\n');

// Import the IPO module directly
const IPOModule = require('./server/modules/ipoModule');
const GameStateModule = require('./server/modules/gameStateModule');

// Create a mock game state
const mockGameState = new GameStateModule();
mockGameState.phase = 'lobby';
mockGameState.participants = [
  {
    id: 'human_1',
    name: 'Human Player',
    isHuman: true,
    capital: 1000,
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {}
  },
  {
    id: 'bot_1',
    name: 'Aggressive Bot',
    isHuman: false,
    capital: 1000,
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {},
    personality: {
      bidStrategy: 'high',
      riskTolerance: 0.8,
      concentration: 0.75
    }
  },
  {
    id: 'bot_2',
    name: 'Conservative Bot',
    isHuman: false,
    capital: 1000,
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {},
    personality: {
      bidStrategy: 'low',
      riskTolerance: 0.3,
      concentration: 0.5
    }
  }
];

// Create IPO module
const ipoModule = new IPOModule(mockGameState, null, 'test_session');

console.log('🔍 BEFORE IPO - All participants:');
mockGameState.participants.forEach(p => {
  console.log(`  ${p.name}: $${p.remainingCapital} cash, ${Object.keys(p.shares).length} companies, totalSpent: $${p.totalSpent}`);
});

// Start IPO
console.log('\n🎯 STARTING IPO...');
ipoModule.startIPO();

// Simulate some bids
console.log('\n📝 SIMULATING BIDS...');

// Human bid
const humanBid = {
  companyId: 'company_1',
  price: 2.50,
  shares: 200,
  amount: 500
};
console.log(`Human bidding: ${humanBid.shares} shares at $${humanBid.price} = $${humanBid.amount}`);

// Bot bids
const bot1Bid = {
  companyId: 'company_1',
  price: 2.75,
  shares: 300,
  amount: 825
};
console.log(`Bot 1 bidding: ${bot1Bid.shares} shares at $${bot1Bid.price} = $${bot1Bid.amount}`);

const bot2Bid = {
  companyId: 'company_1',
  price: 2.25,
  shares: 500,
  amount: 1125
};
console.log(`Bot 2 bidding: ${bot2Bid.shares} shares at $${bot2Bid.price} = $${bot2Bid.amount}`);

// Process the bids
console.log('\n🔄 PROCESSING BIDS...');
ipoModule.processHumanBid('human_1', [humanBid]);
ipoModule.processAIBids();

// Wait a moment for processing
setTimeout(() => {
  console.log('\n🔍 AFTER IPO - All participants:');
  mockGameState.participants.forEach(p => {
    const totalWorth = p.remainingCapital + p.totalSpent;
    console.log(`  ${p.name}: $${p.remainingCapital.toFixed(2)} cash, $${p.totalSpent.toFixed(2)} spent, $${totalWorth.toFixed(2)} total worth`);
    
    // Show share holdings
    Object.keys(p.shares).forEach(companyId => {
      const shares = p.shares[companyId];
      if (shares > 0) {
        console.log(`    ${companyId}: ${shares} shares`);
      }
    });
    
    // Check for money conservation
    if (Math.abs(totalWorth - 1000) > 0.01) {
      console.log(`    ⚠️  WARNING: Net worth should be $1000, but is $${totalWorth.toFixed(2)}`);
    }
  });
  
  console.log('\n✅ DUTCH AUCTION TEST COMPLETE');
}, 2000);

