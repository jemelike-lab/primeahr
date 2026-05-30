import { T } from '../_lib/tokens';

export type PillTone = 'green' | 'amber' | 'red' | 'orange' | 'violet' | 'blue' | 'slate';

const TONE: Record<PillTone, { fg: string; bg: string; ink: string }> = {
  green:  { fg: T.green,  bg: T.greenSoft,  ink: T.greenInk  },
  amber:  { fg: T.amber,  bg: T.amberSoft,  ink: T.amberInk  },
  red:    { fg: T.red,    bg: T.redSoft,    ink: T.redInk    },
  orange: { fg: T.orange, bg: T.orangeSoft, ink: T.orangeInk },
  violet: { fg: T.violet, bg: T.violetSoft, ink: T.violetInk },
  blue:   { fg: T.blue,   bg: T.blueSoft,   ink: T.blueInk   },
  slate:  { fg: T.slate,  bg: T.slateSoft,  ink: T.slateInk  },
};

export function StatusPill({ tone, children, dot = true }: { tone: PillTone; children: React.ReactNode; dot?: boolean }) {
  const c = TONE[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '2px 9px', borderRadius: 999,
      background: c.bg, color: c.ink,
      fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
      lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c.fg }} />}
      {children}
    </span>
  );
}

export function bgCheckTone(category: string): PillTone {
  if (category === 'missing') return 'red';
  if (category === 'failing') return 'red';
  if (category === 'expiring') return 'orange';
  return 'slate';
}
export function evalTone(status: string): PillTone {
  if (status === 'completed') return 'green';
  if (status === 'scheduled') return 'blue';
  if (status === 'due') return 'amber';
  if (status === 'overdue') return 'red';
  return 'slate';
}
export function compTone(status: string): PillTone {
  if (status === 'proposed') return 'blue';
  if (status === 'pending_approval') return 'amber';
  if (status === 'approved') return 'green';
  if (status === 'effective') return 'green';
  if (status === 'rejected') return 'red';
  return 'slate';
}
// FIX: sync_status enum values are pending|in_flight|sent|confirmed|failed|abandoned.
// Prior version used legacy names 'retrying'/'dead_letter' which never matched.
export function syncTone(status: string): PillTone {
  if (status === 'sent' || status === 'confirmed') return 'green';
  if (status === 'pending') return 'blue';
  if (status === 'in_flight') return 'amber';
  if (status === 'failed' || status === 'abandoned') return 'red';
  return 'slate';
}
