import type { SyncOutboxRow, DispatchResult } from '../types';

const RESEND_URL = 'https://api.resend.com/emails';

export async function dispatchResend(row: SyncOutboxRow): Promise<DispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: 0, ok: false, response_data: null,
      error_message: 'RESEND_API_KEY not set' };
  }

  const p = row.payload as {
    to?: string; from?: string; subject?: string;
    text?: string; html?: string | null;
  };
  if (!p.to || !p.subject || (!p.text && !p.html)) {
    return { status: 0, ok: false, response_data: null,
      error_message: 'resend payload missing to/subject/body' };
  }

  const body: Record<string, unknown> = {
    from: p.from ?? 'BLH HR <hr@beatricelovingheart.com>',
    to: [p.to],
    subject: p.subject,
    text: p.text ?? undefined,
    html: p.html ?? undefined,
  };

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return {
      status: res.status, ok: res.ok, response_data: parsed,
      error_message: res.ok ? null
        : `resend ${res.status}: ${parsed?.message ?? text.slice(0, 200)}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, ok: false, response_data: null, error_message: msg };
  }
}
