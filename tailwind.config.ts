import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gov-blue': '#1E3A8A',
        'gov-blue-dark': '#172554',
        'gov-blue-hover': '#1E40AF',
        'gov-bg': '#F8F9FA',
        'gov-pass': '#16A34A',
        'gov-fail': '#DC2626',
        'gov-warn': '#D97706',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: '8px',
      },
    },
  },
  plugins: [],
};
export default config;
