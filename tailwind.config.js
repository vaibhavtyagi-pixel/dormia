/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#070914',
        card: '#111428',
        indigo: '#7c83ff',
        'indigo-light': '#c8d0ff',
        'indigo-pale': '#1a2040',
        'indigo-cloud': '#0d1230',
        mint: '#5de2b1',
        'mint-pale': '#183a33',
        amber: '#f6c453',
        'amber-warm': '#2b2314',
        'amber-pale': '#4a3c1e',
        ink: '#eef1ff',
        'text-secondary': '#dde3ff',
        border: 'rgba(124,131,255,0.24)',
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 8px 32px rgba(61, 90, 241, 0.08)',
      },
    },
  },
  plugins: [],
};
