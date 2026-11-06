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
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ChatMessage, ChatSession } from './types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Fallback in-memory/localStorage user representation if anonymous authentication is restricted in Firebase console
function getFallbackUser(): { uid: string } {
  const STORAGE_KEY = 'newton_local_fallback_uid_v1';
  let uid = '';
  try {
    uid = localStorage.getItem(STORAGE_KEY) || '';
    if (!uid) {
      uid = 'anon_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, uid);
    }
  } catch (e) {
    uid = 'anon_local_' + Date.now();
  }
  return { uid };
}

let authPromise: Promise<{ uid: string }> | null = null;

/**
 * Ensures user identity completes before performing any database read/write.
 * Attempts signInAnonymously; if disabled/restricted (auth/admin-restricted-operation),
 * falls back gracefully to a persistent local user identity and warns without breaking the app.
 */
export function waitForAuth(): Promise<{ uid: string }> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authPromise) {
    authPromise = new Promise<{ uid: string }>((resolve) => {
      let isSettled = false;
      const unsubscribe = onAuthStateChanged(
        auth,
        async (user) => {
          if (user) {
            if (!isSettled) {
              isSettled = true;
              unsubscribe();
              resolve(user);
            }
          } else {
            try {
              const cred = await signInAnonymously(auth);
              if (!isSettled) {
                isSettled = true;
                unsubscribe();
                resolve(cred.user);
              }
            } catch (err: unknown) {
              const firebaseErr = err as { code?: string; message?: string };
              // auth/admin-restricted-operation occurs when Anonymous sign-in provider is disabled in Firebase console
              if (firebaseErr?.code === 'auth/admin-restricted-operation' || firebaseErr?.code === 'auth/operation-not-allowed') {
                console.info('Firebase anonymous sign-in is not enabled in the project console. Using local device session.');
              } else {
                console.warn('Authentication warning, continuing with local profile:', firebaseErr?.message || err);
              }
              if (!isSettled) {
                isSettled = true;
                unsubscribe();
                resolve(getFallbackUser());
              }
            }
          }
        },
        (error) => {
          console.warn('onAuthStateChanged error, using local fallback:', error);
          if (!isSettled) {
            isSettled = true;
            unsubscribe();
            resolve(getFallbackUser());
          }
        }
      );
    });
  }
  return authPromise;
}

// Kick off auth on script load without unhandled promise rejections
waitForAuth().catch(() => {});

function getLocalSessionsKey(uid: string): string {
  return `newton_chat_sessions_v2_${uid}`;
}

function getLocalMessagesKey(uid: string, sessionId: string): string {
  return `newton_messages_v2_${uid}_${sessionId}`;
}

export async function saveSessionToStorage(session: ChatSession): Promise<void> {
  const user = await waitForAuth();
  const uid = user.uid;
  const sessionWithUser: ChatSession = {
    ...session,
    userId: uid,
  };

  // Local storage scoped to this user
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

export async function fetchAllSessions(): Promise<ChatSession[]> {
  try {
    const user = await waitForAuth();
    const uid = user.uid;

    const q = query(collection(db, 'users', uid, 'sessions'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const results: ChatSession[] = [];
      snap.forEach(d => {
        results.push(d.data() as ChatSession);
      });
      localStorage.setItem(getLocalSessionsKey(uid), JSON.stringify(results));
      return results;
    }

    const raw = localStorage.getItem(getLocalSessionsKey(uid));
    if (raw) return JSON.parse(raw);
    return [];
  } catch (err) {
    console.warn('Firestore fetch sessions error, checking local cache:', err);
    try {
      const user = auth.currentUser;
      if (user) {
        const raw = localStorage.getItem(getLocalSessionsKey(user.uid));
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
    return [];
  }
}

export async function saveMessageToStorage(sessionId: string, message: ChatMessage): Promise<void> {
  const user = await waitForAuth();
  const uid = user.uid;

  // Sanitize message for storage: never store huge raw base64 payloads in Firestore (1 MB limit)
  const storageMessage: ChatMessage = { ...message };
  if (storageMessage.imageUrl && storageMessage.imageUrl.startsWith('data:image')) {
    delete storageMessage.imageUrl;
    storageMessage.imageNote = 'Imagen adjunta: ejercicio escaneado';
  }
  if (storageMessage.diagramUrl && storageMessage.diagramUrl.startsWith('data:image')) {
    delete storageMessage.diagramUrl;
  }
  delete storageMessage.diagramLoading;

  // Local storage scoped to this user and session
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

export async function fetchMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
  try {
    const user = await waitForAuth();
    const uid = user.uid;

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
      localStorage.setItem(getLocalMessagesKey(uid, sessionId), JSON.stringify(results));
      return results;
    }

    const raw = localStorage.getItem(getLocalMessagesKey(uid, sessionId));
    if (raw) return JSON.parse(raw);
    return [];
  } catch (err) {
    console.warn('Firestore fetch messages error:', err);
    try {
      const user = auth.currentUser;
      if (user) {
        const raw = localStorage.getItem(getLocalMessagesKey(user.uid, sessionId));
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Local storage read error:', e);
    }
    return [];
  }
}

export async function deleteSessionFromStorage(sessionId: string): Promise<void> {
  let uid = '';
  try {
    const user = await waitForAuth();
    uid = user.uid;
  } catch (e) {
    uid = auth.currentUser?.uid || '';
  }

  if (uid) {
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
      // Delete all messages in the subcollection first
      const messagesRef = collection(db, 'users', uid, 'sessions', sessionId, 'messages');
      const msgsSnap = await getDocs(messagesRef);
      const batch = writeBatch(db);
      msgsSnap.forEach((msgDoc) => {
        batch.delete(msgDoc.ref);
      });
      // Delete the session doc
      const sessionDocRef = doc(db, 'users', uid, 'sessions', sessionId);
      batch.delete(sessionDocRef);
      await batch.commit();
    } catch (err) {
      console.warn('Firestore delete session and subcollections error:', err);
    }
  }
}
