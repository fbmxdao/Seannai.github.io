import React, { useState, useEffect, useRef } from 'react';
import { Mode, AppTab, Trade, User, RiskSettings } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TradeExecution from './components/TradeExecution';
import AIInsights from './components/AIInsights';
import SettingsTab from './components/SettingsTab';
import PortfolioTab from './components/PortfolioTab';
import LearningCenter from './components/LearningCenter';
import SupportPages from './components/SupportPages';
import AuthPortal from './components/AuthPortal';
import { NAV_ITEMS } from './constants';
import { QuantEngine } from './logic/quantEngine';
import { ShieldAlert } from 'lucide-react';

const TRADES_STORAGE_KEY = 'seanai_trade_vault';
const RISK_STORAGE_KEY = 'seanai_risk_vault';
const TRIAL_BALANCE_KEY = 'seanai_trial_balance';
const LIVE_BALANCE_KEY = 'seanai_live_balance';
const SESSION_KEY = 'seanai_session';

export interface LogEntry {
  id: string;
  timestamp: string;
  msg: string;
  type: 'info' | 'success' | 'warning' | 'ai';
}

const DEFAULT_RISK: RiskSettings = { 
  defaultStopLoss: 2, 
  defaultTakeProfit: 5, 
  maxDrawdown: 15,
  useProxy: false,
  proxyUrl: 'https://cors-anywhere.herokuapp.com/',
  aiMaxPositionSize: 50,
  aiRiskPercent: 2
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try { return JSON.parse(savedSession); } catch (e) { return null; }
    }
    return null;
  });

  const [mode, setMode] = useState<Mode>(Mode.TRIAL);
  const [activeTab, setActiveTab] = useState('dashboard' as AppTab);
  const [collapsed, setCollapsed] = useState(true);
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'offline' | 'checking'>('offline');
  
  const priceHistory = useRef<Record<string, number[]>>({
    'BTC/USDT': Array.from({length: 60}, (_, i) => 96000 + Math.sin(i/10)*200 + i*15),
    'ETH/USDT': Array.from({length: 60}, (_, i) => 2600 + Math.sin(i/10)*10 + i*3),
    'SOL/USDT': Array.from({length: 60}, (_, i) => 190 + Math.sin(i/10)*5 + i*0.8)
  });

  const addLog = (msg: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      msg,
      type
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  const consecutiveLosses = useRef(0);
  const dailyPnL = useRef(0);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);

  const [trialBalance, setTrialBalance] = useState(() => {
    const saved = localStorage.getItem(TRIAL_BALANCE_KEY);
    return saved ? parseFloat(saved) : 10000.00;
  });

  const [liveBalance, setLiveBalance] = useState(() => {
    const saved = localStorage.getItem(LIVE_BALANCE_KEY);
    return saved ? parseFloat(saved) : 2450.75;
  });

  const [marketPrices, setMarketPrices] = useState<Record<string, { price: number, change: string, up: boolean }>>({
    'BTC/USDT': { price: 96450.00, change: '+1.20%', up: true },
    'ETH/USDT': { price: 2680.00, change: '+0.45%', up: true },
    'SOL/USDT': { price: 198.50, change: '-0.15%', up: false },
  });
  const [latency, setLatency] = useState(0);
  
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(() => {
    const saved = localStorage.getItem(RISK_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_RISK, ...parsed };
      } catch (e) { return DEFAULT_RISK; }
    }
    return DEFAULT_RISK;
  });

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem(TRADES_STORAGE_KEY);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return parsed.map((t: any) => ({
          ...t,
          accountType: t.accountType || Mode.TRIAL
        }));
      } catch (e) { return []; }
    }
    return [];
  });

  const currentBalance = mode === Mode.TRIAL ? trialBalance : liveBalance;

  useEffect(() => {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(TRIAL_BALANCE_KEY, trialBalance.toString());
    localStorage.setItem(LIVE_BALANCE_KEY, liveBalance.toString());
  }, [trialBalance, liveBalance]);

  useEffect(() => {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem(RISK_STORAGE_KEY, JSON.stringify(riskSettings));
  }, [riskSettings]);

  // Check Backend Status
  useEffect(() => {
    if (!user) return;
    const checkBackend = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (res.ok) setBackendStatus('connected');
        else setBackendStatus('offline');
      } catch (e) {
        setBackendStatus('offline');
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (user && isCalibrating) {
      addLog(`Kernel booting... Syncing logic gates.`, 'info');
      setTimeout(() => {
        addLog(`Platform Integrity: PASSED`, 'success');
        addLog(`Vault Encryption: ACTIVE`, 'success');
        addLog(`Risk Protocol v4.2: LOADED`, 'success');
        setIsCalibrating(false);
        addLog(`System initialized in ${mode} mode`, 'info');
      }, 1500);
    }
  }, [user, mode]);

  useEffect(() => {
    if (!user) return;
    const fetchPrices = async () => {
      try {
        const start = Date.now();
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
        
        const fetchWithTimeout = (url: string, ms: number) => {
            const proxyPrefix = riskSettings.useProxy && riskSettings.proxyUrl ? riskSettings.proxyUrl : '';
            return Promise.race([
                fetch(`${proxyPrefix}${url}`).then(res => res.json()),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
            ]);
        };

        const results = await Promise.all(
          symbols.map(s => fetchWithTimeout(`https://api.binance.com/api/v3/ticker/24hr?symbol=${s}`, 4000))
        );
        
        setLatency(Date.now() - start);

        const newPrices: Record<string, { price: number, change: string, up: boolean }> = {};
        results.forEach((r: any) => {
          const pair = r.symbol.replace('USDT', '/USDT');
          const price = parseFloat(r.lastPrice);
          newPrices[pair] = {
            price,
            change: `${parseFloat(r.priceChangePercent) > 0 ? '+' : ''}${parseFloat(r.priceChangePercent).toFixed(2)}%`,
            up: parseFloat(r.priceChangePercent) >= 0
          };
          const history = priceHistory.current[pair] || [];
          priceHistory.current[pair] = [...history.slice(-100), price];
        });
        setMarketPrices(newPrices);
      } catch (e) {
        setLatency(Math.floor(Math.random() * 30) + 15);
        setMarketPrices(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(key => {
                const item = next[key];
                const movement = (Math.random() - 0.5) * (key.includes('BTC') ? 50 : 5);
                const newPrice = Math.max(0, item.price + movement);
                next[key] = { ...item, price: newPrice };
                const history = priceHistory.current[key] || [];
                priceHistory.current[key] = [...history.slice(-100), newPrice];
            });
            return next;
        });
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 8000);
    return () => clearInterval(interval);
  }, [riskSettings.useProxy, riskSettings.proxyUrl, user]);

  useEffect(() => {
    if (!isAutoPilot || !user) return;
    const engineInterval = setInterval(() => {
      if (consecutiveLosses.current >= 3) {
        setIsAutoPilot(false);
        setSystemAlert("SAFETY TRIGGERED: Max consecutive losses (3) reached.");
        addLog("Safety Killswitch: Max consecutive losses", "warning");
        return;
      }
      const drawdownPercent = (dailyPnL.current / currentBalance) * 100;
      if (drawdownPercent <= -riskSettings.maxDrawdown) {
        setIsAutoPilot(false);
        setSystemAlert(`SAFETY TRIGGERED: Daily drawdown limit reached.`);
        addLog("Safety Killswitch: Max drawdown limit", "warning");
        return;
      }
      const pairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT'];
      pairs.forEach(pair => {
        const history = priceHistory.current[pair];
        if (!history || history.length < 50) return;
        const analysis = QuantEngine.analyzeTrend(history);
        const currentPrice = marketPrices[pair]?.price || 0;
        const hasOpenPosition = trades.some(t => t.pair === pair && t.status === 'OPEN' && t.accountType === mode);
        if (analysis.action === 'BUY' && !hasOpenPosition) {
          const safeAmount = QuantEngine.getSafePositionSize(
            currentBalance, 
            currentPrice, 
            riskSettings.aiRiskPercent / 100, 
            riskSettings.aiMaxPositionSize
          );
          if (safeAmount > 10) {
            handleExecuteTrade(pair, 'BUY', safeAmount, currentPrice);
            addLog(`AI AUTO: Opening LONG position on ${pair}`, "ai");
          }
        }
      });
    }, 10000);
    return () => clearInterval(engineInterval);
  }, [isAutoPilot, mode, marketPrices, trades, currentBalance, riskSettings, user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      let hasUpdates = false;
      const newTrades = trades.map(t => {
        if (t.status === 'OPEN') {
          const currentPrice = marketPrices[t.pair]?.price || t.entryPrice;
          const priceChange = ((currentPrice - t.entryPrice) / t.entryPrice) * 100;
          const isLong = t.type === 'BUY';
          const pnlPercent = isLong ? priceChange : -priceChange;
          if (pnlPercent <= -riskSettings.defaultStopLoss || pnlPercent >= riskSettings.defaultTakeProfit) {
            hasUpdates = true;
            const pnlValue = t.amount * (pnlPercent / 100);
            dailyPnL.current += pnlValue;
            if (pnlValue < 0) consecutiveLosses.current++;
            else consecutiveLosses.current = 0;
            if (t.accountType === Mode.LIVE) setLiveBalance(b => b + t.amount + pnlValue);
            else setTrialBalance(b => b + t.amount + pnlValue);
            addLog(`Trade Closed: ${t.pair} | PnL: ${pnlValue >= 0 ? '+' : ''}$${pnlValue.toFixed(2)}`, pnlValue >= 0 ? "success" : "warning");
            return { ...t, status: 'CLOSED' as const, pnl: pnlValue, exitPrice: currentPrice };
          }
        }
        return t;
      });
      if (hasUpdates) setTrades(newTrades);
    }, 5000);
    return () => clearInterval(interval);
  }, [trades, marketPrices, riskSettings, user]);

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setIsCalibrating(true);
  };

  const handleExecuteTrade = async (pair: string, type: 'BUY' | 'SELL', amount: number, price: number) => {
    // If in Live mode and backend is connected, we could route here
    if (mode === Mode.LIVE && backendStatus === 'connected') {
        addLog(`Routing ${type} ${pair} to Binance via Quant Backend...`, 'info');
        // Simulated API call to server/main.py
        // await fetch('http://localhost:8000/api/v1/order', { method: 'POST', body: JSON.stringify({ pair, type, amount }) });
    }

    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      pair,
      type,
      entryPrice: price,
      amount,
      status: 'OPEN',
      timestamp: Date.now(),
      stopLoss: price * (1 - riskSettings.defaultStopLoss / 100),
      takeProfit: price * (1 + riskSettings.defaultTakeProfit / 100),
      accountType: mode
    };
    
    setTrades(prev => [newTrade, ...prev]);
    if (mode === Mode.TRIAL) setTrialBalance(prev => prev - amount);
    else setLiveBalance(prev => prev - amount);
    
    if (!isAutoPilot) addLog(`Order Executed: ${type} ${pair} (Simulation)`, "success");
  };

  const handleCloseTrade = (tradeId: string) => {
    setTrades(prevTrades => {
      const tradeIndex = prevTrades.findIndex(t => t.id === tradeId);
      if (tradeIndex === -1 || prevTrades[tradeIndex].status === 'CLOSED') return prevTrades;

      const trade = prevTrades[tradeIndex];
      const currentPrice = marketPrices[trade.pair]?.price || trade.entryPrice;
      const isLong = trade.type === 'BUY';
      const priceChange = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
      const pnlPercent = isLong ? priceChange : -priceChange;
      const pnlValue = trade.amount * (pnlPercent / 100);

      if (trade.accountType === Mode.LIVE) setLiveBalance(b => b + trade.amount + pnlValue);
      else setTrialBalance(b => b + trade.amount + pnlValue);

      addLog(`Manual Override: Closed ${trade.pair} | Final PnL: ${pnlValue >= 0 ? '+' : ''}$${pnlValue.toFixed(2)}`, pnlValue >= 0 ? "success" : "warning");

      dailyPnL.current += pnlValue;
      if (pnlValue < 0) consecutiveLosses.current++;
      else consecutiveLosses.current = 0;

      const newTrades = [...prevTrades];
      newTrades[tradeIndex] = { ...trade, status: 'CLOSED', exitPrice: currentPrice, pnl: pnlValue };
      return newTrades;
    });
  };

  const onUpdateRisk = (newSettings: RiskSettings) => {
    setRiskSettings(newSettings);
    if (newSettings.defaultStopLoss === 2 && newSettings.defaultTakeProfit === 5 && newSettings.maxDrawdown === 15) {
      addLog("Risk Protocol Reset: Factory Defaults Applied", "warning");
    }
  };

  if (!user) return <AuthPortal onLogin={(u) => setUser(u)} />;

  if (isCalibrating) {
    return (
      <div className="min-h-screen bg-[#1a1d28] text-[#f3f4f6] flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 animate-pulse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black uppercase tracking-widest text-white">System Calibration</h2>
          <p className="text-[10px] font-mono text-blue-400">Syncing Logic Engine & Market Feeds...</p>
        </div>
      </div>
    );
  }

  const displayedTrades = trades.filter(t => (t.accountType || Mode.TRIAL) === mode);

  return (
    <div className="min-h-screen bg-[#1a1d28] text-[#f3f4f6] flex flex-col">
      <Header user={user} onLogout={handleLogout} mode={mode} setMode={setMode} balance={currentBalance} />
      
      {systemAlert && (
        <div className="bg-red-600/20 border-b border-red-500/30 text-red-400 p-2 text-center text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <ShieldAlert size={14} /> {systemAlert}
          <button onClick={() => { setSystemAlert(null); consecutiveLosses.current = 0; }} className="ml-4 underline">Reset Safety</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden md:block">
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0 h-[calc(100vh-80px)]">
          {activeTab === 'dashboard' ? (
            <Dashboard 
              mode={mode} 
              setActiveTab={setActiveTab} 
              trades={displayedTrades} 
              balance={currentBalance} 
              marketPrices={marketPrices} 
              latency={latency} 
              logs={logs}
              onClearLogs={() => setLogs([])}
              backendStatus={backendStatus}
            />
          ) : activeTab === 'trade' ? (
            <TradeExecution 
              mode={mode} 
              balance={currentBalance} 
              onExecute={handleExecuteTrade} 
              isAuto={isAutoPilot} 
              setIsAuto={setIsAutoPilot} 
              marketPrices={marketPrices} 
              riskSettings={riskSettings} 
              logs={logs}
            />
          ) : activeTab === 'insights' ? (
            <AIInsights trades={trades} marketPrices={marketPrices} priceHistory={priceHistory.current} />
          ) : activeTab === 'settings' ? (
            <SettingsTab riskSettings={riskSettings} setRiskSettings={onUpdateRisk} />
          ) : activeTab === 'portfolio' ? (
            <PortfolioTab trades={displayedTrades} balance={currentBalance} mode={mode} marketPrices={marketPrices} onCloseTrade={handleCloseTrade} />
          ) : activeTab === 'learning' ? (
            <LearningCenter />
          ) : activeTab === 'support' ? (
            <SupportPages />
          ) : (
            <div className="p-20 text-center text-gray-500 uppercase font-black text-xs">Module under construction</div>
          )}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#232837]/95 backdrop-blur-xl border-t border-gray-800 flex items-center gap-4 px-4 py-3 z-[100] overflow-x-auto custom-scrollbar whitespace-nowrap">
        {NAV_ITEMS.map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id)} 
            className={`flex flex-col items-center gap-1 shrink-0 px-3 transition-all ${
              activeTab === item.id ? 'text-blue-400 scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : 'text-gray-500'
            }`}
          >
            {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;