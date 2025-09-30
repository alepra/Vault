(function() {
  console.log('IPO Test Script loaded');
  
  const participantsInput = document.getElementById('participants');
  const startingCapitalInput = document.getElementById('startingCapital');
  const sharesPerCompanyInput = document.getElementById('sharesPerCompany');
  const minBidInput = document.getElementById('minBid');
  const runSimulationBtn = document.getElementById('runSimulation');
  const ipoResults = document.getElementById('ipoResults');
  const portfolioResults = document.getElementById('portfolioResults');

  // Bot personality types for IPO bidding
  const botPersonalities = [
    { name: 'Aggressive', riskTolerance: 0.8, concentration: 0.7, bidMultiplier: 1.2 },
    { name: 'Conservative', riskTolerance: 0.3, concentration: 0.4, bidMultiplier: 0.9 },
    { name: 'Concentrated', riskTolerance: 0.6, concentration: 0.9, bidMultiplier: 1.1 },
    { name: 'Diversified', riskTolerance: 0.5, concentration: 0.2, bidMultiplier: 1.0 },
    { name: 'Value Investor', riskTolerance: 0.4, concentration: 0.5, bidMultiplier: 0.8 },
    { name: 'Growth Focused', riskTolerance: 0.7, concentration: 0.6, bidMultiplier: 1.3 },
    { name: 'Momentum Trader', riskTolerance: 0.6, concentration: 0.3, bidMultiplier: 1.1 },
    { name: 'Short-term Trader', riskTolerance: 0.8, concentration: 0.3, bidMultiplier: 1.4 },
    { name: 'Risk Averse', riskTolerance: 0.2, concentration: 0.3, bidMultiplier: 0.7 },
    { name: 'Opportunistic', riskTolerance: 0.5, concentration: 0.4, bidMultiplier: 1.0 },
    { name: 'Quality Focused', riskTolerance: 0.4, concentration: 0.6, bidMultiplier: 0.9 }
  ];

  function generateCompany(companyId) {
    return {
      id: companyId,
      name: 'Lemonade Stand ' + companyId,
      shares: parseInt(sharesPerCompanyInput.value),
      bids: [],
      finalPrice: 0,
      totalSharesAllocated: 0
    };
  }

  function generateParticipant(participantId, isHuman = false) {
    const personality = botPersonalities[participantId % botPersonalities.length];
    return {
      id: participantId,
      name: isHuman ? 'Human Player' : 'Bot ' + participantId + ' (' + personality.name + ')',
      isHuman: isHuman,
      personality: personality,
      capital: parseInt(startingCapitalInput.value),
      bids: [],
      shares: {},
      remainingCapital: parseInt(startingCapitalInput.value)
    };
  }

  function generateBids(participants, companies) {
    const minBid = parseFloat(minBidInput.value);
    
    participants.forEach(participant => {
      const personality = participant.personality;
      
      // Determine how many companies to bid on (1-4)
      const companiesToBidOn = Math.max(1, Math.floor(personality.concentration * 4));
      const selectedCompanies = companies.slice(0, companiesToBidOn);
      
      // Calculate total bid budget
      const bidBudget = participant.capital * personality.riskTolerance;
      const budgetPerCompany = bidBudget / companiesToBidOn;
      
      selectedCompanies.forEach(company => {
        // Generate bid price (above minimum)
        const basePrice = minBid + (Math.random() * 2); // $1.00 - $3.00 range
        const bidPrice = basePrice * personality.bidMultiplier;
        
        // Calculate shares to bid for
        const maxShares = Math.floor(budgetPerCompany / bidPrice);
        const sharesToBid = Math.max(1, Math.floor(maxShares * (0.5 + Math.random() * 0.5)));
        const bidAmount = sharesToBid * bidPrice;
        
        // Safeguard: Cannot spend more than remaining capital
        if (bidAmount <= participant.remainingCapital) {
          participant.bids.push({
            companyId: company.id,
            price: bidPrice,
            shares: sharesToBid,
            amount: bidAmount
          });
          participant.remainingCapital -= bidAmount;
        }
      });
    });
  }

  function calculateIPOPrices(companies, participants) {
    companies.forEach(company => {
      // Collect all bids for this company
      const companyBids = [];
      participants.forEach(participant => {
        participant.bids.forEach(bid => {
          if (bid.companyId === company.id) {
            companyBids.push({
              participantId: participant.id,
              price: bid.price,
              shares: bid.shares,
              amount: bid.amount
            });
          }
        });
      });
      
      // Sort bids by price (highest first) for Dutch auction
      companyBids.sort((a, b) => b.price - a.price);
      
      // Find the clearing price (lowest price that sells all shares)
      let totalShares = 0;
      let clearingPrice = parseFloat(minBidInput.value);
      
      for (let i = 0; i < companyBids.length; i++) {
        totalShares += companyBids[i].shares;
        if (totalShares >= company.shares) {
          clearingPrice = companyBids[i].price; // This is the price everyone pays
          break;
        }
      }
      
      company.finalPrice = clearingPrice;
      company.bids = companyBids;
    });
  }

  function allocateShares(companies, participants) {
    companies.forEach(company => {
      // Sort bids by price (highest first)
      const sortedBids = company.bids.sort((a, b) => b.price - a.price);
      
      let remainingShares = company.shares;
      const clearingPrice = company.finalPrice;
      
      // Allocate shares to all bidders who bid at or above clearing price
      sortedBids.forEach(bid => {
        if (remainingShares > 0 && bid.price >= clearingPrice) {
          const sharesToAllocate = Math.min(bid.shares, remainingShares);
          const participant = participants.find(p => p.id === bid.participantId);
          
          if (participant) {
            if (!participant.shares[company.id]) {
              participant.shares[company.id] = 0;
            }
            participant.shares[company.id] += sharesToAllocate;
            
            // Refund the difference between bid price and clearing price
            const refund = (bid.price - clearingPrice) * sharesToAllocate;
            participant.remainingCapital += refund;
            
            remainingShares -= sharesToAllocate;
            company.totalSharesAllocated += sharesToAllocate;
          }
        }
      });
    });
  }

  function runSimulation() {
    console.log('Running simulation...');
    const numParticipants = parseInt(participantsInput.value);
    const participants = [];
    
    // Create participants (1 human + rest bots)
    for (let i = 0; i < numParticipants; i++) {
      participants.push(generateParticipant(i, i === 0));
    }
    
    // Create companies
    const companies = [];
    for (let i = 1; i <= 4; i++) {
      companies.push(generateCompany(i));
    }
    
    // Generate bids
    generateBids(participants, companies);
    
    // Calculate IPO prices
    calculateIPOPrices(companies, participants);
    
    // Allocate shares
    allocateShares(companies, participants);
    
    // Display results
    displayResults(companies, participants);
  }

  function displayResults(companies, participants) {
    console.log('Displaying results for', companies.length, 'companies and', participants.length, 'participants');
    
    // Display IPO results
    let ipoHTML = '<h3>IPO Results (Dutch Auction Style)</h3><ul class="stats">';
    companies.forEach(company => {
      ipoHTML += '<li><strong>' + company.name + '</strong>: $' + company.finalPrice.toFixed(2) + ' per share (' + company.totalSharesAllocated + '/' + company.shares + ' shares allocated)</li>';
    });
    ipoHTML += '</ul>';
    ipoResults.innerHTML = ipoHTML;
    
    // Display participant portfolios
    let portfolioHTML = '<h3>Participant Portfolios</h3>';
    participants.forEach(participant => {
      const totalShares = Object.values(participant.shares).reduce((sum, shares) => sum + shares, 0);
      const totalValue = Object.keys(participant.shares).reduce((sum, companyId) => {
        const company = companies.find(c => c.id == companyId);
        return sum + (participant.shares[companyId] * company.finalPrice);
      }, 0);
      
      portfolioHTML += '<div class="participant"><h4>' + participant.name + '</h4>';
      portfolioHTML += '<p>Remaining Capital: $' + participant.remainingCapital.toFixed(2) + '</p>';
      portfolioHTML += '<p>Total Shares: ' + totalShares + '</p>';
      portfolioHTML += '<p>Portfolio Value: $' + totalValue.toFixed(2) + '</p>';
      
      // Check for controlling interest (35%+)
      Object.keys(participant.shares).forEach(companyId => {
        const company = companies.find(c => c.id == companyId);
        const shares = participant.shares[companyId];
        const percentage = (shares / company.shares) * 100;
        if (percentage >= 35) {
          portfolioHTML += '<p><strong>CEO of ' + company.name + ': ' + percentage.toFixed(1) + '% ownership!</strong></p>';
        }
      });
      
      portfolioHTML += '</div>';
    });
    portfolioResults.innerHTML = portfolioHTML;
  }

  runSimulationBtn.addEventListener('click', runSimulation);
  
  // Run initial simulation
  runSimulation();
})();