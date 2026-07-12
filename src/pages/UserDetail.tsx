import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { sendPasswordResetEmail } from "firebase/auth";
import { db, auth } from "../firebase";
import { useNotifications } from "../NotificationContext";
import { 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Wallet, 
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Settings,
  Lock,
  Unlock,
  Key,
  Save,
  Camera,
  FileText,
  Zap,
  MessageSquare,
  Clock,
  ShieldQuestion,
  CheckCircle2,
  XCircle,
  TrendingDown as TrendingUpIcon
} from "lucide-react";
import { usePrices } from "../PriceContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { cn } from "../lib/utils";
import { format } from "date-fns";

const chartData = [
  { name: "Mon", value: 4000 },
  { name: "Tue", value: 3000 },
  { name: "Wed", value: 5000 },
  { name: "Thu", value: 4500 },
  { name: "Fri", value: 6000 },
  { name: "Sat", value: 5500 },
  { name: "Sun", value: 7000 },
];

export const UserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [kycSubmission, setKycSubmission] = useState<any>(null);
  const [kycHistory, setKycHistory] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const { prices } = usePrices();
  const btcPrice = prices?.btc?.usd || 0;
  const [loading, setLoading] = useState(true);
  
  // Edit states
  const [editUsdBalance, setEditUsdBalance] = useState<string>("");
  const [editWallet, setEditWallet] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // KYC Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Fetch user profile
    const unsubUser = onSnapshot(doc(db, "users", userId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile({ id: doc.id, ...data, btcAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr", btcWalletAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr" });
        setEditUsdBalance(data.usdBalance?.toString() || "0");
        setEditWallet("bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr");
      } else {
        // Try local backup
        const localListStr = localStorage.getItem("local_registered_users") || "[]";
        try {
          const list = JSON.parse(localListStr);
          const localU = list.find((item: any) => item.uid === userId);
          if (localU) {
            setUserProfile({ id: localU.uid, ...localU, btcAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr", btcWalletAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr" });
            setEditUsdBalance(localU.usdBalance?.toString() || "0");
            setEditWallet("bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr");
          }
        } catch (e) {
          console.warn("Failed to find local user detail backup:", e);
        }
      }
      setLoading(false);
    }, (err) => {
      // Try local backup on error too
      const localListStr = localStorage.getItem("local_registered_users") || "[]";
      try {
        const list = JSON.parse(localListStr);
        const localU = list.find((item: any) => item.uid === userId);
        if (localU) {
          setUserProfile({ id: localU.uid, ...localU, btcAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr", btcWalletAddress: "bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr" });
          setEditUsdBalance(localU.usdBalance?.toString() || "0");
          setEditWallet("bc1qnamqyfnm96vxkrftcztmtzuztrute0xcjny4gr");
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Failed to find local user detail backup on error:", e);
      }
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    });

    // Fetch user transactions
    const qTx = query(collection(db, "transactions"), where("userId", "==", userId));
    const unsubTx = onSnapshot(qTx, (snap) => {
      const txs = snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, txType: data.type, type: 'transaction' };
      });
      setTransactions(txs.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "transactions"));

    // Fetch user investments
    const qInv = query(collection(db, "investments"), where("userId", "==", userId));
    const unsubInv = onSnapshot(qInv, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'investment' }));
      setInvestments(invs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, "investments"));

    // Fetch user KYC submission
    const qKyc = query(collection(db, "kyc_submissions"), where("userId", "==", userId));
    const unsubKyc = onSnapshot(qKyc, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'kyc' }));
      const sorted = docs.sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0));
      setKycHistory(sorted);
      setKycSubmission(sorted[0] || null);
    }, (err) => handleFirestoreError(err, OperationType.LIST, "kyc_submissions"));

    return () => {
      unsubUser();
      unsubTx();
      unsubInv();
      unsubKyc();
    };
  }, [userId]);

  useEffect(() => {
    // Combine and sort all activities
    const allActivities = [
      ...transactions.map(t => ({ ...t, timestamp: t.timestamp })),
      ...investments.map(i => ({ ...i, timestamp: i.createdAt })),
      ...kycHistory.map(k => ({ ...k, timestamp: k.submittedAt }))
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    setActivities(allActivities);
  }, [transactions, investments, kycHistory]);

  const handleSaveAdminEdits = async () => {
    if (!userId) return;
    setUpdating(true);
    const btcVal = btcPrice > 0 ? parseFloat(editUsdBalance) / btcPrice : (userProfile?.btcBalance || 0);
    try {
      await updateDoc(doc(db, "users", userId), {
        usdBalance: parseFloat(editUsdBalance),
        btcBalance: btcVal,
        tradingBalanceBtc: btcVal,
        btcWalletAddress: editWallet
      });
      setMessage({ type: 'success', text: "User updated successfully!" });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to update user." });
    } finally {
      setUpdating(false);
    }
  };

  const toggleRestriction = async () => {
    if (!userId || !userProfile) return;
    const newStatus = userProfile.status === 'restricted' ? 'active' : 'restricted';
    try {
      await updateDoc(doc(db, "users", userId), { status: newStatus });
      await addNotification(userId, 
        newStatus === 'restricted' ? "Account Restricted" : "Account Activated", 
        newStatus === 'restricted' ? 
          "Your account has been restricted. Please contact support for more information." : 
          "Your account has been activated. You can now access all features.",
        newStatus === 'restricted' ? "warning" : "success"
      );
      setMessage({ type: 'success', text: `User ${newStatus === 'restricted' ? 'restricted' : 'unrestricted'} successfully!` });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to update status." });
    }
  };

  const sendResetEmail = async () => {
    if (!userProfile?.email) return;
    try {
      await sendPasswordResetEmail(auth, userProfile.email);
      setMessage({ type: 'success', text: "Password reset email sent!" });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to send reset email." });
    }
  };

  const handleResetUserData = async () => {
    if (!userId) return;
    setResetting(true);
    try {
      const { writeBatch, getDocs, collection, query, where, doc } = await import("firebase/firestore");
      const batch = writeBatch(db);
      
      // Clear transactions
      const txSnap = await getDocs(query(collection(db, "transactions"), where("userId", "==", userId)));
      txSnap.forEach(d => batch.delete(d.ref));
      
      // Clear investments
      const invSnap = await getDocs(query(collection(db, "investments"), where("userId", "==", userId)));
      invSnap.forEach(d => batch.delete(d.ref));
      
      // Reset user fields
      batch.update(doc(db, "users", userId), {
        totalDeposited: 0,
        totalDepositedUsd: 0,
        referralBonusEarned: 0
      });
      
      await batch.commit();
      setMessage({ type: 'success', text: "User history and daily limits reset successfully!" });
      setShowResetConfirm(false);
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to reset user data." });
    } finally {
      setResetting(false);
    }
  };

  const handleApproveKyc = async () => {
    if (!userId || !kycSubmission) return;
    try {
      await updateDoc(doc(db, "kyc_submissions", kycSubmission.id), { status: "approved" });
      await updateDoc(doc(db, "users", userId), { kycStatus: "verified" });
      await addNotification(userId, "KYC Verified", "Your KYC verification has been approved. You now have full access to withdrawals.", "success");
      setMessage({ type: 'success', text: "KYC approved successfully!" });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to approve KYC." });
    }
  };

  const handleRejectKyc = async () => {
    if (!userId || !kycSubmission || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await updateDoc(doc(db, "kyc_submissions", kycSubmission.id), { 
        status: "rejected",
        rejectionReason: rejectReason 
      });
      await updateDoc(doc(db, "users", userId), { kycStatus: "rejected" });
      await addNotification(userId, "KYC Rejected", `Your KYC verification was rejected. Reason: ${rejectReason}`, "error");
      setMessage({ type: 'success', text: "KYC rejected successfully." });
      setShowRejectModal(false);
      setRejectReason("");
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: "Failed to reject KYC." });
    } finally {
      setRejecting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96 text-[#C9A96E]">Loading user data...</div>;
  if (!userProfile) return <div className="text-center py-20 text-red-500">User not found.</div>;

  const liveUsdBalance = btcPrice > 0 ? (userProfile?.btcBalance || 0) * btcPrice : (userProfile?.usdBalance || 0);
  // Trading balance is a mirror of account balance
  const tradingBtcBalance = userProfile?.btcBalance || 0;
  const tradingUsdBalance = liveUsdBalance;

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Admin Panel
        </button>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate(`/admin/support?user=${userId}`)}
            className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg text-sm font-bold hover:bg-blue-500/20 transition-colors flex items-center gap-2"
          >
            <MessageSquare size={16} />
            Chat with User
          </button>
          <button 
            onClick={toggleRestriction}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2",
              userProfile.status === 'restricted' 
                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" 
                : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
            )}
          >
            {userProfile.status === 'restricted' ? <Unlock size={16} /> : <Lock size={16} />}
            {userProfile.status === 'restricted' ? "Unrestrict Account" : "Restrict Account"}
          </button>
          <button 
            onClick={sendResetEmail}
            className="px-4 py-2 bg-[#C9A96E]/10 text-[#C9A96E] rounded-lg text-sm font-bold hover:bg-[#C9A96E]/20 transition-colors flex items-center gap-2"
          >
            <Key size={16} />
            Reset Password
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm font-medium">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className={cn(
          "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
          message.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
        )}>
          <AlertCircle size={18} />
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile & Admin Controls */}
        <div className="lg:col-span-1 space-y-8">
          {/* User Identity Card */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-[#C9A96E]/10 rounded-3xl flex items-center justify-center text-[#C9A96E] text-3xl font-bold mx-auto mb-4 overflow-hidden">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                userProfile.displayName?.charAt(0)
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{userProfile.displayName}</h1>
            <p className="text-sm text-gray-500 mb-4">{userProfile.email}</p>
            
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] font-bold rounded-full uppercase tracking-widest mx-auto border border-[#C9A96E]/20">
                Member
              </span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mx-auto",
                userProfile.kycStatus === 'verified' ? "bg-green-500/10 text-green-500" : 
                userProfile.kycStatus === 'pending' ? "bg-yellow-500/10 text-yellow-500" : 
                "bg-gray-500/10 text-gray-500"
              )}>
                KYC: {userProfile.kycStatus?.replace('_', ' ')}
              </span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mx-auto",
                userProfile.status === 'restricted' ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
              )}>
                Status: {userProfile.status || 'active'}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mx-auto bg-blue-500/10 text-blue-500">
                Last Seen: {userProfile.lastLogin ? format(new Date(userProfile.lastLogin), "MMM dd, yyyy HH:mm") : 'Never'}
              </span>
              {userProfile.plainPassword && (
                <div className="mt-4 p-2 bg-slate-950 border border-[#C9A96E]/20 rounded-xl">
                  <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-1">Stored Password</p>
                  <p className="text-xs font-mono text-[#C9A96E] break-all select-all">{userProfile.plainPassword}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Edit Form */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-[#C9A96E]" />
              Quick Edit
            </h3>
            
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account Balance (USD)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editUsdBalance}
                    onChange={(e) => setEditUsdBalance(e.target.value)}
                    className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">BTC Wallet Address</label>
                <input 
                  type="text"
                  value={editWallet}
                  onChange={(e) => setEditWallet(e.target.value)}
                  className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 px-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all font-mono text-xs"
                  placeholder="Enter BTC address"
                />
              </div>

              <button 
                onClick={handleSaveAdminEdits}
                disabled={updating}
                className="w-full bg-[#C9A96E] text-[#0B0B0B] font-bold py-3 rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* KYC Verification Card */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck size={20} className="text-[#C9A96E]" />
              KYC Verification
            </h3>
            
            {kycSubmission ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-slate-950 rounded-xl border border-[#C9A96E]/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Full Name</p>
                    <p className="text-sm font-bold text-white">{kycSubmission.fullName}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-xl border border-[#C9A96E]/5">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">ID Type</p>
                    <p className="text-sm font-bold text-white capitalize">{kycSubmission.idType?.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                      <FileText size={10} /> ID Document
                    </p>
                    <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-[#C9A96E]/10">
                      {kycSubmission.idImage ? (
                        <img src={kycSubmission.idImage} alt="ID" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">No image</div>
                      )}
                    </div>
                  </div>
                </div>

                {kycSubmission.status === 'pending' && (
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleApproveKyc}
                      className="flex-1 bg-green-500 text-[#0B0B0B] font-bold py-3 rounded-xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-400 transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {kycSubmission.status === 'rejected' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs font-bold text-red-500 uppercase mb-1">Rejection Reason</p>
                    <p className="text-sm text-gray-300 italic">"{kycSubmission.rejectionReason || 'No reason provided.'}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-gray-500 italic">
                No KYC submission found for this user.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & History */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              title="Account Balance" 
              value={`$${liveUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
              icon={Wallet}
              color="gold"
            />
            <StatCard 
              title="Trading Balance" 
              value={`${tradingBtcBalance.toFixed(4)} BTC`} 
              icon={Zap}
              color="gold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard 
              title="Total Deposited" 
              value={`$${(userProfile.totalDepositedUsd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              subValue={`${(userProfile.totalDeposited || 0).toFixed(4)} BTC Equivalent`}
              icon={ArrowDownCircle}
              color="green"
            />
             <StatCard 
              title="Referral Bonus" 
              value={`$${(userProfile.referralBonusEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              subValue={`Code: ${userProfile.referralCode || 'N/A'}`}
              icon={TrendingUp}
              color="gold"
            />
          </div>

          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8 mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-[#C9A96E]" />
                Recent Activity
              </h3>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-4 py-2 bg-orange-500/10 text-orange-500 text-xs font-bold rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-all flex items-center gap-2"
              >
                <Clock size={14} />
                Reset History & Limits
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No recent activity.</div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 15).map((act, index) => {
                  let icon = <Clock size={20} />;
                  let title = "Activity";
                  let desc = "";
                  let statusColor = "text-gray-500";
                  let bdColor = "border-gray-500/20";
                  const timeStr = act.timestamp ? format(new Date(act.timestamp), "MMM dd, yyyy HH:mm") : "Unknown date";
                  
                  if (act.type === 'transaction') {
                    icon = act.txType === 'deposit' ? <ArrowDownCircle size={20} className="text-green-500" /> : <ArrowUpCircle size={20} className="text-red-500" />;
                    title = act.txType === 'deposit' ? "Deposit" : "Withdrawal";
                    desc = `${(act.amountBtc || act.amount || 0).toFixed(6)} BTC`;
                    statusColor = act.status === 'confirmed' ? "text-green-500" : act.status === 'pending' ? "text-yellow-500" : "text-red-500";
                    bdColor = act.txType === 'deposit' ? "border-green-500/20" : "border-red-500/20";
                  } else if (act.type === 'investment') {
                    icon = <TrendingUp size={20} className="text-[#C9A96E]" />;
                    title = `Investment: ${act.planName}`;
                    desc = `${(act.amountBtc || 0).toFixed(6)} BTC`;
                    statusColor = act.status === 'active' ? "text-blue-500" : "text-green-500";
                    bdColor = "border-[#C9A96E]/20";
                  } else if (act.type === 'kyc') {
                    icon = <ShieldQuestion size={20} className="text-blue-500" />;
                    title = "KYC Registration";
                    desc = `${act.idType?.replace('_', ' ') || 'ID'} Submission`;
                    if (act.status === 'rejected' && act.rejectionReason) {
                      desc += `: ${act.rejectionReason}`;
                    }
                    statusColor = act.status === 'verified' || act.status === 'approved' ? "text-green-500" : act.status === 'pending' ? "text-yellow-500" : "text-red-500";
                    bdColor = "border-blue-500/20";
                  }

                  return (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      key={act.id || index} 
                      className={`p-4 bg-slate-950 border ${bdColor} rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{title}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto">
                        <div className="flex flex-col items-end">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider", statusColor)}>
                            Status: {act.status}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Investments Table */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#C9A96E]/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-[#C9A96E]" />
                Investment History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-[#C9A96E]/10">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Expected Return</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A96E]/5">
                  {investments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">No investments found</td>
                    </tr>
                  ) : (
                    investments.map(inv => (
                      <tr key={inv.id} className="hover:bg-[#C9A96E]/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-white">{inv.planName}</p>
                          <p className="text-[10px] text-gray-500">{inv.createdAt ? format(new Date(inv.createdAt), "MMM dd, yyyy") : "---"}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-white font-mono">{inv.amountBtc} BTC</td>
                        <td className="px-6 py-4 text-sm text-[#C9A96E] font-mono">{inv.expectedReturnBtc?.toFixed(4)} BTC</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            inv.status === 'active' ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"
                          )}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Deposit History Table */}
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#C9A96E]/10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowDownCircle size={20} className="text-green-500" />
                Deposit History
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-[#C9A96E]/10">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C9A96E]/5">
                  {transactions.filter(t => t.txType === 'deposit').length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500">No deposits found</td>
                    </tr>
                  ) : (
                    transactions.filter(t => t.txType === 'deposit').map(tx => (
                      <tr key={tx.id} className="hover:bg-[#C9A96E]/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {tx.timestamp ? format(new Date(tx.timestamp), "MMM dd, yyyy HH:mm") : "---"}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-white font-mono">
                          {tx.amountBtc || tx.amount} BTC
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            tx.status === 'confirmed' ? "bg-green-500/10 text-green-500" : 
                            tx.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                          )}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRejectModal(false)}
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
                <textarea 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. ID image is blurry, document expired..."
                  className="w-full h-32 bg-slate-950 border border-[#C9A96E]/10 rounded-xl p-4 text-white outline-none focus:border-red-500/40 transition-all resize-none"
                />
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl border border-[#C9A96E]/10 hover:bg-slate-700 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRejectKyc}
                    disabled={rejecting || !rejectReason.trim()}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-400 transition-all disabled:opacity-50"
                  >
                    {rejecting ? "Rejecting..." : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => !resetting && setShowResetConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-orange-500/20 rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mb-6 mx-auto">
                <ShieldQuestion size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 text-center">Reset User Data?</h3>
              <p className="text-gray-400 text-sm mb-8 text-center">
                This will permanently delete ALL transactions and investments for this user. This action will also reset their daily withdrawal limits.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl border border-white/10 hover:bg-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleResetUserData}
                  disabled={resetting}
                  className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetting ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon: Icon, color }: any) => (
  <div className="bg-slate-900 border border-[#C9A96E]/10 p-6 rounded-2xl">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-white tracking-tight">{value}</h4>
        <p className={cn("text-xs mt-1", color === 'green' ? "text-green-500" : "text-gray-400")}>
          {subValue}
        </p>
      </div>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center",
        color === 'gold' ? "bg-[#C9A96E]/10 text-[#C9A96E]" : "bg-green-500/10 text-green-500"
      )}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);
