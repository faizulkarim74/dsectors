// POST /api/upload  → admin only. Body: { filename, dataUrl }
// Stores the image in Vercel Blob and returns its public URL.
import { put } from '@vercel/blob';
import { requireAuth } from './_lib/auth.js';

// Note: Vercel's serverless request body cap is ~4.5MB, so a base64 image
// should be well under ~3MB of original file size. The admin UI compresses
// large images client-side before upload.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireAuth(req, res)) return;

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res
        .status(500)
        .json({ error: 'Image storage not configured (BLOB_READ_WRITE_TOKEN missing).' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { filename, dataUrl } = body;
    if (!dataUrl || !/^data:.*;base64,/.test(dataUrl)) {
      return res.status(400).json({ error: 'Expected a base64 data URL.' });
    }
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    const contentType = match[1] || 'application/octet-stream';
    const buffer = Buffer.from(match[2], 'base64');

    const safeName = (filename || 'image')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-80);
    const key = `cms/${Date.now()}-${safeName}`;

    const blob = await put(key, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true
    });

    return res.status(200).json({ ok: true, url: blob.url });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
