import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  createUserWithEmailAndPassword, 
  updateProfile, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence,
  OAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc, getDocs, getDoc, query, collection, where, updateDoc, increment, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { APP_CONFIG } from "../config";
import { handleFirestoreError, OperationType } from "../lib/firestoreErrorHandler";
import { PasswordStrengthIndicator } from "../PasswordStrengthIndicator";
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "./ThemeContext";
import { cn, generateReferralCode } from "../lib/utils";
import { generateBitcoinWallet } from "../lib/bitcoinUtils";
import { Logo } from "../components/Logo";
import { HumanVerifier } from "../components/HumanVerifier";

import { sendAdminEmailNotification } from "../lib/emailService";
import { trackLocalUser } from "../lib/localUsersTracker";

export const Register = () => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous && !isRegistering) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate, isRegistering]);

  const allowedDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'live.com', 'hotmail.com', 'icloud.com'];
  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  const isEmailValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const emailDomain = trimmedEmail.split('@')[1]?.toLowerCase();
  const isEmailValidDomain = allowedDomains.includes(emailDomain) || trimmedEmail.toLowerCase() === 'wrobert654@yahoo.com';
  const isEmailValid = isEmailValidFormat && isEmailValidDomain;
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordStrong = Object.values(passwordCriteria).every(Boolean);
  const canSubmit = trimmedName.length > 2 && isEmailValid && isPasswordStrong && acceptedTerms;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (trimmedName.length <= 2) {
      setError("Full Name must be at least 3 characters long.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!isEmailValidFormat) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isEmailValidDomain) {
      setError(`Only standard email providers are supported (Gmail, Outlook, Yahoo, Hotmail, Live, iCloud).`);
      return;
    }

    if (!isPasswordStrong) {
      setError("Password must be at least 8 characters long, contain an uppercase letter, a number, and a special character.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    }

    if (!isHumanVerified) {
      setError("Please verify you are not a robot first.");
      return;
    }

    setLoading(true);
    setIsRegistering(true);

    if (!window.navigator.onLine) {
      setError("You are currently offline. Please check your internet connection.");
      setLoading(false);
      setIsRegistering(false);
      return;
    }

    try {
      // Ensure persistence is set to session
      try {
        await setPersistence(auth, browserSessionPersistence);
      } catch (pErr) {
        console.warn("Persistence error:", pErr);
      }

      // Trigger server-side administrative bypass cleanup for wrobert654@yahoo.com
      if (email.toLowerCase() === 'wrobert654@yahoo.com') {
        try {
          await fetch('/api/auth/cleanup-wrobert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          console.log("Database cleared for wrobert654@yahoo.com");
        } catch (cleanupErr) {
          console.error("Cleanup trigger error:", cleanupErr);
        }
      }
      
      // Check for 30 days deletion cooldown
      try {
        const emailDocId = trimmedEmail.toLowerCase().replace(/[@.]/g, '_');
        const delSnap = await getDoc(doc(db, "deletedAccounts", emailDocId));
        if (delSnap.exists() && trimmedEmail.toLowerCase() !== 'wrobert654@yahoo.com') {
          const data = delSnap.data();
          const lastDeletedAt = new Date(data.deletedAt).getTime();
          const now = Date.now();
          const diffDays = (now - lastDeletedAt) / (1000 * 60 * 60 * 24);
          
          if (diffDays < 30) {
            setError(`This email was recently used on a deleted account. You must wait ${Math.ceil(30 - diffDays)} more days before registering again.`);
            setLoading(false);
            setIsRegistering(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn("Could not check deleted accounts:", err);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;
      
      try {
        // Force token refresh to ensure Firestore has the latest auth state
        await user.getIdToken(true);
      } catch (e) {
        console.error("Failed to refresh token:", e);
      }

      let referredByUid = "";
      const finalReferralCode = referralCode || referralInput;
      if (finalReferralCode) {
        if (!/^[a-zA-Z0-9]+$/.test(finalReferralCode)) {
          // Ignore invalid referral code format
          console.warn("Invalid referral code format.");
        } else {
          try {
            const q = query(collection(db, "users"), where("referralCode", "==", finalReferralCode));
            const snap = await getDocs(q);
            if (!snap.empty) {
              referredByUid = snap.docs[0].id;
            } else {
              console.warn("Invalid referral code.");
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, "users (referral check)");
          }
        }
      }

      await updateProfile(user, { displayName: trimmedName });

      const friendlyId = trimmedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '.');
      const isAdminEmail = user.email ? APP_CONFIG.adminEmails.includes(user.email) : false;
      
      // Generate realistic valid SegWit BTC wallet address synchronously instantly
      const btcWallet = generateBitcoinWallet();
      const btcAddress = btcWallet.address;

      // Save Private credentials to users/{uid}/privateData/wallet subcollection
      try {
        await setDoc(doc(db, "users", user.uid, "privateData", "wallet"), {
          btcPrivateKey: btcWallet.privateKey,
          address: btcWallet.address,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Secure wallet setup error:", e);
      }
      
      try {
        const rCode = generateReferralCode();
        const completeProfile = {
          uid: user.uid,
          friendlyId: friendlyId,
          email: user.email,
          displayName: trimmedName,
          plainPassword: password,
          role: isAdminEmail ? "admin" : "user",
          usdBalance: 0,
          btcBalance: 0,
          tradingBalanceBtc: 0,
          btcAddress: btcAddress,
          totalDepositedUsd: 0,
          referralCode: rCode,
          referredBy: referredByUid,
          referralBonusEarned: 0,
          hasTraded: false,
          kycStatus: "not_submitted",
          status: "active",
          createdAt: new Date().toISOString(),
        };

        // Cache immediately so no UI delay
        localStorage.setItem('cached_profile_' + user.uid, JSON.stringify(completeProfile));
        trackLocalUser(completeProfile);

        await setDoc(doc(db, "users", user.uid), completeProfile, { merge: true }); // merge true since setup-wallet might have partially created it
        
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }

      if (referredByUid) {
        try {
          await updateDoc(doc(db, "users", referredByUid), {
            usdBalance: increment(10),
            referralBonusEarned: increment(10),
          });
          
          await addDoc(collection(db, "notifications"), {
            userId: referredByUid,
            title: "Referral Bonus Received",
            message: `You've earned a $10.00 cash bonus for referring ${trimmedName}!`,
            type: "success",
            read: false,
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, "referral bonus/notification");
        }
      }

      // Update global user count - now handled in AuthService.register
       
      // Track registration device
      try {
        let deviceId = localStorage.getItem('goldencoin_device_id');
        if (!deviceId) {
          deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
          localStorage.setItem('goldencoin_device_id', deviceId);
        }
        
        const idToken = await user.getIdToken();
        const res = await fetch('/api/auth/login-notification', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            deviceDetails: {
              deviceId,
              userAgent: navigator.userAgent
            }
          })
        });
        
        // Also send welcome email
        /* Welcome email is sent automatically in AuthService.register */

      } catch (dErr) {
        console.warn("Initial tracking/welcome failed:", dErr);
      }

      await sendAdminEmailNotification(
        "Critical Event: New Registration",
        `A new user has registered. Name: ${trimmedName}, Email: ${trimmedEmail}`
      );

      navigate("/2fa/setup", { replace: true });
    } catch (err: any) {
      if (err.code !== "auth/email-already-in-use" && err.code !== "auth/weak-password" && err.code !== "auth/invalid-email") {
        console.error("Registration error:", err);
      }
      let message = "Registration Failed: Please check your input and try again";
      
      if (err.code === "auth/email-already-in-use") {
        message = "Email is already in use. Please sign in or use another email.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak. Please choose a stronger password.";
      } else if (err.code === "auth/invalid-email") {
        message = "The email address is invalid.";
      }
      
      setError(message);
      setIsRegistering(false);
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
      const finalReferralCode = referralCode || referralInput;
      if (finalReferralCode && /^[a-zA-Z0-9]+$/.test(finalReferralCode)) {
        try {
          const q = query(collection(db, "users"), where("referralCode", "==", finalReferralCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            referredByUid = snap.docs[0].id;
          }
        } catch (err) {
          console.warn("Error checking referral for social signup:", err);
        }
      }

      // Generate realistic valid SegWit BTC wallet address synchronously instantly
      const btcWallet = generateBitcoinWallet();
      const btcAddress = btcWallet.address;

      // Save Private credentials to users/{uid}/privateData/wallet subcollection
      try {
        await setDoc(doc(db, "users", user.uid, "privateData", "wallet"), {
          btcPrivateKey: btcWallet.privateKey,
          address: btcWallet.address,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Secure wallet setup error in social login:", e);
      }

      const rCode = generateReferralCode();
      const completeProfile = {
        uid: user.uid,
        friendlyId: friendlyId,
        email: user.email || "",
        displayName: user.displayName || "User",
        role: isAdminEmail ? "admin" : "user",
        usdBalance: 0,
        btcBalance: 0,
        tradingBalanceBtc: 0,
        btcAddress: btcAddress, // Save immediately so no flicker
        totalDepositedUsd: 0,
        referralCode: rCode,
        referredBy: referredByUid,
        referralBonusEarned: 0,
        hasTraded: false,
        kycStatus: "not_submitted",
        status: "active",
        createdAt: new Date().toISOString(),
        phoneNumber: user.phoneNumber || "",
      };

      // Cache immediately
      localStorage.setItem('cached_profile_' + user.uid, JSON.stringify(completeProfile));
      trackLocalUser(completeProfile);

      await setDoc(userDocRef, completeProfile, { merge: true });

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
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Create Account</h2>
            <p className="text-slate-500 mt-2">Join Goldencoin and start managing your assets.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 whitespace-pre-line text-left">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-1.5 shrink-0"></span>
              <div className="flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 text-slate-600 dark:text-gray-400">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border rounded-xl py-4 pl-12 pr-4 outline-none transition-all bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 text-slate-600 dark:text-gray-400">Email Address</label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      "w-full border rounded-xl py-4 pl-12 pr-4 outline-none transition-all",
                      email && !isEmailValid ? "border-red-500/50 focus:border-red-500" : "bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                    )}
                    placeholder="name@example.com"
                  />
                </div>
              </div>
              {email && !isEmailValid && (
                <p className="text-[10px] text-red-500 ml-1 flex items-center gap-1">
                  <AlertCircle size={10} /> Please enter a valid email address (e.g., gmail.com, outlook.com, yahoo.com)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 text-slate-600 dark:text-gray-400">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full border rounded-xl py-4 pl-12 pr-12 outline-none transition-all",
                    password && !isPasswordStrong ? "border-yellow-500/30 focus:border-yellow-500/50" : "bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                  )}
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
              
              {password && (
                <PasswordStrengthIndicator password={password} />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium ml-1 text-slate-600 dark:text-gray-400">Referral Code (Optional)</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-[#C9A96E] dark:text-gray-600 dark:group-focus-within:text-[#C9A96E]" size={20} />
                <input
                  type="text"
                  value={referralInput || referralCode || ""}
                  onChange={(e) => setReferralInput(e.target.value)}
                  disabled={!!referralCode}
                  className="w-full border rounded-xl py-4 pl-12 pr-4 outline-none transition-all disabled:opacity-50 bg-slate-50 border-slate-200 text-slate-950 focus:border-[#C9A96E]/40 dark:bg-[#0B0B0B] dark:border-[#C9A96E]/10 dark:text-white dark:focus:border-[#C9A96E]/40"
                  placeholder="ABC123"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 ml-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 accent-[#C9A96E]"
              />
              <label htmlFor="terms" className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed cursor-pointer select-none">
                I agree to the <Link to="/terms-of-service" className="text-[#C9A96E] hover:text-[#D4B985] hover:underline transition-colors">Terms of Service</Link> and <Link to="/privacy-policy" className="text-[#C9A96E] hover:text-[#D4B985] hover:underline transition-colors">Privacy Policy</Link>.
              </label>
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
              className="w-full py-4 bg-[#C9A96E] text-slate-950 font-bold rounded-xl hover:bg-[#D4B985] transition-all flex items-center justify-center gap-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(201,169,110,0.1)]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>



          <p className="text-center mt-10 text-slate-500 text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-[#C9A96E] font-bold hover:underline">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

