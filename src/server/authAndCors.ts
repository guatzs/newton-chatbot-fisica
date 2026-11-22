import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type express from 'express';
import cors, { type CorsOptionsDelegate } from 'cors';
import { ipKeyGenerator } from 'express-rate-limit';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

declare global {
  namespace Express {
    interface Request {
      uid?: string;
      authToken?: DecodedIdToken;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

function loadFirebaseProjectId(): string {
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as { projectId?: string };
    if (parsed.projectId && parsed.projectId !== 'remixed-project-id') {
      return parsed.projectId;
    }
  } catch (err) {
    console.warn('[Auth] No se pudo leer firebase-applet-config.json:', (err as Error)?.message);
  }
  return envProjectId || '';
}

let cachedAdminAuth: ReturnType<typeof getAuth> | null = null;

/**
 * Returns a singleton firebase-admin Auth instance initialized solely with projectId.
 * Verifying ID tokens with verifyIdToken(token) (without revocation check) uses Google's
 * public keys and requires no IAM permissions, working on all Firebase projects.
 */
export function getFirebaseAdminAuth(): ReturnType<typeof getAuth> {
  if (cachedAdminAuth) return cachedAdminAuth;

  const projectId = loadFirebaseProjectId();
  if (!projectId) {
    throw new Error('No se encontró un projectId de Firebase válido para verificar tokens.');
  }

  const adminApp = getApps().length > 0 ? getApp() : initializeApp({ projectId });
  cachedAdminAuth = getAuth(adminApp);
  return cachedAdminAuth;
}

export function normalizeOrigin(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function buildAllowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const origins = new Set<string>(DEFAULT_DEV_ORIGINS);

  const singleVars = [env.APP_URL, env.SHARED_APP_URL, env.PUBLIC_APP_URL];
  for (const val of singleVars) {
    if (typeof val === 'string') {
      const normalized = normalizeOrigin(val);
      if (normalized) origins.add(normalized);
    }
  }

  if (typeof env.ALLOWED_ORIGINS === 'string' && env.ALLOWED_ORIGINS.trim()) {
    for (const part of env.ALLOWED_ORIGINS.split(',')) {
      const normalized = normalizeOrigin(part);
      if (normalized) origins.add(normalized);
    }
  }

  return origins;
}

export function isOriginAllowed(
  origin: string | undefined,
  requestHostHeader: string | undefined,
  allowedOrigins: Set<string>
): boolean {
  // Requests without Origin header (same-origin navigations, server health checks, etc.)
  if (!origin) return true;

  let parsedOrigin: URL;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return false;
  }

  if (parsedOrigin.protocol !== 'http:' && parsedOrigin.protocol !== 'https:') {
    return false;
  }

  if (allowedOrigins.has(parsedOrigin.origin)) {
    return true;
  }

  // Allow exact same-host origin (covers deployed Cloud Run & preview domains dynamically without wildcard *)
  if (requestHostHeader) {
    const primaryHost = requestHostHeader.split(',')[0]?.trim().toLowerCase();
    if (primaryHost && parsedOrigin.host.toLowerCase() === primaryHost) {
      return true;
    }
  }

  return false;
}

export class CorsOriginError extends Error {
  status = 403;
  constructor(message = 'Origen no autorizado por la política CORS.') {
    super(message);
    this.name = 'CorsOriginError';
  }
}

export function createApiCorsMiddleware(allowedOrigins: Set<string> = buildAllowedOrigins()) {
  const corsOptionsDelegate: CorsOptionsDelegate<express.Request> = (req, callback) => {
    const origin = req.header('Origin');
    const hostHeader = req.header('x-forwarded-host') || req.header('host');

    if (isOriginAllowed(origin, hostHeader, allowedOrigins)) {
      callback(null, {
        origin: origin ? true : false,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
        credentials: false,
        maxAge: 600,
      });
    } else {
      callback(new CorsOriginError('Origen no autorizado para acceder a esta API.'));
    }
  };

  return cors(corsOptionsDelegate);
}

export function extractBearerToken(authHeader: string | string[] | undefined): string | null {
  const raw = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

export type TokenVerifier = (token: string) => Promise<Pick<DecodedIdToken, 'uid'> & Partial<DecodedIdToken>>;

/**
 * Express middleware that requires a valid Firebase ID token on all /api/* routes
 * except /api/health. Accepts Google, Email/Password, and Anonymous Firebase sessions.
 */
export function createRequireAuth(verifyToken?: TokenVerifier): express.RequestHandler {
  const verifier: TokenVerifier =
    verifyToken ??
    ((token: string) => getFirebaseAdminAuth().verifyIdToken(token));

  return async (req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, '') || '/';
    if (cleanPath === '/health' || req.method === 'OPTIONS') {
      return next();
    }

    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({
        error: 'Acceso no autorizado. Inicia sesión o entra en modo invitado para usar Newton AI.',
      });
    }

    try {
      const decoded = await verifier(token);
      if (!decoded || typeof decoded.uid !== 'string' || !decoded.uid.trim()) {
        return res.status(401).json({
          error: 'No se pudo validar tu identidad. Recarga la página e inténtalo nuevamente.',
        });
      }

      req.uid = decoded.uid;
      req.authToken = decoded as DecodedIdToken;
      return next();
    } catch (err: any) {
      const code = err?.code || err?.errorInfo?.code || 'auth/invalid-token';
      console.warn(`[Auth] Token de Firebase rechazado (${code}) en ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        error: 'Tu sesión no es válida o ha expirado. Recarga la página o vuelve a iniciar sesión.',
      });
    }
  };
}

/**
 * Generates an express-rate-limit key prioritizing the verified Firebase UID,
 * falling back to x-session-id and IP address.
 */
export function getRateLimitKey(req: express.Request): string {
  if (typeof req.uid === 'string' && req.uid.trim().length > 0) {
    return `uid:${req.uid.trim()}`;
  }

  const rawSessionHeader = req.headers['x-session-id'];
  const sessionId = Array.isArray(rawSessionHeader) ? rawSessionHeader[0] : rawSessionHeader;
  if (typeof sessionId === 'string') {
    const trimmed = sessionId.trim();
    if (trimmed.length >= 8 && trimmed.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return `sid:${trimmed}`;
    }
  }

  return ipKeyGenerator(req.ip || 'unknown');
}
