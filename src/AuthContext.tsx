import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { APP_CONFIG } from "./config";
import { generateReferralCode } from "./lib/utils";
import { generateBitcoinWallet } from "./lib/bitcoinUtils";
import { trackLocalUser } from "./lib/localUsersTracker";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  usdBalance: number; // Main account balance in USD
  btcBalance: number; // BTC balance
  tradingBalanceBtc: number; // Trading balance in BTC
  totalDepositedUsd: number; // Total deposited in USD
  totalDeposited: number; // Total deposited in BTC (legacy field name used in logic)
  kycStatus: "not_submitted" | "pending" | "verified" | "rejected";
  kycRejectionReason?: string;
  createdAt: string;
  status: "active" | "restricted" | "suspended" | "inactive";
  isSuspended?: boolean;
  twoFactorEnabled?: boolean;
  photoURL?: string;
  phoneNumber?: string;
  gender?: string;
  btcAddress?: string;
  referralCode: string;
  referredBy?: string;
  referralBonusEarned: number;
  hasTraded?: boolean;
  isOnline?: boolean;
  lastLogin?: string;
  lastSeen?: string;
  friendlyId?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isRestricted: boolean;
  logout: () => Promise<void>;
  dbQuotaExhausted: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isRestricted: false,
  logout: async () => {},
  dbQuotaExhausted: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbQuotaExhausted, setDbQuotaExhausted] = useState(() => {
    try {
      const stored = localStorage.getItem('db_quota_exhausted');
      const time = localStorage.getItem('db_quota_exhausted_time');
      if (stored === 'true' && time) {
        const diff = Date.now() - parseInt(time, 10);
        if (diff < 12 * 60 * 60 * 1000) {
          return true;
        } else {
          localStorage.removeItem('db_quota_exhausted');
          localStorage.removeItem('db_quota_exhausted_time');
        }
      }
    } catch (e) {
      console.warn("localStorage check failed:", e);
    }
    return false;
  });

  useEffect(() => {
    const handleQuotaExhausted = () => {
      setDbQuotaExhausted(true);
      try {
        localStorage.setItem('db_quota_exhausted', 'true');
        localStorage.setItem('db_quota_exhausted_time', Date.now().toString());
      } catch {}
    };
    window.addEventListener('db-quota-exhausted', handleQuotaExhausted);
    return () => window.removeEventListener('db-quota-exhausted', handleQuotaExhausted);
  }, []);
  
  const logoutRef = useRef<(() => Promise<void>) | null>(null);

  const logout = useCallback(async () => {
    try {
      // Set the signing out flag immediately to block dashboard redirection loops
      try {
        sessionStorage.setItem('goldencoin_signing_out', 'true');
      } catch (e) {}

      if (auth.currentUser && !dbQuotaExhausted) {
        try {
          // Do not await this so it cannot under any circumstances hang the main signout flow block!
          updateDoc(doc(db, "users", auth.currentUser.uid), { isOnline: false }).catch(err => {
            console.warn("Could not handle isOnline on logout:", err);
          });
        } catch (err) {
          console.warn("Could not handle isOnline on logout:", err);
        }
      }

      // Clear quota indicators and cached profile storage
      try {
        localStorage.removeItem('db_quota_exhausted');
        localStorage.removeItem('db_quota_exhausted_time');
        
        // Remove all profile cached keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('cached_profile_') || key.startsWith('goldencoin_device_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}

      // Try signOut with a 1000ms timeout race to prevent hanging
      try {
        await Promise.race([
          auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000))
        ]);
      } catch (e) {
        console.warn("Firebase signOut timed out or failed, forcing client-side session deletion:", e);
        // Force database deletion for firebase auth client session if signOut failed/timed out
        try {
          if (window.indexedDB) {
            window.indexedDB.deleteDatabase("firebaseLocalStorageDb");
          }
        } catch (dbErr) {
          console.warn("Failed to delete firebase IndexedDB:", dbErr);
        }
      }

      // Clear states as well
      setUser(null);
      setProfile(null);
      
      // Navigate cleanly
      window.location.replace('/login');
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace('/login');
    }
  }, [dbQuotaExhausted]);

  logoutRef.current = logout;

  // Track inactivity (20 minutes)
  useEffect(() => {
    if (!user) return;
    let idleTimeout: ReturnType<typeof setTimeout>;

    const resetIdleTimeout = () => {
      clearTimeout(idleTimeout);
      // 20 minutes = 1200000 ms
      idleTimeout = setTimeout(() => {
        if (logoutRef.current) {
          console.log("Auto logging out due to inactivity");
          logoutRef.current();
        }
      }, 1200000);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => document.addEventListener(e, resetIdleTimeout));

    resetIdleTimeout();

    return () => {
      clearTimeout(idleTimeout);
      events.forEach(e => document.removeEventListener(e, resetIdleTimeout));
    };
  }, [user]);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous profile listener if any
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (firebaseUser && !firebaseUser.isAnonymous) {
        setUser(firebaseUser);
        
        // Instant load from localStorage cache to prevent visual delays/flicker
        const cached = localStorage.getItem('cached_profile_' + firebaseUser.uid);
        if (cached) {
          try {
            setProfile(JSON.parse(cached));
          } catch (e) {
            console.warn("Failed parsing cached profile:", e);
          }
        }

        if (!dbQuotaExhausted) {
          updateDoc(doc(db, "users", firebaseUser.uid), { isOnline: true }).catch(err => {
            console.warn("Could not set isOnline (user document might not exist yet):", err);
          });
        }
        
        // Refresh token in background without blocking
        firebaseUser.getIdToken(true).then(() => {
          console.log("Token refreshed successfully");
        }).catch(e => {
          if (e.code === 'auth/network-request-failed') {
            console.warn("Token refresh failed due to network. This is expected if connectivity is spotty.");
          } else {
            console.error("Failed to refresh token:", e);
          }
        });

        const profileRef = doc(db, "users", firebaseUser.uid);
        console.log("Attaching onSnapshot for:", firebaseUser.uid);
        
        let retryCount = 0;
        const maxRetries = 3;
        
        const startSnapshot = (isRetry = false) => {
          const unsub = onSnapshot(profileRef, (docSnap) => {
            if (docSnap.exists()) {
              console.log("Profile snapshot received:", docSnap.data());
              const data = docSnap.data() as UserProfile;
              
              // Persist up-to-date profile in localStorage cache
              localStorage.setItem('cached_profile_' + firebaseUser.uid, JSON.stringify(data));
              trackLocalUser(data);
              
              // Fix missing referral code immediately
              if (!data.referralCode) {
                const newCode = generateReferralCode();
                console.log("Generating missing referral code for user:", firebaseUser.uid, newCode);
                if (!dbQuotaExhausted) {
                  updateDoc(profileRef, { referralCode: newCode }).catch(err => {
                    console.error("Failed to update missing referral code:", err);
                  });
                }
                // Update local state temporarily to avoid flicker if possible
                setProfile({ ...data, referralCode: newCode });
              } else {
                setProfile(data);
              }

              // Set up BTC wallet if missing
              if (!data.btcAddress && firebaseUser.email && !dbQuotaExhausted) {
                 const instantWallet = generateBitcoinWallet();
                 updateDoc(profileRef, { btcAddress: instantWallet.address }).catch(e => console.error("Update missing wallet address failed:", e));
                 setDoc(doc(db, "users", firebaseUser.uid, "privateData", "wallet"), {
                   btcPrivateKey: instantWallet.privateKey,
                   address: instantWallet.address,
                   createdAt: new Date().toISOString()
                 }).catch(e => console.error("Update missing private key failed:", e));
                 setProfile(prev => prev ? { ...prev, btcAddress: instantWallet.address } : prev);
              }
            } else {
              console.log("Profile snapshot: document does not exist for", firebaseUser.uid);
              // Try loading from localStorage cache as dynamic fallback first
              const cached = localStorage.getItem('cached_profile_' + firebaseUser.uid);
              if (cached) {
                try {
                  const cachedData = JSON.parse(cached) as UserProfile;
                  console.log("Found cached profile for user-document-not-yet-created. Using fallback:", cachedData);
                  setProfile(cachedData);
                } catch (e) {
                  console.warn("Failed parsing cached profile on fallback:", e);
                  setProfile(null);
                }
              } else {
                // If there's absolutely no cache either, let's auto-generate a fallback profile so registration/login succeeds
                console.log("No cached profile found. Generating an elegant, dynamic fallback profile on-the-fly!");
                const friendlyId = firebaseUser.email ? firebaseUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '.') : firebaseUser.uid.substring(0, 8);
                const isAdminEmail = firebaseUser.email ? APP_CONFIG.adminEmails.includes(firebaseUser.email) : false;
                const instantWallet = generateBitcoinWallet();
                const fallbackProfile: UserProfile = {
                  uid: firebaseUser.uid,
                  friendlyId: friendlyId,
                  email: firebaseUser.email || "",
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Trader",
                  role: isAdminEmail ? "admin" : "user",
                  usdBalance: 0,
                  btcBalance: 0,
                  tradingBalanceBtc: 0,
                  btcAddress: instantWallet.address,
                  totalDepositedUsd: 0,
                  totalDeposited: 0,
                  referralCode: generateReferralCode(),
                  referralBonusEarned: 0,
                  kycStatus: "not_submitted",
                  status: "active",
                  createdAt: new Date().toISOString()
                };
                
                // Cache it
                localStorage.setItem('cached_profile_' + firebaseUser.uid, JSON.stringify(fallbackProfile));
                trackLocalUser(fallbackProfile);
                setProfile(fallbackProfile);
                
                // Try to persist it to firestore, ignoring errors gracefully (such as quota constraints)
                if (!dbQuotaExhausted) {
                  setDoc(profileRef, fallbackProfile, { merge: true }).catch(err => {
                    console.warn("Attempt to dynamically write fallback profile to Firestore failed: ", err);
                  });
                  
                  setDoc(doc(db, "users", firebaseUser.uid, "privateData", "wallet"), {
                    btcPrivateKey: instantWallet.privateKey,
                    address: instantWallet.address,
                    createdAt: new Date().toISOString()
                  }).catch(err => {
                    console.warn("Attempt to dynamically write fallback wallet data failed: ", err);
                  });
                }
              }
            }
            setLoading(false);
          }, (error) => {
            if (error.code === 'permission-denied' && retryCount < maxRetries) {
              retryCount++;
              console.warn(`Profile snapshot permission denied for ${firebaseUser.uid}, retrying in 2s... (Attempt ${retryCount}/${maxRetries})`);
              setTimeout(() => {
                if (unsubProfile) {
                  unsubProfile();
                }
                unsubProfile = startSnapshot(true);
              }, 2000);
            } else {
              console.error("Profile snapshot error for", firebaseUser.uid, ":", error.message, error.code);
              if (error.code === 'resource-exhausted' || (error.message && error.message.toLowerCase().includes('quota'))) {
                setDbQuotaExhausted(true);
              }
              setLoading(false);
            }
          });
          return unsub;
        };

        unsubProfile = startSnapshot();
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // Periodic heartbeat to update isOnline and lastSeen every 5 minutes (reduced from 15s to conserve Firestore daily quota)
  useEffect(() => {
    if (!user || dbQuotaExhausted) return;
    
    const updateHeartbeat = async () => {
      if (dbQuotaExhausted) return;
      try {
        await updateDoc(doc(db, "users", user.uid), {
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
      } catch (err: any) {
        if (err?.code === 'resource-exhausted' || (err?.message && err.message.toLowerCase().includes('quota'))) {
          setDbQuotaExhausted(true);
        }
        console.warn("Heartbeat update omitted (doc may be missing during creation):", err);
      }
    };
    
    // First immediate run
    updateHeartbeat();
    
    const interval = setInterval(updateHeartbeat, 300000);
    
    return () => {
      clearInterval(interval);
      if (!dbQuotaExhausted) {
        // Try to set isOnline to false when logging out/unmounting
        updateDoc(doc(db, "users", user.uid), {
          isOnline: false
        }).catch(() => {});
      }
    };
  }, [user, dbQuotaExhausted]);

  const isAdmin = profile?.role === "admin" || (user?.email ? APP_CONFIG.adminEmails.includes(user.email) : false);
  const isRestricted = profile?.status === "restricted";

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isRestricted, logout, dbQuotaExhausted }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
