import React, { useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { 
  History, 
  Search, 
  Filter, 
  ArrowDownCircle, 
  ArrowUpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  Inbox,
  TrendingUp,
  ShieldCheck,
  Users,
  ArrowUpDown
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  limit, 
  startAfter, 
  endBefore, 
  limitToLast,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

const ITEMS_PER_PAGE = 8;

export const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [firstVisible, setFirstVisible] = useState<any>(null);

  const fetchTransactions = async (direction: 'next' | 'prev' | 'init' = 'init') => {
    if (!user) return;
    setLoading(true);
    try {
      let q;
      if (direction === 'init') {
        q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(ITEMS_PER_PAGE)
        );
        setPage(1);
      } else if (direction === 'next' && lastVisible) {
        q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          startAfter(lastVisible),
          limit(ITEMS_PER_PAGE)
        );
      } else if (direction === 'prev' && firstVisible) {
        q = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          endBefore(firstVisible),
          limitToLast(ITEMS_PER_PAGE)
        );
      } else {
        setLoading(false);
        return;
      }

      const snapshot = await getDocs(q);
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      
      if (txs.length > 0) {
        setFirstVisible(snapshot.docs[0]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        setTransactions(txs);
        
        if (direction === 'next') setPage(prev => prev + 1);
        if (direction === 'prev') setPage(prev => Math.max(1, prev - 1));

        // Check if there's more for next
        if (direction !== 'prev') {
          const nextQ = query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            startAfter(snapshot.docs[snapshot.docs.length - 1]),
            limit(1)
          );
          const nextSnapshot = await getDocs(nextQ);
          setHasMore(!nextSnapshot.empty);
        } else {
          setHasMore(true);
        }
      } else if (direction === 'init') {
        setTransactions([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      console.error("Transactions fetch error:", err);
      setError("Unable to load transaction history. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getTxIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit': return <ArrowDownCircle size={24} />;
      case 'withdrawal':
      case 'withdraw': return <ArrowUpCircle size={24} />;
      case 'investment': return <TrendingUp size={24} />;
      case 'profit': return <ShieldCheck size={24} />;
      case 'referral': return <Users size={24} />;
      default: return <ArrowUpDown size={24} />;
    }
  };

  const getTxColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit': 
      case 'profit':
      case 'referral': return "text-green-500 bg-green-500/10 border-green-500/20";
      case 'withdrawal':
      case 'withdraw':
      case 'investment': return "text-red-500 bg-red-500/10 border-red-500/20";
      default: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    }
  };

  useEffect(() => {
    fetchTransactions('init');
  }, [user]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-8">
      <Tooltip id="tx-tooltip" className="z-50" />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
            <History size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Transaction History</h1>
            <p className="text-gray-400">View and track all your account activities.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={async () => {
              const response = await fetch('/api/transactions/export', { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transactions.csv';
                a.click();
              }
            }}
            className="px-4 py-2 bg-[#C9A96E] text-slate-950 font-bold rounded-xl hover:bg-[#C9A96E]/90 transition-all text-sm flex items-center gap-2"
          >
            Export CSV
          </button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#C9A96E] transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search TXID..."
              className="bg-slate-900 border border-[#C9A96E]/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#C9A96E]/40 transition-all w-64"
            />
          </div>
          <button className="p-2.5 bg-slate-900 border border-[#C9A96E]/10 rounded-xl text-gray-400 hover:text-[#C9A96E] transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 h-48 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-20 flex flex-col items-center justify-center text-center shadow-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-4">
              <AlertCircle size={32} />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">Execution Failed</h4>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">{error}</p>
            <button 
              onClick={() => fetchTransactions('init')}
              className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-all text-sm font-semibold border border-[#C9A96E]/10"
            >
              Retry Connection
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-20 flex flex-col items-center justify-center text-center shadow-xl">
            <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
              <Inbox size={32} />
            </div>
            <h4 className="text-lg font-bold text-white mb-1">No Transactions Found</h4>
            <p className="text-sm text-gray-500">Your transaction history will appear here once you start activity.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {transactions.map((tx) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedTx(tx)}
                className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 shadow-lg hover:border-[#C9A96E]/30 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#C9A96E]/5 rounded-bl-full -mr-12 -mt-12 transition-all group-hover:bg-[#C9A96E]/10" />
                
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110 duration-300",
                    getTxColor(tx.type)
                  )}>
                    {getTxIcon(tx.type)}
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border shadow-sm",
                    ["SUCCESS", "confirmed", "APPROVED"].includes(tx.status) ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                    ["PENDING", "pending"].includes(tx.status) ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : 
                    "bg-red-500/10 text-red-500 border-red-500/20"
                  )}>
                    {tx.status}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Amount</p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-2xl font-bold", tx.type?.toLowerCase() === 'deposit' ? "text-green-500" : "text-red-500")}>
                        {tx.type?.toLowerCase() === 'deposit' ? '+' : '-'}{(tx.amountBtc || tx.amount || 0).toFixed(4)}
                      </span>
                      <span className="text-sm font-bold text-gray-500">BTC</span>
                    </div>
                    {tx.amountUsd && (
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        ≈ ${(tx.amountUsd || 0).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#C9A96E]/5">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock size={14} />
                      <span className="text-[11px] font-medium">{format(new Date(tx.timestamp), "MMM dd, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#C9A96E] group-hover:translate-x-1 transition-transform">
                      <span className="text-[11px] font-bold uppercase tracking-widest">Details</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Pagination Footer */}
      {!loading && transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-slate-900 border border-[#C9A96E]/10 p-4 rounded-2xl shadow-xl">
          <p className="text-sm text-gray-500 font-medium">
            Page <span className="text-white font-bold">{page}</span>
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => fetchTransactions('prev')}
              disabled={page === 1}
              className="px-6 py-2.5 bg-slate-950 border border-[#C9A96E]/10 rounded-xl text-gray-400 hover:text-[#C9A96E] hover:border-[#C9A96E]/30 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-[#C9A96E]/10 transition-all flex items-center gap-2 text-sm font-bold active:scale-95"
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            <button 
              onClick={() => fetchTransactions('next')}
              disabled={!hasMore}
              className="px-6 py-2.5 bg-slate-950 border border-[#C9A96E]/10 rounded-xl text-gray-400 hover:text-[#C9A96E] hover:border-[#C9A96E]/30 disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:border-[#C9A96E]/10 transition-all flex items-center gap-2 text-sm font-bold active:scale-95"
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedTx(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-[#C9A96E]/20 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#C9A96E]/10 flex items-center justify-between bg-slate-950/50">
                <h3 className="text-xl font-bold text-white">Transaction Receipt</h3>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Status Icon & Amount */}
              <div className="p-8 text-center border-b border-[#C9A96E]/10">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                  ["SUCCESS", "confirmed", "APPROVED"].includes(selectedTx.status) ? "bg-green-500/10 text-green-500" : 
                  ["PENDING", "pending"].includes(selectedTx.status) ? "bg-yellow-500/10 text-yellow-500" : 
                  "bg-red-500/10 text-red-500"
                )}>
                  {["SUCCESS", "confirmed", "APPROVED"].includes(selectedTx.status) ? <CheckCircle size={32} /> : 
                   ["PENDING", "pending"].includes(selectedTx.status) ? <Clock size={32} /> : 
                   <AlertCircle size={32} />}
                </div>
                <h4 className="text-3xl font-bold text-white mb-1">
                  {selectedTx.type?.toLowerCase() === 'deposit' ? '+' : '-'}{(selectedTx.amountBtc || selectedTx.amount || 0).toFixed(4)} BTC
                </h4>
                {selectedTx.amountUsd && (
                  <p className="text-gray-500">≈ ${(selectedTx.amountUsd || 0).toLocaleString()}</p>
                )}
                
                <div className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-4",
                  ["SUCCESS", "confirmed", "APPROVED"].includes(selectedTx.status) ? "bg-green-500/10 text-green-500 border border-green-500/20" : 
                  ["PENDING", "pending"].includes(selectedTx.status) ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" : 
                  "bg-red-500/10 text-red-500 border border-red-500/20"
                )}>
                  {selectedTx.status}
                </div>
              </div>

              {/* Details */}
              <div className="p-6 space-y-4 bg-slate-950/20">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-gray-500">Type</span>
                  <span className="text-sm font-semibold text-white capitalize">{selectedTx.type}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="text-sm font-semibold text-white">{format(new Date(selectedTx.timestamp), "MMM dd, yyyy HH:mm")}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-gray-500">Transaction ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-300">
                      {selectedTx.txHash ? `${selectedTx.txHash.substring(0, 12)}...` : "N/A"}
                    </span>
                    {selectedTx.txHash && (
                      <button 
                        onClick={() => navigator.clipboard.writeText(selectedTx.txHash)}
                        data-tooltip-id="tx-tooltip"
                        data-tooltip-content="Copy TXID"
                        className="text-gray-500 hover:text-[#C9A96E] transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {["failed", "REJECTED"].includes(selectedTx.status) && selectedTx.rejectionReason && (
                  <div className="flex justify-between items-start py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Reason</span>
                    <span className="text-sm font-semibold text-red-400 text-right max-w-[200px]">{selectedTx.rejectionReason}</span>
                  </div>
                )}
                {selectedTx.walletAddress && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-sm text-gray-500">Wallet Address</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-300">
                        {`${selectedTx.walletAddress.substring(0, 8)}...${selectedTx.walletAddress.substring(selectedTx.walletAddress.length - 8)}`}
                      </span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(selectedTx.walletAddress)}
                        data-tooltip-id="tx-tooltip"
                        data-tooltip-content="Copy Address"
                        className="text-gray-500 hover:text-[#C9A96E] transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-slate-950/50 flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-[#C9A96E] text-black font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink size={18} /> Print Receipt
                </button>
                <button 
                  onClick={() => setSelectedTx(null)}
                  className="flex-1 py-3 bg-slate-900 border border-[#C9A96E]/20 text-white font-bold rounded-xl hover:bg-[#C9A96E]/10 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
