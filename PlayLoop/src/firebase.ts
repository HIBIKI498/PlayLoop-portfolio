import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = import.meta.env;
export const isFirebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_API_KEY !== 'replace-me'
  && env.VITE_FIREBASE_PROJECT_ID && !env.VITE_FIREBASE_PROJECT_ID.startsWith('demo-')
  && env.VITE_FIREBASE_AUTH_DOMAIN && !env.VITE_FIREBASE_AUTH_DOMAIN.endsWith('.invalid'),
);
// Dummy configuration allows the setup screen to render without credentials.
const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'replace-me',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-playloop.invalid',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-playloop',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-playloop.invalid',
  messagingSenderId: env.VITE_FIREBASE_MESSAGE_SENDER_ID || '000000000000',
  appId: env.VITE_FIREBASE_APP_ID || '1:000000000000:web:demo',
});
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
export const db = getFirestore(firebaseApp);
