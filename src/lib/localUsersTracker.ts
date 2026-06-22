export interface LocalUserProfile {
  uid: string;
  id?: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  usdBalance: number;
  btcBalance: number;
  tradingBalanceBtc: number;
  totalDepositedUsd: number;
  totalDeposited: number;
  kycStatus: "not_submitted" | "pending" | "verified" | "rejected";
  createdAt: string;
  status: "active" | "restricted" | "suspended" | "inactive";
  btcAddress?: string;
  referralCode: string;
  referredBy?: string;
  referralBonusEarned: number;
  friendlyId?: string;
  plainPassword?: string;
}

const LOCAL_USERS_KEY = "local_registered_users";

/**
 * Saves a registered user's profile to the local tracker list in localStorage.
 * This is a critical fallback when Firestore write operations are blocked by quota exhaustion.
 */
export function trackLocalUser(profile: any): void {
  if (!profile || !profile.uid) return;

  try {
    const rawList = localStorage.getItem(LOCAL_USERS_KEY) || "[]";
    let list: LocalUserProfile[] = [];
    try {
      list = JSON.parse(rawList);
      if (!Array.isArray(list)) list = [];
    } catch {
      list = [];
    }

    // Check if the user is already tracked
    const existsIndex = list.findIndex(u => u.uid === profile.uid || (u.email && u.email.toLowerCase() === profile.email.toLowerCase()));
    
    const formattedProfile: LocalUserProfile = {
      uid: profile.uid,
      id: profile.uid,
      ...profile
    };

    if (existsIndex >= 0) {
      list[existsIndex] = { ...list[existsIndex], ...formattedProfile };
    } else {
      list.push(formattedProfile);
    }

    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
    console.log("[LocalUsersTracker] Tracked user successfully:", profile.email);
  } catch (error) {
    console.warn("[LocalUsersTracker] Failed to track user in localStorage:", error);
  }
}

/**
 * Merges any locally registered users in localStorage with the users collection fetched from Firestore.
 * Prioritizes Firestore records if the same userId/email exists in both.
 */
export function getMergedLocalUsers(firestoreUsers: any[]): any[] {
  try {
    const rawList = localStorage.getItem(LOCAL_USERS_KEY) || "[]";
    let localList: LocalUserProfile[] = [];
    try {
      localList = JSON.parse(rawList);
      if (!Array.isArray(localList)) localList = [];
    } catch {
      localList = [];
    }

    const merged = [...firestoreUsers];
    const firestoreUids = new Set(firestoreUsers.map(u => u.uid || u.id));
    const firestoreEmails = new Set(firestoreUsers.map(u => u.email?.toLowerCase()).filter(Boolean));

    localList.forEach(localUser => {
      const matchUid = firestoreUids.has(localUser.uid) || (localUser.id && firestoreUids.has(localUser.id));
      const matchEmail = localUser.email && firestoreEmails.has(localUser.email.toLowerCase());

      if (!matchUid && !matchEmail) {
        // This is a local register fallback user who failed to save to Firestore. Let's add them!
        merged.push({
          id: localUser.uid,
          ...localUser
        });
      }
    });

    return merged;
  } catch (error) {
    console.warn("[LocalUsersTracker] Error merging local users:", error);
    return firestoreUsers;
  }
}
