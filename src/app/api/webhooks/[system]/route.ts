import { createClient } from '@supabase/supabase-js';
import { verifySignature } from '@/lib/bridge/signature';
import type { ExternalSystemRow } from '@/lib/bridge/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/webhooks/[system]
 * Public endpoint. Validates per-system signature, idempotently writes to
 * external_events, returns 200 immediately. The cron processor handles the
 * rest asynchronously.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ system: string }> }
) {
  const { system: code } = await ctx.params;
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  // Read raw body so we can verify the signature
  const rawBody = await req.text();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Look up the system
  const { data: systemRow, error: sysErr } = await admin
    .from('external_systems')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (sysErr || !systemRow) {
    return jsonResponse(
      { error: 'unknown_system', system: code, request_id: requestId },
      404
    );
  }
  const system = systemRow as ExternalSystemRow;

  if (!system.is_active) {
    return jsonResponse(
      { error: 'system_inactive', system: code, request_id: requestId },
      503
    );
  }

  // Signature verification (if configured)
  let signatureValid: boolean | null = null;
  let signatureReason: string | undefined;
  const secret = system.webhook_secret_env ? process.env[system.webhook_secret_env] ?? null : null;
  if (system.webhook_secret_env) {
    const sig = verifySignature(code, rawBody, req.headers, secret);
    signatureValid = sig.valid;
    signatureReason = sig.reason;
    if (!sig.valid) {
      return jsonResponse(
        { error: 'invalid_signature', reason: sig.reason, request_id: requestId },
        401
      );
    }
  }

  // Parse JSON
  let body: any;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return jsonResponse({ error: 'invalid_json', request_id: requestId }, 400);
  }

  // Extract event_id and event_type per system conventions
  const { externalEventId, eventType } = extractIds(code, body, req.headers);
  if (!externalEventId || !eventType) {
    return jsonResponse(
      { error: 'missing_event_id_or_type', request_id: requestId,
        hint: 'send event_id + event_type at root, or set system-appropriate headers' },
      400
    );
  }

  // Capture safe header subset (no auth)
  const safeHeaders = {
    'content-type': req.headers.get('content-type'),
    'user-agent': req.headers.get('user-agent'),
    'x-request-id': requestId,
    ...(req.headers.get('x-checkr-event') ? { 'x-checkr-event': req.headers.get('x-checkr-event') } : {}),
  };

  // Idempotent insert (UNIQUE on source_system + external_event_id)
  const { data: inserted, error: insErr } = await admin
    .from('external_events')
    .insert({
      source_system: code,
      external_event_id: externalEventId,
      event_type: eventType,
      payload: body,
      headers: safeHeaders,
      signature_valid: signatureValid,
      processing_status: 'received',
    })
    .select('id')
    .single();

  if (insErr) {
    // 23505 = unique_violation. That means we've already seen this event — fine.
    if ((insErr as { code?: string }).code === '23505') {
      return jsonResponse(
        { ok: true, deduped: true, system: code, event_id: externalEventId, request_id: requestId },
        200
      );
    }
    return jsonResponse(
      { error: 'insert_failed', message: insErr.message, request_id: requestId },
      500
    );
  }

  return jsonResponse(
    {
      ok: true,
      event_id: (inserted as { id: string }).id,
      external_event_id: externalEventId,
      event_type: eventType,
      system: code,
      signature_valid: signatureValid,
      signature_reason: signatureReason,
      request_id: requestId,
    },
    202
  );
}

function extractIds(
  systemCode: string,
  body: any,
  headers: Headers
): { externalEventId: string | null; eventType: string | null } {
  // System-specific extractors
  switch (systemCode) {
    case 'checkr':
      return {
        externalEventId: body?.id ?? body?.event_id ?? headers.get('x-checkr-event-id') ?? null,
        eventType: body?.type ?? body?.event ?? headers.get('x-checkr-event') ?? null,
      };
    default:
      return {
        externalEventId:
          body?.event_id ??
          body?.id ??
          headers.get('x-event-id') ??
          headers.get('x-webhook-id') ??
          null,
        eventType:
          body?.event_type ??
          body?.type ??
          body?.event ??
          headers.get('x-event-type') ??
          null,
      };
  }
}

function jsonResponse(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
