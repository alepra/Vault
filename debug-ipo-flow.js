/**
 * Direct IPO Flow Debug Test
 * Tests the exact same flow as the real game to identify the precise failure point
 */

const io = require('socket.io-client');

console.log('🔍 Direct IPO Flow Debug Test...\n');

const socket = io('http://localhost:3001', {
    timeout: 5000,
    forceNew: true
});

let sessionId = 'shared_game';

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Exact same flow as real game
    console.log('\n👤 Joining game...');
    socket.emit('joinGame', {
        name: 'Debug Player',
        sessionId: sessionId
    });
});

socket.on('participantUpdate', (participant) => {
    console.log('✅ Participant update received:', participant.name);
});

socket.on('gameStateUpdate', (gameState) => {
    console.log('📊 Game state update:', {
        id: gameState.id,
        phase: gameState.phase,
        timestamp: new Date().toISOString()
    });
});

// Start game after join
setTimeout(() => {
    console.log('\n🚀 Starting game...');
    socket.emit('startGame');
}, 1000);

// Submit IPO bids after game starts
setTimeout(() => {
    console.log('\n📝 Submitting IPO bids...');
    const bids = [{ companyId: 'company1', shares: 50, price: 2.50 }];
    socket.emit('submitIPOBids', { bids: bids });
}, 2000);

socket.on('ipoBidsReceived', (data) => {
    console.log('✅ IPO bids received:', data);
});

// Monitor for phase changes with timestamps
let phaseLog = [];
socket.on('gameStateUpdate', (gameState) => {
    if (gameState.phase) {
        phaseLog.push({
            timestamp: new Date().toISOString(),
            phase: gameState.phase
        });
    }
});

// Check results after enough time
setTimeout(() => {
    console.log('\n📊 Phase Change Log:');
    phaseLog.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.timestamp}: ${entry.phase}`);
    });
    
    const lastPhase = phaseLog[phaseLog.length - 1]?.phase;
    console.log(`\n🎯 Final Phase: ${lastPhase}`);
    
    if (lastPhase === 'newspaper') {
        console.log('✅ SUCCESS: IPO completed successfully');
    } else {
        console.log('❌ FAILURE: IPO did not complete');
        console.log('🔍 The IPO module\'s completeIPO() method was not called or did not emit the gameStateUpdate');
    }
    
    socket.disconnect();
    process.exit(0);
}, 10000); // Wait 10 seconds

console.log('⏳ Debug test running... Will complete in 10 seconds...');

