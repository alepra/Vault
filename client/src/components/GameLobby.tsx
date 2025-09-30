import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState } from '../types/game';
import { Users, Play, Settings, Trophy } from 'lucide-react';

interface GameLobbyProps {
  socket: Socket | null;
  gameState: GameState;
}

const GameLobby: React.FC<GameLobbyProps> = ({ socket, gameState }) => {
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinGame = () => {
    if (!socket || !playerName.trim()) return;
    
    setIsJoining(true);
    socket.emit('joinGame', { name: playerName.trim() });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit('startGame');
  };

  const isHost = gameState.participants.length > 0 && gameState.participants[0].isHuman;
  const canStart = gameState.participants.length >= 2;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍋</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Lemonade Stand Stock Market
          </h1>
          <p className="text-xl text-gray-600">
            Compete with AI bots to buy stocks, become CEO, and build the most profitable lemonade empire!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Users className="mr-2 text-lemon-500" />
              Game Rules
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="text-lemon-500 mr-2">•</span>
                Start with $1,000 to invest in 4 lemonade stand companies
              </li>
              <li className="flex items-start">
                <span className="text-lemon-500 mr-2">•</span>
                Buy 35%+ of a company to become CEO and control its operations
              </li>
              <li className="flex items-start">
                <span className="text-lemon-500 mr-2">•</span>
                Set prices, quality, and marketing to maximize profits
              </li>
              <li className="flex items-start">
                <span className="text-lemon-500 mr-2">•</span>
                Compete with 11 AI bots with different strategies
              </li>
              <li className="flex items-start">
                <span className="text-lemon-500 mr-2">•</span>
                Win by having the highest net worth at the end of summer
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <Settings className="mr-2 text-lemon-500" />
              Game Settings
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Turn Length</span>
                <span className="text-lemon-600 font-semibold">30 seconds</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Game Duration</span>
                <span className="text-lemon-600 font-semibold">Summer Season</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Starting Capital</span>
                <span className="text-lemon-600 font-semibold">$1,000</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Companies</span>
                <span className="text-lemon-600 font-semibold">4 Lemonade Stands</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
            <Users className="mr-2 text-lemon-500" />
            Players ({gameState.participants.length})
          </h2>
          
          <div className="grid gap-3 mb-8">
            {gameState.participants.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  participant.isHuman 
                    ? 'bg-lemon-50 border-2 border-lemon-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    participant.isHuman ? 'bg-lemon-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="font-medium">
                    {participant.name}
                    {participant.isHuman && ' (You)'}
                  </span>
                  {index === 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-lemon-200 text-lemon-800 rounded-full">
                      Host
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  ${participant.capital.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {gameState.participants.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-600">No players yet. Be the first to join!</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {!gameState.participants.some(p => p.isHuman) && (
              <div className="flex-1">
                <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="playerName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lemon-500 focus:border-transparent"
                    maxLength={20}
                  />
                  <button
                    onClick={handleJoinGame}
                    disabled={!playerName.trim() || isJoining}
                    className="px-6 py-2 bg-lemon-500 text-white rounded-lg hover:bg-lemon-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isJoining ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Join Game
                  </button>
                </div>
              </div>
            )}

            {isHost && (
              <div className="flex-1 flex justify-end">
                <button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-lg font-semibold"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Start Game
                </button>
              </div>
            )}
          </div>

          {isHost && !canStart && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Need at least 2 players to start the game
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameLobby;


