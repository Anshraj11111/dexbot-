/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': '#0a0a0f',
        'accent-purple': '#a855f7',
        'accent-cyan': '#22d3ee',
        'accent-blue': '#3b82f6',
        'status-online': '#22c55e',
        'status-offline': '#ef4444',
        'glass-bg': 'rgba(255,255,255,0.08)',
        'glass-border': 'rgba(168,85,247,0.4)',
      },
      screens: {
        '2xl': '1920px',
      },
    },
  },
  plugins: [],
};
