import { initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, initializeFirestore, onSnapshot, persistentLocalCache, serverTimestamp, setDoc } from 'firebase/firestore'

export type CloudUser = { uid: string; email: string | null }
export type CloudRecord = Record<string, unknown>

const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

export const cloudEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)

const app = cloudEnabled ? initializeApp(firebaseConfig) : null
const auth = app ? getAuth(app) : null
// Persistent cache queues writes made offline and replays them when the connection returns.
const db = app ? initializeFirestore(app, { localCache: persistentLocalCache() }) : null

const requireAuth = () => { if (!auth) throw new Error('Cloud sync is not configured'); return auth }
const requireDb = () => { if (!db) throw new Error('Cloud sync is not configured'); return db }

export const watchUser = (callback: (user: CloudUser | null) => void) => {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, (user) => callback(user ? { uid: user.uid, email: user.email } : null))
}
export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(requireAuth(), email, password)
export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(requireAuth(), email, password)
export const sendReset = (email: string) => sendPasswordResetEmail(requireAuth(), email)
export const signOutUser = () => signOut(requireAuth())

export const watchProgress = (
  uid: string,
  onChange: (data: CloudRecord | null, meta: { pending: boolean; fromCache: boolean }) => void,
  onError: (error: unknown) => void,
) => onSnapshot(
  doc(requireDb(), 'users', uid),
  { includeMetadataChanges: true },
  (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null, { pending: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache }),
  onError,
)

// A full replace (no merge) so deleted exercises and days disappear from the cloud copy too.
export const saveProgress = (uid: string, data: CloudRecord) => setDoc(doc(requireDb(), 'users', uid), { ...data, updatedAt: serverTimestamp() })

export const describeAuthError = (error: unknown) => {
  const code = (error as { code?: string } | null)?.code ?? ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'Email or password is incorrect.'
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in.'
    case 'auth/weak-password': return 'Choose a password with at least 6 characters.'
    case 'auth/invalid-email': return 'Enter a valid email address.'
    case 'auth/missing-password': return 'Enter your password.'
    case 'auth/too-many-requests': return 'Too many attempts. Wait a moment and try again.'
    case 'auth/network-request-failed': return 'Cannot reach the server. Check your connection.'
    case 'auth/operation-not-allowed': return 'Email sign-in is not enabled for this Firebase project.'
    default: return 'Something went wrong. Please try again.'
  }
}
