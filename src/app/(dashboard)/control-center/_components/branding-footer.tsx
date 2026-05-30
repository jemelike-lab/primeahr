import { T } from '../_lib/tokens';
import { Shield, Zap } from 'lucide-react';

export function BrandingFooter() {
  return (
    <footer style={{
      marginTop: 28, paddingTop: 18,
      borderTop: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      flexWrap: 'wrap',
      color: T.textMuted, fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.005em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Shield size={13} /> Protected by PrimeaHR encryption
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Zap size={13} /> Built and powered by VELOX &ldquo;Automated Operations&rdquo; LLC
      </div>
    </footer>
  );
}
