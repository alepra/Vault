# Trading System Architecture Analysis & Refactor Plan

## Current System Issues (As of 2025-01-18)

### Problems Identified:
1. **Dual Data Sources**: Ledger Module + GameState tracking same data separately
2. **Sync Issues**: Frontend shows 400 shares, server ledger shows 0 shares
3. **Participant ID Mismatch**: Frontend `vxy2tht0z` vs server expectations
4. **Input Field Clearing**: Trading interface rebuilds every 800ms
5. **Automatic Order Submission**: Orders submit without clicking button
6. **No Persistence**: All data lost on server restart
7. **No Transaction Safety**: Crashes can corrupt game state

### Root Cause:
The system has evolved into a complex web of modules that don't communicate properly. The IPO module records purchases, but the ledger module doesn't reflect them correctly for trading.

## Proposed Solution: Event-Driven Architecture

### Core Concept:
- **Single Source of Truth**: Event log in database
- **All Actions Become Events**: Buy, Sell, IPO, etc.
- **Current State Calculated**: From event history
- **Segregated Module**: Can be plugged in/out safely

### Benefits:
- **Persistent**: Survives server restarts
- **Audit Trail**: Complete transaction history
- **Scalable**: Multiple servers can read same events
- **Crash-Safe**: Events are atomic
- **Flexible**: Easy to add new event types
- **Efficient**: Optimized for high-frequency trading

## Implementation Plan

### Phase 1: Create Event Store Module
- Build segregated `EventStore` module
- Database schema for events
- Basic CRUD operations

### Phase 2: Event Types
- `PURCHASE` (IPO and trading)
- `SALE` (trading)
- `CASH_TRANSFER`
- `CEO_APPOINTMENT`

### Phase 3: Integration
- Replace ledger calls with event store calls
- Keep existing modules as fallback
- Gradual migration

### Phase 4: Optimization
- Add caching for current state
- Optimize for high-frequency trading
- Add real-time updates

## Files to Create:
1. `server/modules/eventStoreModule.js` - Core event store
2. `server/database/events.sql` - Database schema
3. `server/modules/eventDrivenTrading.js` - Trading with events
4. `TRADING_EVENT_SYSTEM.md` - Documentation

## Migration Strategy:
- Keep existing system running
- Add event store alongside
- Gradually replace ledger calls
- Test thoroughly before removing old system
- Can rollback if issues arise

## Success Criteria:
- [ ] All transactions recorded as events
- [ ] Current state calculated from events
- [ ] No data loss on server restart
- [ ] High-frequency trading support
- [ ] Complete audit trail
- [ ] Can be enabled/disabled via config

