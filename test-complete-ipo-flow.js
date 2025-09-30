/**
 * Complete IPO Flow Test
 * Tests the full IPO process with ledger system integration
 */

const IPOModule = require('./server/modules/ipoModule');

console.log('🧪 Testing Complete IPO Flow with Ledger System...\n');

// Create a proper game state starting from lobby
const gameState = {
  id: 'test-game',
  phase: 'lobby',
  turn: 0,
  maxTurns: 100,
  turnLength: 30,
  companies: [
    {
      id: 'company1',
      name: 'Lemonade Stand A',
      shares: 1000,
      totalSharesAllocated: 0,
      bidPrices: []
    },
    {
      id: 'company2', 
      name: 'Lemonade Stand B',
      shares: 1000,
      totalSharesAllocated: 0,
      bidPrices: []
    }
  ],
  participants: [
    {
      id: 'human1',
      name: 'Test Player',
      isHuman: true,
      capital: 1000,
      remainingCapital: 1000,
      shares: {},
      personality: null
    },
    {
      id: 'bot1',
      name: 'Conservative Bot',
      isHuman: false,
      capital: 1000,
      remainingCapital: 1000,
      shares: {},
      personality: {
        bidStrategy: 'conservative',
        riskTolerance: 0.3,
        concentration: 0.5
      }
    },
    {
      id: 'bot2',
      name: 'Aggressive Bot',
      isHuman: false,
      capital: 1000,
      remainingCapital: 1000,
      shares: {},
      personality: {
        bidStrategy: 'aggressive',
        riskTolerance: 0.8,
        concentration: 0.7
      }
    }
  ]
};

// Mock IO object
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock IO: Emitting ${event}`);
    if (event === 'gameStateUpdate') {
      console.log('📊 Game State Update:');
      console.log(`  Phase: ${data.phase}`);
      console.log(`  Participants: ${data.participants.length}`);
      data.participants.forEach(p => {
        const shares = p.shares ? Object.values(p.shares).reduce((sum, s) => sum + s, 0) : 0;
        console.log(`    ${p.name}: $${p.remainingCapital.toFixed(2)} cash, ${shares} shares`);
      });
    }
  },
  to: (sessionId) => ({
    emit: (event, data) => {
      console.log(`📡 Mock IO: Emitting ${event} to session ${sessionId}`);
    }
  })
};

// Create IPO module
const ipoModule = new IPOModule(gameState, mockIO, 'test-session');

console.log('Test 1: Starting IPO phase...');
const startResult = ipoModule.startIPO();
console.log(`IPO start: ${startResult ? 'SUCCESS' : 'FAILED'}\n`);

console.log('Test 2: Processing human bids...');
const humanBids = [
  { companyId: 'company1', shares: 200, price: 2.50 },
  { companyId: 'company2', shares: 150, price: 2.25 }
];

const humanResult = ipoModule.processHumanBids(humanBids, 'human1');
console.log(`Human bids processed: ${humanResult ? 'SUCCESS' : 'FAILED'}\n`);

console.log('Test 3: Processing AI bids...');
setTimeout(() => {
  ipoModule.processAIBids();
  
  console.log('\nTest 4: Checking final results...');
  
  // Check human participant
  const human = gameState.participants.find(p => p.id === 'human1');
  console.log(`Human Player:`);
  console.log(`  Cash: $${human.remainingCapital.toFixed(2)}`);
  console.log(`  Shares: ${JSON.stringify(human.shares)}`);
  console.log(`  Total Spent: $${(human.totalSpent || 0).toFixed(2)}`);
  
  // Check companies
  gameState.companies.forEach(company => {
    console.log(`${company.name}:`);
    console.log(`  IPO Price: $${(company.ipoPrice || 0).toFixed(2)}`);
    console.log(`  Shares Allocated: ${company.totalSharesAllocated}`);
  });
  
  // Check ledger data
  const ledgerData = ipoModule.getLedgerData();
  console.log('\nLedger Data:');
  ledgerData.forEach(ledger => {
    console.log(`${ledger.participantName}:`);
    console.log(`  Cash: $${ledger.cash.toFixed(2)}`);
    console.log(`  Stock Value: $${ledger.totalStockValue.toFixed(2)}`);
    console.log(`  Net Worth: $${ledger.totalNetWorth.toFixed(2)}`);
    console.log(`  P&L: $${ledger.totalProfitLoss.toFixed(2)}`);
  });
  
  console.log('\n✅ Complete IPO flow test finished!');
}, 2000);
