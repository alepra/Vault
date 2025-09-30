/**
 * Event Store Module - Single Source of Truth for All Game Transactions
 * 
 * This module provides a segregated, event-driven architecture that can be
 * plugged in/out of the existing system safely.
 * 
 * Core Concept: All game actions become events stored in database.
 * Current state is calculated from event history.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EventStoreModule {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.eventCache = new Map(); // Cache for current state calculations
        this.cacheExpiry = 5000; // 5 seconds
        this.lastCacheUpdate = 0;
        
        console.log('📊 EventStore Module: Initializing...');
    }

    /**
     * Initialize the event store database
     */
    async initialize() {
        try {
            const dbPath = path.join(__dirname, '..', '..', 'events.db');
            this.db = new sqlite3.Database(dbPath);
            
            await this.createTables();
            this.isInitialized = true;
            
            console.log('✅ EventStore Module: Initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ EventStore Module: Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Create database tables for events
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            const createEventsTable = `
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    participant_id TEXT NOT NULL,
                    company_id TEXT,
                    shares INTEGER,
                    price REAL,
                    amount REAL,
                    timestamp INTEGER NOT NULL,
                    metadata TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createIndexes = `
                CREATE INDEX IF NOT EXISTS idx_events_participant ON events(participant_id);
                CREATE INDEX IF NOT EXISTS idx_events_company ON events(company_id);
                CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
                CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
            `;

            this.db.serialize(() => {
                this.db.run(createEventsTable, (err) => {
                    if (err) {
                        console.error('❌ Failed to create events table:', err);
                        reject(err);
                        return;
                    }
                    
                    this.db.run(createIndexes, (err) => {
                        if (err) {
                            console.error('❌ Failed to create indexes:', err);
                            reject(err);
                            return;
                        }
                        
                        console.log('✅ EventStore: Database tables created');
                        resolve();
                    });
                });
            });
        });
    }

    /**
     * Record a new event
     */
    async recordEvent(eventData) {
        if (!this.isInitialized) {
            console.error('❌ EventStore: Not initialized');
            return { success: false, error: 'EventStore not initialized' };
        }

        const {
            eventType,
            participantId,
            companyId = null,
            shares = null,
            price = null,
            amount = null,
            metadata = null
        } = eventData;

        const timestamp = Date.now();

        return new Promise((resolve) => {
            const sql = `
                INSERT INTO events (event_type, participant_id, company_id, shares, price, amount, timestamp, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                eventType,
                participantId,
                companyId,
                shares,
                price,
                amount,
                timestamp,
                metadata ? JSON.stringify(metadata) : null
            ], function(err) {
                if (err) {
                    console.error('❌ EventStore: Failed to record event:', err);
                    resolve({ success: false, error: err.message });
                    return;
                }

                console.log(`📝 EventStore: Recorded ${eventType} event for ${participantId} (ID: ${this.lastID})`);
                
                // Invalidate cache
                EventStoreModule.prototype.invalidateCache.call(this);
                
                resolve({ 
                    success: true, 
                    eventId: this.lastID,
                    timestamp: timestamp
                });
            });
        });
    }

    /**
     * Get current holdings for a participant
     */
    async getCurrentHoldings(participantId) {
        if (!this.isInitialized) {
            return { success: false, error: 'EventStore not initialized' };
        }

        // Check cache first
        const cacheKey = `holdings_${participantId}`;
        if (this.isCacheValid() && this.eventCache.has(cacheKey)) {
            return { success: true, data: this.eventCache.get(cacheKey) };
        }

        return new Promise((resolve) => {
            const sql = `
                SELECT 
                    company_id,
                    SUM(CASE WHEN event_type = 'PURCHASE' THEN shares ELSE -shares END) as total_shares,
                    SUM(CASE WHEN event_type = 'PURCHASE' THEN amount ELSE -amount END) as total_invested
                FROM events 
                WHERE participant_id = ? AND company_id IS NOT NULL
                GROUP BY company_id
                HAVING total_shares > 0
            `;

            this.db.all(sql, [participantId], (err, rows) => {
                if (err) {
                    console.error('❌ EventStore: Failed to get holdings:', err);
                    resolve({ success: false, error: err.message });
                    return;
                }

                const holdings = {};
                rows.forEach(row => {
                    holdings[row.company_id] = {
                        shares: row.total_shares,
                        totalInvested: row.total_invested,
                        averagePrice: row.total_invested / row.total_shares
                    };
                });

                // Cache the result
                this.eventCache.set(cacheKey, holdings);
                this.lastCacheUpdate = Date.now();

                console.log(`📊 EventStore: Retrieved holdings for ${participantId}:`, holdings);
                resolve({ success: true, data: holdings });
            });
        });
    }

    /**
     * Get current cash balance for a participant
     */
    async getCurrentCash(participantId) {
        if (!this.isInitialized) {
            return { success: false, error: 'EventStore not initialized' };
        }

        // Check cache first
        const cacheKey = `cash_${participantId}`;
        if (this.isCacheValid() && this.eventCache.has(cacheKey)) {
            return { success: true, data: this.eventCache.get(cacheKey) };
        }

        return new Promise((resolve) => {
            const sql = `
                SELECT 
                    SUM(CASE 
                        WHEN event_type = 'CASH_DEPOSIT' THEN amount
                        WHEN event_type = 'SALE' THEN amount
                        WHEN event_type = 'PURCHASE' THEN -(shares * price)
                        WHEN event_type = 'CASH_WITHDRAWAL' THEN -amount
                        ELSE 0 
                    END) as cash_balance
                FROM events 
                WHERE participant_id = ?
            `;

            this.db.get(sql, [participantId], (err, row) => {
                if (err) {
                    console.error('❌ EventStore: Failed to get cash balance:', err);
                    resolve({ success: false, error: err.message });
                    return;
                }

                const cashBalance = row.cash_balance || 0;

                // Cache the result
                this.eventCache.set(cacheKey, cashBalance);
                this.lastCacheUpdate = Date.now();

                console.log(`💰 EventStore: Retrieved cash balance for ${participantId}: $${cashBalance}`);
                resolve({ success: true, data: cashBalance });
            });
        });
    }

    /**
     * Get transaction history for a participant
     */
    async getTransactionHistory(participantId, limit = 50) {
        if (!this.isInitialized) {
            return { success: false, error: 'EventStore not initialized' };
        }

        return new Promise((resolve) => {
            const sql = `
                SELECT * FROM events 
                WHERE participant_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            `;

            this.db.all(sql, [participantId, limit], (err, rows) => {
                if (err) {
                    console.error('❌ EventStore: Failed to get transaction history:', err);
                    resolve({ success: false, error: err.message });
                    return;
                }

                resolve({ success: true, data: rows });
            });
        });
    }

    /**
     * Check if participant can afford a purchase
     */
    async canAffordPurchase(participantId, amount) {
        const cashResult = await this.getCurrentCash(participantId);
        if (!cashResult.success) {
            return { success: false, error: cashResult.error };
        }

        const canAfford = cashResult.data >= amount;
        return { success: true, data: canAfford, availableCash: cashResult.data };
    }

    /**
     * Check if participant has enough shares to sell
     */
    async canSellShares(participantId, companyId, shares) {
        const holdingsResult = await this.getCurrentHoldings(participantId);
        if (!holdingsResult.success) {
            return { success: false, error: holdingsResult.error };
        }

        const holdings = holdingsResult.data;
        const availableShares = holdings[companyId]?.shares || 0;
        const canSell = availableShares >= shares;

        return { 
            success: true, 
            data: canSell, 
            availableShares: availableShares 
        };
    }

    /**
     * Cache management
     */
    isCacheValid() {
        return (Date.now() - this.lastCacheUpdate) < this.cacheExpiry;
    }

    invalidateCache() {
        if (this.eventCache) {
            this.eventCache.clear();
        }
        this.lastCacheUpdate = 0;
        console.log('🔄 EventStore: Cache invalidated');
    }

    /**
     * Get module status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            cacheSize: this.eventCache.size,
            lastCacheUpdate: this.lastCacheUpdate,
            cacheValid: this.isCacheValid()
        };
    }

    /**
     * Get all participants from the database
     */
    async getAllParticipants() {
        if (!this.isInitialized) {
            return { success: false, error: 'EventStore not initialized' };
        }

        return new Promise((resolve) => {
            const sql = `
                SELECT DISTINCT participant_id 
                FROM events 
                WHERE participant_id IS NOT NULL
                ORDER BY participant_id
            `;

            this.db.all(sql, [], (err, rows) => {
                if (err) {
                    console.error('❌ EventStore: Failed to get all participants:', err);
                    resolve({ success: false, error: err.message });
                    return;
                }

                const participants = rows.map(row => ({
                    participantId: row.participant_id
                }));

                console.log(`📊 EventStore: Retrieved ${participants.length} participants`);
                resolve({ success: true, data: participants });
            });
        });
    }

    /**
     * Get participant state (cash + holdings) for a specific participant
     */
    async getParticipantState(participantId) {
        if (!this.isInitialized) {
            return { success: false, error: 'EventStore not initialized' };
        }

        try {
            const cashResult = await this.getCurrentCash(participantId);
            const holdingsResult = await this.getCurrentHoldings(participantId);

            if (!cashResult.success || !holdingsResult.success) {
                return { success: false, error: 'Failed to get participant state' };
            }

            const state = {
                participantId: participantId,
                cash: cashResult.data,
                shares: holdingsResult.data,
                totalNetWorth: cashResult.data + this.calculateStockValue(holdingsResult.data),
                totalStockValue: this.calculateStockValue(holdingsResult.data)
            };

            return { success: true, data: state };
        } catch (error) {
            console.error('❌ EventStore: Failed to get participant state:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Calculate total stock value from holdings
     */
    calculateStockValue(holdings) {
        let totalValue = 0;
        for (const [companyId, holding] of Object.entries(holdings)) {
            if (holding && holding.shares) {
                // Use a default price of $1 for now - this should be enhanced with real prices
                totalValue += holding.shares * 1;
            }
        }
        return totalValue;
    }

    /**
     * Clear all data from the database
     */
    async clearAllData() {
        if (!this.isInitialized) {
            console.log('⚠️ EventStore not initialized - cannot clear data');
            return false;
        }

        try {
            // Clear all events
            await this.db.run('DELETE FROM events');
            
            // Clear cache
            this.invalidateCache();
            
            console.log('✅ EventStore: All data cleared from database');
            return true;
        } catch (error) {
            console.error('❌ EventStore: Failed to clear data:', error);
            return false;
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 EventStore: Database connection closed');
        }
    }
}

module.exports = EventStoreModule;

