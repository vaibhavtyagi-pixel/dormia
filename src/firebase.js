import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const fallbackConfig = {
  apiKey: 'AIzaSyAigItEvgwInqercfTaU8-RBf0pHWg22qY',
  authDomain: 'dormia-946e0.firebaseapp.com',
  projectId: 'dormia-946e0',
  storageBucket: 'dormia-946e0.firebasestorage.app',
  messagingSenderId: '754627144922',
  appId: '1:754627144922:web:d53786af6acef2c0a109e3',
  databaseURL: 'https://dormia-946e0-default-rtdb.firebaseio.com',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || fallbackConfig.databaseURL,
};

if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn(
    'Firebase env vars missing in runtime. Using fallback web config; set VITE_FIREBASE_* in Vercel for explicit configuration.'
  );
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

