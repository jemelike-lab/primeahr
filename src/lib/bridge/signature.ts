import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signature verification for inbound webhooks.
 * Default scheme: HMAC-SHA256 of raw body, hex-encoded, in `X-Webhook-Signature` header.
 * Per-system overrides documented inline (Checkr uses its own scheme).
 */
export function verifySignature(
  systemCode: string,
  rawBody: string,
  headers: Headers,
  secret: string | null
): { valid: boolean; reason?: string } {
  if (!secret) {
    return { valid: false, reason: 'no_secret_configured' };
  }

  switch (systemCode) {
    case 'checkr':
      return verifyCheckr(rawBody, headers, secret);
    default:
      return verifyHmacSha256(rawBody, headers, secret);
  }
}

function verifyHmacSha256(
  rawBody: string,
  headers: Headers,
  secret: string
): { valid: boolean; reason?: string } {
  const provided = headers.get('x-webhook-signature') || headers.get('x-signature');
  if (!provided) return { valid: false, reason: 'no_signature_header' };

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Strip optional "sha256=" prefix
  const cleaned = provided.startsWith('sha256=') ? provided.slice(7) : provided;

  if (cleaned.length !== expected.length) {
    return { valid: false, reason: 'signature_length_mismatch' };
  }
  try {
    const ok = timingSafeEqual(Buffer.from(cleaned, 'hex'), Buffer.from(expected, 'hex'));
    return ok ? { valid: true } : { valid: false, reason: 'signature_mismatch' };
  } catch {
    return { valid: false, reason: 'signature_compare_error' };
  }
}

/**
 * Checkr webhook signature (per Checkr docs).
 * Header: X-Checkr-Signature. Format: t=<unix>,v1=<hex>.
 * v1 = HMAC-SHA256(t + '.' + body, secret).
 * Reject events older than 5 minutes.
 */
function verifyCheckr(
  rawBody: string,
  headers: Headers,
  secret: string
): { valid: boolean; reason?: string } {
  const sigHeader = headers.get('x-checkr-signature');
  if (!sigHeader) return { valid: false, reason: 'no_checkr_signature_header' };

  const parts = Object.fromEntries(
    sigHeader.split(',').map(p => {
      const [k, v] = p.split('=');
      return [k.trim(), v?.trim() ?? ''];
    })
  );
  const ts = parts.t;
  const v1 = parts.v1;
  if (!ts || !v1) return { valid: false, reason: 'malformed_checkr_signature' };

  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10));
  if (age > 300) return { valid: false, reason: 'checkr_signature_expired' };

  const signedPayload = `${ts}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');
  if (v1.length !== expected.length) {
    return { valid: false, reason: 'checkr_signature_length_mismatch' };
  }
  try {
    const ok = timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
    return ok ? { valid: true } : { valid: false, reason: 'checkr_signature_mismatch' };
  } catch {
    return { valid: false, reason: 'checkr_signature_compare_error' };
  }
}

/**
 * Sign an outbound payload (for sync_outbox dispatcher).
 * PrimeaHR signs every outbound call with HMAC-SHA256 so receivers can verify it's us.
 */
export function signOutboundPayload(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** Verify a cron call came from Vercel cron or has the right shared secret. */
export function verifyCronAuth(req: Request, expectedSecret: string | null): boolean {
  if (!expectedSecret) return true; // dev mode: allow if no secret set
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  const provided = auth.replace(/^Bearer\s+/i, '').trim();
  if (provided.length !== expectedSecret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expectedSecret));
  } catch {
    return false;
  }
}
