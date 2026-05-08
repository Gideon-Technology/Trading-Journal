import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0D1117',
          card: '#161B22',
          elevated: '#1C2128',
          border: '#21262D',
        },
        win: '#3FB950',
        loss: '#F85149',
        breakeven: '#D29922',
        accent: '#58A6FF',
        muted: '#8B949E',
        text: '#E6EDF3',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
