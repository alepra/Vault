/**
 * Test to reproduce the real IPO issues:
 * 1. Shares not all being sold
 * 2. Net worth calculations wrong
 * 3. Bot names not displaying properly
 */

const IPOModule = require('./server/modules/ipoModule');
const LedgerModule = require('./server/modules/ledgerModule');
const BotNameModule = require('./server/modules/botNameModule');

// Mock IO object
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock IO: Emitting ${event}`);
    if (event === 'gameStateUpdate') {
      console.log('📊 Game State Update:');
      console.log(`  Phase: ${data.phase}`);
      console.log(`  Participants: ${data.participants.length}`);
      data.participants.forEach(p => {
        console.log(`    ${p.name}: $${p.remainingCapital.toFixed(2)} cash, ${Object.keys(p.shares || {}).length} companies`);
      });
    }
  }
};

// Create game state similar to real game
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
      ipoPrice: 0,
      currentPrice: 0,
      totalSharesAllocated: 0,
      bidPrices: [],
      finalPrice: 0
    },
    {
      id: 'company2', 
      name: 'Lemonade Stand B',
      shares: 1000,
      ipoPrice: 0,
      currentPrice: 0,
      totalSharesAllocated: 0,
      bidPrices: [],
      finalPrice: 0
    },
    {
      id: 'company3',
      name: 'Lemonade Stand C', 
      shares: 1000,
      ipoPrice: 0,
      currentPrice: 0,
      totalSharesAllocated: 0,
      bidPrices: [],
      finalPrice: 0
    },
    {
      id: 'company4',
      name: 'Lemonade Stand D',
      shares: 1000,
      ipoPrice: 0,
      currentPrice: 0,
      totalSharesAllocated: 0,
      bidPrices: [],
      finalPrice: 0
    }
  ],
  participants: [
    {
      id: 'human1',
      name: 'Test Player',
      isHuman: true,
      capital: 1000,
      remainingCapital: 1000,
      totalSpent: 0,
      shares: {},
      originalCapital: 1000
    }
  ]
};

async function testRealIPOIssues() {
  console.log('🧪 Testing Real IPO Issues...\n');

  // Create IPO module
  const ipoModule = new IPOModule(gameState, mockIO, 'test-session');
  
  // Start IPO phase
  console.log('Test 1: Starting IPO phase...');
  ipoModule.startIPO();
  
  // Add some AI bots with different personalities
  console.log('\nTest 2: Adding AI bots with personalities...');
  const botPersonalities = [
    { bidStrategy: 'aggressive', riskTolerance: 0.8, concentration: 0.6 },
    { bidStrategy: 'conservative', riskTolerance: 0.3, concentration: 0.4 },
    { bidStrategy: 'momentum', riskTolerance: 0.7, concentration: 0.5 },
    { bidStrategy: 'value', riskTolerance: 0.5, concentration: 0.7 },
    { bidStrategy: 'growth', riskTolerance: 0.6, concentration: 0.8 },
    { bidStrategy: 'diversified', riskTolerance: 0.4, concentration: 0.3 },
    { bidStrategy: 'scavenger', riskTolerance: 0.9, concentration: 1.0 },
    { bidStrategy: 'scavenger', riskTolerance: 0.9, concentration: 1.0 },
    { bidStrategy: 'scavenger', riskTolerance: 0.9, concentration: 1.0 }
  ];
  
  botPersonalities.forEach((personality, index) => {
    const bot = {
      id: `bot${index + 1}`,
      name: `Bot ${index + 1}`, // This should be updated by bot name module
      isHuman: false,
      capital: 1000,
      remainingCapital: 1000,
      totalSpent: 0,
      shares: {},
      personality: personality
    };
    
    // Update bot name using bot name module
    ipoModule.botNames.updateBotName(bot);
    gameState.participants.push(bot);
    
    console.log(`  Added: ${bot.name} (${personality.bidStrategy})`);
  });
  
  console.log(`\nTotal participants: ${gameState.participants.length}`);
  
  // Process human bids
  console.log('\nTest 3: Processing human bids...');
  const humanBids = [
    { companyId: 'company1', shares: 200, price: 2.5 },
    { companyId: 'company2', shares: 150, price: 2.25 },
    { companyId: 'company3', shares: 100, price: 2.0 }
  ];
  
  await ipoModule.processHumanBids(humanBids, 'human1');
  
  // Process AI bids (this will automatically complete the IPO)
  console.log('\nTest 4: Processing AI bids...');
  await ipoModule.processAIBids();
  
  // Check final results
  console.log('\nTest 6: Checking final results...');
  console.log('\n📊 Company Share Allocation:');
  gameState.companies.forEach(company => {
    const allocated = company.totalSharesAllocated || 0;
    const remaining = company.shares - allocated;
    console.log(`  ${company.name}: ${allocated}/${company.shares} shares (${remaining} remaining)`);
    if (remaining > 0) {
      console.log(`    ❌ PROBLEM: ${remaining} shares unsold!`);
    } else {
      console.log(`    ✅ All shares sold!`);
    }
  });
  
  console.log('\n📊 Participant Net Worth:');
  const ledgerData = ipoModule.getLedgerData();
  ledgerData.forEach(ledger => {
    const netWorth = ledger.cash + ledger.totalStockValue;
    const expectedNetWorth = 1000;
    const isCorrect = Math.abs(netWorth - expectedNetWorth) < 0.01;
    console.log(`  ${ledger.participantName}:`);
    console.log(`    Cash: $${ledger.cash.toFixed(2)}`);
    console.log(`    Stock Value: $${ledger.totalStockValue.toFixed(2)}`);
    console.log(`    Net Worth: $${netWorth.toFixed(2)} ${isCorrect ? '✅' : '❌'}`);
    if (!isCorrect) {
      console.log(`    ❌ PROBLEM: Expected $${expectedNetWorth}, got $${netWorth.toFixed(2)}`);
    }
  });
  
  console.log('\n📊 Bot Names:');
  gameState.participants.forEach(participant => {
    if (!participant.isHuman) {
      console.log(`  ${participant.name} (${participant.personality.bidStrategy})`);
    }
  });
  
  console.log('\n✅ Test completed!');
}

// Run the test
testRealIPOIssues().catch(console.error);
