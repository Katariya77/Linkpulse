import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as Record<string, string | undefined>)[key]) {
      return (import.meta.env as Record<string, string | undefined>)[key] || '';
    }
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key] || '';
    }
  } catch {}
  return '';
};

const isValidValue = (val: unknown): val is string => {
  return typeof val === 'string' && val.trim().length > 3 && val.trim() !== '.' && !val.includes('MY_FIREBASE');
};

const resolveConfigValue = (appletVal: string | undefined, envKey: string, fallback: string = ''): string => {
  if (isValidValue(appletVal)) return appletVal;
  const envVal = getEnvVar(envKey);
  if (isValidValue(envVal)) return envVal;
  return fallback;
};

export const firebaseConfig = {
  apiKey: resolveConfigValue(appletConfig.apiKey, 'VITE_FIREBASE_API_KEY'),
  authDomain: resolveConfigValue(appletConfig.authDomain, 'VITE_FIREBASE_AUTH_DOMAIN', 'namefinderji.firebaseapp.com'),
  projectId: resolveConfigValue(appletConfig.projectId, 'VITE_FIREBASE_PROJECT_ID', 'namefinderji'),
  storageBucket: resolveConfigValue(appletConfig.storageBucket, 'VITE_FIREBASE_STORAGE_BUCKET', 'namefinderji.firebasestorage.app'),
  messagingSenderId: resolveConfigValue(appletConfig.messagingSenderId, 'VITE_FIREBASE_MESSAGING_SENDER_ID', '395072875400'),
  appId: resolveConfigValue(appletConfig.appId, 'VITE_FIREBASE_APP_ID', '1:395072875400:web:05b3ab8f0e6610c23a283d'),
  firestoreDatabaseId: resolveConfigValue(appletConfig.firestoreDatabaseId, 'VITE_FIREBASE_FIRESTORE_DATABASE_ID', 'linkpulse-db'),
};

export const isFirebaseConfigured = Boolean(
  isValidValue(firebaseConfig.apiKey) && 
  isValidValue(firebaseConfig.projectId)
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // Initialize Firestore with configured databaseId ('linkpulse-db')
    try {
      if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }
    } catch {
      db = getFirestore(app);
    }

    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.warn('Firebase initialization error:', error);
  }
}

// Connectivity test as recommended by Firebase integration guidelines
if (typeof window !== 'undefined' && db) {
  (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (err: any) {
      if (err instanceof Error && err.message.includes('the client is offline')) {
        console.warn('Firebase connection notice: client is offline or initializing.');
      }
    }
  })();
}

export { app, auth, db, googleProvider };

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId: 'google' | 'password' | 'demo';
}

const LOCAL_STORAGE_USER_KEY = 'linkpulse_auth_user';

const safeStorage = {
  get: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  set: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch {}
  },
  remove: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

export async function loginWithGoogle(): Promise<AuthSessionUser> {
  if (isFirebaseConfigured && auth && googleProvider) {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const sessionUser: AuthSessionUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Google User',
        photoURL: user.photoURL,
        providerId: 'google',
      };
      safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      throw new Error(error.message || 'Google sign-in failed');
    }
  }

  // Simulated fallback for sandbox preview if Firebase credentials are not yet injected
  await new Promise((resolve) => setTimeout(resolve, 600));
  const demoUser: AuthSessionUser = {
    uid: `google_user_${Date.now()}`,
    email: 'alex.rivera@gmail.com',
    displayName: 'Alex Rivera',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    providerId: 'google',
  };
  safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  return demoUser;
}

export async function loginWithEmail(email: string, pass: string): Promise<AuthSessionUser> {
  if (!email || !pass) {
    throw new Error('Please enter both email and password.');
  }

  if (isFirebaseConfigured && auth) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      const sessionUser: AuthSessionUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        photoURL: user.photoURL,
        providerId: 'password',
      };
      safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    } catch (error: any) {
      console.error('Email sign-in failed:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        throw new Error('Invalid email or password.');
      }
      if (error.code === 'auth/user-not-found') {
        throw new Error('No user found with this email address.');
      }
      throw new Error(error.message || 'Failed to sign in.');
    }
  }

  // Simulated fallback when credentials are not yet configured
  await new Promise((resolve) => setTimeout(resolve, 500));
  const sessionUser: AuthSessionUser = {
    uid: `email_user_${Date.now()}`,
    email,
    displayName: email.split('@')[0],
    photoURL: null,
    providerId: 'password',
  };
  safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function registerWithEmail(email: string, pass: string, username?: string): Promise<AuthSessionUser> {
  if (!email || !pass) {
    throw new Error('Please provide email and password.');
  }
  if (pass.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  if (isFirebaseConfigured && auth) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      const user = result.user;
      if (username) {
        await updateProfile(user, { displayName: username });
      }
      const sessionUser: AuthSessionUser = {
        uid: user.uid,
        email: user.email,
        displayName: username || user.displayName || email.split('@')[0],
        photoURL: user.photoURL,
        providerId: 'password',
      };
      safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(sessionUser));
      return sessionUser;
    } catch (error: any) {
      console.error('Email registration failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('An account with this email already exists.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      }
      throw new Error(error.message || 'Registration failed.');
    }
  }

  // Simulated fallback when credentials are not yet configured
  await new Promise((resolve) => setTimeout(resolve, 500));
  const sessionUser: AuthSessionUser = {
    uid: `email_user_${Date.now()}`,
    email,
    displayName: username || email.split('@')[0],
    photoURL: null,
    providerId: 'password',
  };
  safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured && auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Firebase signOut failed:', e);
    }
  }
  safeStorage.remove(LOCAL_STORAGE_USER_KEY);
}

export function getStoredUser(): AuthSessionUser | null {
  try {
    const raw = safeStorage.get(LOCAL_STORAGE_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function subscribeToAuth(callback: (user: AuthSessionUser | null) => void): () => void {
  if (isFirebaseConfigured && auth) {
    const unsubscribe = onAuthStateChanged(auth, (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const user: AuthSessionUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          photoURL: fbUser.photoURL,
          providerId: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password',
        };
        safeStorage.set(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
        callback(user);
      } else {
        safeStorage.remove(LOCAL_STORAGE_USER_KEY);
        callback(null);
      }
    });
    return unsubscribe;
  }

  // Check stored user if offline
  const stored = getStoredUser();
  callback(stored);
  return () => {};
}
