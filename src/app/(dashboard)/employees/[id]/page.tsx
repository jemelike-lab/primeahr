import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  User, Mail, Phone, MapPin, Briefcase, Building2, Calendar, BadgeCheck,
  ShieldCheck, GraduationCap, ClipboardCheck, DollarSign, Activity, Bell,
  ChevronLeft, ExternalLink, FileText, AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const T = {
  page: '#f4f1ea', card: '#fbf9f4', border: '#e4ddcd',
  text: '#2c2c2a', textMuted: '#8a8475', textFaint: '#a39d8e',
  sidebar: '#1c2b2a',
  accent: '#e08a3c', accentSoft: '#fff1e0', accentDeep: '#a8551d',
  green: '#3e8e5a', greenSoft: '#e3f1ea', greenInk: '#1c5236',
  red: '#c4503a', redSoft: '#fbe5e0', redInk: '#7e2a1a',
  amber: '#d4a13a', amberSoft: '#fbf2dd', amberInk: '#735419',
  blue: '#4078a0', blueSoft: '#e1ecf6', blueInk: '#1c4870',
  slate: '#8a8475', slateSoft: '#ece8df', slateInk: '#4a463e',
};

type Params = { params: Promise<{ id: string }> };

export default async function EmployeeProfilePage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: emp } = await supabase
    .from('employees')
    .select(`
      *,
      department:departments(id, name),
      role:roles(id, title),
      supervisor:employees!supervisor_id(id, first_name, last_name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!emp) notFound();

  const [docsRes, bgRes, evalsRes, trainingRes, compRes, activityRes, reminderRes] = await Promise.all([
    supabase.from('employee_documents')
      .select('id, name, category, status, version, uploaded_at, expiration_date, file_name')
      .eq('employee_id', id)
      .order('uploaded_at', { ascending: false })
      .limit(20),
    supabase.from('background_checks')
      .select('id, status, checkr_package, requested_at, completed_at, expires_at, last_reminder_at')
      .eq('subject_employee_id', id)
      .order('requested_at', { ascending: false })
      .limit(1),
    supabase.from('evaluations')
      .select('id, evaluation_type, status, scheduled_for, completed_at, overall_rating')
      .eq('employee_id', id)
      .order('scheduled_for', { ascending: false })
      .limit(5),
    supabase.from('training')
      .select('id, title, training_type, status, due_date, expires_at, completed_at, score')
      .eq('employee_id', id)
      .order('due_date', { ascending: false, nullsFirst: false })
      .limit(8),
    supabase.from('compensation_history')
      .select('id, change_type, status, previous_rate, new_rate, pay_rate_type, effective_date, reason')
      .eq('employee_id', id)
      .order('effective_date', { ascending: false })
      .limit(8),
    supabase.from('activity_log')
      .select('id, action, entity_type, entity_name, description, actor_name, created_at')
      .eq('entity_type', 'employee')
      .eq('entity_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('reminder_log')
      .select('id, source_table, stage, channel, recipient_masked, message_summary, outcome, fired_at')
      .eq('subject_employee_id', id)
      .order('fired_at', { ascending: false })
      .limit(8),
  ]);

  const docs = (docsRes.data ?? []) as any[];
  const bg = (bgRes.data?.[0] ?? null) as any;
  const evals = (evalsRes.data ?? []) as any[];
  const training = (trainingRes.data ?? []) as any[];
  const comp = (compRes.data ?? []) as any[];
  const activity = (activityRes.data ?? []) as any[];
  const reminders = (reminderRes.data ?? []) as any[];

  const fullName = [emp.first_name, emp.middle_name, emp.last_name].filter(Boolean).join(' ');
  const displayName = emp.preferred_name || fullName;

  // Training compliance %
  const trainingTotal = training.length;
  const trainingDone = training.filter(t => t.status === 'completed').length;
  const trainingPct = trainingTotal === 0 ? 0 : Math.round((trainingDone / trainingTotal) * 100);

  // Current comp = newest with status='effective' or 'approved'
  const currentComp = comp.find(c => c.status === 'effective') ?? comp[0] ?? null;

  return (
    <div style={{ background: T.page, minHeight: '100%', padding: '24px 32px',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: T.text }}>

      {/* Back link */}
      <div style={{ marginBottom: 14 }}>
        <Link href="/employees" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, color: T.textMuted, textDecoration: 'none', fontWeight: 600 }}>
          <ChevronLeft size={14} /> Employees
        </Link>
      </div>

      {/* Hero */}
      <section style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: 22, marginBottom: 18, display: 'grid',
        gridTemplateColumns: 'auto 1fr auto', gap: 22, alignItems: 'center' }}>
        <Avatar src={emp.avatar_url} name={displayName} size={72} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {displayName}
            </h1>
            <StatusPill status={emp.employment_status} />
          </div>
          <div style={{ fontSize: 13.5, color: T.textMuted, marginBottom: 6 }}>
            {emp.role?.title ?? 'Unassigned role'}
            {emp.department?.name ? ` · ${emp.department.name}` : ''}
            {emp.employee_number ? ` · #${emp.employee_number}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 18, fontSize: 12, color: T.textFaint, flexWrap: 'wrap' }}>
            {emp.email && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Mail size={12} /> {emp.email}</span>)}
            {emp.phone && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Phone size={12} /> {emp.phone}</span>)}
            {(emp.city || emp.state) && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} /> {[emp.city, emp.state].filter(Boolean).join(', ')}</span>)}
            {emp.hire_date && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} /> Hired {formatDate(emp.hire_date)}</span>)}
            {emp.supervisor && (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <User size={12} /> Reports to {emp.supervisor.first_name} {emp.supervisor.last_name}</span>)}
          </div>
          {emp.fun_fact && (
            <div style={{ marginTop: 10, fontSize: 12, fontStyle: 'italic', color: T.accentDeep }}>
              &ldquo;{emp.fun_fact}&rdquo;
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {emp.blhinterviews_url && (
            <a href={emp.blhinterviews_url} target="_blank" rel="noreferrer" style={extLinkStyle}>
              <ExternalLink size={12} /> BLH Interviews
            </a>
          )}
          {emp.casesync_url && (
            <a href={emp.casesync_url} target="_blank" rel="noreferrer" style={extLinkStyle}>
              <ExternalLink size={12} /> Casesync
            </a>
          )}
        </div>
      </section>

      {/* KPI strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <KPI label="Background check" value={bg?.status ?? '—'}
          icon={<ShieldCheck size={18} />}
          tone={bg?.status === 'clear' ? 'green' : bg?.status === 'expired' ? 'red' : 'amber'} />
        <KPI label="Training compliance" value={`${trainingPct}%`}
          icon={<GraduationCap size={18} />}
          tone={trainingPct >= 80 ? 'green' : trainingPct >= 50 ? 'amber' : 'red'} />
        <KPI label="Last evaluation" value={evals[0]?.completed_at ? formatDate(evals[0].completed_at) : 'None yet'}
          icon={<ClipboardCheck size={18} />}
          tone={evals[0]?.completed_at ? 'blue' : 'slate'} />
        <KPI
          label="Current rate"
          value={currentComp?.new_rate
            ? `$${Number(currentComp.new_rate).toFixed(2)}${currentComp.pay_rate_type === 'hourly' ? '/hr' : currentComp.pay_rate_type === 'salary' ? '/yr' : ''}`
            : emp.salary ? `$${Number(emp.salary).toLocaleString()}` : '—'}
          icon={<DollarSign size={18} />}
          tone={currentComp || emp.salary ? 'green' : 'slate'} />
      </section>

      {/* Two-col grid */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 18, alignItems: 'start', marginBottom: 18 }}>
        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Documents" subtitle={`${docs.length} on file`} icon={<FileText size={15} />}>
            {docs.length === 0 ? <Empty label="No documents uploaded yet" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {docs.slice(0, 8).map(d => (
                  <Row key={d.id}
                    left={<Pill tone={docStatusTone(d.status)}>{d.status}</Pill>}
                    title={d.name}
                    subtitle={`${d.category}${d.version > 1 ? ` · v${d.version}` : ''}${d.expiration_date ? ` · expires ${formatDate(d.expiration_date)}` : ''}`}
                    right={d.uploaded_at ? relTime(d.uploaded_at) : '—'} />
                ))}
                {docs.length > 8 && <MoreFooter count={docs.length - 8} />}
              </div>
            )}
          </Card>

          <Card title="Training" subtitle={`${trainingDone}/${trainingTotal} complete`} icon={<GraduationCap size={15} />}>
            {training.length === 0 ? <Empty label="No training assigned" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {training.map(t => (
                  <Row key={t.id}
                    left={<Pill tone={trainingTone(t.status)}>{t.status}</Pill>}
                    title={t.title ?? t.training_type ?? 'Training'}
                    subtitle={[t.training_type, t.due_date ? `due ${formatDate(t.due_date)}` : null,
                      t.score != null ? `${t.score}%` : null].filter(Boolean).join(' · ')}
                    right={t.expires_at ? `exp ${formatDate(t.expires_at)}` : t.completed_at ? formatDate(t.completed_at) : '—'} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Evaluations" subtitle={`${evals.length} on record`} icon={<ClipboardCheck size={15} />}>
            {evals.length === 0 ? <Empty label="No evaluations recorded" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {evals.map(e => (
                  <Row key={e.id}
                    left={<Pill tone={evalTone(e.status)}>{e.status}</Pill>}
                    title={e.evaluation_type ?? 'Evaluation'}
                    subtitle={e.completed_at ? `Completed ${formatDate(e.completed_at)}`
                      : e.scheduled_for ? `Scheduled ${formatDate(e.scheduled_for)}` : '—'}
                    right={e.overall_rating != null ? `${e.overall_rating}/5` : '—'} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Card title="Compensation history" subtitle={`${comp.length} change${comp.length === 1 ? '' : 's'}`} icon={<DollarSign size={15} />}>
            {comp.length === 0 ? <Empty label="No compensation history yet" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {comp.map(c => (
                  <Row key={c.id}
                    left={<Pill tone={c.status === 'effective' ? 'green' : c.status === 'approved' ? 'blue' : c.status === 'proposed' ? 'amber' : 'slate'}>{c.status}</Pill>}
                    title={c.change_type ?? 'Rate change'}
                    subtitle={c.previous_rate
                      ? `$${Number(c.previous_rate).toFixed(2)} → $${Number(c.new_rate).toFixed(2)}${c.reason ? ` · ${c.reason}` : ''}`
                      : `$${Number(c.new_rate).toFixed(2)}${c.reason ? ` · ${c.reason}` : ''}`}
                    right={c.effective_date ? formatDate(c.effective_date) : '—'} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Activity" subtitle="Recent events" icon={<Activity size={15} />}>
            {activity.length === 0 ? <Empty label="No recorded activity" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {activity.map(a => (
                  <Row key={a.id}
                    left={<Pill tone={actionTone(a.action)}>{a.action}</Pill>}
                    title={a.description ?? a.entity_name ?? a.action}
                    subtitle={a.actor_name ? `by ${a.actor_name}` : 'system'}
                    right={relTime(a.created_at)} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Reminders" subtitle={`${reminders.length} recent`} icon={<Bell size={15} />}>
            {reminders.length === 0 ? <Empty label="No reminders fired" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {reminders.map(r => (
                  <Row key={r.id}
                    left={<Pill tone={r.outcome === 'sent' ? 'green' : r.outcome === 'queued' ? 'blue' : r.outcome === 'failed' ? 'red' : 'slate'}>{r.outcome}</Pill>}
                    title={r.message_summary ?? `${r.source_table} · ${r.stage}`}
                    subtitle={`${r.channel} · ${r.recipient_masked} · ${r.stage}`}
                    right={relTime(r.fired_at)} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Contact & consent */}
      <section style={{ marginBottom: 24 }}>
        <Card title="Contact & consent" subtitle="Channels available for outreach" icon={<BadgeCheck size={15} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <ContactBlock label="Work email" value={emp.email}    consent={emp.consent_email} />
            <ContactBlock label="Work phone" value={emp.phone}    consent={emp.consent_sms} consentLabel="SMS" />
            <ContactBlock label="Personal email" value={emp.personal_email} consent={emp.consent_email} />
            <ContactBlock label="WhatsApp"   value={emp.phone}    consent={emp.consent_whatsapp} consentLabel="WhatsApp" />
          </div>
          {emp.opt_out_reason && (
            <div style={{ marginTop: 14, padding: '10px 12px', background: T.redSoft,
              borderRadius: 8, fontSize: 12, color: T.redInk, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> <strong>Opted out:</strong> {emp.opt_out_reason}
            </div>
          )}
        </Card>
      </section>

      <footer style={{ paddingTop: 18, borderTop: `1px solid ${T.border}`,
        fontSize: 11, color: T.textFaint, textAlign: 'center', lineHeight: 1.7 }}>
        Protected by PrimeaHR encryption · Built and powered by VELOX &quot;Automated Operations&quot; LLC
      </footer>
    </div>
  );
}

// ---------- components ----------

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  const initials = name.split(' ').slice(0, 2).map(s => s[0] ?? '').join('').toUpperCase();
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%',
      objectFit: 'cover', border: `2px solid ${T.border}` }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: T.accentSoft,
      color: T.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, letterSpacing: '-0.02em' }}>
      {initials || '·'}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const tone: 'green'|'blue'|'red'|'amber'|'slate' =
    status === 'active' ? 'green' :
    status === 'onboarding' ? 'blue' :
    status === 'on_leave' ? 'amber' :
    status === 'terminated' ? 'red' : 'slate';
  return <Pill tone={tone}>{status ?? 'unknown'}</Pill>;
}

function KPI({ label, value, icon, tone }:
  { label: string; value: string; icon: React.ReactNode; tone: 'green'|'blue'|'red'|'amber'|'slate' }) {
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
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, icon, children }:
  { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon && <span style={{ color: T.accentDeep, display: 'inline-flex' }}>{icon}</span>}
        <div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em' }}>{title}</h3>
          {subtitle && <p style={{ margin: '1px 0 0 0', fontSize: 11, color: T.textFaint }}>{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Row({ left, title, subtitle, right }:
  { left: React.ReactNode; title: string; subtitle?: string; right?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '8px 10px', background: T.page,
      borderRadius: 8, border: `1px solid ${T.border}`, alignItems: 'flex-start' }}>
      {left}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        )}
      </div>
      {right && (
        <div style={{ fontSize: 10.5, color: T.textFaint, alignSelf: 'center', whiteSpace: 'nowrap' }}>{right}</div>
      )}
    </div>
  );
}

function MoreFooter({ count }: { count: number }) {
  return (
    <div style={{ fontSize: 11, color: T.textFaint, textAlign: 'center', padding: '4px 0' }}>
      + {count} more
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ padding: '14px 8px', textAlign: 'center', fontSize: 12, color: T.textFaint }}>
      {label}
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '1px 7px',
      borderRadius: 999, background: c.bg, color: c.ink, fontSize: 10, fontWeight: 700,
      whiteSpace: 'nowrap', alignSelf: 'flex-start' }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.fg }} />
      {children}
    </span>
  );
}

function ContactBlock({ label, value, consent, consentLabel }:
  { label: string; value: string | null; consent: boolean; consentLabel?: string }) {
  return (
    <div style={{ padding: '12px 14px', background: T.page, borderRadius: 10, border: `1px solid ${T.border}` }}>
      <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? T.text : T.textFaint,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 8 }}>
        {value ?? 'Not on file'}
      </div>
      <Pill tone={consent ? 'green' : 'slate'}>{consent ? 'Consented' : 'No consent'}{consentLabel ? ` · ${consentLabel}` : ''}</Pill>
    </div>
  );
}

const extLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px',
  background: T.page, border: `1px solid ${T.border}`, borderRadius: 8,
  fontSize: 11.5, fontWeight: 600, color: T.text, textDecoration: 'none',
};

// ---------- helpers ----------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relTime(iso: string): string {
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (Math.abs(diff) < 60) return diff > 0 ? `${Math.floor(diff)}s ago` : `in ${Math.floor(-diff)}s`;
  const m = Math.floor(Math.abs(diff) / 60);
  if (m < 60) return diff > 0 ? `${m}m ago` : `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return diff > 0 ? `${h}h ago` : `in ${h}h`;
  const d = Math.floor(h / 24);
  return diff > 0 ? `${d}d ago` : `in ${d}d`;
}

function docStatusTone(s: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (s === 'approved' || s === 'verified' || s === 'completed') return 'green';
  if (s === 'pending' || s === 'pending_review') return 'amber';
  if (s === 'rejected' || s === 'expired') return 'red';
  if (s === 'uploaded') return 'blue';
  return 'slate';
}

function trainingTone(s: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (s === 'completed') return 'green';
  if (s === 'overdue') return 'red';
  if (s === 'in_progress') return 'amber';
  if (s === 'assigned' || s === 'not_started') return 'blue';
  return 'slate';
}

function evalTone(s: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (s === 'completed') return 'green';
  if (s === 'overdue') return 'red';
  if (s === 'due' || s === 'in_progress') return 'amber';
  if (s === 'scheduled') return 'blue';
  return 'slate';
}

function actionTone(a: string): 'green'|'blue'|'red'|'amber'|'slate' {
  if (a === 'approved' || a === 'signed') return 'green';
  if (a === 'rejected' || a === 'deleted') return 'red';
  if (a === 'status_changed') return 'amber';
  if (a === 'created' || a === 'uploaded' || a === 'sent' || a === 'commented' || a === 'transferred') return 'blue';
  return 'slate';
}
