/**
 * Test to check what phase the game is currently in
 */

const io = require('socket.io-client');

console.log('🧪 Testing Current Game Phase...\n');

// Connect to the game server
const socket = io('http://localhost:8080');

socket.on('connect', () => {
    console.log('✅ Connected to server');
    
    // Request current game state
    socket.emit('getGameState');
    console.log('📤 Requested current game state');
});

socket.on('gameStateUpdate', (game) => {
    console.log('📊 Current Game State:');
    console.log(`   Phase: ${game.phase}`);
    console.log(`   Participants: ${game.participants ? game.participants.length : 0}`);
    console.log(`   Companies: ${game.companies ? game.companies.length : 0}`);
    
    if (game.companies) {
        game.companies.forEach((company, index) => {
            console.log(`   Company ${index + 1}: ${company.name} - Price: $${company.currentPrice || company.ipoPrice || 'N/A'}`);
        });
    }
    
    console.log('\n🎯 What you should do:');
    if (game.phase === 'lobby') {
        console.log('   → Enter your name and click "Start Game"');
    } else if (game.phase === 'ipo') {
        console.log('   → Submit your IPO bids, then click "Ready for Next Phase"');
    } else if (game.phase === 'newspaper') {
        console.log('   → Read the newspaper, then click "READY FOR TRADING" (big green button)');
    } else if (game.phase === 'trading') {
        console.log('   → Click "Start Trading" button to activate trading, then buy/sell shares');
    }
    
    socket.disconnect();
    process.exit(0);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
    console.log('⏰ Timeout - server not responding');
    process.exit(1);
}, 5000);
