/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#050508',
        surface: '#0D0D14',
        border: '#1A1A2E',
        primary: '#4D7CFF',
        secondary: '#8B5CF6',
        'stock-up': '#00E676',
        'stock-down': '#FF1744',
        text: '#E0E0E0',
        muted: '#6B7280',
      },
    },
  },
  plugins: [],
};
