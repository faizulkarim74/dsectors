// ─────────────────────────────────────────────────────────────
// Minimal stateless admin auth: an HMAC-signed session cookie.
// No external session store needed — the signature proves validity.
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';

const COOKIE_NAME = 'cms_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error('AUTH_SECRET is missing or too short (set a long random string).');
  }
  return s;
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url');
}

/** Constant-time string compare. */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Verify the admin password against ADMIN_PASSWORD. */
export function checkPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error('ADMIN_PASSWORD is not set.');
  return safeEqual(password || '', expected);
}

/** Create a signed session token. */
export function createToken() {
  const payload = { iat: Date.now(), exp: Date.now() + MAX_AGE * 1000 };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Validate a token string; returns true if signature + expiry are OK. */
export function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  if (!safeEqual(sig, sign(payloadB64))) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  });
  return out;
}

/** True if the request carries a valid admin session cookie. */
export function isAuthed(req) {
  const token = parseCookies(req)[COOKIE_NAME];
  return verifyToken(token);
}

/** Set the session cookie on the response. */
export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${MAX_AGE}`
  );
}

/** Clear the session cookie. */
export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`
  );
}

/** Guard helper: returns true if authed, otherwise writes 401 and returns false. */
export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'Unauthorized' });
  return false;
}
