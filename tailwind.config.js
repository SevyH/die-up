/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0A1A33', deep: '#060F1F', card: '#10243F', line: '#1B3457' },
        gold: { DEFAULT: '#FFD23F', dim: '#C9A227' },
      },
      fontFamily: {
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        swipeAcross: {
          '0%': { transform: 'translateX(-120%) skewX(-8deg)', opacity: '0' },
          '20%': { transform: 'translateX(0) skewX(-8deg)', opacity: '1' },
          '80%': { transform: 'translateX(0) skewX(-8deg)', opacity: '1' },
          '100%': { transform: 'translateX(120%) skewX(-8deg)', opacity: '0' },
        },
        popIn: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        sinkDrop: {
          '0%': { transform: 'translateY(-140px) rotate(0deg)', opacity: '1' },
          '70%': { transform: 'translateY(0) rotate(540deg)', opacity: '1' },
          '80%': { transform: 'translateY(-14px) rotate(560deg)' },
          '100%': { transform: 'translateY(0) rotate(580deg)' },
        },
        splash: {
          '0%, 60%': { transform: 'scale(0)', opacity: '0' },
          '75%': { transform: 'scale(1.4)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 210, 63, 0.55)' },
          '50%': { boxShadow: '0 0 0 14px rgba(255, 210, 63, 0)' },
        },
      },
      animation: {
        swipe: 'swipeAcross 1.1s cubic-bezier(.22,1,.36,1) forwards',
        pop: 'popIn .35s cubic-bezier(.34,1.56,.64,1) forwards',
        sinkDrop: 'sinkDrop .9s ease-in forwards',
        splash: 'splash 1.1s ease-out forwards',
        shake: 'shake .5s ease-in-out',
        pulseGold: 'pulseGold 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
