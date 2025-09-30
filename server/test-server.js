const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.get('/', (req, res) => {
  res.json({ message: 'Test server working' });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Keep server alive
setInterval(() => {
  console.log('Server still running...');
}, 10000);

