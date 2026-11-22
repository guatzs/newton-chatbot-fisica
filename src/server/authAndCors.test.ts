import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type express from 'express';
import {
  buildAllowedOrigins,
  createRequireAuth,
  extractBearerToken,
  getRateLimitKey,
  isOriginAllowed,
} from './authAndCors';

function createMockRes() {
  const state: { statusCode: number; body: any } = { statusCode: 200, body: null };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: any) {
      state.body = payload;
      return res;
    },
  } as unknown as express.Response;
  return { res, state };
}

describe('extractBearerToken', () => {
  it('extracts valid Bearer tokens and rejects malformed headers', () => {
    assert.equal(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
    assert.equal(extractBearerToken('bearer token123'), 'token123');
    assert.equal(extractBearerToken(undefined), null);
    assert.equal(extractBearerToken(''), null);
    assert.equal(extractBearerToken('Basic dXNlcjpwYXNz'), null);
    assert.equal(extractBearerToken('Bearer '), null);
    assert.equal(extractBearerToken('Bearer a b'), null);
  });
});

describe('CORS allowlist (buildAllowedOrigins & isOriginAllowed)', () => {
  it('allows localhost dev origins and configured production APP_URL / ALLOWED_ORIGINS', () => {
    const allowed = buildAllowedOrigins({
      APP_URL: 'https://newton-ucsur.run.app/app',
      ALLOWED_ORIGINS: 'https://fisica.ucsur.edu.pe, https://staging.ucsur.edu.pe/',
    });

    assert.equal(isOriginAllowed('http://localhost:3000', 'localhost:3000', allowed), true);
    assert.equal(isOriginAllowed('http://127.0.0.1:3000', '127.0.0.1:3000', allowed), true);
    assert.equal(isOriginAllowed('https://newton-ucsur.run.app', 'other.host', allowed), true);
    assert.equal(isOriginAllowed('https://fisica.ucsur.edu.pe', 'other.host', allowed), true);
    assert.equal(isOriginAllowed('https://staging.ucsur.edu.pe', 'other.host', allowed), true);
  });

  it('allows exact same-host origin and blocks unauthorized third-party origins', () => {
    const allowed = buildAllowedOrigins({});

    assert.equal(
      isOriginAllowed(
        'https://ais-pre-demo.us-east1.run.app',
        'ais-pre-demo.us-east1.run.app',
        allowed
      ),
      true
    );
    assert.equal(
      isOriginAllowed('https://evil-site.example', 'ais-pre-demo.us-east1.run.app', allowed),
      false
    );
    assert.equal(isOriginAllowed('javascript:alert(1)', 'localhost:3000', allowed), false);
    assert.equal(isOriginAllowed(undefined, 'localhost:3000', allowed), true);
  });
});

describe('createRequireAuth middleware', () => {
  it('skips auth for /health and OPTIONS requests', async () => {
    let verifyCalled = false;
    const middleware = createRequireAuth(async () => {
      verifyCalled = true;
      return { uid: 'u1' };
    });

    let nextCalled = false;
    const { res } = createMockRes();
    await middleware(
      { path: '/health', method: 'GET', headers: {} } as express.Request,
      res,
      () => {
        nextCalled = true;
      }
    );
    assert.equal(nextCalled, true);
    assert.equal(verifyCalled, false);

    nextCalled = false;
    await middleware(
      { path: '/chat', method: 'OPTIONS', headers: {} } as express.Request,
      res,
      () => {
        nextCalled = true;
      }
    );
    assert.equal(nextCalled, true);
    assert.equal(verifyCalled, false);
  });

  it('returns 401 when Authorization header is missing or invalid', async () => {
    const middleware = createRequireAuth(async () => ({ uid: 'u1' }));
    const { res, state } = createMockRes();
    let nextCalled = false;

    await middleware(
      { path: '/chat', method: 'POST', headers: {} } as express.Request,
      res,
      () => {
        nextCalled = true;
      }
    );
    assert.equal(nextCalled, false);
    assert.equal(state.statusCode, 401);
    assert.ok(typeof state.body?.error === 'string' && state.body.error.length > 0);
  });

  it('returns 401 when Firebase token verification throws', async () => {
    const middleware = createRequireAuth(async () => {
      throw new Error('auth/id-token-expired');
    });
    const { res, state } = createMockRes();
    let nextCalled = false;

    await middleware(
      {
        path: '/vision',
        method: 'POST',
        originalUrl: '/api/vision',
        headers: { authorization: 'Bearer expired-token' },
      } as express.Request,
      res,
      () => {
        nextCalled = true;
      }
    );

    assert.equal(nextCalled, false);
    assert.equal(state.statusCode, 401);
    assert.ok(state.body?.error.includes('expirado'));
  });

  it('attaches verified uid (both Google and anonymous) and calls next()', async () => {
    const middleware = createRequireAuth(async (token) => {
      assert.equal(token, 'valid-anon-token');
      return { uid: 'anon-uid-42' };
    });
    const req = {
      path: '/transcribe',
      method: 'POST',
      headers: { authorization: 'Bearer valid-anon-token' },
    } as express.Request;
    const { res, state } = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(state.statusCode, 200);
    assert.equal(req.uid, 'anon-uid-42');
  });
});

describe('getRateLimitKey', () => {
  it('prioritizes verified req.uid over x-session-id and IP', () => {
    const keyWithUid = getRateLimitKey({
      uid: 'firebase-uid-123',
      headers: { 'x-session-id': 'session-12345678' },
      ip: '192.168.1.10',
    } as unknown as express.Request);
    assert.equal(keyWithUid, 'uid:firebase-uid-123');

    const keyWithSession = getRateLimitKey({
      headers: { 'x-session-id': 'session-12345678' },
      ip: '192.168.1.10',
    } as unknown as express.Request);
    assert.equal(keyWithSession, 'sid:session-12345678');

    const keyWithIp = getRateLimitKey({
      headers: {},
      ip: '192.168.1.10',
    } as unknown as express.Request);
    assert.equal(keyWithIp, '192.168.1.10');
  });
});
