
export enum Mode {
  TRIAL = 'TRIAL',
  LIVE = 'LIVE'
}

export type AppTab = 
  | 'dashboard' 
  | 'trade' 
  | 'portfolio' 
  | 'insights' 
  | 'settings' 
  | 'learning' 
  | 'support';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'TRADER' | 'MANAGER';
  avatar?: string;
}

export interface ClientAccount {
  id: string;
  name: string;
  tier: 'BASIC' | 'PRO' | 'WHALE';
  balance: number;
  status: 'ACTIVE' | 'PAUSED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskSettings {
  defaultStopLoss: number;
  defaultTakeProfit: number;
  maxDrawdown: number;
  useProxy?: boolean;
  proxyUrl?: string;
  aiMaxPositionSize: number;
  aiRiskPercent: number;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  status: 'OPEN' | 'CLOSED';
  pnl?: number;
  timestamp: number;
  stopLoss?: number;
  takeProfit?: number;
  accountType?: Mode;
}

export interface AIInsight {
  pair: string;
  confidence: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
  keyLevels?: {
    support: number;
    resistance: number;
  };
  timestamp?: number;
}
