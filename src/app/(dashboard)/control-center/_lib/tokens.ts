// Locked Tripleseat-style palette + status palette for Control Center
// All inline-style usage to avoid Tailwind processing surprises.
export const T = {
  sidebar: '#1c2b2a',
  bg: '#f4f1ea',
  card: '#fbf9f4',
  cardElev: '#ffffff',
  border: '#e4ddcd',
  borderDeep: '#cfc5ad',
  accent: '#e08a3c',
  accentDeep: '#d4762a',
  accentSoft: '#fcebd6',
  text: '#2c2c2a',
  textMuted: '#8a8475',
  textFaint: '#a39d8e',
  // Status palette
  green: '#059669', greenSoft: '#d1fae5', greenInk: '#065f46',
  amber: '#b45309', amberSoft: '#fef3c7', amberInk: '#78350f',
  red: '#b91c1c', redSoft: '#fee2e2', redInk: '#7f1d1d',
  orange: '#c2410c', orangeSoft: '#ffedd5', orangeInk: '#7c2d12',
  violet: '#6d28d9', violetSoft: '#ede9fe', violetInk: '#4c1d95',
  blue: '#1d4ed8', blueSoft: '#dbeafe', blueInk: '#1e3a8a',
  slate: '#334155', slateSoft: '#e2e8f0', slateInk: '#0f172a',
} as const;

export const FONT = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
