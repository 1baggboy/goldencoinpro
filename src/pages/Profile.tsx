import React, { useState, useEffect } from "react";
import { User, Mail, ShieldCheck, Save, Camera, AlertCircle, Phone, Users, Lock, ShieldAlert, Trash2, Moon, Sun, ArrowDownCircle, ArrowUpCircle, TrendingUp, ShieldQuestion, CheckCircle2, XCircle, Clock, Wallet, Copy, Check } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useNotifications } from "../NotificationContext";
import { useTheme } from "./ThemeContext";
import { doc, updateDoc, deleteDoc, collection, query, where, onSnapshot, setDoc, writeBatch, getDocs } from "firebase/firestore";
import { db, auth } from "../firebase";
import { deleteUser } from "firebase/auth";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { DeviceManagement } from "../components/DeviceManagement";
import { PriceAlertsCard } from "../components/Dashboard/PriceAlertsCard";

export const Profile = () => {
  const { profile, user } = useAuth();
  const { addNotification } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/profile/security') {
      const el = document.getElementById('security-section');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
    }
  }, [location.pathname]);

  const [displayName, setDisplayName] = useState(profile?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Activities feed state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [kycSubmission, setKycSubmission] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Devices state
  const [devices, setDevices] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (profile?.btcAddress) {
       navigator.clipboard.writeText(profile.btcAddress);
       setCopied(true);
       setTimeout(() => setCopied(false), 2000);
    }
  };

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhoneNumber(profile.phoneNumber || "");
      setGender(profile.gender || "");
      setPhotoURL(profile.photoURL || "");
    }
  }, [profile]);

  // Fetch activities and devices
  useEffect(() => {
    if (!user) return;

    // Devices
    const qDevices = collection(db, "users", user.uid, "devices");
    const unsubDevices = onSnapshot(qDevices, (snap) => {
      setDevices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${user.uid}/devices`));

    const qTx = query(collection(db, "transactions"), where("userId", "==", user.uid));
    const unsubTx = onSnapshot(qTx, (snap) => {
      const txs = snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, ...data, txType: data.type, type: 'transaction' };
      });
      setTransactions(txs);
    }, (error) => handleFirestoreError(error, OperationType.GET, "transactions"));

    const qInv = query(collection(db, "investments"), where("userId", "==", user.uid));
    const unsubInv = onSnapshot(qInv, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'investment' }));
      setInvestments(invs);
    }, (error) => handleFirestoreError(error, OperationType.GET, "investments"));

    const qKyc = query(collection(db, "kyc_submissions"), where("userId", "==", user.uid));
    const unsubKyc = onSnapshot(qKyc, (snap) => {
      if (!snap.empty) {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'kyc' }));
        setKycSubmission(docs.sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0))[0]);
      } else {
        setKycSubmission(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, "kyc_submissions"));

    return () => {
      unsubDevices();
      unsubTx();
      unsubInv();
      unsubKyc();
    };
  }, [user]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!user) return;
    try {
      if (confirm('Are you sure you want to revoke access for this device?')) {
        await deleteDoc(doc(db, "users", user.uid, "devices", deviceId));
        setMessage({ type: 'success', text: 'Device revoked successfully.' });
      }
    } catch (err) {
      console.error("Failed to revoke device", err);
      setMessage({ type: 'error', text: 'Failed to revoke device.' });
    }
  };

  useEffect(() => {
    const allActivities = [
      ...transactions.map(t => ({ ...t, timestamp: t.timestamp })),
      ...investments.map(i => ({ ...i, timestamp: i.createdAt || i.startTime })),
      ...(kycSubmission ? [{ ...kycSubmission, timestamp: kycSubmission.submittedAt }] : [])
    ].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 50); // Keep last 50
    setActivities(allActivities);
    setLoadingActivities(false);
  }, [transactions, investments, kycSubmission]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 1MB for Firestore document limit)
    if (file.size > 1024 * 1024) {
      setMessage({ type: 'error', text: "Image too large. Max 1MB." });
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          photoURL: base64String
        });
        setPhotoURL(base64String);
        await addNotification(user.uid, "Profile Updated", "Your profile picture has been updated successfully.", "success");
        setMessage({ type: 'success', text: "Profile picture updated!" });
      } catch (error) {
        console.error("Upload error:", error);
        setMessage({ type: 'error', text: "Failed to upload image." });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setUpdating(true);
    setMessage(null);
    
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        phoneNumber,
        gender,
        photoURL
      });
      await addNotification(user.uid, "Profile Updated", "Your personal information has been updated successfully.", "success");
      setMessage({ type: 'success', text: "Profile updated successfully!" });
    } catch (error) {
      console.error("Update profile error:", error);
      setMessage({ type: 'error', text: "Failed to update profile. Please try again." });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || !profile) return;
    
    // Check if user has balance
    if (profile.usdBalance > 0 || (profile.tradingBalanceBtc && profile.tradingBalanceBtc > 0)) {
      setMessage({ type: 'error', text: "You must withdraw your entire balance before deleting your account." });
      setShowDeleteModal(false);
      return;
    }

    setDeleting(true);
    try {
      let emailDocId = "";
      // Add to deletedAccounts to prevent registration/login for 30 days
      if (user.email) {
        emailDocId = user.email.toLowerCase().replace(/[@.]/g, '_');
        const deletedRef = doc(db, "deletedAccounts", emailDocId);
        await setDoc(deletedRef, {
          email: user.email,
          deletedAt: new Date().toISOString()
        });
      }

      // 1. Prepare batch for full account database deletion
      const batch = writeBatch(db);
      
      // Collections where userId matches
      const collectionsToCleanup = ['transactions', 'investments', 'kyc_submissions', 'notifications'];
      
      // Fetch and add to batch
      for (const colName of collectionsToCleanup) {
        try {
          const q = query(collection(db, colName), where("userId", "==", user.uid));
          const snap = await getDocs(q);
          snap.forEach((d) => batch.delete(d.ref));
        } catch (colErr) {
          console.warn(`Error queueing cleanup for ${colName}:`, colErr);
        }
      }
      
      // Cleanup subcollections (devices)
      try {
        const devicesSnap = await getDocs(collection(db, "users", user.uid, "devices"));
        devicesSnap.forEach((d) => batch.delete(d.ref));
      } catch (devErr) {
        console.warn(`Error queueing cleanup for devices:`, devErr);
      }
      
      // Delete user document from Firestore (cache it first to restore if Firebase Auth fails)
      const cachedProfile = { ...profile };
      batch.delete(doc(db, "users", user.uid));
      
      // 2. Commit the full cleanup batch
      await batch.commit();
      
      try {
        // Delete user from Firebase Auth
        await deleteUser(user);
      } catch (authError: any) {
        // If Auth fails (e.g., requires-recent-login), restore the Firestore profile so we don't leave the app in a broken state
        await setDoc(doc(db, "users", user.uid), cachedProfile);
        if (emailDocId) {
          await deleteDoc(doc(db, "deletedAccounts", emailDocId));
        }
        throw authError; // rethrow to be caught by the outer catch
      }
      
      // Redirect to home
      window.location.replace("/");
    } catch (error: any) {
      console.error("Delete account error:", error);
      if (error.code === 'auth/requires-recent-login') {
        setMessage({ type: 'error', text: "Please sign out and sign in again before deleting your account." });
      } else {
        setMessage({ type: 'error', text: "Failed to delete account. Please contact support." });
      }
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const hasChanges = 
    displayName !== (profile?.displayName || "") ||
    phoneNumber !== (profile?.phoneNumber || "") ||
    gender !== (profile?.gender || "") ||
    photoURL !== (profile?.photoURL || "");

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-full mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A96E]/10 rounded-2xl flex items-center justify-center text-[#C9A96E]">
          <User size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
          <p className="text-gray-400">Manage your personal information and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-8 text-center relative overflow-hidden group">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 bg-[#C9A96E]/10 border-2 border-[#C9A96E]/30 rounded-full flex items-center justify-center text-[#C9A96E] text-4xl font-bold overflow-hidden">
                {uploading ? (
                  <div className="animate-pulse">...</div>
                ) : photoURL ? (
                  <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.displayName?.charAt(0) || "U"
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-[#C9A96E] text-[#0B0B0B] rounded-full shadow-lg cursor-pointer hover:bg-[#D4B985] transition-all">
                <Camera size={16} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>
            <h3 className="text-xl font-bold text-white truncate">{profile?.displayName}</h3>
            <p className="text-sm text-gray-500 mb-6 truncate">{profile?.email}</p>
            
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#C9A96E]/5 rounded-xl border border-[#C9A96E]/10">
              <ShieldCheck size={16} className="text-[#C9A96E]" />
              <span className="text-xs font-bold text-[#C9A96E] uppercase tracking-widest">
                {profile?.kycStatus?.replace('_', ' ')}
              </span>
            </div>
            
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#C9A96E]/5 rounded-full blur-2xl group-hover:bg-[#C9A96E]/10 transition-all duration-500"></div>
          </div>

          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Preferences</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {theme === 'light' ? <Sun size={14} className="text-gray-500" /> : <Moon size={14} className="text-gray-500" />}
                  <span className="text-xs text-gray-500">Theme Mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-3 py-1 bg-[#C9A96E]/10 text-[#C9A96E] text-[10px] font-bold rounded-full border border-[#C9A96E]/20 hover:bg-[#C9A96E]/20 transition-all uppercase tracking-widest"
                >
                  {theme === 'light' ? "Light" : "Dark"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Account Info</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Role</span>
                <span className="text-xs font-bold text-white capitalize">{profile?.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Member Since</span>
                <span className="text-xs font-bold text-white">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "---"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">User ID</span>
                <span className="text-[10px] font-mono text-gray-500">{profile?.friendlyId || user?.uid.substring(0, 12)}...</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Security</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-gray-500" />
                  <span className="text-xs text-gray-500">2FA Status</span>
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full",
                  profile?.twoFactorEnabled ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                )}>
                  {profile?.twoFactorEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <Link 
                to="/2fa/setup" 
                className="w-full py-2 bg-[#C9A96E]/10 text-[#C9A96E] text-xs font-bold rounded-lg border border-[#C9A96E]/20 hover:bg-[#C9A96E]/20 transition-all flex items-center justify-center gap-2"
              >
                <ShieldAlert size={14} />
                Manage 2FA
              </Link>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8">
            <h3 className="text-xl font-bold text-white mb-8">Personal Information</h3>
            
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400">Sex / Gender</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-[#C9A96E]/40 transition-all appearance-none"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 opacity-60">
                  <label className="text-sm font-bold text-gray-400">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="email"
                      value={profile?.email || ""}
                      readOnly
                      className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 pl-12 pr-4 text-gray-500 outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2 opacity-90">
                  <label className="text-sm font-bold text-gray-400">Assigned Bitcoin Wallet Address (Read-only)</label>
                  <div className="relative">
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A96E]/50" size={18} />
                    <input
                      type="text"
                      value={profile?.btcAddress || "Loading Assigned Address..."}
                      readOnly
                      className="w-full bg-slate-950 border border-[#C9A96E]/10 rounded-xl py-3 pl-12 pr-12 text-[#C9A96E] font-mono text-sm outline-none cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A96E] hover:text-[#D4B985] transition-colors p-1"
                      title="Copy Address"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">This is your permanently assigned Bitcoin address for instant global deposits and withdrawals.</p>
                </div>
              </div>

              {message && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-4 rounded-xl flex items-center gap-3 text-sm font-medium",
                    message.type === 'success' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                  )}
                >
                  <AlertCircle size={18} />
                  {message.text}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={updating || !hasChanges}
                className="w-full bg-[#C9A96E] text-[#0B0B0B] font-bold py-4 rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {updating ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Price Alerts Section */}
      <PriceAlertsCard />

      {/* Trusted Devices Section */}
      <div id="security-section" className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8">
        <DeviceManagement />
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-900 border border-[#C9A96E]/10 rounded-2xl p-6 lg:p-8">
        <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2">
          <Clock size={20} className="text-[#C9A96E]" />
          Recent Activity
        </h3>

        {loadingActivities ? (
          <div className="text-center py-12 text-gray-500">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No recent activity.</div>
        ) : (
          <div className="space-y-4">
            {activities.map((act, index) => {
              let icon = <Clock size={20} />;
              let title = "Activity";
              let desc = "";
              let statusColor = "text-gray-500";
              let bdColor = "border-gray-500/20";
              const timeStr = act.timestamp ? new Date(act.timestamp).toLocaleString() : "Unknown date";
              
              if (act.type === 'transaction') {
                icon = act.txType === 'deposit' ? <ArrowDownCircle size={20} className="text-green-500" /> : <ArrowUpCircle size={20} className="text-red-500" />;
                title = act.txType === 'deposit' ? "Deposit" : "Withdrawal";
                desc = `${act.amountBtc ? act.amountBtc.toFixed(6) : '0'} BTC`;
                statusColor = act.status === 'confirmed' ? "text-green-500" : act.status === 'pending' ? "text-yellow-500" : "text-red-500";
                bdColor = act.txType === 'deposit' ? "border-green-500/20" : "border-red-500/20";
              } else if (act.type === 'investment') {
                icon = <TrendingUp size={20} className="text-[#C9A96E]" />;
                title = `Investment: ${act.planName}`;
                desc = `${act.amountBtc ? act.amountBtc.toFixed(6) : "0"} BTC`;
                statusColor = act.status === 'active' ? "text-blue-500" : "text-green-500";
                bdColor = "border-[#C9A96E]/20";
              } else if (act.type === 'kyc') {
                icon = <ShieldQuestion size={20} className="text-blue-500" />;
                title = "KYC Registration";
                desc = `${act.documentType || 'ID'} Submission`;
                if (act.status === 'rejected' && act.rejectionReason) {
                  desc += `: ${act.rejectionReason}`;
                }
                statusColor = act.status === 'verified' ? "text-green-500" : act.status === 'pending' ? "text-yellow-500" : "text-red-500";
                bdColor = "border-blue-500/20";
              }

              return (
                <div key={act.id || index} className={`p-4 bg-slate-950 border ${bdColor} rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
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
                    <span className={cn("text-xs font-bold uppercase tracking-wider", statusColor)}>
                      {act.status}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Danger Zone Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delete Account Section */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
              <Trash2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Delete Account</h3>
              <p className="text-sm text-gray-400 mb-6">
                Permanently delete your account and all associated data. You must have a zero balance to proceed.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 text-center">Are you absolutely sure?</h3>
            <p className="text-gray-400 mb-8 text-center">
              This action cannot be undone. This will permanently delete your account and remove your data from our servers.
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-xl border border-white/10 hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? "Deleting..." : "Yes, delete account"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
