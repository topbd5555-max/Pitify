// Google Sheets webhook helper
const WEBHOOK_URL = process.env.SHEET_WEBHOOK_URL;
const SECRET = process.env.SHEET_SECRET;

async function callSheet(payload) {
  if (!WEBHOOK_URL) {
    console.warn('⚠️ SHEET_WEBHOOK_URL not configured - skipping Google Sheets sync');
    return { ok: false, error: 'Webhook not configured' };
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, secret: SECRET }),
    });
    return await res.json();
  } catch (err) {
    console.error('Sheet webhook error:', err.message);
    return { ok: false, error: err.message };
  }
}

export async function addUserToSheet(user) {
  return callSheet({
    action: 'add',
    name: user.name,
    email: user.email,
    password: user.password,
    created_at: user.created_at,
  });
}

export async function findUserInSheet(email) {
  return callSheet({ action: 'find', email });
}

export async function pingSheet() {
  return callSheet({ action: 'count' });
}