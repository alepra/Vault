/**
 * Event Store Integration for Lemonade Stand Game
 * 
 * This module integrates the Event Store system into the existing game
 * while maintaining compatibility with the current architecture.
 */

const EventStoreModule = require('./eventStoreModule');
const EventDrivenTradingModule = require('./eventDrivenTrading');

class EventStoreIntegration {
    constructor() {
        this.eventStore = null;
        this.eventDrivenTrading = null;
        this.isEnabled = false;
        this.legacyLedger = null; // Reference to existing ledger module
        this.tradingModule = null; // Reference to existing trading module
        this.ipoModule = null; // Reference to existing IPO module
        
        console.log('🔗 EventStore Integration: Initializing...');
    }

    /**
     * Initialize the Event Store integration
     */
    async initialize(legacyLedger, tradingModule, ipoModule) {
        try {
            console.log('🚀 EventStore Integration: Starting initialization...');
            
            // Store references to existing modules
            this.legacyLedger = legacyLedger;
            this.tradingModule = tradingModule;
            this.ipoModule = ipoModule;
            
            // Initialize Event Store
            this.eventStore = new EventStoreModule();
            const eventStoreSuccess = await this.eventStore.initialize();
            
            if (!eventStoreSuccess) {
                console.log('⚠️ EventStore Integration: Event Store failed to initialize, using legacy system');
                return false;
            }
            
            // Initialize Event-Driven Trading
            this.eventDrivenTrading = new EventDrivenTradingModule(this.eventStore);
            this.eventDrivenTrading.setEnabled(true);
            
            this.isEnabled = true;
            console.log('✅ EventStore Integration: Successfully initialized');
            return true;
            
        } catch (error) {
            console.error('❌ EventStore Integration Error:', error);
            return false;
        }
    }

    /**
     * Handle participant initialization with Event Store
     */
    async initializeParticipant(participantId, participantName, isHuman = false, startingCapital = 1000) {
        if (!this.isEnabled) {
            // Fallback to legacy system
            return this.legacyLedger.initializeParticipant(participantId, participantName, isHuman, startingCapital);
        }

        try {
            // Record initial cash deposit event
            await this.eventStore.recordEvent({
                eventType: 'CASH_DEPOSIT',
                participantId,
                amount: startingCapital,
                description: `Initial capital for ${participantName}`,
                metadata: { isHuman, participantName }
            });

            // Also initialize in legacy system for compatibility
            const legacyLedger = this.legacyLedger.initializeParticipant(participantId, participantName, isHuman, startingCapital);
            
            console.log(`📊 EventStore: Initialized participant ${participantName} with $${startingCapital}`);
            return legacyLedger;
            
        } catch (error) {
            console.error('❌ EventStore Integration: Failed to initialize participant:', error);
            // Fallback to legacy
            return this.legacyLedger.initializeParticipant(participantId, participantName, isHuman, startingCapital);
        }
    }

    /**
     * Handle IPO share purchases with Event Store
     */
    async recordIPOPurchase(participantId, companyId, companyName, shares, price, phase = 'ipo') {
        if (!this.isEnabled) {
            // Fallback to legacy system
            return this.legacyLedger.recordPurchase(participantId, companyId, companyName, shares, price, phase);
        }

        try {
            // Record purchase event
            await this.eventStore.recordEvent({
                eventType: 'PURCHASE',
                participantId,
                companyId,
                shares,
                price,
                description: `IPO purchase: ${shares} shares of ${companyName} at $${price}`,
                metadata: { phase, companyName }
            });

            // Also record in legacy system for compatibility
            const success = this.legacyLedger.recordPurchase(participantId, companyId, companyName, shares, price, phase);
            
            if (success) {
                console.log(`📊 EventStore: Recorded IPO purchase - ${participantId}: ${shares} shares of ${companyName} at $${price}`);
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ EventStore Integration: Failed to record IPO purchase:', error);
            // Fallback to legacy
            return this.legacyLedger.recordPurchase(participantId, companyId, companyName, shares, price, phase);
        }
    }

    /**
     * Handle trading orders with Event Store
     */
    async handleTradingOrder(orderData) {
        if (!this.isEnabled) {
            // Fallback to legacy system
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }

        try {
            const { participantId, companyId, orderType, shares, price } = orderData;
            
            console.log(`📈 EventStore: Processing ${orderType} order for ${participantId}`);
            
            // Use Event-Driven Trading Module
            const result = await this.eventDrivenTrading.submitOrder(orderData);
            
            if (result.success) {
                console.log(`✅ EventStore: Order executed successfully`);
                return result;
            } else {
                console.log(`❌ EventStore: Order failed: ${result.error}`);
                return result;
            }
            
        } catch (error) {
            console.error('❌ EventStore Integration: Trading order error:', error);
            return { success: false, error: 'Event Store trading error' };
        }
    }

    /**
     * Get participant portfolio from Event Store
     */
    async getParticipantPortfolio(participantId) {
        if (!this.isEnabled) {
            // Fallback to legacy system
            return this.legacyLedger.getLedgerSummary(participantId);
        }

        try {
            // Get current state from Event Store
            const portfolio = await this.eventStore.getParticipantState(participantId);
            
            if (portfolio) {
                console.log(`📊 EventStore: Retrieved portfolio for ${participantId}`);
                return portfolio;
            } else {
                // Fallback to legacy
                return this.legacyLedger.getLedgerSummary(participantId);
            }
            
        } catch (error) {
            console.error('❌ EventStore Integration: Failed to get portfolio:', error);
            // Fallback to legacy
            return this.legacyLedger.getLedgerSummary(participantId);
        }
    }

    /**
     * Get all participants data for frontend display
     */
    async getAllParticipantsData() {
        if (!this.isEnabled) {
            // Fallback to legacy system
            return this.legacyLedger.getAllLedgers();
        }

        try {
            // Get all participants from Event Store
            const eventStoreResult = await this.eventStore.getAllParticipants();
            if (!eventStoreResult.success) {
                console.log('⚠️ EventStore: Failed to get participants, falling back to legacy');
                return this.legacyLedger.getAllLedgers();
            }

            const participants = [];
            
            for (const participant of eventStoreResult.data) {
                try {
                    const stateResult = await this.eventStore.getParticipantState(participant.participantId);
                    if (stateResult.success) {
                        const state = stateResult.data;
                        
                        // Get participant name from legacy ledger for display purposes
                        const legacyLedger = this.legacyLedger.ledgers.get(participant.participantId);
                        const participantName = legacyLedger ? legacyLedger.participantName : 'Unknown';
                        
                        participants.push({
                            participantId: participant.participantId,
                            participantName: participantName,
                            cash: state.cash,
                            shares: state.shares,
                            totalNetWorth: state.totalNetWorth,
                            totalStockValue: state.totalStockValue
                        });
                    } else {
                        console.log(`⚠️ EventStore: Failed to get state for ${participant.participantId}, using legacy data`);
                        // Fallback to legacy data for this participant
                        const legacyLedger = this.legacyLedger.ledgers.get(participant.participantId);
                        if (legacyLedger) {
                            participants.push({
                                participantId: participant.participantId,
                                participantName: legacyLedger.participantName || 'Unknown',
                                cash: legacyLedger.cash || 0,
                                shares: legacyLedger.shares || {},
                                totalNetWorth: legacyLedger.totalNetWorth || legacyLedger.netWorth || 0,
                                totalStockValue: this.calculateStockValue(legacyLedger.shares || {})
                            });
                        }
                    }
                } catch (error) {
                    console.log(`⚠️ EventStore: Error processing ${participant.participantId}:`, error);
                }
            }
            
            console.log(`📊 EventStore: Retrieved data for ${participants.length} participants`);
            return participants;
            
        } catch (error) {
            console.error('❌ EventStore Integration: Failed to get participants data:', error);
            // Fallback to legacy
            return this.legacyLedger.getAllLedgers();
        }
    }
    
    calculateStockValue(shares) {
        // This is a simplified calculation - in a real system, you'd get current prices
        let totalValue = 0;
        for (const [companyId, shareCount] of Object.entries(shares)) {
            // Use a default price of $1 for now - this should be enhanced with real prices
            totalValue += (shareCount || 0) * 1;
        }
        return totalValue;
    }

    /**
     * Sync Event Store data with legacy ledger (for compatibility)
     */
    async syncWithLegacyLedger() {
        if (!this.isEnabled) {
            return;
        }

        try {
            console.log('🔄 EventStore Integration: Syncing with legacy ledger...');
            
            // Get all participants from Event Store
            const eventStoreData = await this.eventStore.getAllParticipants();
            
            if (eventStoreData) {
                // Update legacy ledger with Event Store data
                for (const participant of eventStoreData) {
                    this.legacyLedger.ledgers.set(participant.participantId, participant);
                }
                
                console.log('✅ EventStore Integration: Sync completed');
            }
            
        } catch (error) {
            console.error('❌ EventStore Integration: Sync failed:', error);
        }
    }

    /**
     * Check if Event Store is enabled
     */
    isEventStoreEnabled() {
        return this.isEnabled;
    }

    /**
     * Clear all data from the Event Store database
     */
    async clearAllData() {
        if (!this.isEnabled || !this.eventStore) {
            console.log('⚠️ Event Store not enabled - skipping clear');
            return true;
        }

        try {
            await this.eventStore.clearAllData();
            console.log('✅ Event Store: All data cleared');
            return true;
        } catch (error) {
            console.error('❌ Event Store: Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Transfer data from Legacy Ledger to Event Store
     * This is called after IPO phase to sync all participant data
     */
    async transferLedgerToEventStore() {
        if (!this.isEnabled || !this.eventStore || !this.legacyLedger) {
            console.log('⚠️ Event Store or Legacy Ledger not available - skipping transfer');
            return false;
        }

        try {
            console.log('🔄 Event Store: Starting data transfer from Legacy Ledger...');
            
            // Get all participants from legacy ledger
            const allLedgers = this.legacyLedger.getAllLedgers();
            console.log(`📊 Event Store: Found ${allLedgers.length} participants in Legacy Ledger`);
            
            let transferredCount = 0;
            
            for (const ledger of allLedgers) {
                const participantId = ledger.participantId;
                const participantName = ledger.participantName;
                const cash = ledger.cash || 0;
                const stockPositions = ledger.stockPositions || [];
                
                console.log(`🔄 Event Store: Transferring ${participantName} (${participantId}) - Cash: $${cash}, Shares: ${stockPositions.length} companies`);
                
                // Don't record cash deposit - participant already has $1000 from initialization
                // We just need to record the purchases which will deduct from that balance
                
                // Record all share purchases from stockPositions
                for (const position of stockPositions) {
                    if (position.totalShares > 0) {
                        // Calculate average price from cost basis
                        const averagePrice = position.costBasis / position.totalShares;
                        const totalCost = position.costBasis; // Use the actual cost basis
                        
                        await this.eventStore.recordEvent({
                            eventType: 'PURCHASE',
                            participantId: participantId,
                            companyId: position.companyId,
                            shares: position.totalShares,
                            price: averagePrice,
                            amount: totalCost, // Add the amount field for proper tracking
                            description: `IPO purchase transferred from Legacy Ledger: ${position.totalShares} shares at $${averagePrice.toFixed(2)}`,
                            metadata: { 
                                source: 'ledger_transfer', 
                                participantName,
                                companyName: position.companyName,
                                phase: 'ipo_transfer'
                            }
                        });
                        
                        console.log(`  📈 Recorded ${position.totalShares} shares of ${position.companyName} at $${averagePrice.toFixed(2)} (total: $${totalCost.toFixed(2)})`);
                    }
                }
                
                transferredCount++;
            }
            
            // Invalidate cache to ensure fresh data
            this.eventStore.invalidateCache();
            
            console.log(`✅ Event Store: Successfully transferred ${transferredCount} participants from Legacy Ledger`);
            return true;
            
        } catch (error) {
            console.error('❌ Event Store: Failed to transfer data from Legacy Ledger:', error);
            return false;
        }
    }

    /**
     * Update company prices in Event Store for accurate net worth calculations
     */
    updateCompanyPrices(companies) {
        if (this.isEnabled && this.eventStore) {
            this.eventStore.updateCompanyPrices(companies);
        }
    }
    
    /**
     * Get Event Store status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            eventStoreReady: this.eventStore ? this.eventStore.isInitialized : false,
            tradingReady: this.eventDrivenTrading ? this.eventDrivenTrading.isEnabled : false
        };
    }
}

module.exports = EventStoreIntegration;
