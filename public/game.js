/**
 * Clean Architecture - Game Client
 * Bright, intuitive interface for the lemonade stand stock market game
 */

class GameClient {
    constructor() {
        this.socket = null;
        this.gameState = null;
        this.participantId = null;
        this.participantName = null;
        this.isConnected = false;
        
        this.initializeSocket();
        this.setupEventListeners();
    }

    initializeSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔌 Connected to server');
            this.updateConnectionStatus(true);
        });
        
        this.socket.on('disconnect', () => {
            console.log('🔌 Disconnected from server');
            this.updateConnectionStatus(false);
        });
        
        this.socket.on('gameStateUpdate', (state) => {
            console.log('📊 Game state updated:', state.phase);
            this.gameState = state;
            this.updateGameDisplay();
        });
    }

    setupEventListeners() {
        // Name input
        const nameInput = document.getElementById('participantName');
        const joinButton = document.getElementById('joinButton');
        
        nameInput.addEventListener('input', (e) => {
            joinButton.disabled = e.target.value.trim().length === 0;
        });
        
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !joinButton.disabled) {
                this.joinGame();
            }
        });
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const backendDot = document.getElementById('backendDot');
        const socketDot = document.getElementById('socketDot');
        const backendText = document.getElementById('backendText');
        const socketText = document.getElementById('socketText');
        
        if (connected) {
            backendDot.className = 'dot connected';
            socketDot.className = 'dot connected';
            backendText.textContent = 'Connected';
            socketText.textContent = 'Connected';
        } else {
            backendDot.className = 'dot checking';
            socketDot.className = 'dot';
            backendText.textContent = 'Disconnected';
            socketText.textContent = 'Disconnected';
        }
    }

    enterLobby() {
        document.getElementById('welcomePage').style.display = 'none';
        document.getElementById('lobby').style.display = 'block';
        document.getElementById('participantName').focus();
    }

    joinGame() {
        const name = document.getElementById('participantName').value.trim();
        if (!name) return;
        
        this.participantName = name;
        
        // Join game via WebSocket
        this.socket.emit('join-game', { name });
        
        // Show participant info
        document.getElementById('joinForm').style.display = 'none';
        document.getElementById('participantInfo').style.display = 'block';
        document.getElementById('welcomeText').textContent = `Welcome, ${name}!`;
        document.getElementById('startButton').style.display = 'block';
    }

    startGame() {
        console.log('🚀 Starting game...');
        
        // Start game via API
        fetch('/api/start-game', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Game started:', data);
                this.showMainGame();
            } else {
                console.error('❌ Failed to start game:', data.error);
                alert('Failed to start game: ' + data.error);
            }
        })
        .catch(error => {
            console.error('❌ Error starting game:', error);
            alert('Error starting game: ' + error.message);
        });
    }

    showMainGame() {
        document.getElementById('lobby').style.display = 'none';
        document.getElementById('mainGameDisplay').style.display = 'block';
        this.updateGameDisplay();
    }

    updateGameDisplay() {
        if (!this.gameState) return;
        
        // Update phase indicator
        const phaseIndicator = document.getElementById('currentPhaseIndicator');
        const currentPhase = document.getElementById('currentPhase');
        
        if (phaseIndicator) {
            phaseIndicator.textContent = `🎮 GAME PHASE: ${this.gameState.phase.toUpperCase()}`;
        }
        if (currentPhase) {
            currentPhase.textContent = `🎮 ${this.gameState.phase.toUpperCase()}`;
        }
        
        // Update participants list
        this.updateParticipantsList();
        
        // Update your portfolio
        this.updateYourPortfolio();
        
        // Update companies list
        this.updateCompaniesList();
        
        // Show appropriate interface based on phase
        this.showPhaseInterface();
    }

    updateParticipantsList() {
        const participantsList = document.getElementById('participantsList');
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        const participants = Object.values(this.gameState.participants);
        participants.sort((a, b) => b.netWorth - a.netWorth);
        
        participants.forEach(participant => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'participant-name';
            nameSpan.textContent = participant.name;
            
            const netWorthSpan = document.createElement('span');
            netWorthSpan.className = 'participant-net-worth';
            netWorthSpan.textContent = `$${participant.netWorth.toFixed(0)}`;
            
            item.appendChild(nameSpan);
            item.appendChild(netWorthSpan);
            
            // Add CEO badge if applicable
            if (participant.isCEO) {
                const ceoBadge = document.createElement('span');
                ceoBadge.className = 'participant-ceo';
                ceoBadge.textContent = '👑 CEO';
                item.appendChild(ceoBadge);
            }
            
            participantsList.appendChild(item);
        });
    }

    updateYourPortfolio() {
        if (!this.participantId) return;
        
        const participant = this.gameState.participants[this.participantId];
        if (!participant) return;
        
        // Update cash and net worth
        const cashElement = document.getElementById('yourCash');
        const netWorthElement = document.getElementById('yourNetWorth');
        
        if (cashElement) cashElement.textContent = participant.cash.toFixed(0);
        if (netWorthElement) netWorthElement.textContent = participant.netWorth.toFixed(0);
        
        // Update shares
        this.updateYourShares(participant);
        
        // Update CEO controls
        this.updateCEOControls(participant);
    }

    updateYourShares(participant) {
        const sharesContainer = document.getElementById('yourShares');
        if (!sharesContainer) return;
        
        sharesContainer.innerHTML = '<h4>📊 Your Shares</h4>';
        
        if (!participant.shares || Object.keys(participant.shares).length === 0) {
            sharesContainer.innerHTML += '<p>No shares owned</p>';
            return;
        }
        
        Object.entries(participant.shares).forEach(([companyId, shares]) => {
            if (shares > 0) {
                const company = this.gameState.companies[companyId];
                if (company) {
                    const shareItem = document.createElement('div');
                    shareItem.className = 'share-item';
                    
                    shareItem.innerHTML = `
                        <span>${company.name}</span>
                        <span>${shares} shares @ $${company.currentPrice.toFixed(2)}</span>
                    `;
                    
                    sharesContainer.appendChild(shareItem);
                }
            }
        });
    }

    updateCEOControls(participant) {
        const ceoControls = document.getElementById('ceoControls');
        const ceoCompany = document.getElementById('ceoCompany');
        
        if (participant.isCEO && participant.ceoCompanyId) {
            const company = this.gameState.companies[participant.ceoCompanyId];
            if (company) {
                ceoControls.style.display = 'block';
                ceoCompany.textContent = `You are CEO of ${company.name}`;
            }
        } else {
            ceoControls.style.display = 'none';
        }
    }

    updateCompaniesList() {
        const companiesList = document.getElementById('companiesList');
        if (!companiesList) return;
        
        companiesList.innerHTML = '';
        
        Object.values(this.gameState.companies).forEach(company => {
            const item = document.createElement('div');
            item.className = 'company-item';
            
            item.innerHTML = `
                <div class="company-name">${company.name}</div>
                <div class="company-price">$${company.currentPrice.toFixed(2)}</div>
                <div class="company-shares">${company.sharesAllocated || 0} / ${company.totalShares} shares allocated</div>
            `;
            
            companiesList.appendChild(item);
        });
    }

    showPhaseInterface() {
        // Hide all phase interfaces
        document.getElementById('ipoInterface').style.display = 'none';
        document.getElementById('newspaperInterface').style.display = 'none';
        document.getElementById('tradingInterface').style.display = 'none';
        
        switch (this.gameState.phase) {
            case 'ipo':
                this.showIPOInterface();
                break;
            case 'newspaper':
                this.showNewspaperInterface();
                break;
            case 'trading':
                this.showTradingInterface();
                break;
        }
    }

    showIPOInterface() {
        const ipoInterface = document.getElementById('ipoInterface');
        const biddingForm = document.getElementById('ipoBiddingForm');
        
        ipoInterface.style.display = 'block';
        biddingForm.innerHTML = '';
        
        Object.values(this.gameState.companies).forEach(company => {
            const card = document.createElement('div');
            card.className = 'company-bid-card';
            
            card.innerHTML = `
                <h3>${company.name}</h3>
                <div class="company-price">Current Price: $${company.currentPrice.toFixed(2)}</div>
                <div class="bid-inputs">
                    <input type="number" id="shares_${company.id}" placeholder="Shares to bid" min="1" max="1000">
                    <input type="number" id="price_${company.id}" placeholder="Price per share" step="0.01" min="0.01">
                </div>
            `;
            
            biddingForm.appendChild(card);
        });
    }

    showNewspaperInterface() {
        const newspaperInterface = document.getElementById('newspaperInterface');
        const ipoResults = document.getElementById('ipoResults');
        const ceoAnnouncements = document.getElementById('ceoAnnouncements');
        
        newspaperInterface.style.display = 'block';
        
        // Show IPO results
        ipoResults.innerHTML = '';
        Object.values(this.gameState.companies).forEach(company => {
            const result = document.createElement('div');
            result.innerHTML = `
                <strong>${company.name}:</strong> $${company.ipoPrice.toFixed(2)} per share
                ${company.ceoName ? ` - CEO: ${company.ceoName}` : ''}
            `;
            ipoResults.appendChild(result);
        });
        
        // Show CEO announcements
        ceoAnnouncements.innerHTML = '';
        Object.values(this.gameState.companies).forEach(company => {
            if (company.ceoName) {
                const announcement = document.createElement('div');
                announcement.innerHTML = `
                    <strong>${company.ceoName}</strong> is now CEO of ${company.name}
                `;
                ceoAnnouncements.appendChild(announcement);
            }
        });
    }

    showTradingInterface() {
        const tradingInterface = document.getElementById('tradingInterface');
        const tradingCompany = document.getElementById('tradingCompany');
        
        tradingInterface.style.display = 'block';
        
        // Populate company selector
        tradingCompany.innerHTML = '<option value="">Select Company</option>';
        Object.values(this.gameState.companies).forEach(company => {
            const option = document.createElement('option');
            option.value = company.id;
            option.textContent = `${company.name} - $${company.currentPrice.toFixed(2)}`;
            tradingCompany.appendChild(option);
        });
    }

    submitIPOBids() {
        const bids = [];
        
        Object.values(this.gameState.companies).forEach(company => {
            const sharesInput = document.getElementById(`shares_${company.id}`);
            const priceInput = document.getElementById(`price_${company.id}`);
            
            const shares = parseInt(sharesInput.value);
            const price = parseFloat(priceInput.value);
            
            if (shares > 0 && price > 0) {
                bids.push({
                    companyId: company.id,
                    shares: shares,
                    price: price
                });
            }
        });
        
        if (bids.length === 0) {
            alert('Please enter at least one bid');
            return;
        }
        
        console.log('📤 Submitting IPO bids:', bids);
        
        // Submit bids via WebSocket
        this.socket.emit('submit-ipo-bids', { bids });
        
        // Show loading state
        const submitButton = document.querySelector('.submit-bids-button');
        submitButton.textContent = '⏳ Processing...';
        submitButton.disabled = true;
    }

    proceedToTrading() {
        // Change phase to trading
        fetch('/api/phase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phase: 'trading' })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('✅ Proceeded to trading phase');
            } else {
                console.error('❌ Failed to proceed to trading:', data.error);
            }
        })
        .catch(error => {
            console.error('❌ Error proceeding to trading:', error);
        });
    }

    submitBuyOrder() {
        const companyId = document.getElementById('tradingCompany').value;
        const shares = parseInt(document.getElementById('tradingShares').value);
        const price = parseFloat(document.getElementById('tradingPrice').value);
        
        if (!companyId || !shares || !price) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log('📈 Submitting buy order:', { companyId, shares, price });
        
        // Submit order via WebSocket
        this.socket.emit('submit-buy-order', {
            companyId: companyId,
            shares: shares,
            price: price,
            orderType: 'limit'
        });
        
        // Clear form
        document.getElementById('tradingShares').value = '';
        document.getElementById('tradingPrice').value = '';
    }

    submitSellOrder() {
        const companyId = document.getElementById('tradingCompany').value;
        const shares = parseInt(document.getElementById('tradingShares').value);
        const price = parseFloat(document.getElementById('tradingPrice').value);
        
        if (!companyId || !shares || !price) {
            alert('Please fill in all fields');
            return;
        }
        
        console.log('📉 Submitting sell order:', { companyId, shares, price });
        
        // Submit order via WebSocket
        this.socket.emit('submit-sell-order', {
            companyId: companyId,
            shares: shares,
            price: price,
            orderType: 'limit'
        });
        
        // Clear form
        document.getElementById('tradingShares').value = '';
        document.getElementById('tradingPrice').value = '';
    }
}

// Global functions for HTML onclick handlers
let gameClient;

function enterLobby() {
    gameClient.enterLobby();
}

function joinGame() {
    gameClient.joinGame();
}

function startGame() {
    gameClient.startGame();
}

function submitIPOBids() {
    gameClient.submitIPOBids();
}

function proceedToTrading() {
    gameClient.proceedToTrading();
}

function submitBuyOrder() {
    gameClient.submitBuyOrder();
}

function submitSellOrder() {
    gameClient.submitSellOrder();
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameClient = new GameClient();
    console.log('🎮 Game client initialized');
});
