import type { SyncOutboxRow, DispatchResult } from '../types';

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

/**
 * Dispatch a sync_outbox row to Twilio's Messages API.
 * Used for both target_system='twilio_sms' and target_system='twilio_whatsapp'.
 * The channel kind is inferred from row.target_system.
 */
export async function dispatchTwilio(row: SyncOutboxRow): Promise<DispatchResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      status: 0, ok: false, response_data: null,
      error_message: 'Twilio creds missing (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE)',
    };
  }

  const payload = row.payload as { to?: string; body?: string };
  if (!payload.to || !payload.body) {
    return { status: 0, ok: false, response_data: null,
      error_message: 'twilio payload missing to/body' };
  }

  const isWhatsapp = row.target_system === 'twilio_whatsapp';
  const to = isWhatsapp ? `whatsapp:${normalizePhone(payload.to)}` : normalizePhone(payload.to);
  const from = isWhatsapp ? `whatsapp:${fromNumber}` : fromNumber;

  const url = `${TWILIO_BASE}/Accounts/${accountSid}/Messages.json`;
  const form = new URLSearchParams();
  form.set('To', to);
  form.set('From', from);
  form.set('Body', payload.body);

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'authorization': `Basic ${auth}`,
      },
      body: form.toString(),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return {
      status: res.status, ok: res.ok, response_data: parsed,
      error_message: res.ok ? null
        : `twilio ${res.status}: ${parsed?.message ?? text.slice(0, 200)}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, ok: false, response_data: null, error_message: msg };
  }
}

function normalizePhone(p: string): string {
  // strip everything but digits and leading +
  const trimmed = p.trim();
  if (trimmed.startsWith('+')) return '+' + trimmed.slice(1).replace(/\D/g, '');
  const digits = trimmed.replace(/\D/g, '');
  // assume US if no country code
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}
