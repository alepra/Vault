import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Participant, Company } from '../types/game';
import { Settings, TrendingUp, DollarSign, Target, BarChart3, Users } from 'lucide-react';

interface CompanyDashboardProps {
  socket: Socket | null;
  gameState: GameState;
  participant: Participant | null;
}

const CompanyDashboard: React.FC<CompanyDashboardProps> = ({ socket, gameState, participant }) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [priceLevel, setPriceLevel] = useState<number>(5);
  const [qualityLevel, setQualityLevel] = useState<number>(5);
  const [marketingPercentage, setMarketingPercentage] = useState<number>(10);

  useEffect(() => {
    if (participant?.ceoCompanyId) {
      setSelectedCompany(participant.ceoCompanyId);
    } else if (gameState.companies.length > 0) {
      setSelectedCompany(gameState.companies[0].id);
    }
  }, [participant, gameState.companies]);

  useEffect(() => {
    if (selectedCompany) {
      const company = gameState.companies.find(c => c.id === selectedCompany);
      if (company) {
        setPriceLevel(company.price);
        setQualityLevel(company.quality);
        setMarketingPercentage(company.marketing * 100);
      }
    }
  }, [selectedCompany, gameState.companies]);

  const handleUpdateCompany = () => {
    if (!socket || !selectedCompany) return;

    socket.emit('updateCompany', {
      companyId: selectedCompany,
      price: priceLevel,
      quality: qualityLevel,
      marketing: marketingPercentage / 100
    });
  };

  const selectedCompanyData = gameState.companies.find(c => c.id === selectedCompany);
  const isCEO = participant?.ceoCompanyId === selectedCompany;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  // Calculate derived values (same logic as test interface)
  const mapPrice = (level: number) => 0.75 + (2.25 - 0.75) * ((level - 1) / 9);
  const mapCost = (level: number) => 0.50 + (2.00 - 0.50) * ((level - 1) / 9);
  
  const calculateWeatherMultiplier = (weather: string) => {
    switch (weather) {
      case 'hot': return 1.4;
      case 'cold': return 0.6;
      case 'rainy': return 0.4;
      default: return 1.0;
    }
  };

  const calculateEconomyMultiplier = (economy: string) => {
    switch (economy) {
      case 'good': return 1.2;
      case 'bad': return 0.8;
      default: return 1.0;
    }
  };

  const calculateReputationPenalty = (priceLevel: number, qualityLevel: number) => {
    const price = mapPrice(priceLevel);
    const quality = qualityLevel;
    const fairPrice = 1.50 + (quality - 5) * 0.15;
    const gougingRatio = price / Math.max(fairPrice, 0.01);
    
    if (gougingRatio > 1.5) {
      const penalty = Math.min(0.8, (gougingRatio - 1.5) * 0.4);
      return 1.0 - penalty;
    }
    
    if (gougingRatio < 0.8) {
      const bonus = Math.min(0.3, (0.8 - gougingRatio) * 0.2);
      return 1.0 + bonus;
    }
    
    return 1.0;
  };

  const calculateMarketingEffectiveness = (marketingPct: number) => {
    if (marketingPct <= 0.2) {
      return marketingPct / 0.2;
    }
    const extra = (marketingPct - 0.2) / 0.2;
    return 1.0 + (0.4 * extra);
  };

  const currentPrice = mapPrice(priceLevel);
  const currentCost = mapCost(qualityLevel);
  const fairPrice = 1.50 + (qualityLevel - 5) * 0.15;
  const weatherMult = calculateWeatherMultiplier(gameState.weather);
  const economyMult = calculateEconomyMultiplier(gameState.economy);
  const totalDemandMultiplier = weatherMult * economyMult;
  const reputationMultiplier = calculateReputationPenalty(priceLevel, qualityLevel);
  const marketingEffectiveness = calculateMarketingEffectiveness(marketingPercentage / 100);
  const qualityAppeal = qualityLevel / 10;
  const attractiveness = reputationMultiplier * marketingEffectiveness * qualityAppeal;
  const competitors = Math.max(1, gameState.companies.length - 1);
  const others = competitors * 1.0;
  const marketShare = attractiveness / (attractiveness + others);
  const baseDemand = 1000;
  const totalDemand = Math.floor(baseDemand * totalDemandMultiplier);
  const units = Math.floor(totalDemand * marketShare);
  const revenue = currentPrice * units;
  const ingredientCost = currentCost * units;
  const marketingSpend = revenue * (marketingPercentage / 100);
  const profit = revenue - ingredientCost - marketingSpend;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Management</h1>
        <p className="text-gray-600">
          {isCEO ? 'You are the CEO! Control your company\'s operations.' : 'View company performance and management options.'}
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Company Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="mr-2 text-lemon-500" />
              Your Companies
            </h2>
            
            <div className="space-y-3">
              {gameState.companies
                .filter(company => participant && participant.shares[company.id] > 0)
                .map((company) => {
                  const ownership = (participant?.shares[company.id] || 0) / company.shares;
                  const isCEO = ownership >= 0.35;
                  
                  return (
                    <div
                      key={company.id}
                      onClick={() => setSelectedCompany(company.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCompany === company.id 
                          ? 'border-lemon-500 bg-lemon-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                        {isCEO && (
                          <span className="px-2 py-1 text-xs bg-lemon-200 text-lemon-800 rounded-full">
                            CEO
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Your Shares: {participant?.shares[company.id] || 0}</div>
                        <div>Ownership: {formatPercent(ownership)}</div>
                        <div>Current Price: {formatCurrency(company.currentPrice)}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Middle Column - Management Controls */}
        <div className="lg:col-span-1">
          {selectedCompanyData && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="mr-2 text-lemon-500" />
                Management Controls
              </h2>
              
              <div className="space-y-6">
                {/* Price Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Level (1-10): {priceLevel}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={priceLevel}
                    onChange={(e) => setPriceLevel(parseInt(e.target.value))}
                    disabled={!isCEO}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0.75</span>
                    <span className="font-semibold">{formatCurrency(currentPrice)}</span>
                    <span>$2.25</span>
                  </div>
                </div>

                {/* Quality Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality Level (1-10): {qualityLevel}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={qualityLevel}
                    onChange={(e) => setQualityLevel(parseInt(e.target.value))}
                    disabled={!isCEO}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>$0.50</span>
                    <span className="font-semibold">{formatCurrency(currentCost)}</span>
                    <span>$2.00</span>
                  </div>
                </div>

                {/* Marketing Control */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marketing (% of revenue): {marketingPercentage}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={marketingPercentage}
                    onChange={(e) => setMarketingPercentage(parseInt(e.target.value))}
                    disabled={!isCEO}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-semibold">{marketingPercentage}%</span>
                    <span>40%</span>
                  </div>
                </div>

                {isCEO && (
                  <button
                    onClick={handleUpdateCompany}
                    className="w-full py-3 bg-lemon-500 text-white rounded-lg hover:bg-lemon-600 font-semibold"
                  >
                    Update Company Settings
                  </button>
                )}

                {!isCEO && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      You need 35% ownership to become CEO and control this company.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Performance Metrics */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="mr-2 text-lemon-500" />
              Performance Metrics
            </h2>
            
            {selectedCompanyData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Price per cup:</span>
                    <div className="font-bold text-lg">{formatCurrency(currentPrice)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Cost per cup:</span>
                    <div className="font-bold text-lg">{formatCurrency(currentCost)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Fair price:</span>
                    <div className="font-bold">{formatCurrency(fairPrice)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Marketing effectiveness:</span>
                    <div className="font-bold">{formatPercent(marketingEffectiveness)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Demand multiplier:</span>
                    <div className="font-bold">{totalDemandMultiplier.toFixed(2)}x</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Attractiveness:</span>
                    <div className="font-bold">{attractiveness.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Market share:</span>
                    <div className="font-bold">{formatPercent(marketShare)}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Projected Results</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Units sold:</span>
                      <span className="font-semibold">{units}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-semibold">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Ingredient cost:</span>
                      <span className="font-semibold">{formatCurrency(ingredientCost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Marketing spend:</span>
                      <span className="font-semibold">{formatCurrency(marketingSpend)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-medium">Profit:</span>
                      <span className={`font-bold text-lg ${
                        profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(profit)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <div className="font-medium mb-1">Market Conditions</div>
                    <div>Weather: {gameState.weather} ({formatPercent(weatherMult - 1)})</div>
                    <div>Economy: {gameState.economy} ({formatPercent(economyMult - 1)})</div>
                    <div>Total Demand: {totalDemand} cups</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;

