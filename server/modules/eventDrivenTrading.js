/**
 * Event-Driven Trading Module
 * 
 * This module provides trading functionality using the EventStore as the single source of truth.
 * It can be plugged in/out of the existing system safely.
 */

class EventDrivenTradingModule {
    constructor(eventStore) {
        this.eventStore = eventStore;
        this.isEnabled = false;
        this.tradingActive = false;
        this.orderBook = new Map(); // companyId -> {buyOrders: [], sellOrders: []}
        
        console.log('📈 EventDrivenTrading: Initialized');
    }

    /**
     * Enable/disable the event-driven trading system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`📈 EventDrivenTrading: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }

    /**
     * Start trading (replaces manual trading control)
     */
    async startTrading() {
        if (!this.isEnabled) {
            console.log('⚠️ EventDrivenTrading: Cannot start - module disabled');
            return { success: false, error: 'Event-driven trading disabled' };
        }

        this.tradingActive = true;
        console.log('🚀 EventDrivenTrading: Trading started');
        return { success: true };
    }

    /**
     * Stop trading
     */
    async stopTrading() {
        this.tradingActive = false;
        console.log('⏹️ EventDrivenTrading: Trading stopped');
        return { success: true };
    }

    /**
     * Submit a buy order using event store
     */
    async submitBuyOrder(participantId, companyId, shares, price) {
        if (!this.isEnabled) {
            return { success: false, error: 'Event-driven trading disabled' };
        }

        if (!this.tradingActive) {
            return { success: false, error: 'Trading not active' };
        }

        const totalCost = shares * price;

        // Check if participant can afford the purchase
        const canAffordResult = await this.eventStore.canAffordPurchase(participantId, totalCost);
        if (!canAffordResult.success) {
            return { success: false, error: canAffordResult.error };
        }

        if (!canAffordResult.data) {
            return { 
                success: false, 
                error: `Insufficient cash: need $${totalCost}, have $${canAffordResult.availableCash}` 
            };
        }

        // Record the purchase event
        const eventResult = await this.eventStore.recordEvent({
            eventType: 'PURCHASE',
            participantId: participantId,
            companyId: companyId,
            shares: shares,
            price: price,
            amount: totalCost,
            metadata: {
                orderType: 'buy',
                timestamp: Date.now()
            }
        });

        if (!eventResult.success) {
            return { success: false, error: eventResult.error };
        }

        console.log(`📈 EventDrivenTrading: Buy order executed - ${participantId} bought ${shares} shares of ${companyId} at $${price}`);
        
        return { 
            success: true, 
            eventId: eventResult.eventId,
            message: `Successfully purchased ${shares} shares at $${price}`
        };
    }

    /**
     * Submit a sell order using event store
     */
    async submitSellOrder(participantId, companyId, shares, price) {
        if (!this.isEnabled) {
            return { success: false, error: 'Event-driven trading disabled' };
        }

        if (!this.tradingActive) {
            return { success: false, error: 'Trading not active' };
        }

        // Check if participant has enough shares to sell
        const canSellResult = await this.eventStore.canSellShares(participantId, companyId, shares);
        if (!canSellResult.success) {
            return { success: false, error: canSellResult.error };
        }

        if (!canSellResult.data) {
            return { 
                success: false, 
                error: `Only ${canSellResult.availableShares} shares available` 
            };
        }

        const totalProceeds = shares * price;

        // Record the sale event
        const eventResult = await this.eventStore.recordEvent({
            eventType: 'SALE',
            participantId: participantId,
            companyId: companyId,
            shares: shares,
            price: price,
            amount: totalProceeds,
            metadata: {
                orderType: 'sell',
                timestamp: Date.now()
            }
        });

        if (!eventResult.success) {
            return { success: false, error: eventResult.error };
        }

        console.log(`📈 EventDrivenTrading: Sell order executed - ${participantId} sold ${shares} shares of ${companyId} at $${price}`);
        
        return { 
            success: true, 
            eventId: eventResult.eventId,
            message: `Successfully sold ${shares} shares at $${price}`
        };
    }

    /**
     * Get current portfolio for a participant
     */
    async getPortfolio(participantId) {
        if (!this.isEnabled) {
            return { success: false, error: 'Event-driven trading disabled' };
        }

        const [cashResult, holdingsResult] = await Promise.all([
            this.eventStore.getCurrentCash(participantId),
            this.eventStore.getCurrentHoldings(participantId)
        ]);

        if (!cashResult.success || !holdingsResult.success) {
            return { 
                success: false, 
                error: cashResult.error || holdingsResult.error 
            };
        }

        const portfolio = {
            cash: cashResult.data,
            holdings: holdingsResult.data,
            totalValue: cashResult.data + Object.values(holdingsResult.data)
                .reduce((sum, holding) => sum + (holding.shares * holding.averagePrice), 0)
        };

        return { success: true, data: portfolio };
    }

    /**
     * Initialize participant with starting cash
     */
    async initializeParticipant(participantId, participantName, startingCash = 1000) {
        if (!this.isEnabled) {
            return { success: false, error: 'Event-driven trading disabled' };
        }

        const eventResult = await this.eventStore.recordEvent({
            eventType: 'CASH_DEPOSIT',
            participantId: participantId,
            amount: startingCash,
            metadata: {
                participantName: participantName,
                initialization: true
            }
        });

        if (!eventResult.success) {
            return { success: false, error: eventResult.error };
        }

        console.log(`💰 EventDrivenTrading: Initialized ${participantName} (${participantId}) with $${startingCash}`);
        return { success: true };
    }

    /**
     * Get module status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            tradingActive: this.tradingActive,
            eventStoreStatus: this.eventStore.getStatus()
        };
    }
}

module.exports = EventDrivenTradingModule;

