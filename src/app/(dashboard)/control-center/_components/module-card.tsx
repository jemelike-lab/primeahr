import { T } from '../_lib/tokens';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { PillTone } from './status-pill';

const TONE_RING: Record<PillTone, string> = {
  green: T.green, amber: T.amber, red: T.red, orange: T.orange,
  violet: T.violet, blue: T.blue, slate: T.slate,
};

export function ModuleCard({
  title, subtitle, count, tone = 'slate', icon: Icon, viewAllHref, accent = false, children,
}: {
  title: string; subtitle?: string;
  count?: number;
  tone?: PillTone;
  icon?: LucideIcon;
  viewAllHref?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      boxShadow: '0 1px 2px rgba(28,43,42,0.04), 0 2px 12px rgba(28,43,42,0.04)',
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
      minHeight: 240,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${T.accent} 0%, ${T.accentDeep} 100%)`,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {Icon && (
          <div style={{
            width: 34, height: 34, flexShrink: 0,
            borderRadius: 10,
            background: count && count > 0 ? TONE_RING[tone] + '14' : T.accentSoft,
            color: count && count > 0 ? TONE_RING[tone] : T.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={17} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{
              fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.015em',
              color: T.text, margin: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
            }}>{title}</h3>
            {typeof count === 'number' && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 999,
                background: count > 0 ? TONE_RING[tone] : T.slateSoft,
                color: count > 0 ? '#fff' : T.textMuted,
                lineHeight: 1.4,
              }}>{count}</span>
            )}
          </div>
          {subtitle && (
            <p style={{
              fontSize: 11.5, color: T.textMuted, margin: '2px 0 0',
              fontWeight: 500, letterSpacing: '-0.005em',
            }}>{subtitle}</p>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>

      {viewAllHref && (
        <Link href={viewAllHref} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 600, color: T.accent,
          textDecoration: 'none', marginTop: 'auto',
          paddingTop: 8, borderTop: `1px dashed ${T.border}`,
        }}>View all <ChevronRight size={13} /></Link>
      )}
    </div>
  );
}

export function Row({ left, right, href }: {
  left: React.ReactNode; right?: React.ReactNode; href?: string;
}) {
  const inner = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 0',
      borderBottom: `1px solid ${T.border}40`,
      minHeight: 36,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{left}</div>
      {right && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none', color: 'inherit' }}>{inner}</Link>;
  return inner;
}
