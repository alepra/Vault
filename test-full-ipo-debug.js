const GameStateModule = require('./server/modules/gameStateModule');
const IPOModule = require('./server/modules/ipoModule');
const LedgerModule = require('./server/modules/ledgerModule');
const BotNameModule = require('./server/modules/botNameModule');

console.log('🔍 Testing FULL IPO process to find cash corruption...\n');

// Create modules
const gameState = new GameStateModule();
const currentGame = gameState.getGameState(); // Get the actual game state object

// Create mock IO object
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock IO emit: ${event} with data`);
  },
  to: (sessionId) => ({
    emit: (event, data) => {
      console.log(`📡 Mock IO to(${sessionId}) emit: ${event} with data`);
    }
  })
};

// Add participants first
const human = gameState.addParticipant('Debug Human', true);
const bot1 = gameState.addParticipant('Test Bot 1', false);
const bot2 = gameState.addParticipant('Test Bot 2', false);

// Now create IPO module with the updated game state
const updatedGame = gameState.getGameState();
console.log(`\n🔍 Game state participants: ${updatedGame.participants.length}`);
updatedGame.participants.forEach(p => console.log(`  - ${p.name} (${p.id})`));

const ipo = new IPOModule(updatedGame, mockIO, 'test_session');
const ledger = ipo.ledger; // Get the ledger from IPO module

console.log('👥 Participants added:');
console.log(`Human: ${human.id} - ${human.name}`);
console.log(`Bot 1: ${bot1.id} - ${bot1.name}`);
console.log(`Bot 2: ${bot2.id} - ${bot2.name}`);

// Initialize ledgers
ledger.initializeParticipant(human.id, human.name, true, 1000);
ledger.initializeParticipant(bot1.id, bot1.name, false, 1000);
ledger.initializeParticipant(bot2.id, bot2.name, false, 1000);

console.log('\n📊 Initial ledger state:');
let humanLedger = ledger.ledgers.get(human.id);
console.log(`Human cash: $${humanLedger.cash}, net worth: $${humanLedger.totalNetWorth}`);

// Start IPO
console.log('\n🚀 Starting IPO...');
ipo.startIPO();

  // Process human bids
  console.log('\n💰 Processing human bids...');
  ipo.processHumanBids(human.id, [
    { companyId: 'company_1', shares: 100, maxPrice: 2.00 },
    { companyId: 'company_2', shares: 150, maxPrice: 1.50 }
  ]);

  // Process AI bids (this will handle all companies and scavenger bots)
  console.log('\n🤖 Processing AI bids...');
  ipo.processAIBids();

console.log('\n📊 Ledger state after bidding:');
humanLedger = ledger.ledgers.get(human.id);
console.log(`Human cash: $${humanLedger.cash}, net worth: $${humanLedger.totalNetWorth}`);

// Complete IPO
console.log('\n🎉 Completing IPO...');
ipo.completeIPO();

console.log('\n📊 Final ledger state:');
humanLedger = ledger.ledgers.get(human.id);
console.log(`Human cash: $${humanLedger.cash}, net worth: $${humanLedger.totalNetWorth}`);

// Show stock positions
console.log('\n📈 Human stock positions:');
for (const [companyId, positions] of humanLedger.stockPositions) {
  for (const lot of positions) {
    console.log(`  ${companyId}: ${lot.shares} shares at $${lot.pricePerShare} = $${(lot.shares * lot.pricePerShare).toFixed(2)}`);
  }
}

// Show companies
console.log('\n🏢 Company IPO prices:');
const companies = gameState.getGameState().companies;
companies.forEach(company => {
  console.log(`  ${company.name}: $${company.ipoPrice} (${company.totalSharesAllocated}/${company.totalShares} shares sold)`);
});

console.log('\n✅ Full IPO test complete');
