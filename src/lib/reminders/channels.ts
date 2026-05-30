import type { Channel, DraftedMessage } from './types';

/**
 * Enqueue a reminder for outbound dispatch via sync_outbox.
 * Returns the sync_outbox row id, or null on failure.
 */
export async function enqueueForChannel(
  adminSupabase: any,
  channel: Channel,
  recipient: string,
  drafted: DraftedMessage,
  context: {
    source_table: string;
    source_id: string;
    subject_kind: 'employee' | 'candidate';
    subject_id: string;
    stage: string;
    ai_action_id: string | null;
  }
): Promise<string | null> {
  const targetSystem = channel === 'email' ? 'resend_email'
                       : channel === 'whatsapp' ? 'twilio_whatsapp'
                       : 'twilio_sms';

  const payload: Record<string, unknown> = channel === 'email'
    ? {
        to: recipient,
        from: 'BLH HR <hr@beatricelovingheart.com>',
        subject: drafted.subject,
        text: drafted.body,
        html: drafted.html ?? null,
      }
    : {
        to: recipient,
        body: drafted.body,
      };

  const { data, error } = await adminSupabase.from('sync_outbox').insert({
    target_system: targetSystem,
    operation: 'send',
    target_table: context.source_table,
    target_id: context.source_id,
    payload: {
      ...payload,
      _ctx: {
        stage: context.stage,
        subject_kind: context.subject_kind,
        subject_id: context.subject_id,
        ai_action_id: context.ai_action_id,
      },
    },
    triggered_by: 'cron:scan-reminders',
    ai_action_id: context.ai_action_id,
  }).select('id').single();

  if (error || !data) return null;
  return (data as { id: string }).id;
}
