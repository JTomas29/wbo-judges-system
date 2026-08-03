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
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        badgePulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.5)' },
          '70%': { boxShadow: '0 0 0 6px rgba(239, 68, 68, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)' },
        },
        notifSlideIn: {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        toastSlideUp: {
          '0%': { opacity: '0', transform: 'translate(-50%, 12px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        dropdownIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
        slideUp: 'slideUp 0.3s ease-out',
        pulseDot: 'pulseDot 1.5s ease-in-out infinite',
        slideInRight: 'slideInRight 0.3s ease-out',
        badgePulse: 'badgePulse 2s infinite',
        notifSlideIn: 'notifSlideIn 0.3s ease-out',
        toastSlideUp: 'toastSlideUp 0.3s ease-out',
        dropdownIn: 'dropdownIn 0.16s ease-out',
      },
    },
  },
  plugins: [],
};
