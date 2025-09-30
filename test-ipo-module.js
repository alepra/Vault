/**
 * IPO Module Isolation Test
 * This script tests the IPO module in isolation to identify the exact problem
 */

const IPOModule = require('./server/modules/ipoModule.js');

// Mock game state
const mockGameState = {
    id: 'test-game',
    phase: 'ipo',
    turn: 0,
    maxTurns: 100,
    turnLength: 30,
    companies: [
        {
            id: 'company1',
            name: 'Lemonade Stand A',
            shares: 100,
            ipoPrice: 2.00,
            currentPrice: 2.00,
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
            totalSpent: 0,
            shares: {}
        }
    ]
};

// Mock Socket.io
const mockIO = {
    to: (sessionId) => ({
        emit: (event, data) => {
            console.log(`📡 Mock IO: Emitting ${event} to session ${sessionId}`);
            console.log('📡 Data:', JSON.stringify(data, null, 2));
        }
    })
};

console.log('🧪 Starting IPO Module Isolation Test...\n');

// Test 1: Create IPO module
console.log('Test 1: Creating IPO module...');
const ipoModule = new IPOModule(mockGameState, mockIO, 'test-session');
console.log('✅ IPO module created successfully\n');

// Test 2: Process human bids
console.log('Test 2: Processing human bids...');
const humanBids = [
    {
        companyId: 'company1',
        shares: 50,
        price: 2.50
    }
];

console.log('📝 Submitting human bids:', humanBids);
ipoModule.processHumanBids(humanBids, 'human1')
    .then(result => {
        console.log('✅ Human bids processed:', result);
        console.log('📊 Game state after human bids:');
        console.log('   - Phase:', mockGameState.phase);
        console.log('   - Human capital:', mockGameState.participants[0].remainingCapital);
        console.log('   - Human shares:', mockGameState.participants[0].shares);
        console.log('   - Company allocated shares:', mockGameState.companies[0].totalSharesAllocated);
        console.log('   - Company bid prices:', mockGameState.companies[0].bidPrices);
    })
    .catch(error => {
        console.error('❌ Error processing human bids:', error);
    });

// Test 3: Wait for AI bids processing (simulate the 5-second delay)
console.log('\nTest 3: Waiting for AI bids processing...');
setTimeout(() => {
    console.log('⏰ 5 seconds elapsed - checking if AI bids were processed...');
    console.log('📊 Final game state:');
    console.log('   - Phase:', mockGameState.phase);
    console.log('   - Is processing:', ipoModule.isProcessing);
    
    // Manually check if completeIPO was called
    if (mockGameState.phase === 'newspaper') {
        console.log('✅ IPO completed successfully - phase changed to newspaper');
    } else {
        console.log('❌ IPO not completed - phase still:', mockGameState.phase);
        console.log('🔍 Debugging IPO module state:');
        console.log('   - isProcessing:', ipoModule.isProcessing);
        console.log('   - sessionId:', ipoModule.sessionId);
    }
}, 6000);

console.log('\n⏳ Test running... Check results in 6 seconds...');

