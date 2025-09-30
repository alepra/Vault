/**
 * SIMPLE DUTCH AUCTION TEST
 * Tests the core money flow logic without complex modules
 */

console.log('🍋 SIMPLE DUTCH AUCTION TEST STARTING...\n');

// Simple participants
const participants = [
  {
    id: 'human_1',
    name: 'Human Player',
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {}
  },
  {
    id: 'bot_1', 
    name: 'Aggressive Bot',
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {}
  },
  {
    id: 'bot_2',
    name: 'Conservative Bot', 
    remainingCapital: 1000,
    totalSpent: 0,
    shares: {}
  }
];

// Simple company
const company = {
  id: 'company_1',
  name: 'Lemonade Stand 1',
  shares: 1000,
  finalPrice: 0
};

console.log('🔍 BEFORE BIDDING - All participants:');
participants.forEach(p => {
  console.log(`  ${p.name}: $${p.remainingCapital} cash, $${p.totalSpent} spent`);
});

// Simulate bids (Dutch auction style)
const bids = [
  { participantId: 'human_1', price: 2.50, shares: 200 },
  { participantId: 'bot_1', price: 2.75, shares: 300 },
  { participantId: 'bot_2', price: 2.25, shares: 500 }
];

console.log('\n📝 BIDS RECEIVED:');
bids.forEach(bid => {
  const participant = participants.find(p => p.id === bid.participantId);
  console.log(`  ${participant.name}: ${bid.shares} shares at $${bid.price}`);
});

// Dutch auction logic - sort by price (highest first)
bids.sort((a, b) => b.price - a.price);

// Find clearing price (lowest price that sells all shares)
let totalShares = 0;
let clearingPrice = 0;

for (let i = 0; i < bids.length; i++) {
  totalShares += bids[i].shares;
  if (totalShares >= company.shares) {
    clearingPrice = bids[i].price;
    break;
  }
}

console.log(`\n💰 CLEARING PRICE: $${clearingPrice.toFixed(2)}`);

// Allocate shares at clearing price
let remainingShares = company.shares;

bids.forEach(bid => {
  if (remainingShares > 0 && bid.price >= clearingPrice) {
    const participant = participants.find(p => p.id === bid.participantId);
    const sharesToAllocate = Math.min(bid.shares, remainingShares);
    const actualCost = sharesToAllocate * clearingPrice;
    
    // Deduct money and allocate shares
    participant.remainingCapital -= actualCost;
    participant.totalSpent += actualCost;
    participant.shares[company.id] = (participant.shares[company.id] || 0) + sharesToAllocate;
    
    console.log(`💰 ${participant.name} gets ${sharesToAllocate} shares at $${clearingPrice.toFixed(2)} = $${actualCost.toFixed(2)}`);
    
    remainingShares -= sharesToAllocate;
  }
});

company.finalPrice = clearingPrice;
company.totalSharesAllocated = company.shares - remainingShares;

console.log('\n🔍 AFTER ALLOCATION - All participants:');
participants.forEach(p => {
  const totalWorth = p.remainingCapital + p.totalSpent;
  console.log(`  ${p.name}: $${p.remainingCapital.toFixed(2)} cash, $${p.totalSpent.toFixed(2)} spent, $${totalWorth.toFixed(2)} total worth`);
  
  // Show shares
  const shares = p.shares[company.id] || 0;
  if (shares > 0) {
    console.log(`    Shares: ${shares} of ${company.name}`);
  }
  
  // Check money conservation
  if (Math.abs(totalWorth - 1000) > 0.01) {
    console.log(`    ⚠️  WARNING: Net worth should be $1000, but is $${totalWorth.toFixed(2)}`);
  } else {
    console.log(`    ✅ Net worth correct: $1000`);
  }
});

console.log(`\n📊 COMPANY RESULT: ${company.name} sold ${company.totalSharesAllocated} shares at $${company.finalPrice.toFixed(2)}`);
console.log('\n✅ SIMPLE DUTCH AUCTION TEST COMPLETE');

