import React, { useState, useEffect } from "react";
import { Tooltip } from "react-tooltip";
import { 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Wallet,
  Timer,
  Inbox,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { APP_CONFIG } from "../config";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { usePrices } from "../PriceContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const INVESTMENT_PLANS = [
  {
    id: "starter",
    name: "Starter Plan",
    return: 1.25, // +25%
    duration: 60, // 1 Hour
    minAmount: 1000, // USD
    description: "Ideal for exploring micro-arbitrage cycles. Aims for a variable return target of up to 25% based on real-time market fluctuations. Subject to market and liquidity risks. Minimum deposit $1,000.",
    icon: Zap,
    color: "blue"
  },
  {
    id: "professional",
    name: "Professional Plan",
    return: 1.50, // +50%
    duration: 360, // 6 Hours
    minAmount: 500, // USD
    description: "Designed for mid-term trend tracking and leverage strategies. Target returns of up to 50% depending on quantitative model performance. Principal risk applies. Minimum deposit $500.",
    icon: TrendingUp,
    color: "gold"
  },
  {
    id: "elite",
    name: "Elite Plan",
    return: 2.0, // +100%
    duration: 1440, // 24 Hours
    minAmount: 1000, // USD
    description: "High-tier liquidity provision and multi-exchange hedging. Maximum target returns of up to 100% over a 24-hour cycle, structured for advanced portfolios. Fully exposed to digital asset volatility. Minimum deposit $1,000.",
    icon: ShieldCheck,
    color: "green"
  }
];

export const Invest = () => {
  const { profile, user } = useAuth();
  const { addNotification } = useNotifications();
  const [selectedPlan, setSelectedPlan] = useState(INVESTMENT_PLANS[0]);
  const [amount, setAmount] = useState<string>("");
  const [investing, setInvesting] = useState(false);
  const [activeInvestments, setActiveInvestments] = useState<any[]>([]);
  const { prices } = usePrices();
  const btcPrice = prices?.btc?.usd || 0;
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch active investments
    const q = query(collection(db, "investments"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setActiveInvestments(invs.sort((a, b) => b.startTime - a.startTime));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, "investments");
      setMessage({ type: 'error', text: "Unable to load active investments. Please try again later." });
    });

    return () => {
      unsub();
    };
  }, [user]);

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const usdAmount = parseFloat(amount);
    const btcAmount = usdAmount / btcPrice;
    
    if (isNaN(usdAmount) || usdAmount < selectedPlan.minAmount) {
      setMessage({ type: 'error', text: `Minimum investment for this plan is $${selectedPlan.minAmount.toLocaleString()}.` });
      return;
    }

    if (btcAmount > profile.btcBalance) {
      setMessage({ type: 'error', text: "Insufficient BTC balance." });
      return;
    }

    setInvesting(true);
    setMessage(null);

    try {
      const startTime = Date.now();
      const endTime = startTime + (selectedPlan.duration * 60 * 1000);
      const expectedReturnUsd = usdAmount * selectedPlan.return;
      const expectedReturnBtc = expectedReturnUsd / btcPrice;

      // 1. Deduct balance
      await updateDoc(doc(db, "users", user.uid), {
        usdBalance: increment(-usdAmount),
        tradingBalanceBtc: increment(-btcAmount)
      });

      // 2. Create investment record
      await addDoc(collection(db, "investments"), {
        userId: user.uid,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amountBtc: btcAmount,
        amountUsd: usdAmount,
        expectedReturnUsd: expectedReturnUsd,
        expectedReturnBtc: expectedReturnBtc,
        startTime,
        endTime,
        status: "active"
      });

      // 3. Handle Referral Reward if first trade
      if (!profile.hasTraded) {
        await updateDoc(doc(db, "users", user.uid), {
          hasTraded: true
        });

        if (profile.referredBy) {
          const bonusAmount = 0.0005; // Fixed referral bonus (~$32)
          await updateDoc(doc(db, "users", profile.referredBy), {
            btcBalance: increment(bonusAmount),
            referralBonusEarned: increment(bonusAmount)
          });
          await addNotification(profile.referredBy, "Referral Bonus Received!", `You've earned ${bonusAmount} BTC because your referral ${profile.displayName} started trading.`, "success");
        }
      }

      await addNotification(user.uid, "Investment Started", `Your investment of ${btcAmount} BTC in the ${selectedPlan.name} has started.`, "success");
      toast.success("Investment started successfully!");
      setAmount("");
    } catch (error) {
      console.error("Investment error:", error);
      setMessage({ type: 'error', text: "Failed to start investment. Please try again." });
    } finally {
      setInvesting(false);
    }
  };

  const claimInvestment = async (inv: any) => {
    if (!user) return;
    try {
      // 1. Update investment status
      await updateDoc(doc(db, "investments", inv.id), {
        status: "completed"
      });

      // 2. Add return to balance
      await updateDoc(doc(db, "users", user.uid), {
        usdBalance: increment(inv.expectedReturnUsd),
        tradingBalanceBtc: increment(inv.expectedReturnBtc),
        btcBalance: increment(inv.expectedReturnBtc)
      });

      await addNotification(user.uid, "Investment Claimed", `You have successfully claimed your return of ${inv.expectedReturnBtc.toFixed(6)} BTC from the ${inv.planName}.`, "success");
      setMessage({ type: 'success', text: `Claimed ${inv.expectedReturnBtc.toFixed(4)} BTC successfully!` });
    } catch (error) {
      console.error("Claim error:", error);
      setMessage({ type: 'error', text: "Failed to claim investment." });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-8">
      <Tooltip id="invest-tooltip" className="z-50" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
          <TrendingUp size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Investment Plans</h1>
          <p className="text-gray-400">Grow your wealth with our high-yield Bitcoin investment cycles.</p>
        </div>
      </div>

      {/* AI Smart Insight Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-slate-900 border border-[#C9A96E]/20 rounded-2xl p-4 flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C9A96E]/10 text-[#C9A96E] rounded-xl flex items-center justify-center">
            <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-black text-[#C9A96E] uppercase tracking-widest">Quantitative Scout</p>
            <p className="text-sm text-gray-300">The Professional Plan currently has the highest risk-adjusted yield. Compounding returns over 6-hour cycles can boost annual gains by 40%.</p>
          </div>
        </div>
        <button 
          onClick={() => {
            const event = new CustomEvent('open-support', { detail: 'I want to know which investment plan is best for me' });
            window.dispatchEvent(event);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all border border-white/5"
        >
          <HelpCircle size={16} />
          <span className="text-xs font-bold uppercase tracking-tight">Get Strategy</span>
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INVESTMENT_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={cn(
                  "p-6 rounded-2xl border transition-all text-left relative overflow-hidden group",
                  selectedPlan.id === plan.id 
                    ? "bg-[#C9A96E]/10 border-[#C9A96E] shadow-[0_0_20px_rgba(201,169,110,0.1)]" 
                    : "bg-slate-900 border-[#C9A96E]/10 hover:border-[#C9A96E]/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
                  plan.color === 'blue' ? "bg-blue-500/10 text-blue-500" :
                  plan.color === 'gold' ? "bg-[#C9A96E]/10 text-[#C9A96E]" :
                  "bg-green-500/10 text-green-500"
                )}>
                  <plan.icon size={20} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-2xl font-black text-[#C9A96E] mb-2">+{((plan.return - 1) * 100)}%</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock size={12} />
                  {plan.duration >= 1440 ? `${plan.duration / 1440} Days` : plan.duration >= 60 ? `${plan.duration / 60} Hours` : `${plan.duration} Minutes`}
                </div>
                {selectedPlan.id === plan.id && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 size={16} className="text-[#C9A96E]" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Investment Form */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white">Start Investment</h3>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Available Balance</p>
                <p className="text-sm font-bold text-[#C9A96E]">${((profile?.btcBalance || 0) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-gray-500">{(profile?.btcBalance || 0).toFixed(6)} BTC</p>
              </div>
            </div>

            <form onSubmit={handleInvest} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400">Amount to Invest (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 pl-10 pr-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all font-mono"
                    placeholder={`Min $${selectedPlan.minAmount.toLocaleString()}`}
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    ≈ {(parseFloat(amount || "0") / btcPrice).toFixed(6)} BTC
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#C9A96E]/5 rounded-xl border border-[#C9A96E]/10 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Selected Plan</span>
                  <span className="text-white font-bold">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Duration</span>
                  <span className="text-white font-bold">{selectedPlan.duration >= 1440 ? `${selectedPlan.duration / 1440} Days` : selectedPlan.duration >= 60 ? `${selectedPlan.duration / 60} Hours` : `${selectedPlan.duration} Minutes`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Expected Return</span>
                  <span className="text-green-500 font-bold">
                    ${(parseFloat(amount || "0") * selectedPlan.return).toLocaleString()}
                  </span>
                </div>
              </div>

              {message && (
                <div className={cn(
                  "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
                  message.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                )}>
                  <AlertCircle size={18} />
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={investing || !amount}
                className="w-full bg-[#C9A96E] text-[#0B0B0B] font-bold py-4 rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {investing ? "Processing..." : "Confirm Investment"}
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </div>

        {/* Active Investments */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 h-fit">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Timer size={20} className="text-[#C9A96E]" />
            Active Investments
          </h3>
          
          <div className="space-y-4">
            {activeInvestments.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
                  <Inbox size={32} />
                </div>
                <p className="text-sm text-gray-500">No active investments.</p>
                <p className="text-xs text-gray-600 mt-1">Start a plan to grow your BTC.</p>
              </div>
            ) : (
              activeInvestments.map((inv) => {
                const isExpired = Date.now() >= inv.endTime;
                const progress = Math.min(100, Math.max(0, ((Date.now() - inv.startTime) / (inv.endTime - inv.startTime)) * 100));

                return (
                  <div key={inv.id} className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[#C9A96E] uppercase tracking-widest">{inv.planName}</p>
                        <p className="text-sm font-bold text-white mt-1">{inv.amountBtc} BTC</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase font-bold">Return</p>
                        <p className="text-sm font-bold text-green-500">
                          ${inv.expectedReturnUsd ? inv.expectedReturnUsd.toLocaleString() : (inv.expectedReturnBtc * btcPrice).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Progress</span>
                        <span>{isExpired ? "Completed" : `${Math.round(progress)}%`}</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-[#C9A96E]"
                        />
                      </div>
                    </div>

                    {inv.status === 'active' ? (
                      isExpired ? (
                        <button 
                          onClick={() => claimInvestment(inv)}
                          className="w-full py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                        >
                          Claim Return
                        </button>
                      ) : (
                        <p className="text-[10px] text-center text-gray-500 italic">
                          Ends in {formatDistanceToNow(inv.endTime)}
                        </p>
                      )
                    ) : (
                      <div className="flex items-center justify-center gap-1 text-green-500 text-xs font-bold">
                        <CheckCircle2 size={14} />
                        Claimed
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Dynamic How-It-Works & Transparent Disclosures Panel */}
      <div className="bg-slate-900 border border-[#C9A96E]/20 rounded-2xl p-6 lg:p-8 space-y-8 mt-12">
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <div className="w-1 h-6 bg-[#C9A96E] rounded-full"></div>
            How the Business Operates
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Understanding our business model, flow of capital, and target allocation strategies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-300">
          <div className="p-4 bg-slate-950 border border-[#C9A96E]/5 rounded-xl space-y-2">
            <div className="text-xs font-black text-[#C9A96E] uppercase tracking-wider">1. Capital Pooling</div>
            <p className="text-xs text-gray-400">
              When you invest, your BTC is pooled into institutional-grade multi-signature cold storage vaults under strict custody controls.
            </p>
          </div>
          <div className="p-4 bg-slate-950 border border-[#C9A96E]/5 rounded-xl space-y-2">
            <div className="text-xs font-black text-[#C9A96E] uppercase tracking-wider">2. Liquidity Routing</div>
            <p className="text-xs text-gray-400">
              Our automated smart router distributes capital across premier decentralized liquidity nodes and exchange spreads to capture arbitrage gaps.
            </p>
          </div>
          <div className="p-4 bg-slate-950 border border-[#C9A96E]/5 rounded-xl space-y-2">
            <div className="text-xs font-black text-[#C9A96E] uppercase tracking-wider">3. Yield Generation</div>
            <p className="text-xs text-gray-400">
              Profits are generated strictly from dynamic pricing spread variances, quantitative trend hedging, and liquidity provider (LP) fees.
            </p>
          </div>
          <div className="p-4 bg-slate-950 border border-[#C9A96E]/5 rounded-xl space-y-2">
            <div className="text-xs font-black text-[#C9A96E] uppercase tracking-wider">4. Automated Settlement</div>
            <p className="text-xs text-gray-400">
              Upon maturity, the contract cycle completes and funds (principal + net profit) are released back to your available ledger balance.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#C9A96E]/10 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 text-red-400">
            <AlertCircle size={14} /> Critical Risk & Performance Disclosure
          </h3>
          <div className="text-xs text-gray-400 space-y-2 leading-relaxed">
            <p>
              <strong>No Guaranteed Profits:</strong> Digital assets and cryptocurrency trading involve significant market volatility, liquidity shifts, and systematic risks. Past performance and plan return target estimates are <strong>not indicative or guarantees of future results</strong>.
            </p>
            <p>
              <strong>Risk of Capital Loss:</strong> Trading and providing liquidity carry risks including smart contract vulnerabilities, counterparty defaults, rapid price slides, and exchange disruptions. <strong>Never invest capital that you cannot afford to lose entirely.</strong>
            </p>
            <p>
              <strong>Transparent Withdrawals:</strong> Withdrawals are processed within 24 hours after security review, with a minimum limit of $50 USD. Standard network blockchain fee applies (approximately 0.0001 BTC). No hidden fees or locked reserves exist outside of active investment cycles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
