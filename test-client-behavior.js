/**
 * Client Behavior Test
 * Tests the exact same flow as the working server test but with client-side logic
 */

const io = require('socket.io-client');

console.log('🧪 Testing Client Behavior...\n');

// Simulate the exact client behavior
const socket = io('http://localhost:3001', {
    timeout: 5000,
    forceNew: true
});

let gameData = null;
let sessionId = 'shared_game'; // Same as client uses

// Simulate client's fetchGameState function
async function fetchGameState(forceFresh = false) {
    try {
        const freshParam = forceFresh ? '&fresh=true' : '';
        const apiUrl = `http://localhost:3001/api/game?session=${sessionId}${freshParam}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data) {
            gameData = data;
            console.log('✅ Game state fetched:', {
                id: data.id,
                phase: data.phase,
                companies: data.companies?.length || 0,
                participants: data.participants?.length || 0
            });
            return data;
        }
    } catch (error) {
        console.error('❌ Failed to fetch game state:', error.message);
    }
}

// Simulate client's updateGameDisplay function
function updateGameDisplay() {
    if (gameData) {
        console.log('🔄 updateGameDisplay called, phase:', gameData.phase);
    }
}

// Simulate client's submitIPOBids function
function submitIPOBids() {
    if (!gameData || !gameData.companies) {
        console.log('❌ No game data or companies available');
        return;
    }
    
    const bids = [
        {
            companyId: 'company1',
            shares: 50,
            price: 2.50
        }
    ];
    
    console.log('📤 Submitting IPO bids:', bids);
    socket.emit('submitIPOBids', { bids: bids });
}

socket.on('connect', () => {
    console.log('✅ Connected to server');
    console.log('🔗 Socket ID:', socket.id);
    
    // Simulate client initialization
    fetchGameState(true).then(() => {
        updateGameDisplay();
    });
});

socket.on('gameStateUpdate', (data) => {
    console.log('📊 Game state updated:', {
        id: data.id,
        phase: data.phase,
        companies: data.companies?.length || 0,
        participants: data.participants?.length || 0
    });
    
    gameData = data;
    updateGameDisplay();
});

socket.on('ipoBidsReceived', (data) => {
    console.log('✅ IPO bids received:', data);
    
    // Simulate client's setTimeout check
    setTimeout(() => {
        console.log('🔄 Checking for game state update after IPO...');
        if (gameData) {
            console.log('📊 Current phase after timeout:', gameData.phase);
        }
    }, 1000);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

// Test sequence
setTimeout(() => {
    console.log('\n👤 Joining game...');
    socket.emit('joinGame', {
        name: 'Test Player',
        sessionId: sessionId
    });
}, 1000);

setTimeout(() => {
    console.log('\n🚀 Starting game...');
    socket.emit('startGame');
}, 2000);

setTimeout(() => {
    console.log('\n📝 Submitting IPO bids...');
    submitIPOBids();
}, 4000);

// Monitor phase changes
let phaseHistory = [];
socket.on('gameStateUpdate', (data) => {
    if (data.phase) {
        phaseHistory.push({
            timestamp: new Date().toISOString(),
            phase: data.phase
        });
    }
});

// Final analysis
setTimeout(() => {
    console.log('\n📊 Client Test Results:');
    console.log('Phase changes detected:', phaseHistory.length);
    phaseHistory.forEach((change, index) => {
        console.log(`  ${index + 1}. ${change.timestamp}: ${change.phase}`);
    });
    
    if (phaseHistory.length >= 3) {
        const lastPhase = phaseHistory[phaseHistory.length - 1].phase;
        if (lastPhase === 'newspaper') {
            console.log('✅ SUCCESS: Client behavior matches server test');
        } else {
            console.log(`❌ FAILURE: Final phase is ${lastPhase}, expected 'newspaper'`);
        }
    } else {
        console.log('❌ FAILURE: Insufficient phase changes detected');
    }
    
    socket.disconnect();
    process.exit(0);
}, 15000);

console.log('⏳ Client test running... Will complete in 15 seconds...');
