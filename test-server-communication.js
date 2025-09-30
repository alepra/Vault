/**
 * Server Communication Test
 * Tests the complete communication flow between client and server for IPO processing
 */

const io = require('socket.io-client');
const IPOModule = require('./server/modules/ipoModule.js');

console.log('🧪 Starting Server Communication Test...\n');

// Test 1: Test server connection
console.log('Test 1: Testing server connection...');
const socket = io('http://localhost:3001', {
    timeout: 5000,
    forceNew: true
});

socket.on('connect', () => {
    console.log('✅ Connected to server successfully');
    console.log('🔗 Socket ID:', socket.id);
    
    // Test 2: Test game state fetch
    console.log('\nTest 2: Testing game state fetch...');
    fetch('http://localhost:3001/api/game?session=test-session&fresh=true')
        .then(response => response.json())
        .then(gameState => {
            console.log('✅ Game state fetched successfully');
            console.log('📊 Game state:', {
                id: gameState.id,
                phase: gameState.phase,
                companies: gameState.companies?.length || 0,
                participants: gameState.participants?.length || 0
            });
            
            // Test 3: Test join game
            console.log('\nTest 3: Testing join game...');
            socket.emit('joinGame', {
                name: 'Test Player',
                sessionId: 'test-session'
            });
        })
        .catch(error => {
            console.error('❌ Failed to fetch game state:', error.message);
        });
});

socket.on('participantUpdate', (participant) => {
    console.log('✅ Participant update received:', participant.name);
});

socket.on('gameStateUpdate', (gameState) => {
    console.log('✅ Game state update received:', {
        id: gameState.id,
        phase: gameState.phase,
        companies: gameState.companies?.length || 0,
        participants: gameState.participants?.length || 0
    });
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', () => {
    console.log('🔌 Disconnected from server');
});

// Test 4: Test start game
setTimeout(() => {
    console.log('\nTest 4: Testing start game...');
    socket.emit('startGame');
}, 2000);

// Test 5: Test IPO bid submission
setTimeout(() => {
    console.log('\nTest 5: Testing IPO bid submission...');
    const testBids = [
        {
            companyId: 'company1',
            shares: 50,
            price: 2.50
        }
    ];
    
    console.log('📤 Submitting IPO bids:', testBids);
    socket.emit('submitIPOBids', { bids: testBids });
}, 4000);

// Test 6: Listen for IPO responses
socket.on('ipoBidsReceived', (data) => {
    console.log('✅ IPO bids received response:', data);
});

socket.on('ipoCompleted', (data) => {
    console.log('✅ IPO completed response:', data);
});

// Test 7: Monitor for phase changes
let phaseChanges = [];
socket.on('gameStateUpdate', (gameState) => {
    if (gameState.phase) {
        phaseChanges.push({
            timestamp: new Date().toISOString(),
            phase: gameState.phase
        });
        console.log(`📊 Phase change detected: ${gameState.phase}`);
    }
});

// Test 8: Final analysis
setTimeout(() => {
    console.log('\n📊 Test Results Summary:');
    console.log('Phase changes detected:', phaseChanges.length);
    phaseChanges.forEach((change, index) => {
        console.log(`  ${index + 1}. ${change.timestamp}: ${change.phase}`);
    });
    
    if (phaseChanges.length >= 2) {
        const lastPhase = phaseChanges[phaseChanges.length - 1].phase;
        if (lastPhase === 'newspaper') {
            console.log('✅ SUCCESS: IPO completed and phase changed to newspaper');
        } else {
            console.log(`❌ FAILURE: Final phase is ${lastPhase}, expected 'newspaper'`);
        }
    } else {
        console.log('❌ FAILURE: No phase changes detected');
    }
    
    socket.disconnect();
    process.exit(0);
}, 15000); // Wait 15 seconds for complete test

console.log('⏳ Test running... Will complete in 15 seconds...');

