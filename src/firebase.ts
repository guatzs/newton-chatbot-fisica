import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  onAuthStateChanged, 
  User, 
  Unsubscribe 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ChatMessage, ChatSession } from './types';

// Clean up legacy fallback UID from previous anonymous versions if present
try {
  localStorage.removeItem('newton_local_fallback_uid_v1');
} catch {
  // Ignore localStorage access errors
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface AuthResult {
  success: boolean;
  user?: User;
  cancelled?: boolean;
  errorMessage?: string;
}

/**
 * Initiates Google Sign-In via popup with translated Spanish errors.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return { success: true, user: cred.user };
  } catch (err: unknown) {
    const fbErr = err as { code?: string; message?: string };
    const code = fbErr?.code || '';

    // Popup closed or cancelled by user: not an error, just reset button
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return { success: false, cancelled: true };
    }

    if (code === 'auth/popup-blocked') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { success: false };
      } catch {
        return {
          success: false,
          errorMessage: 'Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.',
        };
      }
    }

    if (code === 'auth/unauthorized-domain') {
      return {
        success: false,
        errorMessage: 'Este dominio no está autorizado en Firebase. Avisa al administrador.',
      };
    }

    return {
      success: false,
      errorMessage: 'No pudimos conectar con Google. Revisa tu conexión e inténtalo de nuevo.',
    };
  }
}

/**
 * Checks if user was redirected from Google Auth.
 */
export async function checkRedirectResult(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    return res ? res.user : null;
  } catch (err: unknown) {
    console.warn('Redirect auth result warning:', err);
    return null;
  }
}

/**
 * Signs out current user from Firebase.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribes to Firebase Auth state changes.
 */
export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

function getLocalSessionsKey(uid: string): string {
  return `newton_chat_sessions_v2_${uid}`;
}

function getLocalMessagesKey(uid: string, sessionId: string): string {
  return `newton_messages_v2_${uid}_${sessionId}`;
}

/**
 * Saves session metadata to storage.
 * In guest mode (auth.currentUser == null), returns immediately without saving.
 */
export async function saveSessionToStorage(session: ChatSession): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  const sessionWithUser: ChatSession = {
    ...session,
    userId: uid,
  };

  // Local storage cache scoped to this user
  try {
    const key = getLocalSessionsKey(uid);
    const raw = localStorage.getItem(key);
    const list: ChatSession[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(s => s.id === session.id);
    if (idx >= 0) {
      list[idx] = sessionWithUser;
    } else {
      list.unshift(sessionWithUser);
    }
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage write error:', e);
  }

  // Firestore: users/{uid}/sessions/{sessionId}
  try {
    const sessionRef = doc(db, 'users', uid, 'sessions', session.id);
    await setDoc(sessionRef, {
      ...sessionWithUser,
      updatedAt: new Date().toISOString(),
      firestoreSyncedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore save session error:', err);
  }
}

/**
 * Fetches all sessions for current user.
 * In guest mode, returns an empty array immediately.
 */
export async function fetchAllSessions(): Promise<ChatSession[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const uid = user.uid;

  try {
    const q = query(collection(db, 'users', uid, 'sessions'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const results: ChatSession[] = [];
      snap.forEach(d => {
        results.push(d.data() as ChatSession);
      });
      try {
        localStorage.setItem(getLocalSessionsKey(uid), JSON.stringify(results));
      } catch {}
      return results;
    }

    const raw = localStorage.getItem(getLocalSessionsKey(uid));
    if (raw) return JSON.parse(raw);
    return [];
  } catch (err) {
    console.warn('Firestore fetch sessions error, checking local cache:', err);
    try {
      const raw = localStorage.getItem(getLocalSessionsKey(uid));
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
    return [];
  }
}

/**
 * Saves a message to storage.
 * In guest mode, returns immediately without saving.
 */
export async function saveMessageToStorage(sessionId: string, message: ChatMessage): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  const storageMessage: ChatMessage = { ...message };
  if (storageMessage.imageUrl && storageMessage.imageUrl.startsWith('data:image')) {
    delete storageMessage.imageUrl;
    storageMessage.imageNote = 'Imagen adjunta: ejercicio escaneado';
  }
  if (storageMessage.diagramUrl && storageMessage.diagramUrl.startsWith('data:image')) {
    delete storageMessage.diagramUrl;
  }
  delete storageMessage.diagramLoading;

  // Local storage cache scoped to this user and session
  try {
    const key = getLocalMessagesKey(uid, sessionId);
    const raw = localStorage.getItem(key);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    list.push(storageMessage);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('Local storage write error:', e);
  }

  // Firestore: users/{uid}/sessions/{sessionId}/messages/{messageId}
  try {
    const msgRef = doc(db, 'users', uid, 'sessions', sessionId, 'messages', message.id);
    await setDoc(msgRef, {
      ...storageMessage,
      firestoreSyncedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore save message error:', err);
  }
}

/**
 * Fetches messages for a session.
 * In guest mode, returns an empty array immediately.
 */
export async function fetchMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const uid = user.uid;

  try {
    const q = query(
      collection(db, 'users', uid, 'sessions', sessionId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const results: ChatMessage[] = [];
      snap.forEach(d => {
        results.push(d.data() as ChatMessage);
      });
      try {
        localStorage.setItem(getLocalMessagesKey(uid, sessionId), JSON.stringify(results));
      } catch {}
      return results;
    }

    const raw = localStorage.getItem(getLocalMessagesKey(uid, sessionId));
    if (raw) return JSON.parse(raw);
    return [];
  } catch (err) {
    console.warn('Firestore fetch messages error:', err);
    try {
      const raw = localStorage.getItem(getLocalMessagesKey(uid, sessionId));
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
    return [];
  }
}

/**
 * Deletes a session and its messages from storage.
 * In guest mode, returns immediately without saving.
 */
export async function deleteSessionFromStorage(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;

  try {
    const key = getLocalSessionsKey(uid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: ChatSession[] = JSON.parse(raw);
      localStorage.setItem(key, JSON.stringify(list.filter(s => s.id !== sessionId)));
    }
    localStorage.removeItem(getLocalMessagesKey(uid, sessionId));
  } catch (e) {
    console.warn(e);
  }

  try {
    const messagesRef = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
    const msgsSnap = await getDocs(messagesRef);
    const batch = writeBatch(db);
    msgsSnap.forEach((msgDoc) => {
      batch.delete(msgDoc.ref);
    });
    const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
    batch.delete(sessionDocRef);
    await batch.commit();
  } catch (err) {
    console.warn('Firestore delete session and subcollections error:', err);
  }
}
