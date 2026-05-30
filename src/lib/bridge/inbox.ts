import type { ExternalEventRow, EventHandlerResult } from './types';
import { blhinterviewsHandlers } from './handlers/blhinterviews';
import { blhcasesyncHandlers } from './handlers/blhcasesync';
import { checkrHandlers } from './handlers/checkr';

type RegistryEntry = { resolve(eventType: string): any; knownEventTypes(): string[] };

const REGISTRY: Record<string, RegistryEntry> = {
  blhinterviews: blhinterviewsHandlers,
  blhcasesync: blhcasesyncHandlers,
  checkr: checkrHandlers,
};

const MAX_INBOX_BATCH = 25;
const MAX_INBOX_ATTEMPTS = 5;

/**
 * Drain the external_events inbox. Pick up to MAX_INBOX_BATCH rows in 'received' or
 * 'processing' state where attempts < MAX_INBOX_ATTEMPTS. Route each to its handler,
 * write the outcome, and log an ai_actions row.
 */
export async function processInbox(adminSupabase: any): Promise<{
  picked: number; processed: number; failed: number; skipped: number;
}> {
  const { data: events, error } = await adminSupabase
    .from('external_events')
    .select('*')
    .in('processing_status', ['received', 'processing'])
    .lt('attempts', MAX_INBOX_ATTEMPTS)
    .order('received_at', { ascending: true })
    .limit(MAX_INBOX_BATCH);

  if (error) throw new Error(`inbox query failed: ${error.message}`);
  const rows = (events ?? []) as ExternalEventRow[];

  let processed = 0, failed = 0, skipped = 0;

  for (const event of rows) {
    // Mark as processing (advisory; idempotent)
    await adminSupabase
      .from('external_events')
      .update({ processing_status: 'processing', attempts: event.attempts + 1 })
      .eq('id', event.id);

    const registry = REGISTRY[event.source_system];
    if (!registry) {
      skipped++;
      await markEvent(adminSupabase, event, 'ignored', {
        error_message: `unknown source_system: ${event.source_system}`,
      });
      continue;
    }

    const handler = registry.resolve(event.event_type);
    if (!handler) {
      skipped++;
      await markEvent(adminSupabase, event, 'ignored', {
        error_message: `no handler for event_type: ${event.event_type}`,
      });
      continue;
    }

    let result: EventHandlerResult;
    try {
      result = await handler(event, { adminSupabase });
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      await markEvent(adminSupabase, event, 'failed', { error_message: msg });
      await logAiAction(adminSupabase, event, null, 'failure', `handler threw: ${msg}`);
      continue;
    }

    const finalStatus: 'processed' | 'ignored' | 'failed' =
      result.outcome === 'success' ? 'processed'
        : result.outcome === 'ignored' ? 'ignored'
          : result.outcome === 'failure' ? 'failed'
            : 'processed'; // partial / requires_review still count as processed

    await markEvent(adminSupabase, event, finalStatus, {
      target_table: result.target_table,
      target_id: result.target_id,
      error_message: result.outcome === 'failure' ? result.result_summary : null,
    });
    await logAiAction(
      adminSupabase, event, result.target_id, result.outcome, result.result_summary
    );

    if (finalStatus === 'processed') processed++;
    else if (finalStatus === 'failed') failed++;
    else skipped++;
  }

  return { picked: rows.length, processed, failed, skipped };
}

async function markEvent(
  adminSupabase: any,
  event: ExternalEventRow,
  status: 'processed' | 'failed' | 'ignored',
  fields: { target_table?: string | null; target_id?: string | null; error_message?: string | null }
) {
  await adminSupabase
    .from('external_events')
    .update({
      processing_status: status,
      processed_at: new Date().toISOString(),
      target_table: fields.target_table ?? event.target_table,
      target_id: fields.target_id ?? event.target_id,
      error_message: fields.error_message ?? event.error_message,
    })
    .eq('id', event.id);
}

async function logAiAction(
  adminSupabase: any,
  event: ExternalEventRow,
  targetId: string | null,
  outcome: 'success' | 'failure' | 'partial' | 'requires_review' | 'ignored',
  summary: string
) {
  await adminSupabase.from('ai_actions').insert({
    kind: 'status_transition',
    outcome: outcome === 'ignored' ? 'success' : outcome,
    target_table: event.target_table ?? 'external_events',
    target_id: targetId ?? event.id,
    result_summary: `[${event.source_system}/${event.event_type}] ${summary}`,
    result_data: { event_id: event.id, source: event.source_system, type: event.event_type },
    triggered_by: 'webhook',
    request_id: event.external_event_id,
  });
}
