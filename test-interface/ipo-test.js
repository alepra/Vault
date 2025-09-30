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
    // Scavenger bots for liquidity
    { name: 'Scavenger 1', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
    { name: 'Scavenger 2', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' },
    { name: 'Scavenger 3', riskTolerance: 0.9, concentration: 1.0, bidMultiplier: 0.4, bidStrategy: 'scavenger' }
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
    const startingCapital = parseInt(startingCapitalInput.value);
    return {
      id: participantId,
      name: isHuman ? 'Human Player' : 'Bot ' + participantId + ' (' + personality.name + ')',
      isHuman: isHuman,
      personality: personality,
      capital: startingCapital,
      originalCapital: startingCapital, // Track original amount
      bids: [],
      shares: {},
      remainingCapital: startingCapital,
      totalSpent: 0, // Track total spent on bids
      totalRefunded: 0 // Not used in proper Dutch auction
    };
  }

  function generateBids(participants, companies) {
    console.log('Generating bids for', participants.length, 'participants');
    const minBid = parseFloat(minBidInput.value);
    
    participants.forEach(participant => {
      const personality = participant.personality;
      console.log('Generating bids for', participant.name, 'with personality', personality.name);
      
      // Determine how many companies to bid on (1-4)
      // Concentration: 0.3 = 1 company, 0.5 = 2 companies, 0.7 = 3 companies, 0.9 = 4 companies
      const companiesToBidOn = Math.max(1, Math.min(4, Math.ceil(personality.concentration * 4)));
      // Shuffle companies so different bots bid on different companies
      const shuffledCompanies = [...companies].sort(() => Math.random() - 0.5);
      const selectedCompanies = shuffledCompanies.slice(0, companiesToBidOn);
      
      console.log(participant.name, 'concentration:', personality.concentration, 'companies to bid on:', companiesToBidOn);
      
      // Calculate total bid budget - ensure minimum 70% deployment
      const minDeployment = 0.7; // 70% minimum
      const riskDeployment = personality.riskTolerance;
      const actualDeployment = Math.max(minDeployment, riskDeployment);
      const bidBudget = participant.capital * actualDeployment;
      const budgetPerCompany = bidBudget / companiesToBidOn;
      
      console.log(participant.name, 'will bid on', companiesToBidOn, 'companies with budget', bidBudget, 'deployment:', (actualDeployment * 100).toFixed(0) + '%');
      
      selectedCompanies.forEach(company => {
        // Generate bid price based on personality strategy
        let bidPrice;
        if (personality.bidStrategy === 'scavenger') {
          // Scavenger bots bid minimum price with slight variations
          bidPrice = minBid + (Math.random() * 0.5); // $1.50 to $2.00
        } else if (personality.bidStrategy === 'ceo') {
          // Concentrated bots bid very high to become CEO (need 35% ownership)
          bidPrice = minBid + 1.0 + (Math.random() * 1.5); // $2.50 to $4.00
        } else if (personality.bidStrategy === 'low') {
          // Value investors bid low - try minimum or slightly above
          bidPrice = minBid + (Math.random() * 0.5); // $1.50 to $2.00
        } else if (personality.bidStrategy === 'high') {
          // Aggressive investors bid high
          bidPrice = minBid + 0.75 + (Math.random() * 1.0); // $2.25 to $3.25
        } else {
          // Medium strategy
          bidPrice = minBid + 0.5 + (Math.random() * 0.75); // $2.00 to $2.75
        }
        
        // Round to nearest quarter
        bidPrice = Math.round(bidPrice * 4) / 4;
        
        // Ensure minimum bid
        bidPrice = Math.max(bidPrice, minBid);
        
        // Calculate shares to bid for
        let sharesToBid;
        if (personality.bidStrategy === 'scavenger') {
          // Scavenger bots divide their remaining capital equally among all companies
          const capitalPerCompany = participant.remainingCapital / companiesToBidOn;
          const maxShares = Math.floor(capitalPerCompany / bidPrice);
          sharesToBid = Math.max(100, Math.floor(maxShares / 100) * 100);
        } else if (personality.bidStrategy === 'ceo') {
          // Concentrated bots target 35% ownership (350 shares out of 1000) with ALL their capital
          const targetShares = 350;
          const totalBudget = participant.capital * personality.riskTolerance; // Use total budget, not per company
          const maxAffordableShares = Math.floor(totalBudget / bidPrice);
          sharesToBid = Math.min(targetShares, Math.max(100, Math.floor(maxAffordableShares / 100) * 100));
        } else {
          // Regular bots use their budget per company
          const maxShares = Math.floor(budgetPerCompany / bidPrice);
          sharesToBid = Math.max(100, Math.floor(maxShares / 100) * 100);
        }
        
        // Make sure we don't exceed available budget
        const bidAmount = sharesToBid * bidPrice;
        
        console.log(participant.name, 'bidding on', company.name, ':', sharesToBid, 'shares at $' + bidPrice.toFixed(2), 'total $' + bidAmount.toFixed(2));
        
        // Safeguard: Cannot spend more than remaining capital
        if (bidAmount <= participant.remainingCapital && sharesToBid >= 100) {
          participant.bids.push({
            companyId: company.id,
            price: bidPrice,
            shares: sharesToBid,
            amount: bidAmount
          });
          // NO money deducted during bidding phase - only after auction completes
          console.log(participant.name, 'bid placed, remaining capital:', participant.remainingCapital);
        } else {
          console.log(participant.name, 'bid rejected - insufficient capital or too few shares');
        }
      });
    });
  }

  function calculateIPOPrices(companies, participants) {
    console.log('Calculating IPO prices...');
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
      
      console.log(company.name, 'received', companyBids.length, 'bids');
      
      if (companyBids.length === 0) {
        console.log(company.name, 'NO BIDS - setting price to minimum');
        company.finalPrice = parseFloat(minBidInput.value);
        company.bids = [];
        return;
      }
      
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
      
      // If we don't have enough bids to sell all shares, use the lowest bid
      if (totalShares < company.shares) {
        clearingPrice = companyBids[companyBids.length - 1].price;
        console.log(company.name, 'WARNING: Not enough bids to sell all shares. Using lowest bid price.');
      }
      
      company.finalPrice = clearingPrice;
      company.bids = companyBids;
      console.log(company.name, 'clearing price: $' + clearingPrice.toFixed(2), 'total shares bid:', totalShares, 'shares available:', company.shares);
    });
  }

  function allocateShares(companies, participants) {
    console.log('Allocating shares...');
    companies.forEach(company => {
      if (company.bids.length === 0) {
        console.log(company.name, 'no bids to allocate');
        company.totalSharesAllocated = 0;
        return;
      }
      
      // Sort bids by price (highest first)
      const sortedBids = company.bids.sort((a, b) => b.price - a.price);
      
      let remainingShares = company.shares;
      const clearingPrice = company.finalPrice;
      
      console.log(company.name, 'allocating shares at $' + clearingPrice.toFixed(2));
      
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
            
            // In Dutch auction, participants pay the clearing price (not their bid price)
            const actualCost = clearingPrice * sharesToAllocate;
            // Deduct money only when trade executes at clearing price
            participant.remainingCapital -= actualCost;
            participant.totalSpent += actualCost;
            
            console.log(participant.name, 'gets', sharesToAllocate, 'shares of', company.name, 'bid: $' + bid.price.toFixed(2), 'paid: $' + clearingPrice.toFixed(2), 'total cost: $' + actualCost.toFixed(2), 'remaining capital: $' + participant.remainingCapital.toFixed(2));
            
            remainingShares -= sharesToAllocate;
            company.totalSharesAllocated += sharesToAllocate;
          }
        }
      });
      
      // If there are still shares left, allocate them to the lowest bidders
      if (remainingShares > 0) {
        console.log(company.name, 'WARNING: Still have', remainingShares, 'shares left to allocate');
        // Find the lowest bidders and give them more shares
        const lowestBids = sortedBids.filter(bid => bid.price === clearingPrice);
        lowestBids.forEach(bid => {
          if (remainingShares > 0) {
            const extraShares = Math.min(100, remainingShares); // Give them 100 more shares
            const participant = participants.find(p => p.id === bid.participantId);
            if (participant) {
              participant.shares[company.id] += extraShares;
              // Deduct money for extra shares too
              const extraCost = clearingPrice * extraShares;
              participant.remainingCapital -= extraCost;
              participant.totalSpent += extraCost;
              remainingShares -= extraShares;
              company.totalSharesAllocated += extraShares;
              console.log(participant.name, 'gets extra', extraShares, 'shares of', company.name, 'cost: $' + extraCost.toFixed(2));
            }
          }
        });
      }
      
      console.log(company.name, 'final allocation:', company.totalSharesAllocated, 'out of', company.shares, 'shares');
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
    
    // Debug: Check total money flow
    let totalRemainingCapital = 0;
    let totalPortfolioValue = 0;
    let totalBidAmount = 0;
    participants.forEach(participant => {
      totalRemainingCapital += participant.remainingCapital;
      // Calculate portfolio value based on what they actually paid (clearing prices)
      const participantValue = Object.keys(participant.shares).reduce((sum, companyId) => {
        const shares = participant.shares[companyId];
        if (shares > 0) {
          const company = companies.find(c => c.id == companyId);
          if (company) {
            return sum + (shares * company.finalPrice); // Use clearing price, not bid price
          }
        }
        return sum;
      }, 0);
      totalPortfolioValue += participantValue;
      
      // Track total bid amounts
      participant.bids.forEach(bid => {
        totalBidAmount += bid.amount;
      });
    });
    console.log('DEBUG: Total remaining capital:', totalRemainingCapital);
    console.log('DEBUG: Total portfolio value:', totalPortfolioValue);
    console.log('DEBUG: Total bid amount:', totalBidAmount);
    console.log('DEBUG: Total worth:', totalRemainingCapital + totalPortfolioValue);
    console.log('DEBUG: Expected total:', participants.length * 1000);
    
    // Check for participants with < $1000
    participants.forEach(participant => {
      // Simple calculation: remaining capital + what they spent = original capital
      const totalWorth = participant.remainingCapital + participant.totalSpent;
      
      console.log(participant.name + ':');
      console.log('  Original Capital: $' + participant.originalCapital);
      console.log('  Total Spent: $' + participant.totalSpent.toFixed(2));
      console.log('  Remaining Capital: $' + participant.remainingCapital.toFixed(2));
      console.log('  Total Worth: $' + totalWorth.toFixed(2));
      
      if (totalWorth < 1000) {
        console.log('WARNING:', participant.name, 'has total worth of $' + totalWorth.toFixed(2), 'less than $1000!');
      }
    });
    
    // Display IPO results
    let ipoHTML = '<h3>IPO Results (Dutch Auction Style)</h3>';
    companies.forEach(company => {
      ipoHTML += '<div class="company-result">';
      ipoHTML += '<h4><strong>' + company.name + '</strong>: $' + company.finalPrice.toFixed(2) + ' per share (' + company.totalSharesAllocated + '/' + company.shares + ' shares allocated)</h4>';
      
      // Show ownership breakdown for this company
      ipoHTML += '<div class="ownership-breakdown">';
      ipoHTML += '<h5>Share Ownership:</h5>';
      ipoHTML += '<ul class="ownership-list">';
      
      // Get all participants who own shares in this company
      const companyOwners = participants.filter(participant => participant.shares[company.id] > 0);
      companyOwners.sort((a, b) => b.shares[company.id] - a.shares[company.id]); // Sort by shares owned
      
      companyOwners.forEach(participant => {
        const shares = participant.shares[company.id];
        const percentage = (shares / company.shares) * 100;
        const value = shares * company.finalPrice; // Use clearing price
        const isCEO = percentage >= 35;
        
        ipoHTML += '<li>';
        ipoHTML += '<strong>' + participant.name + ':</strong> ';
        ipoHTML += shares + ' shares @ $' + company.finalPrice.toFixed(2) + ' (' + percentage.toFixed(1) + '%) = $' + value.toFixed(2);
        if (isCEO) {
          ipoHTML += ' <span style="color: #ff6b6b; font-weight: bold;">[CEO]</span>';
        }
        ipoHTML += '</li>';
      });
      
      // Show if there are any unallocated shares
      if (company.totalSharesAllocated < company.shares) {
        const unallocated = company.shares - company.totalSharesAllocated;
        ipoHTML += '<li><em>Unallocated: ' + unallocated + ' shares</em></li>';
      }
      
      ipoHTML += '</ul>';
      ipoHTML += '</div>';
      ipoHTML += '</div>';
    });
    ipoResults.innerHTML = ipoHTML;
    
    // Display participant portfolios
    let portfolioHTML = '<h3>Participant Portfolios</h3>';
    participants.forEach(participant => {
      const totalShares = Object.values(participant.shares).reduce((sum, shares) => sum + shares, 0);
      // Simple calculation: remaining capital + what they spent = original capital
      const totalWorth = participant.remainingCapital + participant.totalSpent;
      
      portfolioHTML += '<div class="participant"><h4>' + participant.name + '</h4>';
      portfolioHTML += '<p>Remaining Capital: $' + participant.remainingCapital.toFixed(2) + '</p>';
      portfolioHTML += '<p>Total Shares: ' + totalShares + '</p>';
      portfolioHTML += '<p>Total Spent: $' + participant.totalSpent.toFixed(2) + '</p>';
      portfolioHTML += '<p><strong>Total Worth: $' + totalWorth.toFixed(2) + '</strong> (Remaining + Spent = ' + participant.remainingCapital.toFixed(2) + ' + ' + participant.totalSpent.toFixed(2) + ' = $' + totalWorth.toFixed(2) + ')</p>';
      
      // Show detailed positions for each company
      portfolioHTML += '<div style="margin-left: 20px; margin-top: 10px;">';
      portfolioHTML += '<h5>Detailed Positions:</h5>';
      companies.forEach(company => {
        const shares = participant.shares[company.id] || 0;
        const clearingPrice = company.finalPrice;
        const value = shares * clearingPrice;
        const percentage = (shares / company.shares) * 100;
        
        if (shares > 0) {
          portfolioHTML += '<p><strong>' + company.name + ':</strong> ' + shares + ' shares @ $' + clearingPrice.toFixed(2) + ' = $' + value.toFixed(2) + ' (' + percentage.toFixed(1) + '%)</p>';
        } else {
          portfolioHTML += '<p><em>' + company.name + ':</em> No shares</p>';
        }
      });
      portfolioHTML += '</div>';
      
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