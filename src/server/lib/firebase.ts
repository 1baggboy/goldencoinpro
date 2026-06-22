import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

if (!admin.apps || !admin.apps.length) {
  let projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId && projectId.startsWith('"') && projectId.endsWith('"')) {
    projectId = projectId.slice(1, -1);
  }
  let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  if (clientEmail && clientEmail.startsWith('"') && clientEmail.endsWith('"')) {
    clientEmail = clientEmail.slice(1, -1);
  }
  // Replace escaped newlines in the private key and handle potential wrapping quotes
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    // Handle cases where the key might be wrapped in double quotes in the env string
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
    }
    privateKey = privateKey.trim();
  }

  if (projectId && clientEmail && privateKey && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    try {
      console.log(`[Firebase Admin] Initializing with Service Account for project: ${projectId}`);
      admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('[Firebase Admin] Initialized with credentials');
    } catch (error) {
      console.warn('[Firebase Admin] Initialization failed with provided credentials:', error);
    }
  } else {
    // Attempt fallback or default initialization
    console.warn('[Firebase Admin] Missing or invalid credentials. Attempting fallback...');
    try {
      try {
        const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`[Firebase Admin] Using fallback projectId from config: ${config.projectId}`);
        admin.initializeApp({ projectId: config.projectId });
      } catch (e) {
        console.log('[Firebase Admin] Falling back to default app initialization');
        admin.initializeApp();
      }
    } catch (error) {
      console.warn('[Firebase Admin] Initialization failed: Missing credentials.', error);
    }
  }
}

export let db: admin.firestore.Firestore | null = null;
export let auth: admin.auth.Auth | null = null;
export let messaging: admin.messaging.Messaging | null = null;

if (admin.apps && admin.apps.length) {
  auth = admin.auth();
  messaging = admin.messaging();
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.firestoreDatabaseId) {
        const dbId = config.firestoreDatabaseId;
        console.log(`[Firebase Admin] Initializing with named database ID: ${dbId}`);
        db = getFirestore(admin.app(), dbId);
      } else {
        console.log('[Firebase Admin] Initializing with (default) database');
        db = admin.firestore();
      }
    } else {
      console.warn('[Firebase Admin] config file not found, defaulting to (default) database');
      db = admin.firestore();
    }
  } catch (e) {
    console.error('[Firebase Admin] Error initializing database:', e);
    db = admin.firestore();
  }
}

