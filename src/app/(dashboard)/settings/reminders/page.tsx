import { createClient } from '@/lib/supabase/server';
import { Bell, Clock, MailWarning, ShieldCheck, BellRing } from 'lucide-react';

export const dynamic = 'force-dynamic';

const T = {
  page: '#f4f1ea', card: '#fbf9f4', border: '#e4ddcd',
  text: '#2c2c2a', textMuted: '#8a8475', textFaint: '#a39d8e',
  accent: '#e08a3c', accentSoft: '#fff1e0', accentDeep: '#a8551d',
  green: '#3e8e5a', greenSoft: '#e3f1ea', greenInk: '#1c5236',
  red: '#c4503a', redSoft: '#fbe5e0', redInk: '#7e2a1a',
  amber: '#d4a13a', amberSoft: '#fbf2dd', amberInk: '#735419',
  blue: '#4078a0', blueSoft: '#e1ecf6', blueInk: '#1c4870',
  slate: '#8a8475', slateSoft: '#ece8df', slateInk: '#4a463e',
};

export default async function RemindersSettingsPage() {
  const supabase = await createClient();
  const [recentRes, queueRes, todayRes, suppressedRes] = await Promise.all([
    supabase.from('reminder_log')
      .select('id, source_table, stage, channel, recipient_masked, message_summary, outcome, fired_at')
      .order('fired_at', { ascending: false })
      .limit(30),
    supabase.from('sync_outbox')
      .select('id, target_system, status, attempts, max_attempts, next_attempt_at, error_message, created_at')
      .in('target_system', ['twilio_sms', 'twilio_whatsapp', 'resend_email'])
      .in('status', ['pending', 'in_flight', 'failed'])
      .order('created_at', { ascending: false })
      .limit(15),
    supabase.from('reminder_log')
      .select('outcome', { count: 'exact', head: false })
      .gte('fired_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('reminder_log')
      .select('id', { count: 'exact', head: true })
      .eq('outcome', 'suppressed')
      .gte('fired_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const recent = (recentRes.data ?? []) as Array<any>;
  const queued = (queueRes.data ?? []) as Array<any>;
  const last24 = (todayRes.data ?? []) as Array<{ outcome: string }>;
  const suppressed24 = suppressedRes.count ?? 0;
  const sent24 = last24.filter(r => r.outcome === 'sent').length;
  const queued24 = last24.filter(r => r.outcome === 'queued').length;
  const failed24 = last24.filter(r => r.outcome === 'failed').length;

  return (
    <div style={{ background: T.page, minHeight: '100%', padding: '32px 36px',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: T.text }}>
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentSoft,
            color: T.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BellRing size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Reminder engine
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13.5, color: T.textMuted }}>
              Background checks · evaluations · training · compensation — autonomously reminded
            </p>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KPI label="Sent (24h)" value={sent24} icon={<ShieldCheck size={18} />} tone="green" />
        <KPI label="Queued (24h)" value={queued24} icon={<Clock size={18} />} tone="blue" />
        <KPI label="Failed (24h)" value={failed24} icon={<MailWarning size={18} />} tone={failed24 > 0 ? 'red' : 'slate'} />
        <KPI label="Suppressed (24h)" value={suppressed24} icon={<Bell size={18} />} tone="slate" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        {/* Recent fires */}
        <Card title="Recent activity" subtitle={`Last ${recent.length} reminder events`}>
          {recent.length === 0 ? (
            <Empty label="No reminders fired yet" hint="The scanner runs every 5 minutes once on production" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 12px',
                  background: T.page, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <Pill tone={outcomeTone(r.outcome)}>{r.outcome}</Pill>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.message_summary ?? `${r.source_table} · ${r.stage}`}
                    </div>
                    <div style={{ fontSize: 11, color: T.textFaint }}>
                      {r.source_table} · {r.stage} · {r.channel} · {r.recipient_masked} · {relTime(r.fired_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live channel queue */}
        <Card title="Channel queue" subtitle="Twilio + Resend outbound, in flight">
          {queued.length === 0 ? (
            <Empty label="Channel queue empty" hint="All outbound channel messages are sent" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queued.map(q => (
                <div key={q.id} style={{ display: 'flex', gap: 12, padding: '10px 12px',
                  background: T.page, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <Pill tone={statusTone(q.status)}>{q.status}</Pill>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {channelLabel(q.target_system)}
                    </div>
                    <div style={{ fontSize: 11, color: T.textFaint }}>
                      attempt {q.attempts}/{q.max_attempts}{q.error_message ? ` · ${q.error_message.slice(0, 60)}` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: T.textFaint, alignSelf: 'center' }}>
                    {relTime(q.next_attempt_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section style={{ marginTop: 22 }}>
        <Card title="Stage policy" subtitle="Which reminders fire when, by source type">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <Policy table="Background checks" stages={['T-30', 'T-14', 'T-7', 'T-0', 'overdue']} />
            <Policy table="Evaluations" stages={['T-14', 'T-7', 'T-3', 'T-0', 'overdue']} />
            <Policy table="Training" stages={['T-14', 'T-7', 'T-3', 'T-0', 'overdue']} />
            <Policy table="Compensation" stages={['T-7', 'T-0']} />
          </div>
          <p style={{ marginTop: 14, fontSize: 11.5, color: T.textMuted, lineHeight: 1.5 }}>
            Channel default: email at T-30/T-14, SMS at T-7/T-3/T-0, email for overdue.
            Subject preferences and quiet hours (9pm–8am ET) always win, except for T-0 which fires
            regardless of quiet hours. Cooldowns prevent duplicate fires within a stage.
          </p>
        </Card>
      </section>

      <footer style={{ marginTop: 36, paddingTop: 18, borderTop: `1px solid ${T.border}`,
        fontSize: 11, color: T.textFaint, textAlign: 'center', lineHeight: 1.7 }}>
        Protected by PrimeaHR encryption · Built and powered by VELOX &quot;Automated Operations&quot; LLC
      </footer>
    </div>
  );
}

// ---------- small components ----------

function KPI({ label, value, icon, tone }:
  { label: string; value: number; icon: React.ReactNode; tone: 'green'|'blue'|'red'|'amber'|'slate' }) {
  const colors: Record<string, { bg: string; ink: string; fg: string }> = {
    green: { bg: T.greenSoft, ink: T.greenInk, fg: T.green },
    blue: { bg: T.blueSoft, ink: T.blueInk, fg: T.blue },
    red: { bg: T.redSoft, ink: T.redInk, fg: T.red },
    amber: { bg: T.amberSoft, ink: T.amberInk, fg: T.amber },
    slate: { bg: T.slateSoft, ink: T.slateInk, fg: T.slate },
  };
  const c = colors[tone];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, color: c.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
        <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, children }:
  { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{title}</h3>
        <p style={{ margin: '2px 0 0 0', fontSize: 11.5, color: T.textFaint }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Empty({ label, hint }: { label: string; hint: string }) {
  return (
    <div style={{ padding: '24px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>{label}</div>
      <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 4 }}>{hint}</div>
    </div>
  );
}

function Pill({ tone, children }: { tone: 'green'|'blue'|'red'|'amber'|'slate'; children: React.ReactNode }) {
  const colors: Record<string, { bg: string; ink: string; fg: string }> = {
    green: { bg: T.greenSoft, ink: T.greenInk, fg: T.green },
    blue: { bg: T.blueSoft, ink: T.blueInk, fg: T.blue },
    red: { bg: T.redSoft, ink: T.redInk, fg: T.red },
    amber: { bg: T.amberSoft, ink: T.amberInk, fg: T.amber },
    slate: { bg: T.slateSoft, ink: T.slateInk, fg: T.slate },
  };
  const c = colors[tone];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 9px',
      borderRadius: 999, background: c.bg, color: c.ink, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      alignSelf: 'flex-start' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: c.fg }} />
      {children}
    </span>
  );
}

function Policy({ table, stages }: { table: string; stages: string[] }) {
  return (
    <div style={{ padding: '12px 14px', background: T.page, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, marginBottom: 8 }}>{table}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {stages.map(s => (
          <span key={s} style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
            background: T.accentSoft, color: T.accentDeep }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function outcomeTone(o: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (o === 'sent') return 'green';
  if (o === 'queued') return 'blue';
  if (o === 'failed') return 'red';
  if (o === 'suppressed') return 'slate';
  return 'slate';
}
function statusTone(s: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (s === 'sent' || s === 'confirmed') return 'green';
  if (s === 'pending') return 'blue';
  if (s === 'in_flight') return 'amber';
  if (s === 'failed' || s === 'abandoned') return 'red';
  return 'slate';
}
function channelLabel(s: string): string {
  if (s === 'twilio_sms') return 'Twilio SMS';
  if (s === 'twilio_whatsapp') return 'Twilio WhatsApp';
  if (s === 'resend_email') return 'Resend Email';
  return s;
}
function relTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (Math.abs(diff) < 60) return diff > 0 ? `${Math.floor(diff)}s ago` : `in ${Math.floor(-diff)}s`;
  const m = Math.floor(Math.abs(diff) / 60);
  if (m < 60) return diff > 0 ? `${m}m ago` : `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return diff > 0 ? `${h}h ago` : `in ${h}h`;
  const d = Math.floor(h / 24);
  return diff > 0 ? `${d}d ago` : `in ${d}d`;
}
