import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const App: React.FC = () => {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [gameData, setGameData] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [participantName, setParticipantName] = useState('');
  const [participant, setParticipant] = useState<any>(null);

  useEffect(() => {
    // Backend URL from environment variable or default
    const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    // Test backend connection
    fetch(`${BACKEND_URL}/api/health`)
      .then(response => response.json())
      .then(data => {
        if (data.status === 'ok') {
          setBackendStatus('connected');
          // Initialize socket connection
          const newSocket = io(BACKEND_URL);
          setSocket(newSocket);

          newSocket.on('connect', () => {
            console.log('Connected to backend');
          });

          newSocket.on('gameStateUpdate', (game) => {
            console.log('Game state updated:', game);
            setGameData(game);
          });

          newSocket.on('participantUpdate', (participant) => {
            console.log('Participant updated:', participant);
            setParticipant(participant);
          });

          newSocket.on('disconnect', () => {
            console.log('Disconnected from backend');
            setBackendStatus('disconnected');
          });
        } else {
          setBackendStatus('disconnected');
        }
      })
      .catch(error => {
        console.error('Backend connection failed:', error);
        setBackendStatus('disconnected');
      });
  }, []);

  const joinGame = () => {
    if (socket && participantName.trim()) {
      socket.emit('joinGame', { name: participantName.trim() });
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('startGame');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍋</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Lemonade Stand Stock Market
          </h1>
          <p className="text-xl text-gray-600">
            Real-time stock trading simulation
          </p>
        </div>

        {/* Status Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${backendStatus === 'connected' ? 'bg-green-500' : backendStatus === 'checking' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">Backend Server:</span>
              <span className={backendStatus === 'connected' ? 'text-green-600' : backendStatus === 'checking' ? 'text-yellow-600' : 'text-red-600'}>
                {backendStatus === 'connected' ? 'Connected' : backendStatus === 'checking' ? 'Checking...' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${socket ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">WebSocket:</span>
              <span className={socket ? 'text-green-600' : 'text-red-600'}>
                {socket ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Game Lobby */}
        {backendStatus === 'connected' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Game Lobby</h2>
            
            {!participant ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your name:
                  </label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your name"
                  />
                </div>
                <button
                  onClick={joinGame}
                  disabled={!participantName.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Join Game
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-md">
                  <p className="text-green-800">
                    ✅ Welcome, {participant.name}! You're in the game.
                  </p>
                  <p className="text-sm text-green-600 mt-1">
                    Capital: ${participant.capital}
                  </p>
                </div>
                
                {gameData && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Game Status:</h3>
                    <p>Phase: {gameData.phase}</p>
                    <p>Participants: {gameData.participants?.length || 0}</p>
                    <p>Turn: {gameData.turn}</p>
                    
                    {gameData.phase === 'lobby' && (
                      <button
                        onClick={startGame}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Start Game
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Game Data Display */}
        {gameData && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Game Data</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(gameData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;