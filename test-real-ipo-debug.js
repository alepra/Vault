const { io } = require('socket.io-client');

console.log('🔍 Testing REAL IPO process to find $300 cash bug...\n');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Join game
  socket.emit('joinGame', {
    participantName: 'Debug Human',
    participantType: 'human'
  });
});

socket.on('gameStateUpdate', (gameState) => {
  console.log('📊 Game State Update:');
  console.log(`Phase: ${gameState.phase}`);
  console.log(`Participants: ${gameState.participants.length}`);
  
  if (gameState.participants.length > 0) {
    const human = gameState.participants.find(p => p.type === 'human');
    if (human) {
      console.log('\n🔍 HUMAN PARTICIPANT DATA:');
      console.log(`Name: ${human.name}`);
      console.log(`Cash: $${human.cash}`);
      console.log(`Net Worth: $${human.netWorth}`);
      console.log(`Total Spent: $${human.totalSpent}`);
      console.log(`Remaining Capital: $${human.remainingCapital}`);
      
      if (human.stockPositions && human.stockPositions.length > 0) {
        console.log('\n📈 STOCK POSITIONS:');
        human.stockPositions.forEach(pos => {
          console.log(`  ${pos.companyName}: ${pos.shares} shares at $${pos.pricePerShare} = $${(pos.shares * pos.pricePerShare).toFixed(2)}`);
        });
      }
    }
  }
  
  // Start IPO if we're in lobby
  if (gameState.phase === 'lobby' && gameState.participants.length >= 2) {
    console.log('\n🚀 Starting IPO...');
    socket.emit('startGame');
  }
});

socket.on('ipoStarted', (data) => {
  console.log('\n📊 IPO STARTED:');
  console.log(`Companies: ${data.companies.length}`);
  data.companies.forEach(company => {
    console.log(`  ${company.name}: ${company.totalShares} shares available`);
  });
  
  // Submit some test bids
  setTimeout(() => {
    console.log('\n💰 Submitting test bids...');
    socket.emit('submitIPOBids', {
      bids: [
        { companyId: 'company_1', shares: 100, maxPrice: 2.00 },
        { companyId: 'company_2', shares: 150, maxPrice: 1.50 },
        { companyId: 'company_3', shares: 200, maxPrice: 1.25 }
      ]
    });
  }, 1000);
});

socket.on('ipoCompleted', (data) => {
  console.log('\n🎉 IPO COMPLETED:');
  console.log(`Phase: ${data.phase}`);
  
  if (data.participants) {
    const human = data.participants.find(p => p.type === 'human');
    if (human) {
      console.log('\n🔍 POST-IPO HUMAN DATA:');
      console.log(`Cash: $${human.cash}`);
      console.log(`Net Worth: $${human.netWorth}`);
      console.log(`Total Spent: $${human.totalSpent}`);
      console.log(`Remaining Capital: $${human.remainingCapital}`);
      
      if (human.stockPositions && human.stockPositions.length > 0) {
        console.log('\n📈 POST-IPO STOCK POSITIONS:');
        human.stockPositions.forEach(pos => {
          console.log(`  ${pos.companyName}: ${pos.shares} shares at $${pos.pricePerShare} = $${(pos.shares * pos.pricePerShare).toFixed(2)}`);
        });
      }
      
      // Calculate expected values
      const totalStockValue = human.stockPositions.reduce((sum, pos) => sum + (pos.shares * pos.pricePerShare), 0);
      const expectedNetWorth = human.cash + totalStockValue;
      console.log(`\n🧮 MATH CHECK:`);
      console.log(`Cash: $${human.cash}`);
      console.log(`Stock Value: $${totalStockValue.toFixed(2)}`);
      console.log(`Expected Net Worth: $${expectedNetWorth.toFixed(2)}`);
      console.log(`Actual Net Worth: $${human.netWorth}`);
      console.log(`Difference: $${(expectedNetWorth - human.netWorth).toFixed(2)}`);
    }
  }
  
  // Check companies
  if (data.companies) {
    console.log('\n🏢 COMPANY IPO PRICES:');
    data.companies.forEach(company => {
      console.log(`  ${company.name}: $${company.ipoPrice} (${company.totalSharesAllocated}/${company.totalShares} shares sold)`);
    });
  }
  
  setTimeout(() => {
    console.log('\n✅ Test complete - disconnecting');
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - disconnecting');
  socket.disconnect();
  process.exit(1);
}, 30000);

