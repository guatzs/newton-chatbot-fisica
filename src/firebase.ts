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
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from 'firebase/storage';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signInAnonymously,
  getRedirectResult, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  reload,
  User, 
  Unsubscribe 
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ChatMessage, ChatSession } from './types';
import { mergeAndSortMessages, upsertMessageInList } from './utils/messageHistory';

// Clean up legacy fallback UID from previous anonymous versions if present
try {
  localStorage.removeItem('newton_local_fallback_uid_v1');
} catch {
  // Ignore localStorage access errors
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const storage = getStorage(app);
export const auth = getAuth(app);
auth.languageCode = 'es';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export interface AuthResult {
  success: boolean;
  user?: User;
  cancelled?: boolean;
  errorMessage?: string;
}

/**
 * Translates Firebase Auth error codes into user-friendly Spanish messages.
 */
export function translateAuthError(err: unknown): string {
  const fbErr = err as { code?: string; message?: string };
  const rawCode = fbErr?.code || '';
  const code = rawCode.startsWith('auth/') ? rawCode : `auth/${rawCode}`;

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Correo o contraseña incorrectos.';
    case 'auth/invalid-email':
      return 'El correo no tiene un formato válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    case 'auth/network-request-failed':
      return 'No hay conexión. Revisa tu internet e inténtalo de nuevo.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'La contraseña es demasiado débil. Revisa los requisitos.';
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'Este método de acceso no está activado en Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'Este correo ya está asociado a otro método de acceso. Inicia sesión con ese método.';
    default:
      return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }
}

/**
 * Registers a new user with email and password, sets displayName, and sends verification email.
 */
export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {
      // Ignore profile update failure
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Ignore email verification failure; user can use Resend later
    }
    return { success: true, user: cred.user };
  } catch (err: unknown) {
    return {
      success: false,
      errorMessage: translateAuthError(err),
    };
  }
}

/**
 * Signs in an existing user with email and password.
 */
export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (err: unknown) {
    return {
      success: false,
      errorMessage: translateAuthError(err),
    };
  }
}

/**
 * Resends the email verification message to the current user.
 */
export async function resendVerificationEmail(): Promise<AuthResult> {
  if (!auth.currentUser) {
    return {
      success: false,
      errorMessage: 'No hay ninguna sesión activa.',
    };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true, user: auth.currentUser };
  } catch (err: unknown) {
    return {
      success: false,
      errorMessage: translateAuthError(err),
    };
  }
}

/**
 * Sends a password reset email. Returns success even if user is not found to avoid enumeration.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (err: unknown) {
    const fbErr = err as { code?: string };
    if (fbErr?.code === 'auth/user-not-found') {
      return { success: true };
    }
    return {
      success: false,
      errorMessage: translateAuthError(err),
    };
  }
}

/**
 * Reloads the current user and refreshes their ID token if email is verified.
 */
export async function refreshEmailVerification(): Promise<boolean> {
  if (!auth.currentUser) return false;
  await reload(auth.currentUser);
  if (auth.currentUser.emailVerified) {
    await auth.currentUser.getIdToken(true);
  }
  return auth.currentUser.emailVerified;
}

/**
 * Returns true if the user signed up with email/password and has not verified their email yet.
 */
export function needsEmailVerification(user: User | null): boolean {
  if (!user) return false;
  const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
  return hasPasswordProvider && !user.emailVerified;
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
 * Initiates a transparent Firebase anonymous session for guest users so API calls
 * include a verified Firebase ID token.
 */
export async function signInAsGuest(): Promise<AuthResult> {
  try {
    if (auth.currentUser) {
      return { success: true, user: auth.currentUser };
    }
    const cred = await signInAnonymously(auth);
    return { success: true, user: cred.user };
  } catch (err: unknown) {
    const fbErr = err as { code?: string };
    const code = fbErr?.code || '';
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
      return {
        success: false,
        errorMessage:
          'El modo invitado requiere activar "Anónimo" en Firebase Authentication, o inicia sesión con Google.',
      };
    }
    return {
      success: false,
      errorMessage: translateAuthError(err),
    };
  }
}

/**
 * Retrieves the current Firebase ID token (signing in anonymously transparently
 * if no user is currently signed in) to authorize backend /api/* requests.
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    let user = auth.currentUser;
    if (!user) {
      const cred = await signInAnonymously(auth);
      user = cred.user;
    }
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('[Auth] No se pudo obtener el token de sesión de Firebase:', err);
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

function stripUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean as T;
}

/**
 * Uploads a base64 data URL image to Firebase Storage under users/{uid}/sessions/{sessionId}/{messageId}.jpg.
 * Returns download URL, or null in guest mode or if upload fails.
 */
export async function uploadSessionImage(
  sessionId: string,
  messageId: string,
  dataUrl: string
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return null;
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl || null;

  try {
    const storagePath = `users/${user.uid}/sessions/${sessionId}/${messageId}.jpg`;
    const fileRef = ref(storage, storagePath);
    await uploadString(fileRef, dataUrl, 'data_url');
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn('Firebase Storage upload error:', err);
    return null;
  }
}

/**
 * Saves session metadata to storage.
 * In guest mode (no user or anonymous user), returns immediately without saving.
 */
export async function saveSessionToStorage(session: ChatSession): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;
  const uid = user.uid;

  const sessionWithUser: ChatSession = stripUndefinedFields({
    ...session,
    userId: uid,
  });

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
  if (!user || user.isAnonymous) return [];
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
 * Uploads data:image attachments to Firebase Storage and stores only download URLs.
 * Never writes base64 payloads or undefined fields to Firestore.
 * In guest mode, returns immediately without saving.
 */
export async function saveMessageToStorage(sessionId: string, message: ChatMessage): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;
  const uid = user.uid;

  const storageMessage: ChatMessage = { ...message };
  delete storageMessage.diagramLoading;

  if (storageMessage.imageUrl && storageMessage.imageUrl.startsWith('data:image')) {
    const uploadedUrl = await uploadSessionImage(sessionId, message.id, storageMessage.imageUrl);
    if (uploadedUrl) {
      storageMessage.imageUrl = uploadedUrl;
    } else {
      delete storageMessage.imageUrl;
      storageMessage.imageNote = 'Imagen adjunta: ejercicio escaneado';
    }
  }

  if (storageMessage.diagramUrl && storageMessage.diagramUrl.startsWith('data:image')) {
    const uploadedUrl = await uploadSessionImage(sessionId, message.id, storageMessage.diagramUrl);
    if (uploadedUrl) {
      storageMessage.diagramUrl = uploadedUrl;
      delete storageMessage.diagramError;
    } else {
      delete storageMessage.diagramUrl;
    }
  }

  const cleanMessage = stripUndefinedFields(storageMessage);

  // Local storage cache scoped to this user and session (replace by id, never duplicate)
  try {
    const key = getLocalMessagesKey(uid, sessionId);
    const raw = localStorage.getItem(key);
    const list: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const updatedList = upsertMessageInList(list, cleanMessage);
    localStorage.setItem(key, JSON.stringify(updatedList));
  } catch (e) {
    console.warn('Local storage write error:', e);
  }

  // Firestore: users/{uid}/sessions/{sessionId}/messages/{messageId}
  try {
    const msgRef = doc(db, 'users', uid, 'sessions', sessionId, 'messages', message.id);
    await setDoc(msgRef, {
      ...cleanMessage,
      firestoreSyncedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore save message error:', err);
  }
}

/**
 * Fetches messages for a session by merging localStorage and Firestore by id,
 * preferring the most complete version and ordering chronologically by createdAt
 * (preserving legacy messages without createdAt in appearance order before dated ones).
 * In guest mode, returns an empty array immediately.
 */
export async function fetchMessagesForSession(sessionId: string): Promise<ChatMessage[]> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return [];
  const uid = user.uid;

  let localMessages: ChatMessage[] = [];
  try {
    const raw = localStorage.getItem(getLocalMessagesKey(uid, sessionId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) localMessages = parsed;
    }
  } catch (e) {
    console.warn('Local storage read error:', e);
  }

  let remoteMessages: ChatMessage[] = [];
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'sessions', sessionId, 'messages'));
    snap.forEach((d) => {
      remoteMessages.push(d.data() as ChatMessage);
    });
  } catch (err) {
    console.warn('Firestore fetch messages error:', err);
  }

  const merged = mergeAndSortMessages(localMessages, remoteMessages);
  try {
    localStorage.setItem(getLocalMessagesKey(uid, sessionId), JSON.stringify(merged));
  } catch {}

  return merged;
}

/**
 * Deletes a session and its messages from storage.
 * In guest mode, returns immediately without saving.
 */
export async function deleteSessionFromStorage(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) return;
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
