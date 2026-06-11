/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1929',
          deep:    '#060E1A',
          card:    '#0F2035',
          line:    '#1A3352',
          mid:     '#122840',
        },
        gold:  { DEFAULT: '#F7C948', dim: '#B8922A', light: '#FFE280' },
        cream: '#F0EDE6',
        hot:   '#E8323C',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        hero:    ['"Bebas Neue"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        // Ambient background drift
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%':      { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%':      { transform: 'translate(-20px, 15px) scale(0.97)' },
        },
        // Button pop
        popIn: {
          '0%':   { transform: 'scale(0.5)',  opacity: '0' },
          '65%':  { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        // Slide in from right
        slideRight: {
          '0%':   { transform: 'translateX(40px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        // Score bounce
        scoreBounce: {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.22)' },
          '70%':  { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        // Hero slam for overlays
        heroSlam: {
          '0%':   { transform: 'scale(2.6) rotate(-6deg) skewX(-4deg)', opacity: '0', filter: 'blur(10px)' },
          '16%':  { transform: 'scale(.88) rotate(-3deg) skewX(-3deg)', opacity: '1', filter: 'blur(0)' },
          '28%':  { transform: 'scale(1.06) rotate(-3deg) skewX(-3deg)' },
          '38%':  { transform: 'scale(1)  rotate(-3deg) skewX(-3deg)' },
          '82%':  { transform: 'scale(1)  rotate(-3deg) skewX(-3deg)', opacity: '1' },
          '100%': { transform: 'scale(1.2) rotate(-3deg) skewX(-3deg)', opacity: '0' },
        },
        heroSub: {
          '0%, 20%': { transform: 'translateY(16px)', opacity: '0' },
          '38%':     { transform: 'translateY(0)',    opacity: '1' },
          '82%':     { opacity: '1' },
          '100%':    { opacity: '0' },
        },
        fadeDim: {
          '0%':   { opacity: '0' },
          '10%':  { opacity: '1' },
          '85%':  { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // Letter stagger for DIE UP
        letterPop: {
          '0%':   { transform: 'translateY(40px) scale(0.6)', opacity: '0' },
          '60%':  { transform: 'translateY(-5px) scale(1.1)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // Redemption pulse
        redemptionPulse: {
          '0%, 100%': { textShadow: '0 0 20px rgba(232,50,60,0.6)' },
          '50%':      { textShadow: '0 0 60px rgba(232,50,60,1), 0 0 100px rgba(232,50,60,0.5)' },
        },
        // Screen edge glow for game point
        edgeGlow: {
          '0%':   { boxShadow: 'inset 0 0 0 0 rgba(232,50,60,0)' },
          '50%':  { boxShadow: 'inset 0 0 80px 20px rgba(232,50,60,0.35)' },
          '100%': { boxShadow: 'inset 0 0 0 0 rgba(232,50,60,0)' },
        },
        // Self sink shake + flash
        selfSinkShake: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '10%':      { transform: 'translateX(-12px) rotate(-3deg)' },
          '20%':      { transform: 'translateX(12px) rotate(3deg)' },
          '30%':      { transform: 'translateX(-10px) rotate(-2deg)' },
          '40%':      { transform: 'translateX(10px) rotate(2deg)' },
          '50%':      { transform: 'translateX(-6px) rotate(-1deg)' },
          '60%':      { transform: 'translateX(6px) rotate(1deg)' },
          '70%':      { transform: 'translateX(-3px)' },
          '80%':      { transform: 'translateX(3px)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(247,201,72,0.6)' },
          '50%':      { boxShadow: '0 0 0 16px rgba(247,201,72,0)' },
        },
        // Cup shake on sink
        cupShake: {
          '0%, 54%, 100%': { transform: 'translateX(0)' },
          '62%':           { transform: 'translateX(-6px) rotate(-3deg)' },
          '70%':           { transform: 'translateX(6px) rotate(3deg)' },
          '78%':           { transform: 'translateX(-4px)' },
        },
        // Confetti fall
        confettiFall: {
          '0%':   { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        // Shockwave ring
        shockwave: {
          '0%':   { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(3)',   opacity: '0' },
        },
        // Edge glow for game point
        edgeGlow: {
          '0%':   { boxShadow: 'inset 0 0 0 0 rgba(232,50,60,0)' },
          '40%':  { boxShadow: 'inset 0 0 90px 30px rgba(232,50,60,0.32)' },
          '100%': { boxShadow: 'inset 0 0 0 0 rgba(232,50,60,0)' },
        },
      },
      animation: {
        drift:          'drift 12s ease-in-out infinite',
        pop:            'popIn .3s cubic-bezier(.34,1.56,.64,1) forwards',
        slideRight:     'slideRight .22s ease-out forwards',
        scoreBounce:    'scoreBounce .4s cubic-bezier(.34,1.56,.64,1)',
        heroSlam:       'heroSlam var(--fx-dur, 1.5s) cubic-bezier(.18,.9,.3,1.2) forwards',
        heroSub:        'heroSub var(--fx-dur, 1.5s) ease-out forwards',
        fadeDim:        'fadeDim var(--fx-dur, 1.5s) ease-out forwards',
        letterPop:      'letterPop .5s cubic-bezier(.34,1.56,.64,1) forwards',
        redemptionPulse:'redemptionPulse 1.2s ease-in-out infinite',
        edgeGlow:       'edgeGlow 1.5s ease-out forwards',
        selfSinkShake:  'selfSinkShake .7s ease-in-out',
        pulseGold:      'pulseGold 1.6s ease-in-out infinite',
        cupShake:       'cupShake 1.5s ease-in-out forwards',
        confettiFall:   'confettiFall var(--fall-dur, 3s) ease-in forwards',
        shockwave:      'shockwave 1s ease-out forwards',
        edgeGlow:       'edgeGlow var(--fx-dur, 1.5s) ease-out forwards',
      },
    },
  },
  plugins: [],
};
