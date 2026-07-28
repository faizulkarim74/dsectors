// GET  /api/content  → public, returns the content document (site reads this)
// POST /api/content  → admin only, saves the content document
import { getContent, saveContent } from './_lib/store.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const doc = await getContent();
      // Public + cacheable briefly at the edge; the runtime also cache-busts.
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(doc);
    }

    if (req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid content payload' });
      }
      const saved = await saveContent({
        nodes: body.nodes || {},
        sections: body.sections || {},
        theme: body.theme || {}
      });
      return res.status(200).json({ ok: true, updatedAt: saved.updatedAt });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
