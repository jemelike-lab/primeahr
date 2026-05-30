import type { Subject, SubjectKind } from './types';

/**
 * Load a subject (employee or candidate) by kind+id with all contact/consent context.
 * Returns null if not found.
 */
export async function loadSubject(
  adminSupabase: any,
  kind: SubjectKind,
  id: string,
  preferredChannelFromSource: string | null = null
): Promise<Subject | null> {
  if (kind === 'employee') {
    const { data } = await adminSupabase
      .from('employees')
      .select('id, first_name, last_name, email, personal_email, phone, personal_phone, consent_email, consent_sms, consent_whatsapp, opt_out_reason')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const e = data as Record<string, any>;
    return {
      kind: 'employee',
      id: e.id,
      display_name: [e.first_name, e.last_name].filter(Boolean).join(' ') || 'Team member',
      email: e.email ?? null,
      personal_email: e.personal_email ?? null,
      phone: e.phone ?? null,
      personal_phone: e.personal_phone ?? null,
      consent_email: e.consent_email ?? false,
      consent_sms: e.consent_sms ?? false,
      consent_whatsapp: e.consent_whatsapp ?? false,
      opt_out_reason: e.opt_out_reason ?? null,
      preferred_channel: normalizeChannel(preferredChannelFromSource),
    };
  }
  const { data } = await adminSupabase
    .from('candidates')
    .select('id, first_name, last_name, email, phone, consent_email, consent_sms, consent_whatsapp, opt_out_reason')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  const c = data as Record<string, any>;
  return {
    kind: 'candidate',
    id: c.id,
    display_name: [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Candidate',
    email: c.email ?? null,
    personal_email: null,
    phone: c.phone ?? null,
    personal_phone: null,
    consent_email: c.consent_email ?? false,
    consent_sms: c.consent_sms ?? false,
    consent_whatsapp: c.consent_whatsapp ?? false,
    opt_out_reason: c.opt_out_reason ?? null,
    preferred_channel: normalizeChannel(preferredChannelFromSource),
  };
}

function normalizeChannel(s: string | null): 'email' | 'sms' | 'whatsapp' | null {
  if (s === 'email' || s === 'sms' || s === 'whatsapp') return s;
  return null;
}

/** Mask a recipient for the audit log: never log full email/phone in plain text. */
export function maskRecipient(channel: 'email' | 'sms' | 'whatsapp', recipient: string): string {
  if (channel === 'email') {
    const [user, domain] = recipient.split('@');
    if (!domain) return '***';
    const u = user.length <= 2 ? user[0] + '*' : user[0] + '***' + user[user.length - 1];
    return `${u}@${domain}`;
  }
  // phone — keep country code + last 2 digits
  const digits = recipient.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
}
