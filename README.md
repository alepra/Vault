# Lemonade Stand Stock Market Game

A sophisticated stock market simulation game using lemonade stands as companies. Players compete with AI bots to buy/sell stocks, gain controlling interest, and manage companies through various business metrics.

## 🎮 Game Features

- **Real-time Trading**: Buy and sell stocks in a dynamic market
- **CEO Management**: Control company operations when you own 35%+ of shares
- **AI Bot Competition**: 11 different bot personalities with unique strategies
- **Economic Simulation**: Weather, economy, and market conditions affect demand
- **Educational Value**: Learn business concepts through interactive gameplay

## 🚀 Quick Start

### ⚠️ CRITICAL: READ THIS FIRST!
**DO NOT try to start servers manually!** Use the existing working batch files:
- **`START_GAME_CACHE_BUSTED.bat`** - Full startup (RECOMMENDED)
- **`START_GAME_SIMPLE.bat`** - Basic startup
- See `SERVERS_FIXED_DOCUMENTATION.md` for details

### ✅ **CURRENT STATUS - JANUARY 20, 2025:**
- **IPO PHASE ADVANCEMENT FIXED!** - Game now works end-to-end
- **Complete game flow working** - Lobby → IPO → Trading phases
- **Trading interface accessible** - Users can now reach trading module
- See `IPO_PHASE_ADVANCEMENT_FIXED_FINAL.md` for technical details

### Prerequisites
- Node.js (v16 or higher)
- Python 3.x
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 🏗️ Project Structure

```
lemonade-stand-stock-market/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── index.js          # Express server with Socket.io
│   └── .env              # Environment variables
├── test-interface/        # Original test interface
├── backup-test-interface/ # Backup of test interface
└── package.json          # Root package.json
```

## 🎯 Game Phases

### 1. Lobby
- Join the game with your name
- Wait for other players (or start with AI bots)
- Host can start the game when ready

### 2. IPO (Initial Public Offering)
- 4 lemonade stand companies go public
- Dutch auction bidding system
- AI bots compete for shares
- CEO positions determined (35%+ ownership)

### 3. Trading
- Real-time stock trading
- Buy/sell orders with market pricing
- Portfolio management
- Company performance tracking

### 4. Management (CEO Phase)
- CEOs control company operations
- Set prices, quality, and marketing
- Real-time performance feedback
- Strategic decision making

## 🤖 AI Bot Personalities

1. **Aggressive** - High risk, likely to collude
2. **Conservative** - Low risk, strategic collusion
3. **Concentrated** - Focus on 1-2 companies for CEO positions
4. **Diversified** - Spread investments across multiple companies
5. **Short-term Trader** - Quick buy/sell strategies
6. **Long-term Investor** - Hold positions for extended periods
7. **Growth-focused** - Prioritize companies with growth potential
8. **Value Investor** - Look for undervalued companies
9. **Momentum Trader** - Follow market trends
10. **Contrarian Investor** - Go against market sentiment
11. **Quality-focused** - Prioritize high-quality companies
12. **Price-sensitive** - Focus on low-cost opportunities
13. **Marketing-focused** - Value companies with strong marketing
14. **Risk-averse** - Conservative investment strategies
15. **Opportunistic** - Adapt strategies based on market conditions

## 📊 Economic System

### Market Demand
- **Baseline**: 1,000 total lemonade glasses per cycle
- **Weather Impact**: Hot weather = more demand, cold/rainy = less demand
- **Economic Conditions**: Good economy = premium demand, bad economy = budget demand

### Company Management
- **Price Range**: $0.75 - $2.25 per cup
- **Quality Range**: $0.50 - $2.00 cost per cup
- **Marketing**: 0-40% of revenue with diminishing returns
- **CEO Salary**: 0-100% of company profits

### Victory Conditions
- **Net Worth**: Stock holdings + CEO salaries + cash
- **Strategic Depth**: Trading profits, CEO management, collusion strategies

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start both frontend and backend
- `npm run client` - Start only React frontend
- `npm run server` - Start only Node.js backend
- `npm run build` - Build for production
- `npm run install-all` - Install all dependencies

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite
- **Real-time**: WebSockets for live updates

## 📚 Educational Value

### Business Concepts Taught
- **Supply & Demand**: Market share competition
- **Pricing Strategy**: Price vs. quality trade-offs
- **Marketing ROI**: Diminishing returns
- **Reputation Management**: Long-term vs. short-term profits
- **Market Competition**: Multiple companies competing
- **Economic Factors**: External influences on business

### Student Engagement
- **Relatable Scenarios**: Lemonade stands, allowance money
- **Interactive Learning**: Real-time feedback
- **Strategic Thinking**: Multiple variables to balance
- **Competition**: AI bots with different strategies

## 🔧 Configuration

### Game Settings
- **Turn Length**: 30 seconds (adjustable)
- **Game Duration**: Summer season (adjustable)
- **Starting Capital**: $1,000 per participant
- **Companies**: 4 lemonade stand IPOs
- **Shares per Company**: 1,000 shares each

### Environment Variables
Create a `.env` file in the server directory:
```
NODE_ENV=development
PORT=3001
DB_PATH=./game.db
```

## 🎉 Success Metrics

- ✅ **Working Test Interface**: Fully functional economic engine
- ✅ **Realistic Business Model**: Price, quality, marketing, reputation
- ✅ **Student-Friendly Design**: Kid-appropriate language and concepts
- ✅ **Modular Architecture**: Easy to extend and modify
- ✅ **Comprehensive Documentation**: Everything preserved and documented

## 🚀 Future Enhancements

- **More Bot Personalities**: Expand beyond 15 types
- **Advanced Events**: More complex economic scenarios
- **Tournament Mode**: Competitive gameplay
- **Historical Data**: Track performance over multiple games
- **Mobile App**: Native mobile application
- **Social Features**: Player profiles, achievements, leaderboards

## 📄 License

MIT License - see LICENSE file for details

---

**Last Updated**: January 9, 2025  
**Status**: ✅ READY FOR FULL GAME DEVELOPMENT  
**Next Step**: Begin React frontend and Node.js backend setup


