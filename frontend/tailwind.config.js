/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        wbo: {
          50: '#fcf0f2', 100: '#f3d6db', 200: '#e5b3ba', 300: '#c97a84',
          400: '#a84a55', 500: '#8c2a35', 600: '#7a1f2b', 700: '#6b1421',
          800: '#4a0f14', 900: '#2d080a', 950: '#1a0406',
        },
        gold: {
          DEFAULT: '#C9A44C', dark: '#A9852F', light: '#d4b56e',
        },
        cream: {
          DEFAULT: '#f5f4f2', 100: '#f0eee9', 200: '#e5e2db',
        },
      },
    },
  },
  plugins: [],
};
