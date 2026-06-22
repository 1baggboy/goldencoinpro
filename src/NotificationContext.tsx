import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  arrayUnion
} from "firebase/firestore";
import { db, auth, getMessagingInstance } from "./firebase";
import { useAuth } from "./AuthContext";
import { handleFirestoreError, OperationType } from "./lib/firestoreErrorHandler";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  timestamp: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (userId: string, title: string, message: string, type: Notification["type"]) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fcmGranted: NotificationPermission | "unsupported";
  requestPushPermission: () => Promise<NotificationPermission | "unsupported">;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [fcmGranted, setFcmGranted] = useState<NotificationPermission | "unsupported">("default");

  // Keep track of shown notification IDs in the current session to avoid duplicate alerts
  const shownAlertsRef = useRef<Set<string>>(new Set());

  // Safe client FCM initialization
  const initFcm = useCallback(async (currentUserId: string) => {
    try {
      const messaging = await getMessagingInstance();
      if (!messaging) {
        console.log("[FCM] Messaging is not supported on this device/browser.");
        return;
      }

      const { getToken, onMessage } = await import("firebase/messaging");
      
      // Register service worker explicitly
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
        scope: "/"
      });
      console.log("[FCM] Service worker registered:", registration);

      // Get FCM registration token
      let token = "";
      try {
        token = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: "BFm2YCOFWhwWvJj-A-X7wP8_D_jA_qK0e-b7Q70T0gG5_t_mFmY1_B_pB_" // Generic initialization
        });
      } catch (tokenErr) {
        console.log("[FCM] getToken with VAPID key failed, trying without...", tokenErr);
        token = await getToken(messaging, { serviceWorkerRegistration: registration });
      }

      if (token) {
        console.log("[FCM] Obtained device registration token:", token);
        await updateDoc(doc(db, "users", currentUserId), {
          fcmTokens: arrayUnion(token)
        });
        console.log("[FCM] Device registration token synchronized in user profile.");
      }

      // Handle foreground notifications
      onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground notification payload received:", payload);
        if (payload.notification) {
          triggerNativeNotification(payload.notification.title || "Notification", payload.notification.body || "");
        }
      });
    } catch (err) {
      console.warn("[FCM] Service worker or token registration warning (expected in sandboxes):", err);
    }
  }, []);

  // Browser standard push notification display
  const triggerNativeNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/favicon.ico"
        });
      } catch (err) {
        console.warn("Natively showing browser notification failed:", err);
      }
    }
  };

  // Check state on mount & user changes
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setFcmGranted(Notification.permission);
      if (user && Notification.permission === "granted") {
        initFcm(user.uid);
      }
    } else {
      setFcmGranted("unsupported");
    }
  }, [user, initFcm]);

  const requestPushPermission = async (): Promise<NotificationPermission | "unsupported"> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setFcmGranted("unsupported");
      return "unsupported";
    }
    try {
      const permission = await Notification.requestPermission();
      setFcmGranted(permission);
      if (permission === "granted" && user) {
        await initFcm(user.uid);
      }
      return permission;
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return "default";
    }
  };

  useEffect(() => {
    if (!user || !auth.currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      shownAlertsRef.current.clear();
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Notification[];
      
      // Filter changes to detect incoming successful deposits and withdrawals in real-time
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data() as any;
          const notificationId = change.doc.id;
          
          if (!shownAlertsRef.current.has(notificationId)) {
            // Check if notification is recent (created within the last 60 seconds)
            const isRecent = (Date.now() - new Date(data.timestamp || Date.now()).getTime()) < 60000;
            if (
              isRecent && 
              data.userId === user.uid && 
              (data.type === "success" || 
               data.title?.toLowerCase().includes("deposit") || 
               data.title?.toLowerCase().includes("withdrawal") ||
               data.title?.toLowerCase().includes("approved"))
            ) {
              shownAlertsRef.current.add(notificationId);
              // Fire standard real-time browser notification in client (great for dev/local preview tests!)
              triggerNativeNotification(data.title || "Transaction Update 🎉", data.message || "");
            }
          }
        }
      });

      setNotifications(fetchedNotifications);
      setUnreadCount(fetchedNotifications.filter((n) => !n.read).length);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "notifications"));

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      const promises = unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true }));
      await Promise.all(promises);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const addNotification = async (userId: string, title: string, message: string, type: Notification["type"]) => {
    try {
      await addDoc(collection(db, "notifications"), {
        userId,
        title,
        message,
        type,
        read: false,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      addNotification, 
      deleteNotification,
      fcmGranted,
      requestPushPermission
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
