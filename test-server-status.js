/**
 * Server Status Test
 * Tests if the server is running and responding to basic requests
 */

const http = require('http');

console.log('🔍 Testing Server Status...\n');

// Test 1: Check if server is running
function testServerConnection() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3001/api/game?session=test&fresh=true', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const gameState = JSON.parse(data);
                    resolve({
                        status: 'running',
                        response: gameState,
                        statusCode: res.statusCode
                    });
                } catch (error) {
                    reject({
                        status: 'error',
                        message: 'Invalid JSON response',
                        data: data
                    });
                }
            });
        });
        
        req.on('error', (error) => {
            reject({
                status: 'not_running',
                message: error.message
            });
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject({
                status: 'timeout',
                message: 'Server did not respond within 5 seconds'
            });
        });
    });
}

// Test 2: Check server endpoints
async function testEndpoints() {
    const endpoints = [
        '/api/game?session=test&fresh=true',
        '/api/game?session=test',
        '/api/reset'
    ];
    
    console.log('📡 Testing server endpoints...');
    
    for (const endpoint of endpoints) {
        try {
            const result = await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:3001${endpoint}`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({
                            endpoint: endpoint,
                            statusCode: res.statusCode,
                            data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
                        });
                    });
                });
                
                req.on('error', reject);
                req.setTimeout(3000, () => {
                    req.destroy();
                    reject(new Error('Timeout'));
                });
            });
            
            console.log(`✅ ${endpoint}: ${result.statusCode}`);
            if (result.statusCode !== 200) {
                console.log(`   Response: ${result.data}`);
            }
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
}

// Run tests
async function runTests() {
    try {
        console.log('Test 1: Server Connection...');
        const result = await testServerConnection();
        
        if (result.status === 'running') {
            console.log('✅ Server is running and responding');
            console.log(`📊 Status Code: ${result.statusCode}`);
            console.log(`📊 Game State:`, {
                id: result.response.id,
                phase: result.response.phase,
                companies: result.response.companies?.length || 0,
                participants: result.response.participants?.length || 0
            });
            
            console.log('\nTest 2: Endpoint Testing...');
            await testEndpoints();
            
        } else {
            console.log(`❌ Server issue: ${result.message}`);
        }
        
    } catch (error) {
        console.log(`❌ Server test failed: ${error.message}`);
        
        if (error.status === 'not_running') {
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Make sure the server is running: node server/index.js');
            console.log('2. Check if port 3001 is available');
            console.log('3. Verify the server directory structure');
        }
    }
}

runTests();

