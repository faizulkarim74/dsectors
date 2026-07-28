// GET  /api/leads → admin only, list captured leads
// POST /api/leads → public, capture a lead (stores in DB + emails a notification)
import { addLead, listLeads } from './_lib/store.js';
import { requireAuth } from './_lib/auth.js';
import { Resend } from 'resend';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function notify(lead) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  const from = process.env.LEAD_FROM_EMAIL || 'onboarding@resend.dev';
  if (!key || !to) return { sent: false, reason: 'email not configured' };

  const resend = new Resend(key);
  const rows = Object.entries(lead)
    .filter(([k]) => !['id', 'read', 'createdAt'].includes(k))
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#5c716b;text-transform:capitalize">${escapeHtml(
          k
        )}</td><td style="padding:6px 12px;color:#0a1917"><strong>${escapeHtml(v)}</strong></td></tr>`
    )
    .join('');

  await resend.emails.send({
    from,
    to,
    subject: `New website lead — ${lead.name || lead.email || 'Unknown'}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px">
        <h2 style="color:#1f6e6b;margin:0 0 4px">New contact lead</h2>
        <p style="color:#5c716b;margin:0 0 16px">Captured from the Dsectors website.</p>
        <table style="border-collapse:collapse;width:100%;background:#f4f9f7;border-radius:8px">${rows}</table>
        <p style="color:#7c8d88;font-size:12px;margin-top:16px">Received ${escapeHtml(
          lead.createdAt
        )}</p>
      </div>`
  });
  return { sent: true };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      const leads = await listLeads();
      return res.status(200).json({ leads });
    }

    if (req.method === 'POST') {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

      const name = (body.name || '').toString().trim().slice(0, 200);
      const email = (body.email || '').toString().trim().slice(0, 200);
      const message = (body.message || '').toString().trim().slice(0, 5000);

      if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email and message are required.' });
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const lead = await addLead({
        name,
        email,
        message,
        organisation: (body.organisation || body.org || '').toString().trim().slice(0, 200),
        phone: (body.phone || '').toString().trim().slice(0, 60),
        inquiryType: (body.inquiryType || '').toString().trim().slice(0, 120),
        service: (body.service || '').toString().trim().slice(0, 200),
        source: (body.source || 'website').toString().slice(0, 80)
      });

      // Email is best-effort — never fail the capture if the mailer errors.
      let email_status = { sent: false };
      try {
        email_status = await notify(lead);
      } catch (e) {
        email_status = { sent: false, reason: e.message };
      }

      return res.status(200).json({ ok: true, id: lead.id, email: email_status });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
