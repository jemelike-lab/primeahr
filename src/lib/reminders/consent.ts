import type { Subject, ReminderStage, ReminderDecision, Channel } from './types';
import { defaultChannelFor, isQuietHours } from './policy';

/**
 * Decide whether and how to fire a reminder given subject state + stage.
 * Returns {kind:'fire', channel, recipient} or {kind:'suppressed', reason}.
 *
 * Rules:
 *   1. opt_out_reason set → suppressed regardless of stage
 *   2. quiet hours → suppressed (except T-0 which is allowed any time)
 *   3. preferred_channel set → try that channel first
 *   4. fall through default channel for stage
 *   5. if no consent for any channel → suppressed
 */
export function decideReminder(subject: Subject, stage: ReminderStage): ReminderDecision {
  if (subject.opt_out_reason) {
    return { kind: 'suppressed', reason: `opted_out: ${subject.opt_out_reason}` };
  }
  if (isQuietHours() && stage !== 'T-0') {
    return { kind: 'suppressed', reason: 'quiet_hours' };
  }

  const order: Channel[] = subject.preferred_channel
    ? uniqueOrder([subject.preferred_channel, defaultChannelFor(stage), 'email', 'sms', 'whatsapp'])
    : uniqueOrder([defaultChannelFor(stage), 'email', 'sms', 'whatsapp']);

  for (const channel of order) {
    const consented = subject[`consent_${channel}` as const];
    if (!consented) continue;
    const recipient = pickRecipient(subject, channel);
    if (!recipient) continue;
    return { kind: 'fire', channel, recipient, stage };
  }

  return { kind: 'suppressed', reason: 'no_consented_reachable_channel' };
}

function pickRecipient(s: Subject, channel: Channel): string | null {
  if (channel === 'email') return s.email ?? s.personal_email ?? null;
  // sms + whatsapp both want a phone
  return s.phone ?? s.personal_phone ?? null;
}

function uniqueOrder<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const x of arr) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}
