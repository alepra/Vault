# Lemonade Stand Stock Market Game - Project Documentation

## Project Overview
A sophisticated stock market simulation game using lemonade stands as companies. Players compete with AI bots to buy/sell stocks, gain controlling interest, and manage companies through various business metrics.

## Core Game Mechanics

### Turn System
- **Turn Length**: 30 seconds (adjustable)
- **Game Duration**: Summer season (adjustable)
- **Turn Control**: Ability to adjust both turn length and total game duration

### Starting Capital & IPO System
- **Starting Capital**: $1,000 per participant (adjustable)
- **Number of Companies**: 4 lemonade stand IPOs (adjustable)
- **Shares per Company**: 1,000 shares each
- **IPO Bidding**: Sealed bidding system (2 minutes)
- **Minimum Bid**: $1.00 per share
- **Average Expected Price**: ~$2.50 per share

### Company Management (CEO Controls)
- **Price Slider**: $0.75 - $2.25 per cup (1-10 scale, baseline 5 = $1.50)
- **Quality Slider**: $0.50 - $2.00 cost per cup (1-10 scale, baseline 5 = $1.25)
- **Marketing Slider**: Percentage of revenue with diminishing returns after 20%
- **CEO Salary**: 0-100% of company profits (announced in newspaper)

### Control Mechanics
- **CEO Threshold**: 35% ownership (350 shares) = automatic CEO position
- **Collusion System**: Players can combine shares to reach 35%+ ownership
- **CEO Replacement**: Automatic when someone exceeds current CEO's ownership
- **Dedicated CEO**: One person in coalition becomes CEO

## Economic System

### Market Demand
- **Baseline Demand**: 1,000 total lemonade glasses per cycle
- **Weather Impact**: Hot weather = more demand, cold/rainy = less demand
- **Economic Conditions**: Good economy = premium demand, bad economy = budget demand
- **Market Share Algorithm**: Based on price competitiveness, quality, and marketing effectiveness

### Price Volatility
- **Maximum Range**: ±5% per turn
- **Supply/Demand Driven**: No artificial price manipulation
- **Market Discovery**: Prices determined by actual trading activity

### Company Performance
- **Units Sold**: Based on market share algorithm
- **Revenue**: Units sold × price per cup
- **Costs**: Units sold × quality cost per cup
- **Profit**: Revenue - costs - marketing expenses
- **Reputation**: Based on quality consistency and price fairness

## Bot System

### Bot Personalities (15 Types)
- **Aggressive Bots**: High risk, likely to collude
- **Conservative Bots**: Low risk, strategic collusion for CEO positions
- **Concentrated Investors**: Focus on 1-2 companies for controlling interest
- **Diversified Investors**: Spread investments across multiple companies
- **Short-term Traders**: Quick buy/sell strategies
- **Long-term Investors**: Hold positions for extended periods
- **Growth-focused**: Prioritize companies with growth potential
- **Value Investors**: Look for undervalued companies
- **Momentum Traders**: Follow market trends
- **Contrarian Investors**: Go against market sentiment
- **Quality-focused**: Prioritize high-quality companies
- **Price-sensitive**: Focus on low-cost opportunities
- **Marketing-focused**: Value companies with strong marketing
- **Risk-averse**: Conservative investment strategies
- **Opportunistic**: Adapt strategies based on market conditions

### Bot Behavior
- **Trading Decisions**: Based on personality traits and market conditions
- **Collusion Tendencies**: Some bots more likely to form alliances
- **Management Style**: Varies when bots become CEOs
- **Adaptation**: Bots learn and adjust strategies over time

## News & Information System

### Newspaper Announcements
- **Company Updates**: Financial conditions, management changes
- **Ownership Changes**: Large percentage acquisitions
- **CEO Share Sales**: When CEOs sell company shares
- **Trading Information**: Weekly volume and price fluctuations
- **Rumors & Events**: Unverified stories, neighborhood events
- **CEO Salary Reports**: Weekly salary and company profit announcements

### Event Types
- **Weather Events**: Hot/cold/rainy weather affecting demand
- **Neighborhood Events**: Soccer tournaments, Little League, etc.
- **Rumors**: Unverified stories (e.g., dog drinking incident)
- **Economic Events**: Market conditions, inflation, etc.
- **Company Events**: Management changes, quality issues, etc.

### Information Impact
- **Market Reaction**: Information affects investor sentiment
- **Supply/Demand**: News drives trading decisions
- **No Artificial Prices**: All price changes through market activity
- **Transparency**: Major events announced publicly

## Technical Architecture

### Technology Stack
- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express
- **Database**: SQLite (development) / PostgreSQL (production)
- **Real-time**: WebSockets for live updates
- **Styling**: Tailwind CSS

### Modular Design
- **CompanyGenerator**: Creates IPO companies with different characteristics
- **PricingEngine**: Calculates stock prices based on supply/demand
- **TradingEngine**: Handles buy/sell orders and order matching
- **BotPersonality**: Defines AI trading behaviors and decision patterns
- **GameState**: Manages turn progression and overall game state
- **NewsSystem**: Generates economic events and announcements
- **EconomicEngine**: Controls weather, events, and market conditions

### Key Features
- **Real-time Updates**: Live market data and trading
- **Responsive Design**: Works on desktop and mobile
- **Game Persistence**: Save/load game progress
- **Multiplayer Support**: Multiple human players
- **Chat System**: Player communication for collusion
- **Test Interface**: Easy parameter adjustment and testing

## Game Balance & Testing

### Initial Parameters
- **Quality Baseline**: Level 5 = $1.50 price, $1.25 cost
- **Marketing Threshold**: 20% of revenue before diminishing returns
- **Price Range**: $0.75 - $2.25 per cup
- **Quality Cost Range**: $0.50 - $2.00 per cup
- **Demand Pool**: 1,000 total glasses per cycle

### Testing Approach
- **Conservative Start**: Begin with reasonable numbers
- **Iterative Adjustment**: Modify based on gameplay testing
- **Parameter Flexibility**: Easy adjustment of all key metrics
- **Real-time Feedback**: Immediate impact visualization

## Victory Conditions

### Net Worth Calculation
- **Stock Holdings**: Current value of all stock positions
- **CEO Salaries**: Cumulative earnings from CEO positions
- **Cash Holdings**: Remaining liquid capital
- **Total Net Worth**: Sum of all assets

### Strategic Depth
- **Trading Profits**: Buy low, sell high strategies
- **CEO Management**: Optimize company performance for salary
- **Collusion Strategies**: Form alliances for control
- **Market Timing**: React to news and events
- **Long-term Planning**: Prepare for seasonal changes

## Future Enhancements

### Potential Additions
- **More Bot Personalities**: Expand beyond 15 types
- **Advanced Events**: More complex economic scenarios
- **Tournament Mode**: Competitive gameplay
- **Historical Data**: Track performance over multiple games
- **Mobile App**: Native mobile application
- **Social Features**: Player profiles, achievements, leaderboards

### Scalability
- **Modular Architecture**: Easy to add new features
- **Configurable Parameters**: Adjustable game settings
- **Extensible Bot System**: Add new personality types
- **Flexible Event System**: Create new event types
- **Database Design**: Supports future data requirements

## Development Status

### Current Phase
- **Foundation**: Building core project structure
- **Data Models**: Creating company, player, and game state models
- **Bot System**: Implementing 15 different personality types
- **Test Interface**: Building parameter adjustment tools

### Next Steps
- **Trading Engine**: Implement buy/sell mechanics
- **Pricing Engine**: Build supply/demand calculations
- **News System**: Create event generation and announcement system
- **UI Development**: Build trading interface and company management screens
- **Testing & Refinement**: Adjust parameters based on gameplay

---

*This document will be updated as the project progresses and new features are added.*






