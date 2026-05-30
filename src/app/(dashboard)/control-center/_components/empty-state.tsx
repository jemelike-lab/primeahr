import { T } from '../_lib/tokens';
import { Check } from 'lucide-react';

export function EmptyState({ label = 'All clear', hint }: { label?: string; hint?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '20px 12px', flex: 1,
      color: T.textMuted, textAlign: 'center',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: T.greenSoft, color: T.green,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Check size={16} strokeWidth={3} /></div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: T.textMuted }}>{hint}</div>}
    </div>
  );
}
