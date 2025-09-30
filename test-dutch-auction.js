/**
 * Test Dutch Auction System in Isolation
 * This will test the Dutch auction logic without needing the full server
 */

// Mock the bot personalities (from your actual system)
const botPersonalities = [
  { name: 'Aggressive', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.3, bidStrategy: 'high' },
  { name: 'Conservative', riskTolerance: 0.3, concentration: 0.5, bidMultiplier: 0.8, bidStrategy: 'low' },
  { name: 'Concentrated', riskTolerance: 0.9, concentration: 0.25, bidMultiplier: 2.0, bidStrategy: 'ceo' },
  { name: 'Diversified', riskTolerance: 0.6, concentration: 1.0, bidMultiplier: 1.0, bidStrategy: 'medium' },
  { name: 'Value Investor', riskTolerance: 0.5, concentration: 0.75, bidMultiplier: 0.6, bidStrategy: 'low' },
  { name: 'Growth Focused', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.4, bidStrategy: 'high' },
  { name: 'Momentum Trader', riskTolerance: 0.7, concentration: 0.75, bidMultiplier: 1.2, bidStrategy: 'medium' },
  { name: 'Short-term Trader', riskTolerance: 0.8, concentration: 0.75, bidMultiplier: 1.5, bidStrategy: 'high' },
  { name: 'Risk Averse', riskTolerance: 0.2, concentration: 0.5, bidMultiplier: 0.7, bidStrategy: 'low' },
  { name: 'Opportunistic', riskTolerance: 0.6, concentration: 0.75, bidMultiplier: 1.1, bidStrategy: 'medium' },
  { name: 'Quality Focused', riskTolerance: 0.5, concentration: 0.75, bidMultiplier: 1.0, bidStrategy: 'medium' },
  { name: 'Scavenger 1', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
  { name: 'Scavenger 2', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
  { name: 'Scavenger 3', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' }
];

// Create mock participants
const participants = [
  { id: 'human', name: 'Human Player', isHuman: true, capital: 1000, remainingCapital: 1000, shares: {} },
  ...botPersonalities.map((personality, index) => ({
    id: `bot_${index}`,
    name: personality.name,
    isHuman: false,
    capital: 1000,
    remainingCapital: 1000,
    shares: {},
    personality: personality
  }))
];

// Create mock companies
const companies = [
  { id: 'company1', name: 'Lemonade Stand 1', shares: 1000, totalSharesAllocated: 0 },
  { id: 'company2', name: 'Lemonade Stand 2', shares: 1000, totalSharesAllocated: 0 },
  { id: 'company3', name: 'Lemonade Stand 3', shares: 1000, totalSharesAllocated: 0 },
  { id: 'company4', name: 'Lemonade Stand 4', shares: 1000, totalSharesAllocated: 0 }
];

console.log('🧪 Testing Dutch Auction System...\n');

// Test the Dutch auction logic for one company
function testDutchAuction(company) {
  console.log(`\n📊 Testing ${company.name}...`);
  
  const bids = [];
  
  // Generate bids for this company (same logic as server)
  for (const participant of participants) {
    if (participant.personality) {
      const personality = participant.personality;
      const companiesToBidOn = Math.max(1, Math.min(4, Math.ceil(personality.concentration * 4)));
      
      // Scavengers always bid on all companies, others have 70% chance
      const shouldBid = personality.bidStrategy === 'scavenger' ? true : (Math.random() < 0.7);
      if (shouldBid) {
        let bidPrice;
        if (personality.bidStrategy === 'scavenger') {
          bidPrice = 1.00 + (Math.random() * 0.5);
        } else if (personality.bidStrategy === 'ceo') {
          bidPrice = 2.50 + (Math.random() * 1.5);
        } else if (personality.bidStrategy === 'low') {
          bidPrice = 1.00 + (Math.random() * 0.5);
        } else if (personality.bidStrategy === 'high') {
          bidPrice = 2.25 + (Math.random() * 1.0);
        } else {
          bidPrice = 1.50 + (Math.random() * 0.75);
        }
        
        bidPrice = Math.round(bidPrice * 4) / 4;
        bidPrice = Math.max(bidPrice, 1.00);
        
        // Use the personality's bidMultiplier and concentration properly
        const baseShares = Math.floor((participant.capital * personality.riskTolerance * personality.bidMultiplier) / bidPrice);
        const sharesToBid = Math.max(100, baseShares);
        const bidAmount = sharesToBid * bidPrice;
        
        if (bidAmount <= participant.capital) {
          bids.push({
            participantId: participant.id,
            participantName: participant.name,
            price: bidPrice,
            shares: sharesToBid,
            amount: bidAmount,
            personality: personality.name
          });
        }
      }
    }
  }
  
  console.log(`📝 Generated ${bids.length} bids for ${company.name}`);
  
  // Show bid details
  bids.forEach(bid => {
    console.log(`  ${bid.participantName} (${bid.personality}): ${bid.shares} shares @ $${bid.price.toFixed(2)} = $${bid.amount.toFixed(2)}`);
  });
  
  // Calculate clearing price (Dutch auction)
  bids.sort((a, b) => b.price - a.price);
  
  let totalShares = 0;
  let clearingPrice = 1.00;
  
  for (const bid of bids) {
    totalShares += bid.shares;
    if (totalShares >= company.shares) {
      clearingPrice = bid.price;
      break;
    }
  }
  
  if (totalShares < company.shares) {
    clearingPrice = bids[bids.length - 1]?.price || 1.00;
  }
  
  console.log(`\n💰 Dutch Auction Results:`);
  console.log(`  Total shares bid: ${totalShares}`);
  console.log(`  Shares available: ${company.shares}`);
  console.log(`  Clearing price: $${clearingPrice.toFixed(2)}`);
  console.log(`  All shares sold: ${totalShares >= company.shares ? '✅ YES' : '❌ NO'}`);
  
  // Allocate shares
  let remainingShares = company.shares;
  let allocatedShares = 0;
  
  for (const bid of bids) {
    if (remainingShares > 0 && bid.price >= clearingPrice) {
      const sharesToAllocate = Math.min(bid.shares, remainingShares);
      allocatedShares += sharesToAllocate;
      remainingShares -= sharesToAllocate;
      
      console.log(`  ${bid.participantName}: ${sharesToAllocate} shares @ $${clearingPrice.toFixed(2)}`);
    }
  }
  
  console.log(`  Total allocated: ${allocatedShares}/${company.shares} shares`);
  
  return {
    clearingPrice,
    totalBids: bids.length,
    totalSharesBid: totalShares,
    sharesAllocated: allocatedShares,
    allSharesSold: allocatedShares >= company.shares
  };
}

// Test all companies
const results = [];
for (const company of companies) {
  const result = testDutchAuction(company);
  results.push({ company: company.name, ...result });
}

// Summary
console.log('\n📊 SUMMARY:');
console.log('='.repeat(50));
results.forEach(result => {
  console.log(`${result.company}: $${result.clearingPrice.toFixed(2)} - ${result.sharesAllocated}/${result.totalSharesBid} shares - ${result.allSharesSold ? '✅' : '❌'}`);
});

const allSold = results.every(r => r.allSharesSold);
const allSamePrice = results.every(r => Math.abs(r.clearingPrice - results[0].clearingPrice) < 0.01);

console.log(`\n🎯 All shares sold: ${allSold ? '✅ YES' : '❌ NO'}`);
console.log(`🎯 All same price: ${allSamePrice ? '❌ BAD (should be different)' : '✅ GOOD (different prices)'}`);

if (allSamePrice) {
  console.log('\n🚨 PROBLEM: All companies have the same price - Dutch auction is not working properly!');
} else if (!allSold) {
  console.log('\n🚨 PROBLEM: Not all shares are being sold - insufficient demand!');
} else {
  console.log('\n✅ Dutch auction system is working correctly!');
}

