/**
 * Event Store Bridge Module
 * 
 * This module provides a bridge between the existing system and the new event-driven architecture.
 * It allows gradual migration and can be enabled/disabled via configuration.
 */

class EventStoreBridge {
    constructor() {
        this.eventStore = null;
        this.eventDrivenTrading = null;
        this.isEnabled = false;
        this.fallbackToLegacy = true; // Use legacy system if event store fails
        
        console.log('🌉 EventStoreBridge: Initializing...');
    }

    /**
     * Initialize the event store system
     */
    async initialize() {
        try {
            // Import modules
            const EventStoreModule = require('./eventStoreModule');
            const EventDrivenTradingModule = require('./eventDrivenTrading');
            
            // Initialize event store
            this.eventStore = new EventStoreModule();
            const storeInitialized = await this.eventStore.initialize();
            
            if (!storeInitialized) {
                console.error('❌ EventStoreBridge: Failed to initialize event store');
                this.isEnabled = false;
                return false;
            }
            
            // Initialize event-driven trading
            this.eventDrivenTrading = new EventDrivenTradingModule(this.eventStore);
            this.eventDrivenTrading.setEnabled(true);
            
            this.isEnabled = true;
            console.log('✅ EventStoreBridge: Initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ EventStoreBridge: Failed to initialize:', error);
            this.isEnabled = false;
            return false;
        }
    }

    /**
     * Submit a trading order (routes to event store or legacy system)
     */
    async submitTradingOrder(participantId, companyId, orderType, shares, price) {
        if (this.isEnabled && this.eventDrivenTrading) {
            console.log('📈 EventStoreBridge: Using event-driven trading');
            
            if (orderType === 'buy') {
                return await this.eventDrivenTrading.submitBuyOrder(participantId, companyId, shares, price);
            } else if (orderType === 'sell') {
                return await this.eventDrivenTrading.submitSellOrder(participantId, companyId, shares, price);
            }
        }
        
        if (this.fallbackToLegacy) {
            console.log('📈 EventStoreBridge: Falling back to legacy system');
            // Return a signal to use legacy system
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }
        
        return { success: false, error: 'No trading system available' };
    }

    /**
     * Get participant portfolio (routes to event store or legacy system)
     */
    async getParticipantPortfolio(participantId) {
        if (this.isEnabled && this.eventDrivenTrading) {
            console.log('📊 EventStoreBridge: Using event store for portfolio');
            return await this.eventDrivenTrading.getPortfolio(participantId);
        }
        
        if (this.fallbackToLegacy) {
            console.log('📊 EventStoreBridge: Falling back to legacy system for portfolio');
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }
        
        return { success: false, error: 'No portfolio system available' };
    }

    /**
     * Initialize participant (routes to event store or legacy system)
     */
    async initializeParticipant(participantId, participantName, startingCash = 1000) {
        if (this.isEnabled && this.eventDrivenTrading) {
            console.log('👤 EventStoreBridge: Using event store for participant initialization');
            return await this.eventDrivenTrading.initializeParticipant(participantId, participantName, startingCash);
        }
        
        if (this.fallbackToLegacy) {
            console.log('👤 EventStoreBridge: Falling back to legacy system for participant initialization');
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }
        
        return { success: false, error: 'No participant system available' };
    }

    /**
     * Start trading (routes to event store or legacy system)
     */
    async startTrading() {
        if (this.isEnabled && this.eventDrivenTrading) {
            console.log('🚀 EventStoreBridge: Using event-driven trading start');
            return await this.eventDrivenTrading.startTrading();
        }
        
        if (this.fallbackToLegacy) {
            console.log('🚀 EventStoreBridge: Falling back to legacy trading start');
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }
        
        return { success: false, error: 'No trading system available' };
    }

    /**
     * Stop trading (routes to event store or legacy system)
     */
    async stopTrading() {
        if (this.isEnabled && this.eventDrivenTrading) {
            console.log('⏹️ EventStoreBridge: Using event-driven trading stop');
            return await this.eventDrivenTrading.stopTrading();
        }
        
        if (this.fallbackToLegacy) {
            console.log('⏹️ EventStoreBridge: Falling back to legacy trading stop');
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }
        
        return { success: false, error: 'No trading system available' };
    }

    /**
     * Enable/disable the event store system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.eventDrivenTrading) {
            this.eventDrivenTrading.setEnabled(enabled);
        }
        console.log(`🌉 EventStoreBridge: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Set fallback behavior
     */
    setFallbackToLegacy(fallback) {
        this.fallbackToLegacy = fallback;
        console.log(`🌉 EventStoreBridge: Fallback to legacy ${fallback ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            fallbackToLegacy: this.fallbackToLegacy,
            eventStoreStatus: this.eventStore ? this.eventStore.getStatus() : null,
            tradingStatus: this.eventDrivenTrading ? this.eventDrivenTrading.getStatus() : null
        };
    }

    /**
     * Close connections
     */
    close() {
        if (this.eventStore) {
            this.eventStore.close();
        }
        console.log('🔒 EventStoreBridge: Closed');
    }
}

module.exports = EventStoreBridge;

