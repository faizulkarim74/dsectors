// POST /api/lead-update → admin only. Body: { id, read? , delete? }
// Rewrites the leads list with the change applied. Fine for hobby volumes.
import { requireAuth } from './_lib/auth.js';
import { Redis } from '@upstash/redis';

const LEADS_KEY = 'cms:leads';

function redis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return new Redis({ url, token });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAuth(req, res)) return;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'Missing lead id' });

    const r = redis();
    const rows = await r.lrange(LEADS_KEY, 0, -1);
    const parsed = rows.map((x) => (typeof x === 'string' ? JSON.parse(x) : x));

    const next = parsed
      .map((lead) => {
        if (lead.id !== id) return lead;
        if (body.delete) return null;
        return { ...lead, read: body.read !== undefined ? !!body.read : lead.read };
      })
      .filter(Boolean);

    // Replace the whole list atomically enough for single-admin use.
    const multi = r.multi();
    multi.del(LEADS_KEY);
    if (next.length) multi.rpush(LEADS_KEY, ...next.map((l) => JSON.stringify(l)));
    await multi.exec();

    return res.status(200).json({ ok: true, count: next.length });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
