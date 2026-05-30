import { T } from '../_lib/tokens';
import type { LucideIcon } from 'lucide-react';
import { Activity, RefreshCcw } from 'lucide-react';

export function MetricTile({
  label, value, hint, icon: Icon, tone = 'accent',
}: {
  label: string; value: number | string; hint?: string;
  icon?: LucideIcon;
  tone?: 'accent' | 'green' | 'amber' | 'red' | 'violet';
}) {
  const toneMap = {
    accent: { fg: T.accent, bg: T.accentSoft },
    green:  { fg: T.green,  bg: T.greenSoft  },
    amber:  { fg: T.amber,  bg: T.amberSoft  },
    red:    { fg: T.red,    bg: T.redSoft    },
    violet: { fg: T.violet, bg: T.violetSoft },
  }[tone];
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 1px 2px rgba(28,43,42,0.04)',
      minHeight: 78,
    }}>
      {Icon && (
        <div style={{
          width: 38, height: 38, flexShrink: 0,
          borderRadius: 11, background: toneMap.bg, color: toneMap.fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon size={18} /></div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: T.textMuted,
        }}>{label}</div>
        <div style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em',
          color: T.text, lineHeight: 1.1, marginTop: 2,
        }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{hint}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ generatedAt }: { generatedAt: Date }) {
  const time = generatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', marginBottom: 18,
    }}>
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px', borderRadius: 999,
          background: T.accentSoft, color: T.accentDeep,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 8,
        }}>
          <Activity size={12} /> Phase C · Live
        </div>
        <h1 style={{
          fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em',
          color: T.text, margin: 0,
        }}>Control Center</h1>
        <p style={{
          fontSize: 14, color: T.textMuted, margin: '4px 0 0',
          fontWeight: 500, maxWidth: 720,
        }}>
          The operational heartbeat of Beatrice Loving Heart — every compliance gap, training
          assignment, comp approval, sync event, and AI decision in one mission console.
        </p>
      </div>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '8px 14px', borderRadius: 10,
        background: T.cardElev, border: `1px solid ${T.border}`,
        color: T.textMuted, fontSize: 12, fontWeight: 600,
      }}>
        <RefreshCcw size={13} />
        <span>Refreshed {time}</span>
      </div>
    </div>
  );
}
