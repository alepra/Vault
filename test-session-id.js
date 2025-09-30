/**
 * Session ID Test
 * Tests the exact session ID flow to identify the mismatch
 */

const io = require('socket.io-client');

console.log('🔍 Testing Session ID Flow...\n');

const socket = io('http://localhost:3001', {
    timeout: 5000,
    forceNew: true
});

let sessionId = 'shared_game'; // Same as client uses

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('🔗 Socket ID:', socket.id);
    
    // Test join game with session ID
    console.log('\n👤 Joining game with sessionId:', sessionId);
    socket.emit('joinGame', {
        name: 'Test Player',
        sessionId: sessionId
    });
});

socket.on('participantUpdate', (participant) => {
    console.log('✅ Participant update received:', participant.name);
});

socket.on('gameStateUpdate', (gameState) => {
    console.log('📊 Game state update received:', {
        id: gameState.id,
        phase: gameState.phase,
        sessionId: sessionId
    });
});

// Test sequence
setTimeout(() => {
    console.log('\n🚀 Starting game...');
    socket.emit('startGame');
}, 2000);

setTimeout(() => {
    console.log('\n📝 Submitting IPO bids...');
    const testBids = [
        {
            companyId: 'company1',
            shares: 50,
            price: 2.50
        }
    ];
    
    console.log('📤 Submitting IPO bids with sessionId:', sessionId);
    socket.emit('submitIPOBids', { bids: testBids });
}, 4000);

socket.on('ipoBidsReceived', (data) => {
    console.log('✅ IPO bids received:', data);
});

// Monitor for the final phase change
let phaseChanges = [];
socket.on('gameStateUpdate', (gameState) => {
    if (gameState.phase) {
        phaseChanges.push({
            timestamp: new Date().toISOString(),
            phase: gameState.phase,
            sessionId: sessionId
        });
        console.log(`📊 Phase change: ${gameState.phase} (sessionId: ${sessionId})`);
    }
});

// Final analysis
setTimeout(() => {
    console.log('\n📊 Session ID Test Results:');
    console.log('Phase changes detected:', phaseChanges.length);
    phaseChanges.forEach((change, index) => {
        console.log(`  ${index + 1}. ${change.timestamp}: ${change.phase} (sessionId: ${change.sessionId})`);
    });
    
    const lastPhase = phaseChanges[phaseChanges.length - 1]?.phase;
    if (lastPhase === 'newspaper') {
        console.log('✅ SUCCESS: Phase changed to newspaper');
    } else {
        console.log(`❌ FAILURE: Final phase is ${lastPhase}, expected 'newspaper'`);
        console.log('🔍 This suggests the IPO module is not emitting to the correct session');
    }
    
    socket.disconnect();
    process.exit(0);
}, 15000);

console.log('⏳ Session ID test running... Will complete in 15 seconds...');

