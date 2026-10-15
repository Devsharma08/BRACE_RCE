import type { FirebaseApp } from 'firebase/app';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Firebase project configuration. Derived from environment variables so the
 * server can start even when Firebase is not configured (in which case the
 * auth routes will respond with 503 until the variables are set).
 *
 * Required variables for email/OTP/password-reset flows:
 *   FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_APP_ID
 */
interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  appId?: string;
  measurementId?: string;
}

const FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

const REQUIRED_CONFIG_KEYS = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;

/** True when the fields required by auth operations are present. */
export function isFirebaseConfigured(): boolean {
  return REQUIRED_CONFIG_KEYS.every((key) => Boolean(FIREBASE_CONFIG[key]));
}

/** Throws a descriptive error when the config required for auth is incomplete. */
export function assertFirebaseConfigured(): void {
  const missing = REQUIRED_CONFIG_KEYS.filter((key) => !FIREBASE_CONFIG[key]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase is not configured for email auth. Missing env vars: ${missing.join(', ')}`,
    );
  }
}

let cachedApp: FirebaseApp | undefined;
let cachedAuth: import('firebase/auth').Auth | null = null;

/**
 * Return the Firebase app, initialising it on first use. The singleton app is
 * preserved across calls so the Auth instance below is stable.
 */
export function getFirebaseApp(): FirebaseApp {
  if (!cachedApp) {
    assertFirebaseConfigured();
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    cachedApp = app;
    cachedAuth = getAuth(app);
  }
  return cachedApp;
}

/** Lazy access to the Firebase Auth instance (see getFirebaseApp). */
export function getFirebaseAuth(): import('firebase/auth').Auth {
  if (!cachedAuth) {
    getFirebaseApp();
  }
  return cachedAuth as import('firebase/auth').Auth;
}

