// Phase E — Agentic Reminder Engine types.

export type ReminderStage = 'T-30' | 'T-14' | 'T-7' | 'T-3' | 'T-0' | 'overdue';

export type Channel = 'email' | 'sms' | 'whatsapp';

export type SourceTable = 'background_checks' | 'evaluations' | 'training' | 'compensation_history';

export type SubjectKind = 'employee' | 'candidate';

/** A row from any domain table normalized into a single reminder candidate shape. */
export type ReminderCandidate = {
  source_table: SourceTable;
  source_id: string;
  subject_kind: SubjectKind;
  subject_id: string;
  due_at: string;            // ISO datetime — the effective due date for this stage calculation
  status: string;            // domain-specific status string (e.g. 'clear', 'scheduled', 'assigned')
  context: Record<string, unknown>;  // domain-specific payload for the composer
  last_reminder_at: string | null;
};

/** Loaded employee / candidate with contact + consent state. */
export type Subject = {
  kind: SubjectKind;
  id: string;
  display_name: string;
  email: string | null;
  personal_email: string | null;
  phone: string | null;
  personal_phone: string | null;
  consent_email: boolean;
  consent_sms: boolean;
  consent_whatsapp: boolean;
  opt_out_reason: string | null;
  preferred_channel: Channel | null;     // from `notification_channel` on the source row when set
};

/** Final decision after consent + cooldown gates. */
export type ReminderDecision =
  | { kind: 'fire'; channel: Channel; recipient: string; stage: ReminderStage }
  | { kind: 'suppressed'; reason: string };

/** The drafted message returned from the composer. */
export type DraftedMessage = {
  channel: Channel;
  subject: string;            // for email; phones ignore this
  body: string;                // plaintext SMS body OR plaintext + light markdown for email
  html?: string;               // optional richer email body
  summary: string;             // 1-line summary for logs
  ai_action_id: string | null; // logged via ai_actions
};
