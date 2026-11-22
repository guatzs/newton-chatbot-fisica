import { getFirebaseIdToken } from '../firebase';

const SESSION_STORAGE_KEY = 'newton_session_id';

let fallbackMemorySessionId: string | null = null;

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122-style UUID v4 when crypto.randomUUID is unavailable
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getClientSessionId(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (existing && existing.trim().length >= 8) {
        return existing.trim();
      }
      const created = generateUuid();
      window.localStorage.setItem(SESSION_STORAGE_KEY, created);
      return created;
    }
  } catch {
    // Ignore storage access errors (e.g. private browsing restrictions)
  }

  if (!fallbackMemorySessionId) {
    fallbackMemorySessionId = generateUuid();
  }
  return fallbackMemorySessionId;
}

export function getApiHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-session-id': getClientSessionId(),
    ...(extraHeaders || {}),
  };
}

export async function getAuthApiHeaders(
  extraHeaders?: Record<string, string>,
  forceRefresh = false
): Promise<Record<string, string>> {
  const token = await getFirebaseIdToken(forceRefresh);
  return {
    ...getApiHeaders(extraHeaders),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
