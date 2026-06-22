import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tooltip } from "react-tooltip";
import { 
  Users, 
  ArrowDownCircle, 
  ArrowUpCircle,
  ShieldCheck, 
  TrendingUp,
  Search,
  MoreVertical,
  Lock,
  Check,
  X,
  AlertCircle,
  Eye,
  ShieldAlert,
  Shield,
  ArrowUpDown,
  Filter,
  Camera,
  MessageSquare,
  Inbox,
  Mail,
  User,
  Send
} from "lucide-react";
import { useAuth } from "../AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { APP_CONFIG } from "../config";
import { SupportWidget } from "../components/SupportWidget";
import { useNotifications } from "../NotificationContext";
import { collection, query, onSnapshot, doc, updateDoc, increment, getDocs, where, getDoc, deleteDoc, writeBatch, orderBy } from "firebase/firestore";
import { db, auth } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { cn } from "../lib/utils";
import { usePrices } from "../PriceContext";
import { format } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/restricted');
    }
  }, [isAdmin, navigate]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("joined");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKyc, setFilterKyc] = useState("all");
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingKyc, setPendingKyc] = useState<any[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTxRejectModal, setShowTxRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingKyc, setRejectingKyc] = useState<{ id: string, userId: string } | null>(null);
  const [rejectingTx, setRejectingTx] = useState<{ id: string, userId: string, type: string, amount: number } | null>(null);
  const [activeUserMenu, setActiveUserMenu] = useState<string | null>(null);
  const [activeChatUser, setActiveChatUser] = useState<{ id: string, name: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const { prices } = usePrices();
  const btcPrice = prices?.btc?.usd || 0;
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    activeKyc: 0,
    activeInvestments: 0,
    activeChats: 0,
    activeTickets: 0
  });

  useEffect(() => {
    if (!auth.currentUser || !isAdmin) return;

    // Fetch users
    const unsubUsers = onSnapshot(collection(db, "users"), async (snap) => {
      const u = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(u);
      setStats(prev => ({ ...prev, totalUsers: u.length }));
      
      // Update system stats in Firestore for Landing page
      try {
        await updateDoc(doc(db, "system", "stats"), { totalUsers: u.length });
      } catch (err) {
        console.warn("Could not update public system stats:", err);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, "users"));

    // Fetch active investments count
    const qI = query(collection(db, "investments"), where("status", "==", "active"));
    const unsubI = onSnapshot(qI, (snap) => {
      setStats(prev => ({ ...prev, activeInvestments: snap.docs.length }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "investments"));

    // Fetch pending deposits
    const qD = query(collection(db, "transactions"), where("status", "in", ["pending", "PENDING"]), where("type", "in", ["deposit", "DEPOSIT"]));
    const unsubD = onSnapshot(qD, (snap) => {
      const t = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingDeposits(t);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "transactions"));

    // Fetch pending withdrawals
    const qW = query(collection(db, "transactions"), where("status", "in", ["pending", "PENDING"]), where("type", "in", ["withdrawal", "WITHDRAWAL"]));
    const unsubW = onSnapshot(qW, (snap) => {
      const t = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingWithdrawals(t);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "transactions"));

    // Fetch pending KYC
    const qK = query(collection(db, "kyc_submissions"), where("status", "==", "pending"));
    const unsubK = onSnapshot(qK, (snap) => {
      const k = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPendingKyc(k);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "kyc_submissions"));

    // Fetch active chats count (unread)
    const unsubChats = onSnapshot(collection(db, "support_chats"), (snap) => {
      const allMsgs = snap.docs.map(d => d.data());
      const unreadUserIds = new Set(allMsgs.filter(m => m.sender === 'user' && m.read === false).map(m => m.userId));
      setStats(prev => ({ ...prev, activeChats: unreadUserIds.size }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "support_chats"));

    // Fetch open support tickets count
    const qTickets = query(collection(db, "support_tickets"), where("status", "==", "open"));
    const unsubTickets = onSnapshot(qTickets, (snap) => {
      setStats(prev => ({ ...prev, activeTickets: snap.docs.length }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, "support_tickets"));

    return () => {
      unsubUsers();
      unsubI();
      unsubD();
      unsubW();
      unsubK();
      unsubChats();
      unsubTickets();
    };
  }, [isAdmin]);

  const approveDeposit = async (tx: any) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/transactions/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ transactionId: tx.id })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve deposit");
      }

      await addNotification(tx.userId, "Deposit Approved", `Your deposit of ${tx.amountBtc || tx.amount} BTC has been confirmed and added to your balance.`, "success");
      toast.success("Deposit approved successfully");
    } catch (e: any) {
      console.error("Approve deposit error:", e);
      toast.error("Failed to approve deposit: " + (e.message || "Unknown error"));
    }
  };

  const approveWithdrawal = async (tx: any) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/transactions/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ transactionId: tx.id })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve withdrawal");
      }

      await addNotification(tx.userId, "Withdrawal Approved", `Your withdrawal request for ${tx.amountBtc || tx.amount} BTC has been approved and processed.`, "success");
      toast.success("Withdrawal approved successfully");
    } catch (e: any) {
      console.error("Approve withdrawal error:", e);
      toast.error("Failed to approve withdrawal: " + (e.message || "Unknown error"));
    }
  };

  const handleRejectTransaction = async () => {
    if (!rejectingTx || !rejectReason.trim()) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/transactions/reject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          transactionId: rejectingTx.id,
          reason: rejectReason
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject transaction");
      }

      await addNotification(rejectingTx.userId, `${rejectingTx.type.charAt(0).toUpperCase() + rejectingTx.type.slice(1)} Rejected`, `Your ${rejectingTx.type} request for ${rejectingTx.amount} BTC has been rejected. Reason: ${rejectReason}`, "error");
      
      setShowTxRejectModal(false);
      setRejectReason("");
      setRejectingTx(null);
      setSelectedTx(null);
      toast.success("Transaction rejected");
    } catch (error: any) {
      console.error("Error rejecting transaction:", error);
      toast.error(error.message);
    }
  };

  const initiateRejectTx = (tx: any) => {
    setRejectingTx({ id: tx.id, userId: tx.userId, type: tx.type, amount: tx.amountBtc || tx.amount });
    setShowTxRejectModal(true);
  };

  const approveKyc = async (kyc: any) => {
    try {
      if (!kyc.userId) throw new Error("Missing user ID");
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/kyc/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ userId: kyc.userId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve KYC");
      }

      await addNotification(kyc.userId, "KYC Verified", "Your KYC verification has been approved. You can now access all features, including withdrawals.", "success");
      toast.success("KYC approved successfully");
      setSelectedKyc(null);
    } catch (e: any) {
      console.error("KYC approve error:", e);
      toast.error(e.message);
    }
  };

  const handleRejectKyc = async () => {
    if (!rejectingKyc || !rejectReason.trim()) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/kyc/reject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ 
          userId: rejectingKyc.userId,
          reason: rejectReason
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject KYC");
      }

      await addNotification(rejectingKyc.userId, "KYC Rejected", `Your KYC verification was rejected. Reason: ${rejectReason}`, "error");
      setShowRejectModal(false);
      setRejectReason("");
      setRejectingKyc(null);
      setSelectedKyc(null);
      toast.success("KYC rejected successfully");
    } catch (error: any) {
      console.error("Error rejecting KYC:", error);
      toast.error(error.message);
    }
  };

  const initiateRejectKyc = (id: string, userId: string) => {
    setRejectingKyc({ id, userId });
    setShowRejectModal(true);
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'restricted' ? 'active' : 'restricted';
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      await addNotification(userId, 
        newStatus === 'restricted' ? "Account Restricted" : "Account Activated", 
        newStatus === 'restricted' ? 
          "Your account has been restricted. Please contact support for more information." : 
          "Your account has been activated. You can now access all features.",
        newStatus === 'restricted' ? "warning" : "success"
      );
      setActiveUserMenu(null);
    } catch (e) {
      console.error("Toggle user status error:", e);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent successfully.");
      setActiveUserMenu(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredAndSortedUsers = users
    .filter(u => {
      const matchesSearch = 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || (u.status || "active") === filterStatus;
      const matchesKyc = filterKyc === "all" || u.kycStatus === filterKyc;
      return matchesSearch && matchesStatus && matchesKyc;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") comparison = (a.displayName || "").localeCompare(b.displayName || "");
      if (sortBy === "balance") comparison = (a.btcBalance || 0) - (b.btcBalance || 0);
      if (sortBy === "totalDeposited") comparison = (a.totalDepositedUsd || 0) - (b.totalDepositedUsd || 0);
      if (sortBy === "joined") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateA - dateB;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const resetSystemData = async () => {
    setIsResetting(true);
    setShowResetConfirmDialog(false);
    try {
      console.log("Starting system reset...");
      
      const collectionsToClear = [
        "transactions", 
        "investments", 
        "kyc_submissions", 
        "notifications",
        "contact_messages",
        "support_chats",
        "support_tickets",
        "emailLogs",
        "mail",
        "newsletters",
        "chat_messages",
        "contact_submissions"
      ];
      let totalDeleted = 0;

      // 1. Reset all user balances (using batches of 500)
      const usersSnap = await getDocs(collection(db, "users"));
      console.log(`Found ${usersSnap.size} users to reset.`);
      
      let batch = writeBatch(db);
      let count = 0;

      for (const userDoc of usersSnap.docs) {
        batch.update(doc(db, "users", userDoc.id), {
          btcBalance: 0,
          usdBalance: 0,
          tradingBalanceBtc: 0,
          totalDeposited: 0,
          totalDepositedUsd: 0,
          referralBonusEarned: 0,
          kycStatus: "not_submitted",
          kycRejectionReason: "",
          isSuspended: false,
          status: "active",
          hasTraded: false
        });
        count++;
        if (count === 500) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      console.log("User balances reset.");

      // 2. Delete other collections
      for (const colName of collectionsToClear) {
        try {
          const snap = await getDocs(collection(db, colName));
          if (snap.empty) continue;
          
          console.log(`Deleting ${snap.size} documents from ${colName}...`);
          
          batch = writeBatch(db);
          count = 0;
          for (const d of snap.docs) {
            batch.delete(doc(db, colName, d.id));
            count++;
            totalDeleted++;
            if (count === 500) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
          if (count > 0) await batch.commit();
        } catch (colErr) {
          console.warn(`Could not clear collection ${colName}:`, colErr);
        }
      }

      // 3. Reset system stats explicitly for landing page
      try {
        await updateDoc(doc(db, "system", "stats"), { 
          totalUsers: usersSnap.size,
          lastReset: new Date().toISOString()
        });
      } catch (statsErr) {
        console.warn("Could not explicitly update system stats after reset:", statsErr);
      }

      console.log(`System reset complete. Total documents deleted: ${totalDeleted}`);
      toast.success("System data has been successfully reset.");
      
      // Force reload to refresh all local states
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error("Reset error:", error);
      toast.error("Failed to reset system data: " + (error.code ? `[${error.code}] ` : "") + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full min-h-full space-y-8">
      <Tooltip id="admin-tooltip" className="z-50" />
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Admin Control Panel</h1>
          <p className="text-gray-400">Manage users, deposits, and KYC verifications.</p>
        </div>
        <div className="ml-auto flex items-center gap-4 relative z-10">
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 bg-[#C9A96E]/10 text-[#C9A96E] border border-[#C9A96E]/20 rounded-xl text-sm font-bold hover:bg-[#C9A96E]/20 transition-all flex items-center gap-2"
          >
            <ShieldAlert size={18} />
            Audit Logs
          </Link>
          <button 
            onClick={() => setShowResetConfirmDialog(true)}
            disabled={isResetting}
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg active:scale-95"
          >
            <ShieldAlert size={18} />
            {isResetting ? "Resetting..." : "Reset System Data"}
          </button>
        </div>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        <AdminStatCard title="Total Users" value={stats.totalUsers} icon={Users} />
        <AdminStatCard title="Active Plans" value={stats.activeInvestments} icon={TrendingUp} color="green" />
        <AdminStatCard title="Pending KYC" value={pendingKyc.length} icon={ShieldCheck} color="blue" />
        <AdminStatCard 
          title="Open Tickets" 
          value={stats.activeTickets} 
          icon={Inbox} 
          color="red" 
          link="/admin/tickets" 
          badge={stats.activeTickets > 0}
        />
        <AdminStatCard 
          title="Unread Chats" 
          value={stats.activeChats} 
          icon={MessageSquare} 
          color="gold" 
          link="/admin/support" 
          badge={stats.activeChats > 0}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
        {/* Pending Deposits */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ArrowDownCircle size={20} className="text-yellow-500" />
            Pending Deposits
          </h3>
          <div className="space-y-4">
            {pendingDeposits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
                  <Inbox size={32} />
                </div>
                <p className="text-sm text-gray-500">No pending deposits.</p>
              </div>
            ) : (
              pendingDeposits.map(tx => {
                const txUser = users.find(u => u.id === tx.userId);
                return (
                  <div 
                    key={tx.id} 
                    onClick={() => navigate(`/admin/user/${tx.userId}`)}
                    className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl flex items-center justify-between group hover:border-[#C9A96E]/30 transition-all cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white group-hover:text-[#C9A96E] transition-colors">{tx.amountBtc || tx.amount} BTC</p>
                      <p className="text-[10px] text-gray-500 mt-1">From: <span className="text-gray-300 font-medium">{txUser?.displayName || tx.userId.slice(0, 8) + '...'}</span></p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        data-tooltip-id="admin-tooltip"
                        data-tooltip-content="View Deposit Details"
                        className="p-2 bg-[#C9A96E]/10 text-[#C9A96E] rounded-lg hover:bg-[#C9A96E]/20 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => approveDeposit(tx)}
                        data-tooltip-id="admin-tooltip"
                        data-tooltip-content="Approve Deposit"
                        className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ArrowUpCircle size={20} className="text-red-500" />
            Pending Withdrawals
          </h3>
          <div className="space-y-4">
            {pendingWithdrawals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
                  <Inbox size={32} />
                </div>
                <p className="text-sm text-gray-500">No pending withdrawals.</p>
              </div>
            ) : (
              pendingWithdrawals.map(tx => {
                const txUser = users.find(u => u.id === tx.userId);
                return (
                  <div 
                    key={tx.id} 
                    onClick={() => navigate(`/admin/user/${tx.userId}`)}
                    className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl flex items-center justify-between group hover:border-[#C9A96E]/30 transition-all cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white group-hover:text-[#C9A96E] transition-colors">{tx.amountBtc || tx.amount} BTC</p>
                      <p className="text-[10px] text-gray-500 mt-1">User: <span className="text-gray-300 font-medium">{txUser?.displayName || tx.userId.slice(0, 8) + '...'}</span></p>
                      <p className="text-[10px] text-gray-500">Address: {tx.walletAddress?.slice(0, 12)}...</p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        data-tooltip-id="admin-tooltip"
                        data-tooltip-content="View Withdrawal Details"
                        className="p-2 bg-[#C9A96E]/10 text-[#C9A96E] rounded-lg hover:bg-[#C9A96E]/20 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => approveWithdrawal(tx)}
                        data-tooltip-id="admin-tooltip"
                        data-tooltip-content="Approve Withdrawal"
                        className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
        {/* Pending KYC */}
        <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-500" />
            Pending KYC
          </h3>
          <div className="space-y-4">
            {pendingKyc.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
                  <ShieldCheck size={32} />
                </div>
                <p className="text-sm text-gray-500">No pending KYC requests.</p>
              </div>
            ) : (
              pendingKyc.map(kyc => (
                <div key={kyc.id} className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-bold text-white">{kyc.fullName}</p>
                    <p className="text-xs text-gray-500 mt-1 capitalize">{kyc.idType?.replace('_', ' ')}: {kyc.idNumber}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setSelectedKyc(kyc)}
                      data-tooltip-id="admin-tooltip"
                      data-tooltip-content="View KYC Details"
                      className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => approveKyc(kyc)}
                      data-tooltip-id="admin-tooltip"
                      data-tooltip-content="Approve KYC"
                      className="p-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => initiateRejectKyc(kyc.id, kyc.userId)}
                      data-tooltip-id="admin-tooltip"
                      data-tooltip-content="Reject KYC"
                      className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* KYC Details Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-[#C9A96E]/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#C9A96E]/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-blue-500" />
                KYC Verification Details
              </h3>
              <button onClick={() => setSelectedKyc(null)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Full Name</p>
                    <p className="text-lg font-bold text-white">{selectedKyc.fullName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">ID Type</p>
                    <p className="text-white capitalize">{selectedKyc.idType?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">ID Number</p>
                    <p className="text-white font-mono">{selectedKyc.idNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Submitted At</p>
                    <p className="text-white">{format(new Date(selectedKyc.submittedAt), "MMM dd, yyyy HH:mm")}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">ID Front</p>
                      <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-[#C9A96E]/5 cursor-pointer" onClick={() => window.open(selectedKyc.idImageFront || selectedKyc.idImage)}>
                        {(selectedKyc.idImageFront || selectedKyc.idImage) ? (
                          <img src={selectedKyc.idImageFront || selectedKyc.idImage} alt="ID Front" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700">No Image</div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">ID Back</p>
                      <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-[#C9A96E]/5 cursor-pointer" onClick={() => window.open(selectedKyc.idImageBack)}>
                        {selectedKyc.idImageBack ? (
                          <img src={selectedKyc.idImageBack} alt="ID Back" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700">No Image</div>
                        )}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-xl">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-3">Selfie + ID</p>
                      <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-[#C9A96E]/5 cursor-pointer" onClick={() => window.open(selectedKyc.selfieWithId)}>
                        {selectedKyc.selfieWithId ? (
                          <img src={selectedKyc.selfieWithId} alt="Selfie" className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-700">No Image</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-950 border-t border-[#C9A96E]/10 flex gap-4">
              <button 
                onClick={() => approveKyc(selectedKyc)}
                className="flex-1 py-4 bg-green-500 text-[#0B0B0B] font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Approve KYC
              </button>
              <button 
                onClick={() => initiateRejectKyc(selectedKyc.id, selectedKyc.userId)}
                className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <X size={20} />
                Reject KYC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-[#C9A96E]/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#C9A96E]/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedTx.type === 'deposit' ? <ArrowDownCircle className="text-yellow-500" /> : <ArrowUpCircle className="text-red-500" />}
                {selectedTx.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Details
              </h3>
              <button onClick={() => setSelectedTx(null)} className="text-gray-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center p-4 bg-slate-950 border border-[#C9A96E]/10 rounded-2xl">
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Amount (BTC)</p>
                    <p className="text-2xl font-bold text-[#C9A96E]">{selectedTx.amountBtc || selectedTx.amount} BTC</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Amount (USD)</p>
                    <p className="text-xl font-bold text-white">${(selectedTx.amountUsd || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Status</p>
                  <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold rounded-full uppercase tracking-widest border border-yellow-500/20">
                    {selectedTx.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {selectedTx.type === 'deposit' ? (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Transaction Hash (TXID)</p>
                    <p className="text-sm text-white font-mono break-all bg-slate-950 p-3 rounded-lg border border-[#C9A96E]/5">{selectedTx.txHash}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Destination Wallet</p>
                    <p className="text-sm text-white font-mono break-all bg-slate-950 p-3 rounded-lg border border-[#C9A96E]/5">{selectedTx.walletAddress}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Timestamp</p>
                  <p className="text-sm text-white">{format(new Date(selectedTx.timestamp), "MMM dd, yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">User ID</p>
                  <p className="text-[10px] text-gray-500 font-mono">{selectedTx.userId}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-950 border-t border-[#C9A96E]/10 flex gap-4">
              <button 
                onClick={() => { 
                  if (selectedTx.type === 'deposit') approveDeposit(selectedTx);
                  else approveWithdrawal(selectedTx);
                  setSelectedTx(null); 
                }}
                className="flex-1 py-4 bg-green-500 text-[#0B0B0B] font-bold rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Approve
              </button>
              <button 
                onClick={() => initiateRejectTx(selectedTx)}
                className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <X size={20} />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#C9A96E]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-white">All Users</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Search users..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-[#C9A96E]/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-[#C9A96E]/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-[#C9A96E]" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-[#C9A96E]/10 rounded-lg py-2 px-3 text-xs text-gray-400 outline-none focus:border-[#C9A96E]/40"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="restricted">Restricted</option>
              </select>
              <select 
                value={filterKyc}
                onChange={(e) => setFilterKyc(e.target.value)}
                className="bg-slate-950 border border-[#C9A96E]/10 rounded-lg py-2 px-3 text-xs text-gray-400 outline-none focus:border-[#C9A96E]/40"
              >
                <option value="all">All KYC</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="not_submitted">Not Submitted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-[#C9A96E]/10">
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-[#C9A96E] transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center gap-2">
                    User
                    <ArrowUpDown size={12} className={sortBy === "name" ? "text-[#C9A96E]" : "text-gray-600"} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-[#C9A96E] transition-colors"
                  onClick={() => handleSort("balance")}
                >
                  <div className="flex items-center gap-2">
                    BTC Balance
                    <ArrowUpDown size={12} className={sortBy === "balance" ? "text-[#C9A96E]" : "text-gray-600"} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">KYC Status</th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-[#C9A96E] transition-colors"
                  onClick={() => handleSort("totalDeposited")}
                >
                  <div className="flex items-center gap-2">
                    Total Deposited
                    <ArrowUpDown size={12} className={sortBy === "totalDeposited" ? "text-[#C9A96E]" : "text-gray-600"} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Password</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Last Seen</th>
                <th 
                  className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest cursor-pointer hover:text-[#C9A96E] transition-colors"
                  onClick={() => handleSort("joined")}
                >
                  <div className="flex items-center gap-2">
                    Joined
                    <ArrowUpDown size={12} className={sortBy === "joined" ? "text-[#C9A96E]" : "text-gray-600"} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A96E]/5">
              {filteredAndSortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-20">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-slate-950 rounded-full flex items-center justify-center text-gray-700 mb-4">
                        <Users size={40} />
                      </div>
                      <h4 className="text-lg font-bold text-white mb-1">No users found</h4>
                      <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedUsers.map(u => {
                  const isOnline = u.isOnline === true && (
                    !u.lastSeen || (Date.now() - new Date(u.lastSeen).getTime() < 45000)
                  );
                  return (
                    <tr key={u.id} className="hover:bg-[#C9A96E]/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#C9A96E]/10 rounded-full flex items-center justify-center text-[#C9A96E] text-xs font-bold">
                          {u.displayName?.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" : "bg-gray-400")} />
                            <p className="text-sm font-bold text-white">{u.displayName}</p>
                          </div>
                        <p className="text-[10px] text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#C9A96E]">{Number(u.btcBalance || 0).toFixed(4)} BTC</span>
                      <span className="text-[10px] text-gray-500">≈ ${(Number(u.btcBalance || 0) * btcPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        u.status === 'restricted' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                      )}>
                        {u.status || 'active'}
                      </span>
                      <button 
                        onClick={() => toggleUserStatus(u.id, u.status || 'active')}
                        data-tooltip-id="admin-tooltip"
                        data-tooltip-content={u.status === 'restricted' ? "Activate User" : "Restrict User"}
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          u.status === 'restricted' ? "text-green-500 hover:bg-green-500/10" : "text-red-500 hover:bg-red-500/10"
                        )}
                      >
                        {u.status === 'restricted' ? <Shield size={14} /> : <ShieldAlert size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      u.kycStatus === 'verified' ? "bg-green-500/10 text-green-500" : 
                      u.kycStatus === 'pending' ? "bg-yellow-500/10 text-yellow-500" : 
                      u.kycStatus === 'rejected' ? "bg-red-500/10 text-red-500" :
                      "bg-gray-500/10 text-gray-500"
                    )}>
                      {u.kycStatus ? u.kycStatus.replace('_', ' ') : 'not submitted'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">${(u.totalDepositedUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{(u.totalDeposited || 0).toFixed(4)} BTC</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-gray-400 select-all" title="Click to select">
                      {u.plainPassword || "---"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 select-none animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] inline-block"></span>
                        Active Now
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 font-mono">
                        {u.lastSeen ? format(new Date(u.lastSeen), "MMM dd, yyyy HH:mm") : u.lastLogin ? format(new Date(u.lastLogin), "MMM dd, yyyy HH:mm") : "---"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {u.createdAt ? format(new Date(u.createdAt), "MMM dd, yyyy") : "---"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {/* Quick Actions */}
                       <div className="flex items-center gap-1 mr-2 px-2 border-r border-[#C9A96E]/10">
                          <button 
                            onClick={() => handleResetPassword(u.email)}
                            className="p-1.5 text-gray-500 hover:text-[#C9A96E] hover:bg-[#C9A96E]/10 rounded-lg transition-all"
                            title="Reset Password"
                          >
                            <Lock size={14} />
                          </button>
                          <button 
                            onClick={() => setActiveChatUser({ id: u.id, name: u.displayName || u.email })}
                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                            title="Chat with User"
                          >
                            <MessageSquare size={14} />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(u.id, u.status || 'active')}
                            className={cn(
                              "p-1.5 transition-all rounded-lg",
                              u.status === 'restricted' 
                                ? "text-green-500 hover:bg-green-500/10" 
                                : "text-red-500 hover:bg-red-500/10"
                            )}
                            title={u.status === 'restricted' ? "Unrestrict Account" : "Restrict Account"}
                          >
                            <Shield size={14} />
                          </button>
                       </div>

                      <Link 
                        to={`/admin/user/${u.id}`}
                        className="p-2 text-gray-500 hover:text-[#C9A96E] transition-colors flex items-center gap-1 text-xs font-bold"
                      >
                        <Eye size={16} />
                        View
                      </Link>
                      <div className="relative">
                        <button 
                          onClick={() => setActiveUserMenu(activeUserMenu === u.id ? null : u.id)}
                          className={cn(
                            "p-2 transition-colors rounded-lg",
                            activeUserMenu === u.id ? "text-[#C9A96E] bg-[#C9A96E]/10" : "text-gray-500 hover:text-white"
                          )}
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {activeUserMenu === u.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setActiveUserMenu(null)}
                              />
                              <motion.div
                                key={`user-menu-${u.id}`}
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-slate-900 border border-[#C9A96E]/20 rounded-xl shadow-2xl z-[70] overflow-hidden"
                              >
                                <div className="p-2 space-y-1">
                                  <button 
                                    onClick={() => handleResetPassword(u.email)}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-gray-400 hover:text-[#C9A96E] hover:bg-[#C9A96E]/5 rounded-lg transition-all flex items-center gap-2"
                                  >
                                    <Lock size={14} />
                                    Reset Password
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setActiveChatUser({ id: u.id, name: u.displayName || u.email });
                                      setActiveUserMenu(null);
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-gray-400 hover:text-blue-400 hover:bg-blue-400/5 rounded-lg transition-all flex items-center gap-2"
                                  >
                                    <MessageSquare size={14} />
                                    Chat with User
                                  </button>
                                  <button 
                                    onClick={() => toggleUserStatus(u.id, u.status || 'active')}
                                    className={cn(
                                      "w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                                      u.status === 'restricted' 
                                        ? "text-green-500 hover:bg-green-500/5" 
                                        : "text-red-500 hover:bg-red-500/5"
                                    )}
                                  >
                                    <Shield size={14} />
                                    {u.status === 'restricted' ? "Unrestrict Account" : "Restrict Account"}
                                  </button>
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {activeChatUser && (
        <SupportWidget 
          key={activeChatUser.id}
          targetUserId={activeChatUser.id} 
          targetUserName={activeChatUser.name} 
          initialOpen={true}
          onClose={() => setActiveChatUser(null)}
        />
      )}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowRejectModal(false);
                setRejectingKyc(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-[#C9A96E]/20 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-2">Reject KYC</h3>
              <p className="text-gray-400 text-sm mb-6">Please provide a reason for rejecting this KYC submission. The user will be notified.</p>
              
              <div className="space-y-4">
                <select 
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl p-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all"
                  onChange={(e) => setRejectReason(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Select a reason (optional)</option>
                  <option value="Blurry or illegible ID image">Blurry or illegible ID image</option>
                  <option value="ID document has expired">ID document has expired</option>
                  <option value="Document does not match user details">Document does not match user details</option>
                  <option value="Insufficient information provided">Insufficient information provided</option>
                </select>
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Or type custom reason..."
                  className="w-full h-32 bg-slate-950 border border-[#C9A96E]/10 rounded-xl p-4 text-white outline-none focus:border-red-500/40 transition-all resize-none"
                />
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectingKyc(null);
                    }}
                    className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl border border-[#C9A96E]/10 hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRejectKyc}
                    disabled={!rejectReason.trim()}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Transaction Rejection Reason Modal */}
      <AnimatePresence>
        {showTxRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowTxRejectModal(false);
                setRejectingTx(null);
              }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-[#C9A96E]/20 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-white mb-2">Reject {rejectingTx?.type.charAt(0).toUpperCase()}{rejectingTx?.type.slice(1)}</h3>
              <p className="text-gray-400 text-sm mb-6">Please provide a reason for rejecting this {rejectingTx?.type}. The user will be notified.</p>
              
              <div className="space-y-4">
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Invalid transaction hash, insufficient funds..."
                  className="w-full h-32 bg-slate-950 border border-[#C9A96E]/10 rounded-xl p-4 text-white outline-none focus:border-red-500/40 transition-all resize-none"
                />
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      setShowTxRejectModal(false);
                      setRejectingTx(null);
                    }}
                    className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl border border-[#C9A96E]/10 hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRejectTransaction}
                    disabled={!rejectReason.trim()}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all disabled:opacity-50"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Dialog */}
      <AnimatePresence>
        {showResetConfirmDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirmDialog(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 text-center">Critical Warning</h3>
              <p className="text-gray-400 text-sm mb-6 text-center">
                This will reset ALL user balances to 0 and delete ALL transactions, investments, KYC submissions, support chats, notifications and more.
                <br /><br />
                <strong className="text-red-400">This action cannot be undone.</strong> Are you absolutely sure you want to proceed?
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirmDialog(false)}
                  disabled={isResetting}
                  className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl border border-[#C9A96E]/10 hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={resetSystemData}
                  disabled={isResetting}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isResetting ? "Resetting..." : "Reset System"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminStatCard = ({ title, value, icon: Icon, color, link, badge }: any) => {
  const colorStyles: any = {
    yellow: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    gold: "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20"
  };

  const style = colorStyles[color] || colorStyles.gold;

  const content = (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1 truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-3xl font-black text-white tracking-tight">
            {value}
          </h4>
          {badge && (
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </div>
      </div>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500",
        "group-hover:scale-110 group-hover:rotate-3 shadow-lg",
        style
      )}>
        <Icon size={24} />
      </div>
    </>
  );

  const className = cn(
    "bg-slate-900 border border-[#C9A96E]/10 p-6 rounded-2xl flex items-center gap-4 group transition-all duration-300",
    "hover:border-[#C9A96E]/30 hover:bg-slate-800/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
    "relative overflow-hidden"
  );

  return link ? (
    <Link to={link} className={className}>
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-20 transition-opacity">
        <Icon size={80} className="translate-x-1/4 -translate-y-1/4" />
      </div>
      {content}
    </Link>
  ) : (
    <div className={className}>
      {content}
    </div>
  );
};
