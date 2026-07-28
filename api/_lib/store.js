// ─────────────────────────────────────────────────────────────
// Redis-backed data store (Upstash, via Vercel Marketplace).
// Holds two things:
//   - the site CONTENT document (a single JSON blob), key: "cms:content"
//   - the LEADS list (append-only),                  key: "cms:leads"
// ─────────────────────────────────────────────────────────────
import { Redis } from '@upstash/redis';

const CONTENT_KEY = 'cms:content';
const LEADS_KEY = 'cms:leads';

let _redis = null;

/** Lazily build a Redis client from whichever env-var pair is present. */
function redis() {
  if (_redis) return _redis;
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Redis is not configured. Set KV_REST_API_URL/KV_REST_API_TOKEN ' +
        '(or the UPSTASH_REDIS_REST_* pair) in your environment.'
    );
  }
  _redis = new Redis({ url, token });
  return _redis;
}

/** Default content document used the first time the CMS runs. */
export function emptyContent() {
  return {
    version: 1,
    updatedAt: null,
    nodes: {},     // { "<data-cms key>": { text?, html?, src?, href?, style?{} } }
    sections: {},  // { "<data-cms-section key>": { animation:{type,duration,delay,easing} } }
    theme: {}      // reserved for future global overrides
  };
}

/** Read the whole content document (returns a default if none saved yet). */
export async function getContent() {
  const raw = await redis().get(CONTENT_KEY);
  if (!raw) return emptyContent();
  // Upstash may return an already-parsed object or a JSON string.
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return emptyContent();
    }
  }
  return raw;
}

/** Persist the whole content document. */
export async function saveContent(doc) {
  const toSave = {
    ...emptyContent(),
    ...doc,
    version: 1,
    updatedAt: new Date().toISOString()
  };
  await redis().set(CONTENT_KEY, JSON.stringify(toSave));
  return toSave;
}

/** Append a lead to the front of the list. Returns the stored lead. */
export async function addLead(lead) {
  const record = {
    id:
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    read: false,
    ...lead
  };
  await redis().lpush(LEADS_KEY, JSON.stringify(record));
  return record;
}

/** List leads (newest first). */
export async function listLeads(limit = 500) {
  const rows = await redis().lrange(LEADS_KEY, 0, limit - 1);
  return rows
    .map((r) => {
      if (typeof r === 'string') {
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      }
      return r;
    })
    .filter(Boolean);
}
