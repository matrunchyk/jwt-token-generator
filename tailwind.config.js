/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2297F3',
        secondary: '#9D2A86',
        neutral: '#575756',
      },
    },
  },
  plugins: [],
};