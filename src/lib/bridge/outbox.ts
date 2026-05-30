import type { SyncOutboxRow, ExternalSystemRow, DispatchResult } from './types';
import { signOutboundPayload } from './signature';
import { dispatchTwilio } from './dispatchers/twilio';
import { dispatchResend } from './dispatchers/resend';

const MAX_OUTBOX_BATCH = 25;
const DEFAULT_TIMEOUT_MS = 10_000;

/** Per-system dispatchers. Anything not listed falls through to generic POST. */
const DISPATCHERS: Record<string, (row: SyncOutboxRow) => Promise<DispatchResult>> = {
  twilio_sms: dispatchTwilio,
  twilio_whatsapp: dispatchTwilio,
  resend_email: dispatchResend,
};

/**
 * Drain the sync_outbox queue. Pick rows where status='pending'|'in_flight' and
 * next_attempt_at <= now, dispatch HTTP, update status + retry/backoff.
 */
export async function drainOutbox(adminSupabase: any): Promise<{
  picked: number; sent: number; failed: number; abandoned: number;
}> {
  const now = new Date().toISOString();
  const { data: rows, error } = await adminSupabase
    .from('sync_outbox')
    .select('*')
    .in('status', ['pending', 'in_flight'])
    .lte('next_attempt_at', now)
    .order('next_attempt_at', { ascending: true })
    .limit(MAX_OUTBOX_BATCH);

  if (error) throw new Error(`outbox query failed: ${error.message}`);
  const outRows = (rows ?? []) as SyncOutboxRow[];

  // Load all referenced systems in one query
  const targetCodes = Array.from(new Set(outRows.map(r => r.target_system)));
  const { data: systems } = targetCodes.length
    ? await adminSupabase.from('external_systems').select('*').in('code', targetCodes)
    : { data: [] as ExternalSystemRow[] };
  const systemMap = new Map((systems ?? []).map((s: ExternalSystemRow) => [s.code, s]));

  let sent = 0, failed = 0, abandoned = 0;

  for (const row of outRows) {
    await adminSupabase
      .from('sync_outbox')
      .update({ status: 'in_flight', last_attempt_at: new Date().toISOString() })
      .eq('id', row.id);

    const system = systemMap.get(row.target_system) as ExternalSystemRow | undefined;
    if (!system) {
      await markFailed(adminSupabase, row, `unknown target_system: ${row.target_system}`, true);
      abandoned++;
      continue;
    }
    if (!system.is_active) {
      await adminSupabase
        .from('sync_outbox')
        .update({
          status: 'pending',
          next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
          error_message: `target_system ${system.code} is_active=false`,
        })
        .eq('id', row.id);
      continue;
    }

    let dispatch: DispatchResult;
    try {
      const specialized = DISPATCHERS[row.target_system];
      dispatch = specialized
        ? await specialized(row)
        : await dispatchGeneric(row, system);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      dispatch = { status: 0, ok: false, response_data: null, error_message: msg };
    }

    if (dispatch.ok) {
      await adminSupabase
        .from('sync_outbox')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          response_data: dispatch.response_data,
          error_message: null,
        })
        .eq('id', row.id);

      // If this row corresponds to a reminder, stamp the reminder_log entry to 'sent'
      const aiActionId = (row as any).ai_action_id as string | null;
      if (aiActionId) {
        await adminSupabase
          .from('reminder_log')
          .update({ outcome: 'sent' })
          .eq('sync_outbox_id', row.id);
      }
      sent++;
    } else {
      const nextAttempts = row.attempts + 1;
      if (nextAttempts >= row.max_attempts) {
        await markFailed(adminSupabase, row, dispatch.error_message ?? `http ${dispatch.status}`, true);
        await adminSupabase.from('reminder_log').update({ outcome: 'failed' }).eq('sync_outbox_id', row.id);
        abandoned++;
      } else {
        const delayMin = Math.min(2 ** nextAttempts, 60);
        await adminSupabase
          .from('sync_outbox')
          .update({
            status: 'pending',
            attempts: nextAttempts,
            next_attempt_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
            error_message: dispatch.error_message ?? `http ${dispatch.status}`,
            response_data: dispatch.response_data,
          })
          .eq('id', row.id);
        failed++;
      }
    }
  }

  return { picked: outRows.length, sent, failed, abandoned };
}

async function markFailed(
  adminSupabase: any, row: SyncOutboxRow, msg: string, abandon: boolean
) {
  await adminSupabase
    .from('sync_outbox')
    .update({
      status: abandon ? 'abandoned' : 'failed',
      attempts: row.attempts + 1,
      error_message: msg,
    })
    .eq('id', row.id);
}

/** Generic dispatcher — POST to {base_url}/{operation} with HMAC + Bearer. */
async function dispatchGeneric(row: SyncOutboxRow, system: ExternalSystemRow): Promise<DispatchResult> {
  const url = `${system.base_url.replace(/\/+$/, '')}/${row.operation}`;
  const body = JSON.stringify({
    operation: row.operation,
    target_table: row.target_table,
    target_id: row.target_id,
    payload: row.payload,
    delivery: { attempt: row.attempts + 1, max: row.max_attempts, idempotency_key: row.id },
  });
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-primeahr-event': `${row.target_table}.${row.operation}`,
    'x-primeahr-idempotency-key': row.id,
  };
  if (system.api_token_env) {
    const token = process.env[system.api_token_env];
    if (token) headers['authorization'] = `Bearer ${token}`;
  }
  if (system.webhook_secret_env) {
    const secret = process.env[system.webhook_secret_env];
    if (secret) headers['x-primeahr-signature'] = signOutboundPayload(body, secret);
  }

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: ctl.signal });
    const text = await res.text();
    let parsed: any = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text }; }
    return {
      status: res.status, ok: res.ok, response_data: parsed,
      error_message: res.ok ? null
        : `http ${res.status}: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed).slice(0, 240)}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: 0, ok: false, response_data: null, error_message: msg };
  } finally {
    clearTimeout(t);
  }
}
