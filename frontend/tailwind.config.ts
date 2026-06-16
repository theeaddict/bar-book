import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF3E4',
        primary: '#34241A',
        accent: '#E2A23B',
        success: '#3F7363',
        danger: '#C1502E',
        teal: '#3F7363',
        'primary-light': '#5A3E2E',
        'accent-light': '#EAB55C',
        'accent-dark': '#C48A2E',
      },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
    },
  },
  plugins: [],
};

export default config;
