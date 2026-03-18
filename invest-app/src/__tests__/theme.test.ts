const config = require('../../tailwind.config.js');

const EXPECTED_COLORS: Record<string, string> = {
  bg: '#050508',
  surface: '#0D0D14',
  border: '#1A1A2E',
  primary: '#4D7CFF',
  secondary: '#8B5CF6',
  'stock-up': '#00E676',
  'stock-down': '#FF1744',
  text: '#E0E0E0',
  muted: '#6B7280',
};

describe('tailwind.config.js cyberpunk theme tokens', () => {
  const colors = config.theme.extend.colors;

  it('has all 9 color keys', () => {
    const keys = Object.keys(EXPECTED_COLORS);
    keys.forEach((key) => {
      expect(colors).toHaveProperty(key);
    });
    expect(Object.keys(colors)).toHaveLength(9);
  });

  it.each(Object.entries(EXPECTED_COLORS))(
    'color "%s" matches expected hex %s',
    (key, expected) => {
      expect(colors[key]).toBe(expected);
    }
  );
});
