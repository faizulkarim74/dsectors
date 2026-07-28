import { isAuthed } from './_lib/auth.js';

// Lightweight check the admin UI calls on load to know if it's logged in.
export default async function handler(req, res) {
  return res.status(200).json({ authed: isAuthed(req) });
}
