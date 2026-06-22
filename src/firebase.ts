import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer, initializeFirestore } from "firebase/firestore";
import { getMessaging, isSupported } from "firebase/messaging";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const getMessagingInstance = async () => {
  try {
    if (typeof window !== "undefined" && await isSupported()) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn("FCM messaging is not supported in this browser environment:", err);
  }
  return null;
};

// Use initializeFirestore with experimentalForceLongPolling to prevent iframe WebSocket timeouts
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Firebase is offline. Check your network or configuration.");
    }
  }
}
testConnection();

export default app;
