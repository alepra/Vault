// Test Full Game Fix - Connect to running server and test trading
const io = require('socket.io-client');

console.log('🧪 Testing Full Game Fix...');

// Connect to the running server
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Join a test session
  socket.emit('joinGame', { 
    sessionId: 'test-session-fix',
    name: 'Test Human'
  });
});

let participantId = null;

socket.on('gameStateUpdate', (gameState) => {
  console.log('📊 Received game state update:');
  console.log('  Phase:', gameState.phase);
  console.log('  Participants:', gameState.participants?.length || 0);
  console.log('  Companies:', gameState.companies?.length || 0);
  
  // Check if we have participants with proper financial data
  if (gameState.participants && gameState.participants.length > 0) {
    const participant = gameState.participants[0];
    participantId = participant.id; // Store the real participant ID
    console.log('  Sample participant:', {
      id: participant.id,
      name: participant.name,
      cash: participant.cash,
      netWorth: participant.netWorth,
      shares: participant.shares
    });
  }
});

socket.on('tradesProcessed', (tradeData) => {
  console.log('📈 Trades processed:', tradeData.trades?.length || 0, 'trades');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
  process.exit(0);
});

// Test trading after 5 seconds
setTimeout(() => {
  console.log('\n📈 Testing trading functionality...');
  
  if (!participantId) {
    console.log('❌ No participant ID available for trading test');
    return;
  }
  
  console.log('Using participant ID:', participantId);
  
  // Try to submit a buy order with the real participant ID
  socket.emit('submitBuyOrder', {
    participantId: participantId,
    companyId: 1,
    shares: 50,
    price: 2.50
  });
  
}, 5000);

// Clean up after 15 seconds
setTimeout(() => {
  console.log('\n🛑 Test complete, disconnecting...');
  socket.disconnect();
}, 15000);
