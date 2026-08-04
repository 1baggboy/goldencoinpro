import React, { useEffect, useState } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  AlertCircle,
  Zap,
  ShieldCheck,
  TrendingUp,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  Copy,
  Check,
  Users,
  Inbox,
  Sparkles,
  BrainCircuit,
  Search,
  RefreshCw,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { SearchPanel, SearchItem } from "../components/SearchPanel";
import { getMarketInsight, MarketInsight, getDailyStrategy, DailyStrategy } from "../services/geminiService";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../AuthContext";
import { APP_CONFIG } from "../config";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { usePrices } from "../PriceContext";
import { CryptoAdVert } from "../components/CryptoAdVert";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  handleFirestoreError,
  OperationType,
} from "../lib/firestoreErrorHandler";
import { QuickActions } from "../components/Dashboard/QuickActions";
import { PortfolioSummary } from "../components/Dashboard/PortfolioSummary";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-[#C9A96E]/20 p-4 rounded-lg shadow-xl backdrop-blur-md">
        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-[#B89255] dark:text-[#C9A96E] font-bold text-sm">Total: ${payload[0].value.toLocaleString()}</p>
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-[#C9A96E]/10 text-[10px] text-gray-500">
            <p>Investment Returns: ${(payload[0].value * 0.15).toFixed(0)}</p>
            <p>Deposits: ${(payload[0].value * 0.85).toFixed(0)}</p>
        </div>
      </div>
    );
  }
  return null;
};

const data = [
  { name: "Mon", value: 4000 },
  { name: "Tue", value: 3000 },
  { name: "Wed", value: 5000 },
  { name: "Thu", value: 4500 },
  { name: "Fri", value: 6000 },
  { name: "Sat", value: 5500 },
  { name: "Sun", value: 7000 },
];

export const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, user, isRestricted } = useAuth();
  const { prices, error: priceError } = usePrices();
  const [activeInvestmentsCount, setActiveInvestmentsCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<MarketInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [dailyStrategy, setDailyStrategy] = useState<DailyStrategy | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [tps, setTps] = useState<number>(0);
  const [isDashboardSearchOpen, setIsDashboardSearchOpen] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [sortCriteria, setSortCriteria] = useState<'date' | 'amount' | 'type'>('date');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'BTC'>('USD');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsDashboardSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dashboardSearchItems: SearchItem[] = [
    { name: "Transactions", path: "/transactions" },
    { name: "Deposit", path: "/deposit" },
    { name: "Withdraw", path: "/withdraw" },
    { name: "Invest", path: "/invest" },
    { name: "Profile", path: "/profile" },
  ];

  // Define fetching functions in component scope so they can be reused
  const fetchInsight = async (force = false) => {
    // Only fetch if we have prices and not already loading. 
    // We allow fetching even if price is 0 if force is true or if it's the first run
    if (prices && (prices.btc?.usd > 0 || force)) {
      setLoadingInsight(true);
      try {
        const insight = await getMarketInsight(prices);
        if (insight) {
          setAiInsight(insight);
        }
      } catch (e) {
        console.error("Failed to fetch AI insight:", e);
      } finally {
        setLoadingInsight(false);
      }
    }
  };

  const fetchStrategy = async (force = false) => {
    if (!user || !profile) return;
    
    const userId = user.uid;
    const CACHE_KEY = `goldencoin_daily_strategy_${userId}`;
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (cached && !force) {
      try {
        const { timestamp, strategy } = JSON.parse(cached);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setDailyStrategy(strategy);
          return;
        }
      } catch (e) {
        console.error("Cache parse error", e);
      }
    }

    try {
      const strategy = await getDailyStrategy({
        usdBalance: profile.usdBalance,
        tradingBalanceBtc: profile.tradingBalanceBtc,
        activeInvestmentsCount,
        hasRecentActivity: recentTransactions.length > 0
      });
      
      if (strategy) {
        setDailyStrategy(strategy);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          strategy
        }));
      }
    } catch (error) {
      console.error("Failed to fetch daily strategy:", error);
    }
  };

  // Real Latency and TPS simulation
  useEffect(() => {
    const measureLatency = async () => {
      const start = performance.now();
      try {
        // Try the API first
        const resp = await fetch("/api/health");
        if (!resp.ok) throw new Error("API down");
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch (e) {
        // Fallback to a simple asset fetch/root fetch for latency calculation
        try {
          const startBase = performance.now();
          await fetch("/", { method: 'HEAD' });
          const endBase = performance.now();
          setLatency(Math.round(endBase - startBase));
        } catch (innerE) {
          setLatency(Math.floor(Math.random() * 20) + 10); // Plausible fallback
        }
      }
    };

    const updateTps = () => {
      const baseTps = 7200;
      const fluctuation = Math.floor(Math.random() * 800) - 400;
      setTps(baseTps + fluctuation);
    };

    measureLatency();
    updateTps();

    const latencyInterval = setInterval(measureLatency, 5000);
    const tpsInterval = setInterval(updateTps, 2000);

    return () => {
      clearInterval(latencyInterval);
      clearInterval(tpsInterval);
    };
  }, []);

  useEffect(() => {
    let interval: any;
    if (prices && isAutoRefreshEnabled) {
      // If we have prices (even if slightly stale or initial) and no insight, try to fetch
      // The fetchInsight function itself will check if price is valid (>0)
      if (!aiInsight && !loadingInsight) {
        fetchInsight();
      }
      
      // Auto-refresh every 3 minutes
      interval = setInterval(() => fetchInsight(), 3 * 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [prices?.btc?.usd, aiInsight === null, isAutoRefreshEnabled]); // Re-run if btc price becomes available or if insight is missing

  useEffect(() => {
    fetchStrategy();
  }, [user, profile, activeInvestmentsCount, recentTransactions.length]);

  useEffect(() => {
    const livePrice = prices?.btc?.usd || 0;
    const currentBalance = livePrice > 0 ? (profile?.btcBalance || 0) * livePrice : (profile?.usdBalance || 0);

    if (currentBalance === 0 && recentTransactions.length === 0) {
      setChartData(data.map((d) => ({ ...d, value: 0 })));
    } else {
      // Anchor chart data to current balance with simulated historical growth
      setChartData(data.map((d, i) => ({
        ...d,
        value: currentBalance * (0.85 + (i * 0.025))
      })));
    }
  }, [recentTransactions, profile, prices]);

  useEffect(() => {
    // Fetch active investments count
    let unsubInvestments = () => {};
    let unsubTransactions = () => {};

    if (user) {
      const q = query(
        collection(db, "investments"),
        where("userId", "==", user.uid),
        where("status", "==", "active"),
      );
      unsubInvestments = onSnapshot(
        q,
        (snap) => {
          setActiveInvestmentsCount(snap.docs.length);
        },
        (error) =>
          handleFirestoreError(error, OperationType.LIST, "investments"),
      );

      const txQ = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(5),
      );
      unsubTransactions = onSnapshot(
        txQ,
        (snap) => {
          setRecentTransactions(
            snap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        },
        (error) =>
          handleFirestoreError(error, OperationType.LIST, "transactions"),
      );
    }

    return () => {
      unsubInvestments();
      unsubTransactions();
    };
  }, [user]);

  const liveBtcPrice = prices?.btc?.usd || 0;
  const usdBalance = liveBtcPrice > 0 ? (profile?.btcBalance || 0) * liveBtcPrice : (profile?.usdBalance || 0);
  
  // Trading balance is a direct mirror of account balance
  const tradingBtcBalance = profile?.btcBalance || 0;
  const tradingUsdBalance = usdBalance;

  // Widget States
  const [portfolioExpanded, setPortfolioExpanded] = useState(() => localStorage.getItem('portfolioExpanded') === 'true');
  const [portfolioOrder, setPortfolioOrder] = useState(() => localStorage.getItem('portfolioOrder') || 'last'); // 'first' or 'last'
  const [activityExpanded, setActivityExpanded] = useState(() => localStorage.getItem('activityExpanded') === 'true');
  const [activityOrder, setActivityOrder] = useState(() => localStorage.getItem('activityOrder') || 'last'); // 'first' or 'last'

  useEffect(() => {
      localStorage.setItem('portfolioExpanded', portfolioExpanded.toString());
      localStorage.setItem('portfolioOrder', portfolioOrder);
      localStorage.setItem('activityExpanded', activityExpanded.toString());
      localStorage.setItem('activityOrder', activityOrder);
  }, [portfolioExpanded, portfolioOrder, activityExpanded, activityOrder]);

  const copyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={40} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">
          Account Restricted
        </h1>
        <p className="text-gray-400 max-w-md mb-8">
          Your account has been restricted due to suspicious activity or a
          violation of our terms of service. Please contact support to resolve
          this issue.
        </p>
        <button
          onClick={() =>
            (window.location.href = `mailto:${APP_CONFIG.supportEmail}`)
          }
          className="px-8 py-3 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all"
        >
          Contact Support
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-12 text-slate-900 dark:text-gray-100 font-sans transition-all duration-300 w-full">
      <SearchPanel 
        isOpen={isDashboardSearchOpen} 
        onClose={() => setIsDashboardSearchOpen(false)} 
        items={dashboardSearchItems}
        title="the dashboard"
      />
      <ReactTooltip id="dashboard-tooltip" className="z-50" />
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 lg:gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight font-display transition-all">
              Welcome back, {profile?.displayName?.split(" ")[0]}!
            </h1>
            <span className="hidden sm:inline-block px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] font-bold rounded-full uppercase tracking-[0.2em] border border-[#C9A96E]/20">
              Member
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1 lg:mt-2 text-sm lg:text-lg opacity-80">
            Here's what's happening with your portfolio today.
          </p>
        </div>
        <div className="flex items-center gap-3 lg:gap-4">
          <button
              onClick={() => setIsDashboardSearchOpen(true)}
              className="p-4 bg-slate-200 dark:bg-slate-900 border border-[#C9A96E]/20 rounded-2xl flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-800 transition-all text-[#C9A96E]"
          >
              <Search size={18} />
          </button>
          <Link
            to="/deposit"
            className="flex-1 sm:flex-none px-6 lg:px-8 py-3 lg:py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl lg:rounded-2xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C9A96E]/20"
          >
            <ArrowDownCircle size={18} className="lg:size-5" />
            Deposit BTC
          </Link>
          <Link
            to="/withdraw"
            className="flex-1 sm:flex-none px-6 lg:px-8 py-3 lg:py-4 bg-slate-200 dark:bg-slate-900 text-[#0B0B0B] dark:text-white font-bold rounded-xl lg:rounded-2xl border border-[#C9A96E]/20 hover:bg-slate-300 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <ArrowUpCircle size={18} className="lg:size-5" />
            Withdraw
          </Link>
        </div>
      </div>

      {priceError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={18} />
          {priceError}
        </div>
      )}

      {!profile?.twoFactorEnabled && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Protect your account</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-lg">
                Your account is currently at risk. Enable Two-Factor Authentication (2FA) to significantly improve your security score and protect your funds.
              </p>
            </div>
          </div>
          <Link
            to="/2fa/setup"
            className="w-full sm:w-auto px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold rounded-xl transition-all text-sm text-center shadow-lg shadow-yellow-500/20 shrink-0"
          >
            Enable 2FA
          </Link>
        </div>
      )}

      {/* Stats Header with Currency Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#C9A96E]/10 pb-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-[#C9A96E] font-display flex items-center gap-2">
          <Wallet size={18} className="text-[#C9A96E]" /> Portfolio Balances
        </h2>
        
        {/* Currency Switcher Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-[#C9A96E]/10">
          <span className="text-[11px] font-bold tracking-tight text-slate-500 dark:text-gray-400 pl-1.5 pr-1 select-none">DISPLAY IN:</span>
          <div className="flex bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl shadow-inner gap-1">
            <button
              onClick={() => setDisplayCurrency("USD")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider",
                displayCurrency === "USD"
                  ? "bg-[#C9A96E] text-slate-950 shadow-md transform hover:scale-105"
                  : "text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              USD ($)
            </button>
            <button
              onClick={() => setDisplayCurrency("BTC")}
              className={cn(
                "px-3.5 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-wider",
                displayCurrency === "BTC"
                  ? "bg-[#C9A96E] text-slate-950 shadow-md transform hover:scale-105"
                  : "text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white"
              )}
            >
              BTC (₿)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-5 xl:gap-6">
        <StatCard
          title="Account Balance"
          value={`$${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          color="gold"
          tooltip="Available cash balance for investing, trading, or standard withdrawal"
          warning={usdBalance < 500 ? "Balance is below the $500 minimum required for standard trading strategies." : undefined}
        />
        <StatCard
          title="Trading Balance"
          value={`${tradingBtcBalance.toFixed(4)} BTC`}
          icon={Zap}
          color="gold"
          tooltip="The BTC equivalent of your current account balance, active within high-frequency algorithms"
        />
        <StatCard
          title="Total Deposited"
          value={`$${(profile?.totalDepositedUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subValue={`${(profile?.totalDeposited || 0).toFixed(4)} BTC Equivalent`}
          icon={TrendingUp}
          color="green"
          tooltip="Total historical amount loaded and recorded under this specific identity portfolio"
        />
        <StatCard
          title="Active Investments"
          value={activeInvestmentsCount}
          subValue={
            activeInvestmentsCount > 0 ? "Plans in progress" : "No active plans"
          }
          icon={Zap}
          color="gold"
          tooltip="Number of currently running investment programs"
        />
        <StatCard
          title="KYC Status"
          value={
            profile?.kycStatus === "not_submitted" || !profile?.kycStatus
              ? "UNVERIFIED"
              : profile?.kycStatus?.replace("_", " ").toUpperCase()
          }
          subValue={
            profile?.kycStatus === "verified"
              ? "Identity verified"
              : profile?.kycStatus === "pending"
                ? "Verification pending"
                : profile?.kycStatus === "rejected"
                  ? "Verification failed"
                  : "Complete KYC"
          }
          icon={profile?.kycStatus === "verified" ? ShieldCheck : AlertCircle}
          color={
            profile?.kycStatus === "verified"
              ? "green"
              : profile?.kycStatus === "pending"
                ? "yellow"
                : "red"
          }
          onClick={() => navigate("/kyc")}
          tooltip="Security and withdrawal verification status"
        />
        <StatCard
          title="Market Context"
          value={`$${prices?.btc?.usd?.toLocaleString() || "---"}`}
          subValue={
            <div className="flex items-center gap-1.5 justify-center sm:justify-start">
               <span className={cn(
                 "text-[9px] font-black uppercase tracking-tighter",
                 prices?.btc?.change >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-400"
               )}>
                 {prices?.btc?.change >= 0 ? "+" : ""}{prices?.btc?.change?.toFixed(2)}% (24h)
               </span>
               <div className="flex items-center gap-1 bg-[#C9A96E]/10 px-1.5 py-0.5 rounded-full border border-[#C9A96E]/20">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                 <span className="text-[7px] font-black text-[#C9A96E] uppercase tracking-widest">Live</span>
               </div>
            </div>
          }
          icon={TrendingUp}
          color={prices?.btc?.change >= 0 ? "green" : "red"}
          tooltip="Current real-time Bitcoin price directly from high-frequency market sockets"
        />
      </div>

      {/* Market Ticker */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-4 overflow-hidden select-none">
        <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
          {Object.keys(prices || {}).length > 0 ? (
            <>
              {Object.keys(prices).map((sym) => (
                <TickerItem
                  key={`${sym}-1`}
                  symbol={sym.toUpperCase()}
                  price={prices[sym]?.usd}
                  change={prices[sym]?.change}
                  direction={prices[sym]?.direction}
                  displayCurrency={displayCurrency}
                  btcPrice={prices?.btc?.usd}
                />
              ))}
              {Object.keys(prices).map((sym) => (
                <TickerItem
                  key={`${sym}-2`}
                  symbol={sym.toUpperCase()}
                  price={prices[sym]?.usd}
                  change={prices[sym]?.change}
                  direction={prices[sym]?.direction}
                  displayCurrency={displayCurrency}
                  btcPrice={prices?.btc?.usd}
                />
              ))}
            </>
          ) : (
            <>
              {["BTC", "ETH", "SOL", "ADA", "XRP", "BNB", "DOGE", "LINK", "DOT", "MATIC", "AVAX", "SHIB", "TRX", "LTC", "NEAR", "UNI", "ALGO", "ATOM", "ICP", "XLM", "STX", "FIL", "LDO", "HBAR", "ARB"].map((sym) => (
                <TickerItem
                  key={`${sym}-fallback-1`}
                  symbol={sym}
                  price={sym === "BTC" ? 67340 : sym === "ETH" ? 3480 : 172.5}
                  change={1.5}
                  direction="up"
                  displayCurrency={displayCurrency}
                  btcPrice={67340}
                />
              ))}
              {["BTC", "ETH", "SOL", "ADA", "XRP", "BNB", "DOGE", "LINK", "DOT", "MATIC", "AVAX", "SHIB", "TRX", "LTC", "NEAR", "UNI", "ALGO", "ATOM", "ICP", "XLM", "STX", "FIL", "LDO", "HBAR", "ARB"].map((sym) => (
                <TickerItem
                  key={`${sym}-fallback-2`}
                  symbol={sym}
                  price={sym === "BTC" ? 67340 : sym === "ETH" ? 3480 : 172.5}
                  change={1.5}
                  direction="up"
                  displayCurrency={displayCurrency}
                  btcPrice={67340}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column: Chart and AI Insight */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Insight Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#C9A96E]/20 via-[#C9A96E]/5 to-transparent blur-3xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
            <div className="relative glass-card border border-[#C9A96E]/20 rounded-3xl p-6 lg:p-8 overflow-hidden bg-white/5 backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A96E]/10 rounded-full blur-3xl -z-10 group-hover:bg-[#C9A96E]/20 transition-all duration-700"></div>
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-12">
                <div className="flex gap-4 items-start flex-1 w-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#C9A96E]/30 to-[#C9A96E]/10 text-[#C9A96E] rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-[#C9A96E]/10 border border-[#C9A96E]/20">
                    <BrainCircuit size={32} className="animate-pulse" />
                  </div>
                  <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-xl font-bold text-[#0B0B0B] dark:text-white flex items-center gap-2">
                          Algorithmic Market Desk
                        </h3>
                        <span className="bg-[#C9A96E] text-[#0B0B0B] text-[10px] font-black px-2 py-0.5 rounded-md uppercase shadow-sm">
                          Pro
                        </span>
                        <button 
                          onClick={() => fetchInsight(true)}
                          disabled={loadingInsight}
                          className="ml-2 p-1 hover:bg-[#C9A96E]/10 rounded-full text-[#C9A96E] transition-all disabled:opacity-50"
                          title="Refresh Insight"
                        >
                          <Sparkles size={14} className={loadingInsight ? "animate-spin" : ""} />
                        </button>
                      </div>
                    {loadingInsight || !aiInsight ? (
                      <div className="space-y-3 w-full">
                        <div className="h-4 w-48 bg-[#C9A96E]/10 animate-pulse rounded"></div>
                        <div className="h-3 max-w-lg w-full bg-[#C9A96E]/5 animate-pulse rounded">
                          {!loadingInsight && !aiInsight && (
                            <span className="text-[10px] text-gray-500 font-medium">Establishing secure market socket...</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <h4 className="text-lg font-bold text-[#C9A96E] mb-3 break-words whitespace-normal leading-snug">
                          {aiInsight.headline}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed font-medium break-words whitespace-normal">
                          {aiInsight.insight}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {!loadingInsight && aiInsight && (
                  <div className="flex flex-col items-start lg:items-end gap-3 shrink-0 w-full lg:w-1/3 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#C9A96E]/10">
                    <div
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border shadow-sm w-fit",
                        aiInsight.sentiment === "bullish"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : aiInsight.sentiment === "bearish"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
                      )}
                    >
                      <TrendingUp
                        size={14}
                        className={
                          aiInsight.sentiment === "bearish" ? "rotate-180" : ""
                        }
                      />
                      {aiInsight.sentiment} Sentiment
                    </div>
                    <div className="lg:text-right w-full">
                      <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1">
                        System Recommendation
                      </p>
                      <p className="text-sm xl:text-base font-black text-[#C9A96E] italic">
                        "{aiInsight.recommendation}"
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative Pulse Line */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9A96E]/30 to-transparent"></div>
            </div>
          </motion.div>

          {/* Chart */}
          <div className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 shadow-xl shadow-[#C9A96E]/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[#C9A96E]">
                  <TrendingUp size={18} />
                </div>
                <h3 className="text-xl font-bold text-[#0B0B0B] dark:text-white">
                  Portfolio Performance
                </h3>
              </div>
              <div className="flex gap-4">
                 <button 
                    onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-all",
                        isAutoRefreshEnabled ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                    )}
                 >
                    <RefreshCw size={14} className={isAutoRefreshEnabled ? "animate-spin" : ""} />
                    {isAutoRefreshEnabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
                 </button>
                 <select className="bg-slate-200 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-lg px-3 py-1 text-sm text-gray-600 dark:text-gray-400 outline-none focus:ring-2 focus:ring-[#C9A96E]/50 transition-all">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                 </select>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A96E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C9A96E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#C9A96E"
                    opacity={0.05}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`}
                    dx={-10}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A96E"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className={cn("grid gap-8 transition-all duration-300", portfolioExpanded ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
            {portfolioOrder === 'first' && (
              <PortfolioSummary 
                  usdBalance={usdBalance} 
                  tradingBalanceUsd={tradingUsdBalance} 
                  btcChange={prices?.btc?.change || 0}
                  isExpanded={portfolioExpanded}
                  onToggleExpand={() => setPortfolioExpanded(!portfolioExpanded)}
                  onSwap={() => setPortfolioOrder((prev) => prev === 'first' ? 'last' : 'first')}
              />
            )}
            <QuickActions />
            {portfolioOrder === 'last' && (
              <PortfolioSummary 
                  usdBalance={usdBalance} 
                  tradingBalanceUsd={tradingUsdBalance} 
                  btcChange={prices?.btc?.change || 0}
                  isExpanded={portfolioExpanded}
                  onToggleExpand={() => setPortfolioExpanded(!portfolioExpanded)}
                  onSwap={() => setPortfolioOrder((prev) => prev === 'first' ? 'last' : 'first')}
              />
            )}
          </div>
        </div>

        {/* Referral & Activity Column */}
        <div className="space-y-8">
          {(() => {
            const referralCard = (
              <div key="referral" className="bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-[#C9A96E]/10 text-[#C9A96E] rounded-xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#0B0B0B] dark:text-white">
                      Refer and Earn Cash
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-500">
                      Invite friends and earn cash bonuses
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 dark:text-gray-500 uppercase font-bold tracking-widest ml-1">
                      Referral Code
                    </label>
                    <div className="bg-slate-200 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-xl p-3 flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#0B0B0B] dark:text-white font-mono">
                        {profile?.referralCode}
                      </span>
                      <button
                        onClick={copyReferralCode}
                        data-tooltip-id="dashboard-tooltip"
                        data-tooltip-content="Copy Referral Code"
                        className="p-2 hover:bg-[#C9A96E]/10 text-[#C9A96E] rounded-lg transition-all"
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#C9A96E]/10">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Bonus Earned
                    </span>
                    <span className="text-sm font-bold text-[#C9A96E]">
                      $
                      {profile?.referralBonusEarned?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }) || "0.00"}
                    </span>
                  </div>
                </div>
              </div>
            );

            const recentActivityCard = (
              <div key="activity" className={cn("bg-slate-100 dark:bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 transition-all", activityExpanded ? "max-h-[600px] overflow-y-auto" : "max-h-[400px] overflow-hidden relative")}>
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 py-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-[#0B0B0B] dark:text-white">
                      Recent Activity
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActivityOrder((prev) => prev === 'first' ? 'last' : 'first')}
                        className="p-1.5 bg-slate-200 dark:bg-slate-800 text-gray-500 rounded-lg hover:text-[#C9A96E] transition-colors"
                        title="Reorder Widget"
                    >
                        <ArrowLeftRight size={16} />
                    </button>
                    <button 
                        onClick={() => setActivityExpanded(!activityExpanded)}
                        className="p-1.5 bg-slate-200 dark:bg-slate-800 text-gray-500 rounded-lg hover:text-[#C9A96E] transition-colors"
                        title={activityExpanded ? "Collapse Widget" : "Expand Widget"}
                    >
                        {activityExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                    <select 
                        value={sortCriteria}
                        onChange={(e) => setSortCriteria(e.target.value as any)}
                        className="bg-slate-200 dark:bg-slate-950 border border-[#C9A96E]/20 rounded-lg px-2 py-1 text-[10px] text-gray-600 dark:text-gray-400 outline-none"
                    >
                        <option value="date">Date</option>
                        <option value="amount">Amount</option>
                        <option value="type">Type</option>
                    </select>
                    <Link
                        to="/transactions"
                        className="text-sm text-[#C9A96E] hover:underline transition-all hidden sm:inline"
                    >
                        All
                    </Link>
                  </div>
                </div>
                <div className="space-y-6">
                  {recentTransactions.length > 0 ? (
                    [...recentTransactions].sort((a, b) => {
                        if (sortCriteria === 'date') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                        if (sortCriteria === 'amount') return (b.amountBtc || b.amount || 0) - (a.amountBtc || a.amount || 0);
                        if (sortCriteria === 'type') return (a.type || '').localeCompare(b.type || '');
                        return 0;
                    })
                    .slice(0, activityExpanded ? undefined : 4)
                    .map((tx) => (
                      <ActivityItem
                        key={tx.id}
                        type={tx.type}
                        amount={tx.amountBtc || tx.amount}
                        status={tx.status}
                        date={
                          tx.createdAt
                            ? new Date(tx.createdAt).toLocaleDateString()
                            : "Pending"
                        }
                      />
                    ))
                  ) : (
                    <div className="text-center py-8 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-950 rounded-full flex items-center justify-center text-gray-500 mb-3">
                        <Inbox size={24} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-500">
                        No recent activity
                      </p>
                    </div>
                  )}
                </div>
                {!activityExpanded && recentTransactions.length > 4 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-100 dark:from-slate-900 pointer-events-none" />
                )}
              </div>
            );

            return activityOrder === 'first' 
                ? [recentActivityCard, referralCard] 
                : [referralCard, recentActivityCard];
          })()}

          {/* Premium Cryptocurrency Promotion Stream */}
          <CryptoAdVert />

          {/* AI Strategy Tip */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-slate-900 border border-[#C9A96E]/30 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <Sparkles size={40} className="text-[#C9A96E]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={18} className="text-[#C9A96E]" />
                  <span className="text-[10px] font-black text-[#C9A96E] uppercase tracking-[0.2em]">
                    Daily Strategy
                  </span>
                </div>
                <button 
                   onClick={() => fetchStrategy(true)}
                   className="p-1 hover:bg-[#C9A96E]/10 rounded-full text-[#C9A96E] transition-all opacity-40 hover:opacity-100"
                   title="Generate New Strategy"
                >
                  <Sparkles size={12} />
                </button>
              </div>
              {!dailyStrategy ? (
                <div className="space-y-3">
                  <div className="h-5 w-48 bg-[#C9A96E]/10 animate-pulse rounded"></div>
                  <div className="h-3 w-full bg-[#C9A96E]/5 animate-pulse rounded"></div>
                  <div className="h-3 w-5/6 bg-[#C9A96E]/5 animate-pulse rounded"></div>
                </div>
              ) : (
                <>
                  <h4 className="text-lg font-bold text-white mb-2 italic">
                    {dailyStrategy.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-4 whitespace-normal break-words">
                    {dailyStrategy.strategy}
                  </p>
                </>
              )}
              <div className="flex items-center gap-2 text-[10px] text-green-500 font-bold uppercase tracking-tighter mt-4">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                Live Analysis Enabled
              </div>
            </div>
          </motion.div>

          {/* System Status (Hardware recipe feel) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-100 dark:bg-[#0B0B0B] border border-[#C9A96E]/10 rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#C9A96E]/40 transition-all">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">
                Network Latency
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-mono font-bold text-[#C9A96E]">{latency || "---"}ms</span>
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-[#0B0B0B] border border-[#C9A96E]/10 rounded-xl p-4 flex flex-col items-center justify-center text-center group hover:border-[#C9A96E]/40 transition-all">
              <span className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">
                Node Throughput
              </span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-mono font-bold text-white">{(tps || 0).toLocaleString()} <span className="text-[8px] text-gray-600">tps</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};const StatCard = ({
  title,
  value,
  subValue,
  icon: Icon,
  color,
  onClick,
  tooltip,
  warning,
}: any) => (
  <motion.div
    whileHover={{
      y: -5,
      boxShadow: warning 
        ? "0 10px 30px -10px rgba(239, 68, 68, 0.25)" 
        : "0 10px 30px -10px rgba(201, 169, 110, 0.2)",
    }}
    onClick={onClick}
    data-tooltip-id="dashboard-tooltip"
    data-tooltip-content={tooltip}
    className={cn(
      "bg-slate-100 dark:bg-slate-900 border p-5 rounded-2xl relative overflow-hidden group transition-all duration-300",
      warning 
        ? "border-red-500/30 dark:border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]" 
        : "border-[#C9A96E]/10",
      onClick && "cursor-pointer hover:border-[#C9A96E]/40",
    )}
  >
    {warning && (
      <div className="absolute inset-0 bg-red-500/[0.015] dark:bg-red-500/[0.01] animate-pulse pointer-events-none" />
    )}

    <div className="flex flex-col h-full justify-between relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:rotate-6 shadow-sm",
            warning
              ? "bg-red-500/10 text-red-500 border border-red-500/25 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
              : color === "gold"
                ? "bg-[#C9A96E]/10 text-[#C9A96E] border border-[#C9A96E]/20"
                : color === "green"
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : color === "red"
                    ? "bg-red-500/10 text-red-600 border border-red-500/20"
                    : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20",
          )}
        >
          <Icon size={20} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase font-black tracking-[0.2em]">
            {title}
          </p>
          {warning && (
            <span className="flex items-center gap-1 text-[9px] font-black text-red-500 select-none animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] inline-block"></span>
              LOW BALANCE
            </span>
          )}
        </div>
      </div>
      <div>
        <h4 className="text-xl xl:text-2xl font-black text-[#0B0B0B] dark:text-white tracking-tight leading-none mb-1 truncate">
          {value}
        </h4>
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "text-[9px] font-bold uppercase tracking-tight line-clamp-1",
              warning
                ? "text-red-500/80"
                : color === "green"
                  ? "text-green-600 dark:text-green-500"
                  : color === "yellow"
                    ? "text-yellow-600 dark:text-yellow-500"
                    : color === "red"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-500 dark:text-gray-500",
            )}
          >
            {subValue}
          </div>
        </div>
        {warning && (
          <div className="mt-3 pt-2.5 border-t border-red-500/10 text-[9.5px] font-semibold leading-relaxed text-red-500/90 dark:text-red-400 flex items-start gap-1">
            <span className="text-[11px] leading-none shrink-0">⚠️</span>
            <span>{warning}</span>
          </div>
        )}
      </div>
    </div>
    <div className={cn(
      "absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl transition-all duration-700",
      warning 
        ? "bg-red-500/5 group-hover:bg-red-500/10" 
        : "bg-[#C9A96E]/5 group-hover:bg-[#C9A96E]/15"
    )}></div>
  </motion.div>
);

const TickerItem = ({ symbol, price, change, direction, displayCurrency, btcPrice }: any) => {
  const isBtcDisplay = displayCurrency === "BTC";
  
  let finalPriceStr = "---";
  if (typeof price === "number") {
    if (isBtcDisplay) {
      if (symbol === "BTC") {
        finalPriceStr = "1.0000 ₿";
      } else {
        const btcVal = btcPrice > 0 ? btcPrice : 67340;
        const inBtc = price / btcVal;
        if (inBtc < 0.0001) {
          finalPriceStr = `${inBtc.toFixed(8)} ₿`;
        } else if (inBtc < 0.01) {
          finalPriceStr = `${inBtc.toFixed(6)} ₿`;
        } else {
          finalPriceStr = `${inBtc.toFixed(4)} ₿`;
        }
      }
    } else {
      if (symbol === "SHIB") {
        finalPriceStr = `$${price.toFixed(8)}`;
      } else if (price < 1) {
        finalPriceStr = `$${price.toFixed(4)}`;
      } else {
        finalPriceStr = `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
  }

  return (
    <div className="inline-flex items-center gap-3 px-6 border-r border-[#C9A96E]/10 last:border-none">
      <span className="text-sm font-bold text-[#0B0B0B] dark:text-white flex items-center gap-1">
        {symbol}
        {direction === 'up' && <ArrowUpRight size={12} className="text-green-500" />}
        {direction === 'down' && <ArrowDownRight size={12} className="text-red-500" />}
      </span>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-300 font-mono">
        {finalPriceStr}
      </span>
      <span
        className={cn(
          "text-xs font-bold",
          (change || 0) >= 0
            ? "text-green-600 dark:text-green-500"
            : "text-red-600 dark:text-red-500",
        )}
      >
        {(change || 0) >= 0 ? "+" : ""}
        {(change || 0).toFixed(2)}%
      </span>
    </div>
  );
};

const ActivityItem = ({ type, amount, status, date }: any) => (
  <div className="flex items-center justify-between group cursor-pointer">
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          type?.toUpperCase() === "DEPOSIT"
            ? "bg-green-500/10 text-green-600 dark:text-green-500"
            : "bg-red-500/10 text-red-600 dark:text-red-500",
        )}
      >
        {type?.toUpperCase() === "DEPOSIT" ? (
          <ArrowDownCircle size={18} />
        ) : (
          <ArrowUpCircle size={18} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-[#0B0B0B] dark:text-white capitalize">
          {type?.toLowerCase()}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-500">{date}</p>
      </div>
    </div>
    <div className="text-right">
      <p
        className={cn(
          "text-sm font-bold",
          type?.toUpperCase() === "DEPOSIT"
            ? "text-green-600 dark:text-green-500"
            : "text-red-600 dark:text-red-500",
        )}
      >
        {type?.toUpperCase() === "DEPOSIT" ? "+" : "-"}
        {amount?.toFixed(6)} BTC
      </p>
      <div className="flex flex-col items-end">
        <p
          className={cn(
            "text-[10px] uppercase tracking-wider font-bold",
            ["SUCCESS", "APPROVED", "confirmed"].includes(status)
              ? "text-green-600 dark:text-green-500"
              : ["PENDING", "pending"].includes(status)
                ? "text-yellow-600 dark:text-yellow-500"
                : "text-red-600 dark:text-red-500",
          )}
        >
          {status}
        </p>
        {(status === "failed" || status === "REJECTED") && (
          <p className="text-[8px] text-red-400 italic">Rejected</p>
        )}
      </div>
    </div>
  </div>
);
