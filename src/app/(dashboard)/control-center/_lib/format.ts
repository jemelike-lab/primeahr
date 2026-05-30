// Lightweight formatters — server-safe (no Intl-only client APIs).
export function fullName(first?: string | null, last?: string | null): string {
  return [first, last].filter(Boolean).join(' ') || 'Unknown';
}
export function initials(first?: string | null, last?: string | null): string {
  const a = (first || '').trim()[0] || '';
  const b = (last || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}
export function relTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.round((now - t) / 1000);
  if (Math.abs(diff) < 45) return 'just now';
  const m = Math.round(diff / 60);
  if (Math.abs(m) < 60) return diff < 0 ? `in ${Math.abs(m)}m` : `${m}m ago`;
  const h = Math.round(m / 60);
  if (Math.abs(h) < 24) return diff < 0 ? `in ${Math.abs(h)}h` : `${h}h ago`;
  const d = Math.round(h / 24);
  if (Math.abs(d) < 30) return diff < 0 ? `in ${Math.abs(d)}d` : `${d}d ago`;
  const mo = Math.round(d / 30);
  if (Math.abs(mo) < 12) return diff < 0 ? `in ${Math.abs(mo)}mo` : `${mo}mo ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function fullDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
export function money(n: number | null | undefined, currency = 'USD'): string {
  if (n == null || isNaN(Number(n))) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(n));
  } catch { return `$${Number(n).toFixed(2)}`; }
}
export function titleize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}
