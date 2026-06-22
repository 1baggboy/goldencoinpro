import React, { useState, useEffect } from "react";
import { 
  Copy, 
  Check, 
  Info, 
  ArrowDownCircle, 
  Upload,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  Download,
  RefreshCw
} from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, increment, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "motion/react";
import { usePrices } from "../PriceContext";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { sendAdminEmailNotification } from "../lib/emailService";

export const Deposit = () => {
  const { user, profile } = useAuth();
  const { addNotification } = useNotifications();
  const [copied, setCopied] = useState(false);
  const [amountUsd, setAmountUsd] = useState("");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { prices } = usePrices();
  const btcPrice = prices?.btc?.usd || 0;
  const [dailyDeposited, setDailyDeposited] = useState(0);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  // Load from profile state or fall back to local storage cache for instant, zero-flicker availability
  const getCachedAddress = () => {
    if (profile?.btcAddress) return profile.btcAddress;
    if (user) {
      const cached = localStorage.getItem('cached_profile_' + user.uid);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.btcAddress) return parsed.btcAddress;
        } catch (e) {}
      }
    }
    return "Loading Assigned Address...";
  };

  const walletAddress = getCachedAddress();

  useEffect(() => {
    if (walletAddress && walletAddress !== "Loading Assigned Address..." && walletAddress !== "Loading...") {
      QRCode.toDataURL(walletAddress, { width: 300, margin: 1 }).then(setQrCodeDataUrl);
    }
  }, [walletAddress]);

  useEffect(() => {
    // Fetch today's deposits to calculate daily limit
    if (user) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, "transactions"), 
        where("userId", "==", user.uid), 
        where("type", "==", "DEPOSIT"),
        where("status", "in", ["PENDING", "COMPLETED", "SUCCESS"])
      );

      const unsub = onSnapshot(q, (snap) => {
        let total = 0;
        snap.docs.forEach(doc => {
          const data = doc.data();
          const txDate = new Date(data.timestamp?.toDate ? data.timestamp.toDate() : data.timestamp);
          if (txDate >= today) {
            total += data.amountBtc || (data.amount / btcPrice) || 0;
          }
        });
        setDailyDeposited(total);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, "transactions");
        setError("Unable to calculate daily limits. Please refresh the page.");
      });

      return () => unsub();
    }
  }, [user, btcPrice]);

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncBitcoin = async () => {
     if (!walletAddress || walletAddress === "Loading...") return;
     setSyncing(true);
     setError(null);
     try {
        const response = await fetch('/api/transactions/sync-bitcoin', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${localStorage.getItem('token')}`
           },
           body: JSON.stringify({ btcAddress: walletAddress })
        });
        if (response.ok) {
           addNotification(user!.uid, "Sync Completed", "Your bitcoin deposits have been synced from the global ledger.", "success");
        } else {
           setError("Failed to sync automatically. Please submit proof manually.");
        }
     } catch(e) {
        setError("Network error connecting to ledger sync.");
     } finally {
        setSyncing(false);
     }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const valUsd = parseFloat(amountUsd);
    const amountBtc = valUsd / btcPrice;
    const dailyDepositedUsd = dailyDeposited * btcPrice;

    // 0. Check KYC - Ensure profile exists before checking
    if (!profile) {
      setError("Loading your profile... Please try again in a moment.");
      return;
    }

    const kycStatus = profile?.kycStatus?.toLowerCase() || '';
    if (kycStatus !== 'verified' && kycStatus !== 'approved') {
      setError("Your account must be KYC verified (Currently: " + (profile?.kycStatus || 'Not Submitted') + ") to deposit funds.");
      return;
    }

    if (profile?.status === 'restricted' || profile?.status === 'suspended' || profile?.isSuspended) {
      setError(`Your account is currently ${profile.isSuspended ? 'suspended' : profile.status}. Please contact support.`);
      return;
    }

    // 1. Check Minimum ($50)
    if (valUsd < 50) {
      setError("Minimum deposit amount is $50.");
      return;
    }

    // 2. Check Daily Maximum ($50,000)
    if (dailyDepositedUsd + valUsd > 50000) {
      setError(`Daily deposit limit exceeded. You have already deposited $${dailyDepositedUsd.toLocaleString()} today. Remaining limit: $${(50000 - dailyDepositedUsd).toLocaleString()}`);
      return;
    }

    if (btcPrice <= 0 || isNaN(btcPrice)) {
      setError("Unable to get current Bitcoin price. Please try again in a few moments.");
      return;
    }

    if (isNaN(valUsd) || isNaN(amountBtc)) {
      setError("The calculated deposit amount is invalid. Please check your input.");
      return;
    }

    setLoading(true);
    try {
      console.log("Submitting deposit to transactions collection...");
      const txData = {
        userId: user.uid,
        type: "DEPOSIT",
        amount: valUsd,
        amountBtc: amountBtc,
        status: "PENDING",
        txHash: txHash || "N/A",
        method: "BITCOIN_NETWORK",
        timestamp: new Date().toISOString(),
      };
      
      await addDoc(collection(db, "transactions"), txData);
      
      await addNotification(user.uid, "Deposit Submitted", `Your deposit of $${valUsd.toLocaleString()} (~${amountBtc.toFixed(8)} BTC) has been submitted for verification. It will be credited once confirmed by an admin.`, "info");
      
      // Notify admins via email (Extension will pick this up)
      try {
        const eventTitle = valUsd >= 1000 ? "Critical Event: Large Deposit" : "New Deposit Received";
        await sendAdminEmailNotification(
          eventTitle,
          `User ${profile?.displayName || user.email} has deposited $${valUsd.toLocaleString()} (~${amountBtc.toFixed(8)} BTC). TX Hash: ${txHash}`
        );
      } catch (adminErr) {
        console.error("Failed to send admin email notification:", adminErr);
      }

      setSuccess(true);
      setAmountUsd("");
      setTxHash("");

    } catch (err: any) {
      console.error("Deposit execution error:", err);
      // provide more details if possible
      if (err.code === "permission-denied" || (err.message && err.message.toLowerCase().includes("permission"))) {
        setError(`Permission denied (Code: ${err.code || 'unknown'}). Please ensure your account status is 'Verified' and not 'Restricted'. If the issue persists, contact support.`);
      } else {
        setError("An error occurred during submission: " + (err.message || "Unknown error") + ". Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto space-y-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
          <ArrowDownCircle size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Deposit Funds</h1>
          <p className="text-gray-400">Manage your deposits globally with real-time Bitcoin networking.</p>
        </div>
      </div>

      {/* AI Smart Insight Panel */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-slate-900 border border-blue-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between group gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
          </div>
          <div>
            <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Global Asset Processing</p>
            <p className="text-sm text-gray-300">Your unique Bitcoin address connects directly to the blockchain. Send funds and click "Sync Ledger" to automatically detect deposits.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleSyncBitcoin}
            disabled={syncing}
            className="flex-1 md:flex-none items-center justify-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all border border-blue-500/20 flex disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
            <span className="text-xs font-bold uppercase tracking-tight">Sync Ledger</span>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Wallet Address Section */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8 space-y-6 lg:space-y-8 relative overflow-hidden">
          {/* Active Assigned Badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">Permanently Assigned</span>
          </div>

          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-800">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="size-[160px] lg:size-[180px]" />
              ) : (
                <div className="size-[160px] lg:size-[180px] flex items-center justify-center text-gray-400 font-medium">Loading QR...</div>
              )}
            </div>
            <p className="text-xs text-[#C9A96E] font-medium tracking-wide bg-[#C9A96E]/5 px-3 py-1 rounded-md">Deposit QR Code</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Your Assigned BTC Deposit Address</label>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md font-semibold">Active & Instant</span>
            </div>
            <div className="flex items-center gap-2 p-3 lg:p-4 bg-slate-950 border border-[#C9A96E]/20 rounded-xl relative group hover:border-[#C9A96E]/40 transition-all">
              <span className="text-xs lg:text-sm font-mono text-gray-300 break-all flex-1 selection:bg-[#C9A96E]/20">{walletAddress}</span>
              <button 
                onClick={handleCopy}
                disabled={walletAddress === "Loading Assigned Address..." || walletAddress === "Loading..."}
                className="p-2.5 text-[#C9A96E] bg-slate-900 border border-[#C9A96E]/10 hover:bg-[#C9A96E]/25 rounded-md transition-all shrink-0 disabled:opacity-50 hover:scale-105 active:scale-95"
                title="Copy Bitcoin Address"
              >
                {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex gap-4">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-indigo-200 leading-relaxed space-y-1">
              <p className="font-bold text-white">Guaranteed Transfer Safety</p>
              <p>
                Send only Bitcoin (BTC) to this address. This secure address is reserved permanently for your account. You can send funds immediately from any exchange or wallet.
              </p>
            </div>
          </div>
        </div>

        {/* Proof of Payment Section */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Manual Proof Submission</h3>
          <p className="text-sm text-gray-400 mb-6 border-b border-gray-800 pb-4">If the automatic sync does not capture your transaction, submit the hash manually.</p>
          
          {success ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 p-8 rounded-2xl text-center space-y-4"
            >
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                <Check size={32} />
              </div>
              <h4 className="text-xl font-bold text-white">Submission Received</h4>
              <p className="text-sm text-gray-400">Our team will verify your transaction shortly. You'll be notified once it's confirmed.</p>
              <button 
                onClick={() => setSuccess(false)}
                className="text-[#C9A96E] font-bold text-sm hover:underline"
              >
                Submit another deposit
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmitProof} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertTriangle size={18} />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Amount (USD)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 pl-8 pr-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all font-mono"
                    placeholder="0.00"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    ≈ { (parseFloat(amountUsd || "0") / btcPrice).toFixed(8) } BTC
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 px-1 mb-2">
                  Daily used: ${(dailyDeposited).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / $50,000
                </p>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2 mt-1">
                  <div 
                    className="bg-blue-500 h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(((dailyDeposited) / 50000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Transaction Hash (TXID)</label>
                <input
                  type="text"
                  required
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-4 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all"
                  placeholder="Enter transaction hash"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#C9A96E] text-[#0B0B0B] font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50"
              >
                <Upload size={20} />
                {loading ? "Submitting..." : "Submit Proof"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
