const http = require('http');
const io = require('socket.io-client');

console.log('🧪 Testing Lemonade Stand System...\n');

// Test 1: Backend API
console.log('1. Testing Backend API...');
const apiTest = http.get('http://localhost:3001/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.status === 'ok') {
        console.log('   ✅ Backend API: Working');
        testWebSocket();
      } else {
        console.log('   ❌ Backend API: Error -', result);
      }
    } catch (e) {
      console.log('   ❌ Backend API: Parse Error -', e.message);
    }
  });
});

apiTest.on('error', (err) => {
  console.log('   ❌ Backend API: Connection Failed -', err.message);
  console.log('   💡 Make sure the backend server is running: cd server && node index.js');
});

// Test 2: WebSocket Connection
function testWebSocket() {
  console.log('\n2. Testing WebSocket Connection...');
  
  const socket = io('http://localhost:3001');
  
  socket.on('connect', () => {
    console.log('   ✅ WebSocket: Connected');
    testGameCreation();
  });
  
  socket.on('connect_error', (err) => {
    console.log('   ❌ WebSocket: Connection Failed -', err.message);
  });
  
  socket.on('disconnect', () => {
    console.log('   ⚠️ WebSocket: Disconnected');
  });
  
  // Test game creation
  function testGameCreation() {
    console.log('\n3. Testing Game Creation...');
    
    socket.emit('joinGame', { name: 'Test Player' });
    
    socket.on('participantUpdate', (participant) => {
      console.log('   ✅ Participant Created:', participant.name);
      console.log('   💰 Capital:', participant.capital);
      testGameStart();
    });
    
    socket.on('gameStateUpdate', (game) => {
      console.log('   ✅ Game State Updated:');
      console.log('   📊 Phase:', game.phase);
      console.log('   👥 Participants:', game.participants?.length || 0);
      console.log('   🏢 Companies:', game.companies?.length || 0);
      
      if (game.phase === 'trading') {
        console.log('\n🎉 ALL TESTS PASSED! System is working correctly.');
        console.log('\n📋 Summary:');
        console.log('   ✅ Backend API: Working');
        console.log('   ✅ WebSocket: Connected');
        console.log('   ✅ Game Creation: Working');
        console.log('   ✅ IPO Process: Completed');
        console.log('   ✅ Trading Phase: Ready');
        
        console.log('\n🌐 Open your browser to: http://localhost:8080/client/test.html');
        console.log('🎮 The game is ready to play!');
        
        process.exit(0);
      }
    });
    
    function testGameStart() {
      console.log('\n4. Testing Game Start (IPO Process)...');
      socket.emit('startGame');
    }
  }
}

// Timeout after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test timeout - some tests may have failed');
  process.exit(1);
}, 10000);


