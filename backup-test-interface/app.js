(function() {
  const BASE_DEMAND = 1000;
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

  const unitsEl = document.getElementById('units');
  const revenueEl = document.getElementById('revenue');
  const ingredientCostEl = document.getElementById('ingredientCost');
  const marketingSpendEl = document.getElementById('marketingSpend');
  const profitEl = document.getElementById('profit');

  function lerp(min, max, t) { return min + (max - min) * t; }
  function toFixed2(n) { return Number(n).toFixed(2); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function mapPrice(level) {
    const t = (level - 1) / 9; // 0..1
    return lerp(0.75, 2.25, t);
  }
  function mapCost(level) {
    const t = (level - 1) / 9; // 0..1
    return lerp(0.50, 2.00, t);
  }
  function fairPriceFromQuality(qLevel) {
    // Baseline .50 at quality 5. Adjust ~ .15 per level diff
    const diff = qLevel - 5;
    return 1.50 + diff * 0.15;
  }
  function marketingEffectiveness(pct) {
    // pct is 0..0.4; diminishing returns after 20%
    const m = clamp(pct, 0, 0.4);
    if (m <= 0.2) {
      return m / 0.2; // 0..1 linear up to 20%
    }
    // After 20%, taper so +20% more only yields +0.4 additional effectiveness
    const extra = (m - 0.2) / 0.2; // 0..1 over 20%-40%
    return 1 + 0.4 * extra; // max 1.4 at 40%
  }
  function weatherMultiplier(kind) {
    switch (kind) {
      case 'hot': return 1.3;
      case 'cold': return 0.7;
      case 'rainy': return 0.6;
      default: return 1.0;
    }
  }
  function economyMultiplier(kind) {
    switch (kind) {
      case 'good': return 1.1;
      case 'bad': return 0.9;
      default: return 1.0;
    }
  }
  function priceCompetitiveness(price, fair) {
    // Higher when price is <= fair; penalize when above fair
    if (price <= fair) {
      return clamp(fair / Math.max(price, 0.01), 0.5, 1.5); // up to 1.5 boost
    }
    const penalty = clamp(price / Math.max(fair, 0.01), 1.0, 1.6);
    return 1 / penalty; // 1..~0.62
  }
  function qualityAppeal(qLevel) {
    return clamp(qLevel / 10, 0.1, 1.0);
  }
  function computeAttractiveness(price, fair, qLevel, mktEffVal) {
    const wPrice = 0.4, wQuality = 0.3, wMkt = 0.3;
    const priceScore = priceCompetitiveness(price, fair); // ~0.6..1.5
    const qualityScore = qualityAppeal(qLevel); // 0.1..1.0
    const mktScore = mktEffVal; // 0..1.4
    // Normalize to an index around ~1.0 typical
    const idx = (wPrice * priceScore) + (wQuality * qualityScore) + (wMkt * mktScore);
    return idx;
  }

  function recalc() { console.log(" recalc called\);
    const pLvl = parseInt(priceLevel.value, 10);
    const qLvl = parseInt(qualityLevel.value, 10);
    const mPct = parseInt(marketingPct.value, 10) / 100; // fraction
    const comp = clamp(parseInt(competitors.value || '4', 10), 1, 10);

    priceLevelVal.textContent = pLvl;
    qualityLevelVal.textContent = qLvl;
    marketingPctVal.textContent = Math.round(mPct * 100) + '%';

    const price = mapPrice(pLvl);
    const cost = mapCost(qLvl);
    const fair = fairPriceFromQuality(qLvl);
    const mEff = marketingEffectiveness(mPct);
    const demMult = weatherMultiplier(weather.value) * economyMultiplier(economy.value);

    const attract = computeAttractiveness(price, fair, qLvl, mEff);
    // Assume other competitors average index ~1.0 each
    const others = Math.max(0, comp - 1) * 1.0;
    const share = attract / (attract + others);
    const totalDemand = BASE_DEMAND * demMult;
    const units = Math.floor(totalDemand * share);

    const revenue = price * units;
    const ingCost = cost * units;
    const mSpend = revenue * mPct;
    const profit = revenue - ingCost - mSpend;

    priceDollars.textContent = toFixed2(price);
    costDollars.textContent = toFixed2(cost);
    fairPrice.textContent = toFixed2(fair);
    mktEff.textContent = Math.round(mEff * 100);
    demandMult.textContent = toFixed2(demMult);
    attractIdx.textContent = toFixed2(attract);

    unitsEl.textContent = units.toString();
    revenueEl.textContent = toFixed2(revenue);
    ingredientCostEl.textContent = toFixed2(ingCost);
    marketingSpendEl.textContent = toFixed2(mSpend);
    profitEl.textContent = toFixed2(profit);
  }

  [priceLevel, qualityLevel, marketingPct, weather, economy, competitors].forEach(el => {
    el.addEventListener('input', recalc);
  });

  recalc();
})();