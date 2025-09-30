export interface Participant {
  id: string;
  name: string;
  isHuman: boolean;
  personality?: BotPersonality;
  capital: number;
  remainingCapital: number;
  shares: { [companyId: string]: number };
  totalSpent: number;
  isCEO: boolean;
  ceoCompanyId?: string;
}

export interface BotPersonality {
  name: string;
  riskTolerance: number;
  concentration: number;
  bidMultiplier: number;
  bidStrategy: 'high' | 'medium' | 'low' | 'ceo' | 'scavenger';
}

export interface Company {
  id: string;
  name: string;
  shares: number;
  totalSharesAllocated: number;
  currentPrice: number;
  ipoPrice: number;
  price: number; // Price per cup
  quality: number; // Quality level (1-10)
  marketing: number; // Marketing percentage (0-1)
  ceoId?: string;
  ceoSalary: number; // CEO salary percentage (0-1)
  performance: {
    unitsSold: number;
    revenue: number;
    ingredientCost: number;
    marketingSpend: number;
    profit: number;
    marketShare: number;
  };
}

export interface Trade {
  id: string;
  companyId: string;
  buyerId: string;
  sellerId: string;
  shares: number;
  price: number;
  timestamp: Date;
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  type: 'company' | 'market' | 'weather' | 'economy' | 'rumor';
  timestamp: Date;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface GameState {
  id: string;
  phase: 'lobby' | 'ipo' | 'trading' | 'management' | 'ended';
  turn: number;
  maxTurns: number;
  turnLength: number; // in seconds
  participants: Participant[];
  companies: Company[];
  trades: Trade[];
  news: NewsItem[];
  weather: 'hot' | 'normal' | 'cold' | 'rainy';
  economy: 'good' | 'normal' | 'bad';
  startTime?: Date;
  endTime?: Date;
  winner?: Participant;
}

export interface Bid {
  participantId: string;
  price: number;
  shares: number;
  amount: number;
}

export interface Order {
  id: string;
  participantId: string;
  companyId: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: Date;
  filled: boolean;
  filledShares: number;
  filledPrice: number;
}

export interface MarketData {
  companyId: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
  marketCap: number;
}


