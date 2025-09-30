/**
 * Test bot names display
 */

const BotNameModule = require('./server/modules/botNameModule');

function testBotNamesDisplay() {
  console.log('🧪 Testing Bot Names Display...\n');

  const botNames = new BotNameModule();
  
  // Create test participants with actual personality names from server
  const participants = [
    { id: 'bot1', name: 'Bot 1', isHuman: false, personality: { name: 'Aggressive', bidStrategy: 'high' } },
    { id: 'bot2', name: 'Bot 2', isHuman: false, personality: { name: 'Conservative', bidStrategy: 'low' } },
    { id: 'bot3', name: 'Bot 3', isHuman: false, personality: { name: 'Momentum Trader', bidStrategy: 'medium' } },
    { id: 'bot4', name: 'Bot 4', isHuman: false, personality: { name: 'Value Investor', bidStrategy: 'low' } },
    { id: 'bot5', name: 'Bot 5', isHuman: false, personality: { name: 'Growth Focused', bidStrategy: 'high' } },
    { id: 'bot6', name: 'Bot 6', isHuman: false, personality: { name: 'Diversified', bidStrategy: 'medium' } },
    { id: 'bot7', name: 'Bot 7', isHuman: false, personality: { name: 'Scavenger 1', bidStrategy: 'scavenger' } },
    { id: 'bot8', name: 'Bot 8', isHuman: false, personality: { name: 'Scavenger 2', bidStrategy: 'scavenger' } },
    { id: 'bot9', name: 'Bot 9', isHuman: false, personality: { name: 'Scavenger 3', bidStrategy: 'scavenger' } },
    { id: 'human1', name: 'Test Player', isHuman: true, personality: null }
  ];
  
  console.log('📊 Before updating names:');
  participants.forEach(p => {
    console.log(`  ${p.name} (${p.personality?.bidStrategy || 'human'})`);
  });
  
  console.log('\n📊 After updating names:');
  participants.forEach(p => {
    botNames.updateBotName(p);
    console.log(`  ${p.name} (${p.personality?.bidStrategy || 'human'})`);
  });
  
  console.log('\n✅ Bot names test completed!');
}

testBotNamesDisplay();
