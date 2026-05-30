import type { ReminderCandidate, Subject, ReminderStage, Channel, DraftedMessage } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

/**
 * Draft a reminder message using Claude. Returns a DraftedMessage and inserts an
 * ai_actions row with kind='communication_drafted'.
 *
 * If the Anthropic call fails, falls back to a deterministic template so we still
 * fire the reminder rather than skipping the person.
 */
export async function composeReminder(
  adminSupabase: any,
  candidate: ReminderCandidate,
  subject: Subject,
  stage: ReminderStage,
  channel: Channel
): Promise<DraftedMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const t0 = Date.now();
  const fallback = templateFallback(candidate, subject, stage, channel);

  if (!apiKey) {
    const aiActionId = await logDraft(adminSupabase, candidate, subject, stage, fallback, 'failure',
      'no ANTHROPIC_API_KEY configured; template fallback used', 0);
    return { ...fallback, ai_action_id: aiActionId };
  }

  const prompt = buildPrompt(candidate, subject, stage, channel);
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      const aiActionId = await logDraft(adminSupabase, candidate, subject, stage, fallback, 'failure',
        `Anthropic ${res.status}: ${txt.slice(0, 200)}`, Date.now() - t0);
      return { ...fallback, ai_action_id: aiActionId };
    }
    const data = await res.json() as { content?: Array<{ type: string; text?: string }>;
                                        usage?: { input_tokens?: number; output_tokens?: number } };
    const text = (data.content ?? [])
      .filter(c => c.type === 'text')
      .map(c => c.text ?? '').join('\n').trim();
    const drafted = parseDraft(text, fallback, channel);
    const aiActionId = await logDraft(adminSupabase, candidate, subject, stage, drafted, 'success', null,
      Date.now() - t0, data.usage?.input_tokens, data.usage?.output_tokens);
    return { ...drafted, ai_action_id: aiActionId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const aiActionId = await logDraft(adminSupabase, candidate, subject, stage, fallback, 'failure',
      `compose threw: ${msg}`, Date.now() - t0);
    return { ...fallback, ai_action_id: aiActionId };
  }
}

function buildPrompt(c: ReminderCandidate, s: Subject, stage: ReminderStage, channel: Channel): string {
  const channelHints: Record<Channel, string> = {
    sms:      'SMS: maximum 140 characters in the body. No subject. Brief, warm, action-oriented. No markdown. Include one short link placeholder {portal_link}.',
    whatsapp: 'WhatsApp: 1-3 short sentences. Warm but professional. Plain text. Include {portal_link} once.',
    email:    'Email: 4-8 short sentences in the body. Plain conversational tone. Subject is a clear 6-10 word headline. Sign off as "BLH HR via PrimeaHR". Include {portal_link} once.',
  };
  const stageHints: Record<ReminderStage, string> = {
    'T-30':    'gentle heads-up, 30 days out',
    'T-14':    'reminder, 2 weeks out',
    'T-7':     'reminder, 1 week out — friendly nudge',
    'T-3':     'urgent, 3 days out',
    'T-0':     'due today — strong call to action',
    'overdue': 'past due — supportive but firm, ask them to act now or contact HR',
  };
  return `You are drafting a personalized reminder for a Beatrice Loving Heart (BLH) team member.

BLH is a Maryland case-management agency (CFC and DDA waivers). The recipient is a Support Planner or Coordinator — not a clinical role. Tone: warm, respectful, never alarming, never condescending.

Person: ${s.display_name} (${s.kind})
What is due: ${humanizeTable(c.source_table)} (status: ${c.status})
Due date: ${c.due_at.slice(0, 10)}
Stage: ${stage} — ${stageHints[stage]}
Channel: ${channelHints[channel]}

Context: ${JSON.stringify(c.context)}

Output STRICT JSON only (no prose, no markdown fences) with these keys:
{
  "subject": "short headline for email; empty string for sms/whatsapp",
  "body": "plain text body",
  "html": "optional richer email body (HTML), or empty string",
  "summary": "1-line internal summary of what this reminder is about"
}`;
}

function parseDraft(text: string, fallback: DraftedMessage, channel: Channel): DraftedMessage {
  try {
    const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string; html?: string; summary?: string };
    return {
      channel,
      subject: parsed.subject ?? fallback.subject,
      body: parsed.body ?? fallback.body,
      html: parsed.html || undefined,
      summary: parsed.summary ?? fallback.summary,
      ai_action_id: null,
    };
  } catch {
    return fallback;
  }
}

function templateFallback(c: ReminderCandidate, s: Subject, stage: ReminderStage, channel: Channel): DraftedMessage {
  const due = c.due_at.slice(0, 10);
  const what = humanizeTable(c.source_table);
  const urgency = stage === 'overdue' ? 'is now past due'
                 : stage === 'T-0'    ? 'is due today'
                 : `is due on ${due}`;
  const greeting = `Hi ${s.display_name.split(' ')[0] ?? 'there'},`;
  const body = `${greeting} a quick reminder that your ${what} ${urgency}. You can take care of it in the BLH portal: {portal_link}. — BLH HR via PrimeaHR`;
  return {
    channel,
    subject: `Reminder: your ${what} ${urgency}`,
    body,
    summary: `[${stage}] ${what} reminder for ${s.display_name}`,
    ai_action_id: null,
  };
}

function humanizeTable(t: string): string {
  if (t === 'background_checks')    return 'background check';
  if (t === 'evaluations')          return 'evaluation';
  if (t === 'training')             return 'training';
  if (t === 'compensation_history') return 'compensation update';
  return t;
}

async function logDraft(
  adminSupabase: any,
  candidate: ReminderCandidate,
  subject: Subject,
  stage: ReminderStage,
  drafted: DraftedMessage,
  outcome: 'success' | 'failure' | 'partial' | 'requires_review',
  errorMessage: string | null,
  durationMs: number,
  inputTokens?: number,
  outputTokens?: number,
): Promise<string | null> {
  const { data, error } = await adminSupabase.from('ai_actions').insert({
    kind: 'communication_drafted',
    outcome,
    target_table: candidate.source_table,
    target_id: candidate.source_id,
    subject_employee_id: subject.kind === 'employee'  ? subject.id : null,
    subject_candidate_id: subject.kind === 'candidate' ? subject.id : null,
    model: MODEL,
    prompt_summary: `${stage} reminder for ${candidate.source_table}`,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    duration_ms: durationMs,
    result_summary: drafted.summary,
    result_data: { channel: drafted.channel, subject: drafted.subject },
    error_message: errorMessage,
    triggered_by: 'cron:scan-reminders',
  }).select('id').single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}
