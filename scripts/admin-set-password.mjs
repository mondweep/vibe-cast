// One-off admin utility: set a user's password directly via the Supabase Admin
// API (service_role key), bypassing the email-based recovery flow and its rate
// limit. Run by the project owner only.
//
// Usage:
//   node scripts/admin-set-password.mjs <email> '<new-password>'
//   # or keep the password out of shell history via an env var:
//   NEW_PASSWORD='...' node scripts/admin-set-password.mjs <email>
//
// Reads SUPABASE_URL + a service key from .env (never logs either, never logs
// the password). The service key must be the modern sb_secret_... key.
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
const newPassword = process.argv[3] || process.env.NEW_PASSWORD;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!url) fail('SUPABASE_URL is not set in .env');
if (!serviceKey) fail('No service key in .env (SUPABASE_SECRET_KEY / SUPABASE_SERVICE_KEY / SUPABASE_SERVICE_ROLE_KEY)');
if (!serviceKey.startsWith('sb_secret_'))
  console.warn('! Warning: the service key does not look like a modern sb_secret_ key; legacy JWT keys are disabled on this project.');
if (!email) fail('Provide the user email: node scripts/admin-set-password.mjs <email> <new-password>');
if (!newPassword || newPassword.length < 8) fail('Provide a new password of at least 8 characters (arg 2 or NEW_PASSWORD env)');

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Find the user by email (page through the admin user list).
async function findUserByEmail(target) {
  const wanted = target.toLowerCase();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => (u.email || '').toLowerCase() === wanted);
    if (match) return match;
    if (data.users.length < 200) break; // last page
  }
  return null;
}

const user = await findUserByEmail(email);
if (!user) fail(`No user found with email ${email}`);

const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
  password: newPassword,
});
if (updErr) fail(`Failed to update password: ${updErr.message}`);

console.log(`✓ Password updated for ${email} (id ${user.id}). You can now sign in with the new password — no email needed.`);
