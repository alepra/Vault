(function() {
  console.log('Script loaded');
  
  const priceLevel = document.getElementById('priceLevel');
  const qualityLevel = document.getElementById('qualityLevel');
  const marketingPct = document.getElementById('marketingPct');
  const weather = document.getElementById('weather');
  const economy = document.getElementById('economy');
  const competitors = document.getElementById('competitors');

  const priceLevelVal = document.getElementById('priceLevelVal');
  const qualityLevelVal = document.getElementById('qualityLevelVal');
  const marketingPctVal = document.getElementById('marketingPctVal');

  const priceDollars = document.getElementById('priceDollars');
  const costDollars = document.getElementById('costDollars');
  const fairPrice = document.getElementById('fairPrice');
  const mktEff = document.getElementById('mktEff');
  const demandMult = document.getElementById('demandMult');
  const attractIdx = document.getElementById('attractIdx');
  const marketShare = document.getElementById('marketShare');

  const unitsEl = document.getElementById('units');
  const revenueEl = document.getElementById('revenue');
  const ingredientCostEl = document.getElementById('ingredientCost');
  const marketingSpendEl = document.getElementById('marketingSpend');
  const profitEl = document.getElementById('profit');

  function toFixed2(n) { return Number(n).toFixed(2); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function mapPrice(level) {
    // Level 1 = .75, Level 5 = .50, Level 10 = .25
    const t = (level - 1) / 9; // 0 to 1
    return 0.75 + (2.25 - 0.75) * t;
  }
  
  function mapCost(level) {
    // Level 1 = .50, Level 5 = .25, Level 10 = .00
    const t = (level - 1) / 9; // 0 to 1
    return 0.50 + (2.00 - 0.50) * t;
  }

  function calculateWeatherMultiplier(weatherType) {
    switch (weatherType) {
      case 'hot': return 1.4;      // Hot weather = more lemonade demand
      case 'cold': return 0.6;     // Cold weather = less demand
      case 'rainy': return 0.4;    // Rainy weather = much less demand
      default: return 1.0;         // Normal weather
    }
  }

  function calculateEconomyMultiplier(economyType) {
    switch (economyType) {
      case 'good': return 1.2;     // Good economy = more spending
      case 'bad': return 0.8;      // Bad economy = less spending
      default: return 1.0;         // Normal economy
    }
  }

  function calculateReputationPenalty(priceLevel, qualityLevel) {
    const price = mapPrice(priceLevel);
    const quality = qualityLevel;
    const fairPrice = 1.50 + (quality - 5) * 0.15;
    
    // Calculate gouging ratio: how much above fair price
    const gougingRatio = price / Math.max(fairPrice, 0.01);
    
    // Penalty increases dramatically when price is high relative to quality
    if (gougingRatio > 1.5) { // 50% above fair price
      const penalty = Math.min(0.8, (gougingRatio - 1.5) * 0.4); // Up to 80% penalty
      return 1.0 - penalty;
    }
    
    // Bonus for good value (low price relative to quality)
    if (gougingRatio < 0.8) { // 20% below fair price
      const bonus = Math.min(0.3, (0.8 - gougingRatio) * 0.2); // Up to 30% bonus
      return 1.0 + bonus;
    }
    
    return 1.0; // No penalty/bonus
  }

  function calculateMarketingEffectiveness(marketingPct) {
    // Diminishing returns after 20%
    if (marketingPct <= 0.2) {
      return marketingPct / 0.2; // 0-1 linear up to 20%
    }
    // After 20%, diminishing returns
    const extra = (marketingPct - 0.2) / 0.2; // 0-1 over 20%-40%
    return 1.0 + (0.4 * extra); // Max 1.4 at 40%
  }

  function recalc() {
    console.log('recalc called');
    
    const pLvl = parseInt(priceLevel.value, 10);
    const qLvl = parseInt(qualityLevel.value, 10);
    const mPct = parseInt(marketingPct.value, 10) / 100;
    const comp = clamp(parseInt(competitors.value || '4', 10), 1, 10);

    priceLevelVal.textContent = pLvl;
    qualityLevelVal.textContent = qLvl;
    marketingPctVal.textContent = Math.round(mPct * 100) + '%';

    const price = mapPrice(pLvl);
    const cost = mapCost(qLvl);
    const fair = 1.50 + (qLvl - 5) * 0.15;
    
    // Calculate external factors affecting total market size
    const weatherMult = calculateWeatherMultiplier(weather.value);
    const economyMult = calculateEconomyMultiplier(economy.value);
    const totalDemandMultiplier = weatherMult * economyMult;
    
    // Calculate reputation penalty for price gouging
    const reputationMultiplier = calculateReputationPenalty(pLvl, qLvl);
    
    // Calculate marketing effectiveness
    const marketingEffectiveness = calculateMarketingEffectiveness(mPct);
    
    // Attractiveness = reputation  marketing effectiveness  quality appeal
    const qualityAppeal = qLvl / 10; // 0.1 to 1.0
    const attract = reputationMultiplier * marketingEffectiveness * qualityAppeal;
    
    // Assume other competitors have average attractiveness of 1.0 each
    const others = Math.max(0, comp - 1) * 1.0;
    const share = attract / (attract + others);
    
    // Total market demand affected by weather and economy
    const baseDemand = 1000;
    const totalDemand = Math.floor(baseDemand * totalDemandMultiplier);
    const units = Math.floor(totalDemand * share);

    const revenue = price * units;
    const ingCost = cost * units;
    const mSpend = revenue * mPct;
    const profit = revenue - ingCost - mSpend;

    // Debug logging
    console.log('Weather:', weather.value, 'Economy:', economy.value, 'Total Demand:', totalDemand, 'Share:', (share * 100).toFixed(1) + '%', 'Units:', units);

    priceDollars.textContent = toFixed2(price);
    costDollars.textContent = toFixed2(cost);
    fairPrice.textContent = toFixed2(fair);
    mktEff.textContent = Math.round(marketingEffectiveness * 100);
    demandMult.textContent = toFixed2(totalDemandMultiplier);
    attractIdx.textContent = toFixed2(attract);
    marketShare.textContent = toFixed2(share * 100);

    unitsEl.textContent = units.toString();
    revenueEl.textContent = toFixed2(revenue);
    ingredientCostEl.textContent = toFixed2(ingCost);
    marketingSpendEl.textContent = toFixed2(mSpend);
    profitEl.textContent = toFixed2(profit);
  }

  [priceLevel, qualityLevel, marketingPct, weather, economy, competitors].forEach(el => {
    if (el) {
      el.addEventListener('input', recalc);
    }
  });

  recalc();
})();