
import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  PieChart, 
  Lightbulb, 
  Settings, 
  BookOpen, 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap
} from 'lucide-react';
import { AppTab } from './types';

export const COLORS = {
  bg: '#1a1d28',
  bgSecondary: '#232837',
  trial: '#3b82f6',
  live: '#10b981',
  profit: '#10b981',
  loss: '#ef4444',
  warning: '#f59e0b',
  textPrimary: '#f3f4f6',
  textSecondary: '#9ca3af',
};

export const NAV_ITEMS = [
  { id: 'dashboard' as AppTab, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'trade' as AppTab, label: 'Trade Execution', icon: <Activity size={20} /> },
  { id: 'portfolio' as AppTab, label: 'Portfolio & Analytics', icon: <BarChart3 size={20} /> },
  { id: 'insights' as AppTab, label: 'AI Insights', icon: <Lightbulb size={20} /> },
  { id: 'settings' as AppTab, label: 'Settings', icon: <Settings size={20} /> },
  { id: 'learning' as AppTab, label: 'Learning Center', icon: <BookOpen size={20} /> },
  { id: 'support' as AppTab, label: 'Support', icon: <HelpCircle size={20} /> },
];

export const MOCK_CHART_DATA = [
  { name: '00:00', value: 4000 },
  { name: '04:00', value: 3000 },
  { name: '08:00', value: 2000 },
  { name: '12:00', value: 2780 },
  { name: '16:00', value: 1890 },
  { name: '20:00', value: 2390 },
  { name: '23:59', value: 3490 },
];

export const MOCK_PORTFOLIO_DATA = [
  { name: 'BTC', value: 45, color: '#F7931A' },
  { name: 'ETH', value: 30, color: '#627EEA' },
  { name: 'SOL', value: 15, color: '#14F195' },
  { name: 'Other', value: 10, color: '#9ca3af' },
];

export const MOCK_HISTORY = [
  { id: '1', pair: 'BTC/USDT', type: 'BUY', entryPrice: 62450.50, exitPrice: 63100.20, amount: 0.05, status: 'CLOSED', pnl: 32.48, timestamp: Date.now() - 1000000 },
  { id: '2', pair: 'ETH/USDT', type: 'SELL', entryPrice: 3420.10, exitPrice: 3380.50, amount: 1.2, status: 'CLOSED', pnl: 47.52, timestamp: Date.now() - 2000000 },
  { id: '3', pair: 'SOL/USDT', type: 'BUY', entryPrice: 145.20, exitPrice: 142.10, amount: 10.0, status: 'CLOSED', pnl: -31.00, timestamp: Date.now() - 3000000 },
];
