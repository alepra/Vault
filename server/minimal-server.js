const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

console.log('🚀 Starting minimal server with WebSocket support...');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Minimal server is running',
    timestamp: new Date().toISOString()
  });
});

// Basic game endpoint
app.get('/api/game', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Game endpoint working',
    participants: [],
    phase: 'waiting'
  });
});

// Add ledger endpoint (404 fix)
app.get('/api/ledger', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Ledger endpoint working',
    ledgers: {}
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Handle join game
  socket.on('joinGame', (data) => {
    console.log('🎮 Join game request:', data);
    const participant = {
      id: 'test-participant-' + Date.now(),
      name: data.name || 'Test Player',
      cash: 10000,
      netWorth: 10000
    };
    
    socket.emit('gameStateUpdate', {
      phase: 'lobby',
      participants: [participant],
      companies: [
        { id: 1, name: 'Company 1', totalSharesAllocated: 0 },
        { id: 2, name: 'Company 2', totalSharesAllocated: 0 },
        { id: 3, name: 'Company 3', totalSharesAllocated: 0 },
        { id: 4, name: 'Company 4', totalSharesAllocated: 0 }
      ]
    });
  });
  
  // Handle start game
  socket.on('startGame', (data) => {
    console.log('🚀 Start game request:', data);
    socket.emit('gameStateUpdate', {
      phase: 'ipo',
      participants: [{ id: 'test-participant', name: 'Test Player', cash: 10000, netWorth: 10000 }],
      companies: [
        { id: 1, name: 'Company 1', totalSharesAllocated: 0 },
        { id: 2, name: 'Company 2', totalSharesAllocated: 0 },
        { id: 3, name: 'Company 3', totalSharesAllocated: 0 },
        { id: 4, name: 'Company 4', totalSharesAllocated: 0 }
      ]
    });
  });
  
  // Handle IPO bids
  socket.on('submitIPOBids', (data) => {
    console.log('📤 IPO bids submitted:', data);
    // For now, just acknowledge receipt
    socket.emit('ipoBidsReceived', { message: 'Bids received successfully' });
  });
  
  // Handle reset game
  socket.on('resetGame', (data) => {
    console.log('🔄 Reset game request:', data);
    // Send back to lobby
    socket.emit('gameStateUpdate', {
      phase: 'lobby',
      participants: [],
      companies: [
        { id: 1, name: 'Company 1', totalSharesAllocated: 0 },
        { id: 2, name: 'Company 2', totalSharesAllocated: 0 },
        { id: 3, name: 'Company 3', totalSharesAllocated: 0 },
        { id: 4, name: 'Company 4', totalSharesAllocated: 0 }
      ]
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎮 Game endpoint: http://localhost:${PORT}/api/game`);
  console.log(`📊 Ledger endpoint: http://localhost:${PORT}/api/ledger`);
  console.log('🔌 WebSocket support enabled');
  console.log('⏳ Server will stay running...');
});

// Keep server alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down minimal server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('📝 Minimal server created with WebSocket support');
