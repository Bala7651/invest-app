export const colors = {
  bg: '#050508',
  surface: '#0D0D14',
  border: '#1A1A2E',
  primary: '#4D7CFF',
  secondary: '#8B5CF6',
  stockUp: '#00E676',
  stockDown: '#FF1744',
  text: '#E0E0E0',
  muted: '#6B7280',
} as const;

export type ColorKey = keyof typeof colors;
