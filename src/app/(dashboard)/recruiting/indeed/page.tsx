import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Briefcase, UserPlus, ExternalLink, Sparkles, Inbox } from 'lucide-react';
import { importIndeedCandidateAction } from './actions';

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

export default async function IndeedRecruitingPage() {
  const supabase = await createClient();

  const [reqsRes, recentRes, statsRes] = await Promise.all([
    supabase.from('requisitions')
      .select('id, title, status, indeed_employer_id, indeed_job_key, indeed_apply_url, indeed_posted_at, indeed_last_synced_at')
      .not('indeed_apply_url', 'is', null)
      .order('indeed_posted_at', { ascending: false, nullsFirst: false })
      .limit(30),
    supabase.from('candidates')
      .select('id, first_name, last_name, email, stage, grade, applied_at, source_detail, requisition_id')
      .eq('source', 'indeed')
      .order('applied_at', { ascending: false })
      .limit(20),
    supabase.from('candidates')
      .select('stage', { count: 'exact', head: false })
      .eq('source', 'indeed')
      .gte('applied_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);

  // also fetch requisitions WITHOUT indeed for the import dropdown
  const { data: allReqs } = await supabase
    .from('requisitions')
    .select('id, title, status')
    .in('status', ['open', 'active', 'posted', 'draft'])
    .order('title');

  const reqs = (reqsRes.data ?? []) as any[];
  const recent = (recentRes.data ?? []) as any[];
  const last30 = (statsRes.data ?? []) as Array<{ stage: string }>;
  const requisitionsForImport = (allReqs ?? []) as Array<{ id: string; title: string }>;

  const newCount = last30.filter(r => r.stage === 'new').length;
  const interviewing = last30.filter(r => r.stage === 'interviewing').length;
  const hired = last30.filter(r => r.stage === 'hired').length;

  return (
    <div style={{ background: T.page, minHeight: '100%', padding: '32px 36px',
      fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif', color: T.text }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentSoft,
            color: T.accentDeep, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em' }}>
              Indeed pipeline
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13.5, color: T.textMuted }}>
              BLH jobs posted on Indeed and the candidates flowing in
            </p>
          </div>
        </div>
      </header>

      {/* KPI strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KPI label="Indeed-linked reqs" value={reqs.length} tone="blue" />
        <KPI label="New (30d)" value={newCount} tone="amber" />
        <KPI label="Interviewing (30d)" value={interviewing} tone="blue" />
        <KPI label="Hired (30d)" value={hired} tone="green" />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, alignItems: 'start', marginBottom: 22 }}>
        {/* Linked requisitions */}
        <Card title="Live Indeed jobs" subtitle={`${reqs.length} requisitions with Apply URL on file`}>
          {reqs.length === 0 ? (
            <Empty
              label="No requisitions linked to Indeed yet"
              hint="Open any requisition and add its Indeed Apply URL to start tracking applicants from Indeed"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reqs.map(r => (
                <div key={r.id} style={{ display: 'flex', gap: 12, padding: '10px 12px',
                  background: T.page, borderRadius: 10, border: `1px solid ${T.border}` }}>
                  <Pill tone={r.status === 'open' || r.status === 'active' || r.status === 'posted' ? 'green' : 'slate'}>
                    {r.status}
                  </Pill>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {r.indeed_job_key ? `Key ${r.indeed_job_key.slice(0, 14)}` : 'No key'}
                      {r.indeed_last_synced_at ? ` · synced ${relTime(r.indeed_last_synced_at)}` : ' · never synced'}
                    </div>
                  </div>
                  <a href={r.indeed_apply_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                      background: T.accentSoft, color: T.accentDeep, borderRadius: 8,
                      fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink size={11} /> Apply
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Manual import */}
        <Card title="Import candidate" subtitle="Manually onboard an Indeed applicant" icon={<UserPlus size={15} />}>
          <form action={importIndeedCandidateAction} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field name="first_name" label="First name" required />
            <Field name="last_name" label="Last name" required />
            <Field name="email" label="Email" type="email" required />
            <Field name="phone" label="Phone" type="tel" />
            <Field name="indeed_apply_url" label="Indeed application URL" placeholder="https://indeed.com/..." />
            <div>
              <label style={labelStyle}>Requisition</label>
              <select name="requisition_id" style={{ ...inputStyle, padding: '8px 10px' }}>
                <option value="">— select one —</option>
                {requisitionsForImport.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>
            <button type="submit" style={{ marginTop: 6, padding: '10px 14px',
              background: T.accent, color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Sparkles size={14} /> Import candidate
            </button>
          </form>
        </Card>
      </section>

      {/* Recent Indeed applicants */}
      <section>
        <Card title="Recent Indeed applicants" subtitle={`Last ${recent.length} candidates with source=indeed`} icon={<Inbox size={15} />}>
          {recent.length === 0 ? (
            <Empty label="No Indeed applicants yet" hint="Use the import form above to manually add your first one" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {recent.map(c => (
                <Link key={c.id} href={`/candidates/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', gap: 12, padding: '10px 12px',
                    background: T.page, borderRadius: 10, border: `1px solid ${T.border}`, alignItems: 'center' }}>
                    <Pill tone={stageTone(c.stage)}>{c.stage ?? 'new'}</Pill>
                    {c.grade && c.grade !== 'unknown' && <GradeBadge grade={c.grade} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                        {c.first_name} {c.last_name}
                      </div>
                      <div style={{ fontSize: 10.5, color: T.textFaint,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.email}{c.source_detail ? ` · via ${truncate(c.source_detail, 40)}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 10.5, color: T.textFaint }}>
                      {c.applied_at ? relTime(c.applied_at) : '—'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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

function KPI({ label, value, tone }:
  { label: string; value: number; tone: 'green'|'blue'|'red'|'amber'|'slate' }) {
  const colors: Record<string, { bg: string; ink: string }> = {
    green: { bg: T.greenSoft, ink: T.greenInk },
    blue: { bg: T.blueSoft, ink: T.blueInk },
    red: { bg: T.redSoft, ink: T.redInk },
    amber: { bg: T.amberSoft, ink: T.amberInk },
    slate: { bg: T.slateSoft, ink: T.slateInk },
  };
  const c = colors[tone];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '14px 16px' }}>
      <span style={{ display: 'inline-block', padding: '2px 8px', background: c.bg, color: c.ink,
        borderRadius: 999, fontSize: 10.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</span>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: T.text }}>{value}</div>
    </div>
  );
}

function Card({ title, subtitle, icon, children }:
  { title: string; subtitle: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon && <span style={{ color: T.accentDeep, display: 'inline-flex' }}>{icon}</span>}
        <div>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{title}</h3>
          <p style={{ margin: '1px 0 0 0', fontSize: 11.5, color: T.textFaint }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ padding: '24px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textMuted }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 4 }}>{hint}</div>}
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
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px',
      borderRadius: 999, background: c.bg, color: c.ink, fontSize: 10.5, fontWeight: 700,
      whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.fg }} />
      {children}
    </span>
  );
}

function GradeBadge({ grade }: { grade: string }) {
  const color = grade === 'A' ? T.green : grade === 'B' ? T.amber : T.red;
  return (
    <span style={{ width: 22, height: 22, borderRadius: 5, background: color, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800 }}>{grade}</span>
  );
}

function Field({ name, label, type = 'text', required, placeholder }:
  { name: string; label: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}{required ? ' *' : ''}</label>
      <input name={name} type={type} required={required} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: T.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', background: T.page, border: `1px solid ${T.border}`,
  borderRadius: 8, fontSize: 13, color: T.text, fontFamily: 'inherit',
};

// ---------- helpers ----------

function stageTone(s: string | null): 'green'|'blue'|'red'|'amber'|'slate' {
  if (s === 'hired') return 'green';
  if (s === 'offer') return 'amber';
  if (s === 'interviewing') return 'blue';
  if (s === 'screening') return 'slate';
  if (s === 'dispositioned') return 'red';
  return 'slate';
}

function truncate(s: string, n: number) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

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
