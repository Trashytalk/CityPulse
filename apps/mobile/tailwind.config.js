/* eslint-env node */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f0f8',
          100: '#c5d9ed',
          200: '#9fc0e1',
          300: '#78a7d4',
          400: '#5a93cb',
          500: '#3c80c2',
          600: '#2E5077',
          700: '#1E3A5F',
          800: '#152a45',
          900: '#0c1a2b',
        },
        accent: {
          50: '#fff3e0',
          100: '#ffe0b2',
          200: '#ffcc80',
          300: '#ffb74d',
          400: '#ffa726',
          500: '#FF9800',
          600: '#F57C00',
          700: '#EF6C00',
          800: '#E65100',
          900: '#BF360C',
        },
      },
    },
  },
  plugins: [],
};
