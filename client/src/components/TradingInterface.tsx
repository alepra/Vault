import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, Participant, Company, Order } from '../types/game';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Clock, Target } from 'lucide-react';

interface TradingInterfaceProps {
  socket: Socket | null;
  gameState: GameState;
  participant: Participant | null;
}

const TradingInterface: React.FC<TradingInterfaceProps> = ({ socket, gameState, participant }) => {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [orderMode, setOrderMode] = useState<'market' | 'limit'>('market');
  const [shares, setShares] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (gameState.companies.length > 0 && !selectedCompany) {
      setSelectedCompany(gameState.companies[0].id);
    }
  }, [gameState.companies, selectedCompany]);

  useEffect(() => {
    if (selectedCompany) {
      const company = gameState.companies.find(c => c.id === selectedCompany);
      if (company) {
        setPrice(company.currentPrice);
      }
    }
  }, [selectedCompany, gameState.companies]);

  const handlePlaceOrder = () => {
    if (!socket || !participant || !selectedCompany) return;

    const order: Omit<Order, 'id' | 'timestamp' | 'filled' | 'filledShares' | 'filledPrice'> = {
      participantId: participant.id,
      companyId: selectedCompany,
      type: orderType,
      shares,
      price: orderMode === 'market' ? 0 : price // 0 means market order
    };

    socket.emit('placeOrder', order);
  };

  const handleCancelOrder = (orderId: string) => {
    if (!socket) return;
    socket.emit('cancelOrder', orderId);
  };

  const selectedCompanyData = gameState.companies.find(c => c.id === selectedCompany);
  const participantShares = selectedCompany ? (participant?.shares[selectedCompany] || 0) : 0;
  const effectivePrice = orderMode === 'market' ? (selectedCompanyData?.currentPrice || 0) : price;
  const maxBuyShares = selectedCompany && participant ? 
    Math.floor(participant.remainingCapital / effectivePrice) : 0;

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Company List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <PieChart className="mr-2 text-lemon-500" />
              Companies
            </h2>
            <div className="space-y-3">
              {gameState.companies.map((company) => {
                const priceChange = company.currentPrice - company.ipoPrice;
                const priceChangePercent = (priceChange / company.ipoPrice) * 100;
                const isSelected = selectedCompany === company.id;
                
                return (
                  <div
                    key={company.id}
                    onClick={() => setSelectedCompany(company.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-lemon-500 bg-lemon-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      <div className="text-right">
                        <div className="font-bold text-lg">{formatCurrency(company.currentPrice)}</div>
                        <div className={`text-sm flex items-center ${
                          priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {priceChange >= 0 ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {formatCurrency(Math.abs(priceChange))} ({formatPercent(priceChangePercent / 100)})
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>Market Cap: {formatCurrency(company.currentPrice * company.shares)}</div>
                      <div>CEO: {company.ceoId ? 'Bot' : 'None'}</div>
                      <div>Your Shares: {participant?.shares[company.id] || 0}</div>
                      <div>Ownership: {formatPercent((participant?.shares[company.id] || 0) / company.shares)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column - Trading Interface */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="mr-2 text-lemon-500" />
              Trading
            </h2>
            
            {selectedCompanyData && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">{selectedCompanyData.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Current Price:</span>
                      <div className="font-bold text-lg">{formatCurrency(selectedCompanyData.currentPrice)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Shares:</span>
                      <div className="font-bold">{participantShares}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Your Ownership:</span>
                      <div className="font-bold">{formatPercent(participantShares / selectedCompanyData.shares)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">CEO Threshold:</span>
                      <div className="font-bold">35%</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Type
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setOrderType('buy')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                          orderType === 'buy'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Buy
                      </button>
                      <button
                        onClick={() => setOrderType('sell')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                          orderType === 'sell'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Sell
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Mode
                    </label>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setOrderMode('market')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                          orderMode === 'market'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Market Order
                      </button>
                      <button
                        onClick={() => setOrderMode('limit')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium ${
                          orderMode === 'limit'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        Limit Order
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {orderMode === 'market' 
                        ? 'Executes immediately at current market price'
                        : 'Executes only at your specified price or better'
                      }
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shares
                    </label>
                    <input
                      type="number"
                      value={shares}
                      onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max={orderType === 'buy' ? maxBuyShares : participantShares}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lemon-500 focus:border-transparent"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {orderType === 'buy' 
                        ? `Max: ${maxBuyShares} shares (${formatCurrency(participant?.remainingCapital || 0)} available)`
                        : `Max: ${participantShares} shares owned`
                      }
                    </div>
                  </div>

                  {orderMode === 'limit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price per Share
                      </label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Math.max(0.01, parseFloat(e.target.value) || 0))}
                        step="0.01"
                        min="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lemon-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {orderMode === 'market' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Market Price
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                        {formatCurrency(selectedCompanyData?.currentPrice || 0)} per share
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Market orders execute at the current best available price
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-semibold">
                          {formatCurrency(shares * (orderMode === 'market' ? (selectedCompanyData?.currentPrice || 0) : price))}
                        </span>
                      </div>
                      {orderType === 'buy' && (
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Remaining Capital:</span>
                          <span>
                            {formatCurrency((participant?.remainingCapital || 0) - (shares * (orderMode === 'market' ? (selectedCompanyData?.currentPrice || 0) : price)))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={!participant || (orderType === 'buy' && shares * (orderMode === 'market' ? (selectedCompanyData?.currentPrice || 0) : price) > (participant?.remainingCapital || 0)) || (orderType === 'sell' && shares > participantShares)}
                    className="w-full py-3 bg-lemon-500 text-white rounded-lg hover:bg-lemon-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    Place {orderType === 'buy' ? 'Buy' : 'Sell'} {orderMode === 'market' ? 'Market' : 'Limit'} Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Portfolio & Orders */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* Portfolio */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="mr-2 text-lemon-500" />
                Your Portfolio
              </h2>
              
              {participant && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Cash:</span>
                      <div className="font-bold text-lg">{formatCurrency(participant.remainingCapital)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Spent:</span>
                      <div className="font-bold">{formatCurrency(participant.totalSpent)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">Holdings</h3>
                    {Object.entries(participant.shares).map(([companyId, shareCount]) => {
                      if (shareCount === 0) return null;
                      const company = gameState.companies.find(c => c.id === companyId);
                      if (!company) return null;
                      
                      const value = shareCount * company.currentPrice;
                      const percentage = (shareCount / company.shares) * 100;
                      const isCEO = percentage >= 35;
                      
                      return (
                        <div key={companyId} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">{company.name}</div>
                              <div className="text-sm text-gray-600">
                                {shareCount} shares ({formatPercent(percentage / 100)})
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(value)}</div>
                              {isCEO && (
                                <div className="text-xs text-lemon-600 font-medium">CEO</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Active Orders */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="mr-2 text-lemon-500" />
                Active Orders
              </h2>
              
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No active orders</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {order.type === 'buy' ? 'Buy' : 'Sell'} {order.shares} shares
                          </div>
                          <div className="text-sm text-gray-600">
                            {gameState.companies.find(c => c.id === order.companyId)?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(order.price)}</div>
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingInterface;


