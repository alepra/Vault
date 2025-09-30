/**
 * Example Integration of Event Store System
 * 
 * This file shows how to integrate the event-driven trading system
 * into your existing server with minimal changes.
 */

const EventStoreBridge = require('./modules/eventStoreBridge');

class EventStoreIntegration {
    constructor() {
        this.bridge = null;
        this.isEnabled = false;
    }

    /**
     * Initialize the event store system
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Event Store Integration...');
            
            this.bridge = new EventStoreBridge();
            const success = await this.bridge.initialize();
            
            if (success) {
                this.isEnabled = true;
                console.log('✅ Event Store Integration: Ready');
                return true;
            } else {
                console.log('⚠️ Event Store Integration: Failed, using legacy system');
                return false;
            }
        } catch (error) {
            console.error('❌ Event Store Integration Error:', error);
            return false;
        }
    }

    /**
     * Handle trading orders with fallback
     */
    async handleTradingOrder(orderData) {
        if (!this.isEnabled || !this.bridge) {
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }

        const { participantId, companyId, orderType, shares, price } = orderData;
        
        console.log(`📈 Event Store: Processing ${orderType} order for ${participantId}`);
        
        const result = await this.bridge.submitTradingOrder(
            participantId, companyId, orderType, shares, price
        );

        if (result.error === 'USE_LEGACY_SYSTEM') {
            console.log('🔄 Event Store: Falling back to legacy system');
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }

        return result;
    }

    /**
     * Get participant portfolio with fallback
     */
    async getParticipantPortfolio(participantId) {
        if (!this.isEnabled || !this.bridge) {
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }

        return await this.bridge.getParticipantPortfolio(participantId);
    }

    /**
     * Initialize participant with fallback
     */
    async initializeParticipant(participantId, participantName, startingCash = 1000) {
        if (!this.isEnabled || !this.bridge) {
            return { success: false, error: 'USE_LEGACY_SYSTEM' };
        }

        return await this.bridge.initializeParticipant(participantId, participantName, startingCash);
    }

    /**
     * Enable/disable the system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.bridge) {
            this.bridge.setEnabled(enabled);
        }
        console.log(`🔧 Event Store Integration: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            bridgeStatus: this.bridge ? this.bridge.getStatus() : null
        };
    }
}

// Export singleton instance
const eventStoreIntegration = new EventStoreIntegration();
module.exports = eventStoreIntegration;

