# Event-Driven Trading System Integration Guide

## Overview
This document explains how to integrate the new event-driven trading system into the existing Lemonade Stand Stock Market Game.

## Architecture

### Core Components:
1. **EventStoreModule** - Single source of truth for all transactions
2. **EventDrivenTradingModule** - Trading logic using events
3. **EventStoreBridge** - Bridge between old and new systems

### Key Benefits:
- **Persistent**: All data survives server restarts
- **Audit Trail**: Complete transaction history
- **Crash-Safe**: Atomic transactions
- **Scalable**: Can handle high-frequency trading
- **Flexible**: Easy to add new event types

## Integration Steps

### Step 1: Add to Main Server
Add to `server/index-modular.js`:

```javascript
// Import the bridge
const EventStoreBridge = require('./modules/eventStoreBridge');

// Initialize bridge
const eventStoreBridge = new EventStoreBridge();
await eventStoreBridge.initialize();

// Add to module bridge or use directly
```

### Step 2: Modify Trading Order Handler
In `server/index-modular.js`, modify the trading order handler:

```javascript
socket.on('placeOrder', async (orderData) => {
    const { participantId, companyId, orderType, shares, price } = orderData;
    
    // Try event-driven system first
    const result = await eventStoreBridge.submitTradingOrder(
        participantId, companyId, orderType, shares, price
    );
    
    if (result.error === 'USE_LEGACY_SYSTEM') {
        // Fall back to existing system
        const legacyResult = moduleBridge.submitTradingOrder(orderData);
        // Handle legacy result...
    } else {
        // Handle event-driven result
        if (result.success) {
            socket.emit('orderSuccess', result);
        } else {
            socket.emit('orderError', result.error);
        }
    }
});
```

### Step 3: Configuration
Add to environment or config:

```javascript
// Enable/disable event-driven system
const USE_EVENT_STORE = process.env.USE_EVENT_STORE === 'true' || false;
eventStoreBridge.setEnabled(USE_EVENT_STORE);

// Enable/disable fallback to legacy
const FALLBACK_TO_LEGACY = process.env.FALLBACK_TO_LEGACY === 'true' || true;
eventStoreBridge.setFallbackToLegacy(FALLBACK_TO_LEGACY);
```

## Event Types

### Core Events:
- `PURCHASE` - Buy shares (IPO or trading)
- `SALE` - Sell shares
- `CASH_DEPOSIT` - Add cash (initialization, dividends)
- `CASH_WITHDRAWAL` - Remove cash (fees, penalties)

### Future Events:
- `DIVIDEND` - Company pays dividends
- `STOCK_SPLIT` - Stock split event
- `CEO_APPOINTMENT` - CEO changes
- `COMPANY_EVENT` - Company-specific events

## Database Schema

### Events Table:
```sql
CREATE TABLE events (
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
);
```

## Migration Strategy

### Phase 1: Parallel Operation
- Keep existing system running
- Add event store alongside
- Test with small transactions

### Phase 2: Gradual Migration
- Route new participants to event store
- Keep existing participants on legacy system
- Compare results

### Phase 3: Full Migration
- Route all transactions through event store
- Remove legacy system
- Optimize performance

## Testing

### Test Cases:
1. **Basic Trading**: Buy/sell orders
2. **Portfolio Updates**: Cash and shares
3. **Error Handling**: Insufficient funds/shares
4. **Persistence**: Server restart recovery
5. **Performance**: High-frequency trading

### Test Commands:
```bash
# Enable event store
USE_EVENT_STORE=true npm start

# Disable event store (legacy only)
USE_EVENT_STORE=false npm start

# Check status
curl http://localhost:3001/api/event-store-status
```

## Monitoring

### Status Endpoints:
- `/api/event-store-status` - System status
- `/api/participant-portfolio/:id` - Portfolio data
- `/api/transaction-history/:id` - Transaction history

### Logs to Monitor:
- Event recording success/failure
- Cache hit/miss rates
- Database performance
- Fallback usage

## Rollback Plan

### If Issues Arise:
1. Set `USE_EVENT_STORE=false`
2. System automatically falls back to legacy
3. No data loss (events are preserved)
4. Can re-enable after fixes

### Emergency Procedures:
1. Stop server
2. Set environment variable
3. Restart server
4. System uses legacy mode

## Performance Considerations

### Caching:
- Current state cached for 5 seconds
- Cache invalidated on new events
- Reduces database queries

### Optimization:
- Batch event processing
- Async operations
- Connection pooling
- Index optimization

## Future Enhancements

### Planned Features:
1. **Real-time Updates**: WebSocket events
2. **Advanced Analytics**: Trading patterns
3. **Risk Management**: Position limits
4. **Audit Reports**: Compliance tracking
5. **Multi-Server**: Distributed architecture

## Troubleshooting

### Common Issues:
1. **Database Locked**: Check for concurrent access
2. **Cache Issues**: Clear cache and restart
3. **Performance**: Check database indexes
4. **Memory Usage**: Monitor cache size

### Debug Commands:
```javascript
// Check event store status
console.log(eventStoreBridge.getStatus());

// Clear cache
eventStore.invalidateCache();

// Check database
sqlite3 events.db "SELECT COUNT(*) FROM events;"
```

