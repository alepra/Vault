// Test script to debug human participant detection
const GameStateModule = require('./server/modules/gameStateModule');

const gameState = new GameStateModule();

// Add a human participant
console.log('Adding human participant...');
const humanParticipant = gameState.addParticipant('TestHuman', true);
console.log('Human participant:', humanParticipant);

// Add some AI participants
console.log('Adding AI participants...');
for (let i = 0; i < 3; i++) {
  const aiParticipant = gameState.addParticipant(`Bot${i}`, false);
  console.log(`AI participant ${i}:`, aiParticipant);
}

// Check the game state
const currentGame = gameState.getGameState();
console.log('\nCurrent game state:');
console.log('Total participants:', currentGame.participants.length);
console.log('Participants:');
currentGame.participants.forEach((p, index) => {
  console.log(`  ${index}: ${p.name} - isHuman: ${p.isHuman}`);
});

// Test the filter
const humanParticipants = currentGame.participants.filter(p => p.isHuman);
console.log('\nHuman participants filter result:');
console.log('Count:', humanParticipants.length);
console.log('Participants:', humanParticipants.map(p => `${p.name} (${p.isHuman})`));

