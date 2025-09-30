# Lemonade Stand Stock Market Game - Module Architecture Diagram

## Current Active Modules

### Core System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN SERVER (index-modular.js)              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Express.js    │  │   Socket.IO     │  │   SQLite3 DB    │ │
│  │   Web Server    │  │   WebSockets    │  │   Persistence   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MODULE BRIDGE                                │
│              (Central Communication Hub)                        │
│  • EventEmitter-based coordination                             │
│  • Routes events between modules                               │
│  • Manages phase transitions                                   │
│  • Handles inter-module communication                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  GAME STATE     │ │   IPO MODULE    │ │ TRADING MODULE  │
        │    MODULE       │ │                 │ │                 │
        │                 │ │                 │ │                 │
        │ • Game phases   │ │ • Dutch auction │ │ • Order books   │
        │ • Participants  │ │ • Bid processing│ │ • Market makers │
        │ • Companies     │ │ • Share alloc.  │ │ • Price movement│
        │ • Turn mgmt     │ │ • CEO selection │ │ • Bot trading   │
        │ • Phase timers  │ │ • IPO completion│ │ • Trade exec.   │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │           │           │
                    │           │           │
                    ▼           ▼           ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  LEDGER MODULE  │ │  BOT NAME       │ │  FRONTEND       │
        │                 │ │    MODULE       │ │                 │
        │ • Cash tracking │ │                 │ │ • game-interface│
        │ • Stock pos.    │ │ • Personality   │ │   .html         │
        │ • Net worth     │ │   names         │ │ • React app     │
        │ • CEO status    │ │ • Scavenger     │ │ • WebSocket     │
        │ • FIFO tracking │ │   counters      │ │   client        │
        │ • P&L calc.     │ │ • Name gen.     │ │ • UI controls   │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Data Flow Relationships

### 1. Game Initialization Flow
```
User → Frontend → Socket.IO → Main Server → Module Bridge → Game State Module
                                                          ↓
                                                    Initialize Game
                                                          ↓
                                                    Create Companies
                                                          ↓
                                                    Set Phase: 'lobby'
```

### 2. IPO Phase Flow
```
User Bid → Frontend → Socket.IO → Main Server → Module Bridge → IPO Module
                                                                     ↓
                                                              Store Human Bids
                                                                     ↓
                                                              Process AI Bids
                                                                     ↓
                                                              Dutch Auction
                                                                     ↓
                                                              Ledger Module (Update Cash/Shares)
                                                                     ↓
                                                              Set CEO Status
                                                                     ↓
                                                              Complete IPO
                                                                     ↓
                                                              Module Bridge → Game State
                                                                     ↓
                                                              Phase: 'newspaper'
```

### 3. Trading Phase Flow
```
User Order → Frontend → Socket.IO → Main Server → Module Bridge → Trading Module
                                                                        ↓
                                                                  Validate Order
                                                                        ↓
                                                                  Add to Order Book
                                                                        ↓
                                                                  Match Orders
                                                                        ↓
                                                                  Execute Trades
                                                                        ↓
                                                                  Ledger Module (Update Cash/Shares)
                                                                        ↓
                                                                  Update Prices
                                                                        ↓
                                                                  Emit Trade Results
```

### 4. Phase Advancement Flow
```
Ready Button → Frontend → Socket.IO → Main Server → Module Bridge → Game State Module
                                                                           ↓
                                                                     Advance Phase
                                                                           ↓
                                                                     Update Game State
                                                                           ↓
                                                                     Emit Phase Change
                                                                           ↓
                                                                     Frontend Updates UI
```

## Module Dependencies

### Module Bridge Dependencies
- **Requires**: Game State, IPO, Trading, Ledger, Bot Name modules
- **Provides**: Central coordination, event routing, phase management
- **Communicates with**: All modules via events

### Game State Module Dependencies
- **Independent**: Core game state management
- **Provides**: Game data, phase control, participant management
- **Used by**: All other modules for game state access

### IPO Module Dependencies
- **Requires**: Game State (for companies/participants)
- **Creates**: Own instances of Ledger and Bot Name modules
- **Provides**: IPO processing, Dutch auction, CEO selection
- **Communicates with**: Module Bridge for phase transitions

### Trading Module Dependencies
- **Requires**: Ledger Module (via Module Bridge)
- **Requires**: Game State (for participants/companies)
- **Provides**: Order matching, price movement, bot trading
- **Communicates with**: Module Bridge for trade execution

### Ledger Module Dependencies
- **Independent**: Financial tracking system
- **Provides**: Cash/stock tracking, net worth, CEO status
- **Used by**: IPO and Trading modules for financial updates

### Bot Name Module Dependencies
- **Independent**: Name generation system
- **Provides**: Personality-based bot names
- **Used by**: IPO Module for AI bot naming

## Future Planned Modules

### Weather Module (Planned)
```
┌─────────────────────────────────────────────────────────────────┐
│                    WEATHER MODULE                               │
│                                                                 │
│ • Weather generation                                            │
│ • Impact on lemonade sales                                      │
│ • Seasonal effects                                              │
│ • Random events                                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │  GAME STATE     │
                    │    MODULE       │
                    │                 │
                    │ • Weather state │
                    │ • Event history │
                    └─────────────────┘
```

### News Module (Planned)
```
┌─────────────────────────────────────────────────────────────────┐
│                     NEWS MODULE                                 │
│                                                                 │
│ • Market news generation                                        │
│ • Company-specific news                                         │
│ • Economic indicators                                           │
│ • CEO announcements                                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │  GAME STATE     │
                    │    MODULE       │
                    │                 │
                    │ • News history  │
                    │ • Event queue   │
                    └─────────────────┘
```

### Analytics Module (Planned)
```
┌─────────────────────────────────────────────────────────────────┐
│                   ANALYTICS MODULE                              │
│                                                                 │
│ • Performance metrics                                           │
│ • Trading statistics                                            │
│ • Market analysis                                               │
│ • Player rankings                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────┐
                    │  LEDGER MODULE  │
                    │                 │
                    │ • Historical    │
                    │   data access   │
                    └─────────────────┘
```

## Communication Patterns

### Event-Driven Architecture
- **Module Bridge** acts as central event hub
- All modules communicate via events, not direct calls
- Loose coupling between modules
- Easy to add/remove modules

### Data Flow Patterns
1. **User Input** → Frontend → Socket.IO → Main Server → Module Bridge → Target Module
2. **Module Updates** → Module Bridge → Main Server → Socket.IO → Frontend
3. **Inter-Module Communication** → Module Bridge → Target Module

### State Management
- **Game State Module**: Central state store
- **Ledger Module**: Financial state
- **Trading Module**: Market state
- **IPO Module**: IPO-specific state

## Current Issues & Dependencies

### Known Problems
1. **Trading Orders Not Executing**: Orders received but not processed
2. **Phase Synchronization**: Frontend/backend phase mismatches
3. **Participant ID Mismatches**: Cache issues between sessions
4. **Module Initialization**: Order of module setup critical

### Critical Dependencies
- **Module Bridge** must be initialized before other modules
- **Game State** must be set before IPO/Trading phases
- **Ledger** must be cleared and re-initialized for each game
- **Frontend** must sync with backend phase changes

## File Structure
```
server/
├── index-modular.js          # Main server entry point
├── modules/
│   ├── moduleBridge.js       # Central communication hub
│   ├── gameStateModule.js    # Game state management
│   ├── ipoModule.js          # IPO processing
│   ├── tradingModule.js      # Trading system
│   ├── ledgerModule.js       # Financial tracking
│   └── botNameModule.js      # Bot naming system
└── config/
    └── phase-timers.json     # Phase timing configuration

client/
├── game-interface.html       # Main game interface
├── src/
│   ├── App.js               # React app entry
│   ├── components/          # React components
│   └── types/               # TypeScript definitions
└── build/                   # Compiled frontend
```

This architecture provides a clean, modular system that's easy to debug, maintain, and extend with future features.

