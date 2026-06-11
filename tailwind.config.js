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
        hero: ['"Russo One"', '"Archivo Black"', 'system-ui', 'sans-serif'],
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
        sinkDieFall: {
          '0%':   { transform: 'translateY(-160px) rotate(0deg)', opacity: '1' },
          '60%':  { transform: 'translateY(100px) rotate(480deg)', opacity: '1' },
          '72%':  { transform: 'translateY(92px) rotate(500deg)', opacity: '1' },
          '85%':  { transform: 'translateY(100px) rotate(520deg)', opacity: '1' },
          '100%': { transform: 'translateY(100px) rotate(520deg)', opacity: '0' },
        },
        sinkSplash: {
          '0%, 58%':  { transform: 'scaleY(0) scaleX(0.3)', opacity: '0', transformOrigin: 'bottom center' },
          '65%':      { transform: 'scaleY(1.15) scaleX(1.1)', opacity: '1', transformOrigin: 'bottom center' },
          '80%':      { transform: 'scaleY(1.3) scaleX(1.3)', opacity: '0.7', transformOrigin: 'bottom center' },
          '100%':     { transform: 'scaleY(1.6) scaleX(1.6)', opacity: '0', transformOrigin: 'bottom center' },
        },

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
        fadeDim: {
          '0%': { opacity: '0' },
          '12%': { opacity: '1' },
          '85%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        heroSlam: {
          '0%': { transform: 'scale(2.4) rotate(-6deg)', opacity: '0', filter: 'blur(8px)' },
          '18%': { transform: 'scale(.92) rotate(-3deg)', opacity: '1', filter: 'blur(0)' },
          '30%': { transform: 'scale(1.04) rotate(-3deg)' },
          '40%': { transform: 'scale(1) rotate(-3deg)' },
          '82%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
          '100%': { transform: 'scale(1.15) rotate(-3deg)', opacity: '0' },
        },
        heroSub: {
          '0%, 22%': { transform: 'translateY(14px)', opacity: '0' },
          '40%': { transform: 'translateY(0)', opacity: '1' },
          '82%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        liquidSplash: {
          '0%, 55%': { transform: 'scale(0) translateY(0)', opacity: '0' },
          '68%': { transform: 'scale(1.2) translateY(-10px)', opacity: '1' },
          '100%': { transform: 'scale(1.9) translateY(-26px)', opacity: '0' },
        },
        cupShake: {
          '0%, 54%, 100%': { transform: 'translateX(0)' },
          '62%': { transform: 'translateX(-5px) rotate(-2deg)' },
          '70%': { transform: 'translateX(5px) rotate(2deg)' },
          '78%': { transform: 'translateX(-3px)' },
        },
      },
      animation: {
        swipe: 'swipeAcross 1.1s cubic-bezier(.22,1,.36,1) forwards',
        pop: 'popIn .35s cubic-bezier(.34,1.56,.64,1) forwards',
        sinkDrop: 'sinkDrop .9s ease-in forwards',
        splash: 'splash 1.1s ease-out forwards',
        shake: 'shake .5s ease-in-out',
        pulseGold: 'pulseGold 1.6s ease-in-out infinite',
        fadeDim: 'fadeDim var(--fx-dur, 1.5s) ease-out forwards',
        heroSlam: 'heroSlam var(--fx-dur, 1.5s) cubic-bezier(.18,.9,.3,1.2) forwards',
        heroSub: 'heroSub var(--fx-dur, 1.5s) ease-out forwards',
        liquidSplash: 'liquidSplash 1.5s ease-out forwards',
        cupShake: 'cupShake 1.5s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};
