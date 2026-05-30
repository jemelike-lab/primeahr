import type { ReminderStage, SourceTable, Channel } from './types';

/**
 * Days-out → stage mapping. Higher number = earlier reminder.
 * Each source table picks the stages it cares about.
 */
const ALL_STAGES: { stage: ReminderStage; days: number }[] = [
  { stage: 'T-30',    days: 30 },
  { stage: 'T-14',    days: 14 },
  { stage: 'T-7',     days: 7  },
  { stage: 'T-3',     days: 3  },
  { stage: 'T-0',     days: 0  },
  { stage: 'overdue', days: -1 },
];

/** Which stages apply to which source table. */
const STAGE_MATRIX: Record<SourceTable, ReminderStage[]> = {
  background_checks:    ['T-30', 'T-14', 'T-7',  'T-0', 'overdue'],
  evaluations:          ['T-14', 'T-7',  'T-3',  'T-0', 'overdue'],
  training:             ['T-14', 'T-7',  'T-3',  'T-0', 'overdue'],
  compensation_history: ['T-7',  'T-0'],
};

/**
 * Resolve the current stage for an item given days-until-due.
 * Returns the most urgent matching stage, or null if none applies.
 */
export function resolveStage(daysUntilDue: number, table: SourceTable): ReminderStage | null {
  const allowed = new Set(STAGE_MATRIX[table]);
  if (daysUntilDue < 0) return allowed.has('overdue') ? 'overdue' : null;
  // pick the smallest threshold >= daysUntilDue (i.e. most-urgent applicable bucket)
  for (const { stage, days } of [...ALL_STAGES].sort((a, b) => a.days - b.days)) {
    if (days < 0) continue;
    if (daysUntilDue <= days && allowed.has(stage)) return stage;
  }
  return null;
}

/**
 * Cooldown — minimum hours between two reminders for the same item.
 * Defaults to 22h so each daily scan only fires once per item, but earlier stages can override.
 */
export function cooldownHours(stage: ReminderStage): number {
  switch (stage) {
    case 'T-30': return 24 * 7;   // weekly nudge at this distance
    case 'T-14': return 24 * 3;
    case 'T-7':  return 24 * 2;
    case 'T-3':  return 24;
    case 'T-0':  return 12;
    case 'overdue': return 24;     // once a day for overdue
  }
}

/**
 * Channel escalation by stage. If the subject's preferred channel is set we honor it,
 * otherwise we default to email for soft stages and SMS for urgent ones.
 */
export function defaultChannelFor(stage: ReminderStage): Channel {
  if (stage === 'T-30' || stage === 'T-14') return 'email';
  if (stage === 'T-7' || stage === 'T-3' || stage === 'T-0') return 'sms';
  return 'email'; // overdue
}

/**
 * Quiet hours: 9pm – 8am local. We use America/New_York since BLH operates from Maryland.
 * Returns true if we should NOT fire right now.
 */
export function isQuietHours(now: Date = new Date()): boolean {
  // Approximation — use the host clock interpreted as ET. Production should pass the
  // employee's stored timezone; this default covers the BLH operating geography.
  const tz = 'America/New_York';
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: tz });
  const hour = Number(fmt.format(now));
  return hour >= 21 || hour < 8;
}

/** How many reminders may we fire per scan run, total? Prevents runaway notifications. */
export const MAX_REMINDERS_PER_RUN = 50;
