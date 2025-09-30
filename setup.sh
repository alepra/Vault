#!/bin/bash

echo "Setting up Lemonade Stand Stock Market Game..."
echo

echo "Installing root dependencies..."
npm install

echo
echo "Installing client dependencies..."
cd client
npm install
cd ..

echo
echo "Creating environment file..."
echo "NODE_ENV=development" > server/.env
echo "PORT=3001" >> server/.env
echo "DB_PATH=./game.db" >> server/.env

echo
echo "Setup complete!"
echo
echo "To start the game:"
echo "  npm run dev"
echo
echo "Then open http://localhost:3000 in your browser"
echo


