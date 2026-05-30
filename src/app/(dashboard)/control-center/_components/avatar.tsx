import { T } from '../_lib/tokens';
import { initials } from '../_lib/format';

export function Avatar({ first, last, url, size = 28 }: {
  first?: string | null; last?: string | null; url?: string | null; size?: number;
}) {
  const ini = initials(first, last);
  if (url) {
    return (
      <img src={url} alt={`${first ?? ''} ${last ?? ''}`}
        style={{
          width: size, height: size, borderRadius: 999, objectFit: 'cover',
          flexShrink: 0, border: `1.5px solid ${T.border}`, background: T.cardElev,
        }} />
    );
  }
  // Color the bg from a hash of initials for variety
  const palette = [T.accent, T.green, T.blue, T.violet, T.orange, T.amber];
  const code = (ini.charCodeAt(0) || 0) + (ini.charCodeAt(1) || 0);
  const bg = palette[code % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: 999, flexShrink: 0,
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size <= 28 ? 11 : 13, fontWeight: 700, letterSpacing: '-0.01em',
      boxShadow: `0 1px 2px rgba(0,0,0,0.06)`,
    }}>{ini}</div>
  );
}
