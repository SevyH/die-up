import { useRef, useEffect, useState } from 'react';

// ── Primary tap-target button ──
// Complex box-shadows live in index.css as named classes
export function Btn({ children, onClick, variant = 'gold', className = '', disabled }) {
  const styles = {
    gold: 'bg-gold text-navy-deep font-bold border-b-4 border-b-[#8a6800] btn-3d-gold',
    ghost: 'bg-navy-card text-cream border border-navy-line border-b-4 border-b-navy-deep btn-3d-ghost',
    danger: 'bg-hot text-white border-b-4 border-b-[#7a0e14] btn-3d-danger',
    outline: 'bg-transparent text-gold border-2 border-gold btn-3d-outline',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`font-display tracking-wider italic select-none rounded-2xl px-5 py-4 text-xl
        btn-3d-base disabled:opacity-35 disabled:cursor-not-allowed w-full
        ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Premium toggle ──
export function Toggle({ on, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center gap-3 select-none"
      aria-pressed={on}
    >
      {label && <span className="text-cream font-body font-semibold text-sm">{label}</span>}
      <span className={`relative w-14 h-8 rounded-full p-1 transition-all duration-200 ${on ? 'toggle-track-on' : 'toggle-track-off'}`}>
        <span
          className={`block w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-0'}`}
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.35)' }}
        />
      </span>
    </button>
  );
}

// ── iOS-style drum scroll wheel ──
export function DrumWheel({ options, value, onChange, render = (v) => String(v) }) {
  const ref = useRef(null);
  const ITEM = 44;
  useEffect(() => {
    const idx = options.indexOf(value);
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onScroll = () => {
    const idx = Math.round(ref.current.scrollTop / ITEM);
    const v = options[Math.min(options.length - 1, Math.max(0, idx))];
    if (v !== value) onChange(v);
  };
  return (
    <div className="relative h-[132px] w-28 overflow-hidden rounded-xl bg-navy-deep border border-navy-line">
      <div className="pointer-events-none absolute inset-x-0 top-[44px] h-[44px] border-y-2 border-gold/60" />
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[44px]"
      >
        {options.map((o) => (
          <div
            key={String(o)}
            onClick={() => {
              onChange(o);
              ref.current.scrollTo({ top: options.indexOf(o) * ITEM, behavior: 'smooth' });
            }}
            className={`h-[44px] flex items-center justify-center snap-center font-display italic
              ${o === value ? 'text-gold text-2xl' : 'text-white/35 text-lg'}`}
          >
            {render(o)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Scoreboard ──
export function Scoreboard({ state, highlight }) {
  const Team = ({ id }) => {
    const live = state.possession === id;
    return (
      <div className={`flex-1 text-center py-3 rounded-2xl transition-all duration-200 ${highlight === id ? 'bg-navy-card card-glow-gold' : ''}`}>
        <div className={`text-[10px] font-body font-bold uppercase tracking-[0.22em] truncate px-2 mb-1 ${live ? 'text-gold' : 'text-white/35'}`}>
          {state.teams[id].name}
        </div>
        <ScoreNumber value={state.scores[id]} active={live} />
        {live && (
          <div className="w-6 h-0.5 bg-gold/60 mx-auto mt-1 rounded-full" />
        )}
      </div>
    );
  };
  return (
    <div className="flex items-stretch gap-2 px-4 pt-4">
      <Team id="A" />
      <div className="self-center flex flex-col items-center gap-1 pb-2">
        <div className="w-px h-6 bg-navy-line" />
        <div className="font-display italic text-white/20 text-base">vs</div>
        <div className="w-px h-6 bg-navy-line" />
      </div>
      <Team id="B" />
    </div>
  );
}

// Animated score number
function ScoreNumber({ value, active }) {
  const [prev, setPrev] = useState(value);
  const [bouncing, setBouncing] = useState(false);
  useEffect(() => {
    if (value !== prev) {
      setPrev(value);
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 450);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div
      className={`text-7xl leading-none select-none font-display italic transition-all
        ${active ? 'text-3d score-glow-gold' : 'text-3d-light text-3d-sm'}
        ${bouncing ? 'animate-scoreBounce' : ''}`}
    >
      {value}
    </div>
  );
}

// ── Player bubble ──
export function PlayerBubble({ name, active, dim, onClick, sub }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-3xl px-4 py-6 text-center font-display italic text-2xl tracking-wide transition-all select-none
        ${active
          ? 'bg-gold text-navy-deep animate-pulseGold scale-[1.02] font-bold'
          : dim
            ? 'bg-navy-card text-white/25 border border-navy-line'
            : 'bg-navy-card text-cream border border-navy-line active:border-gold/40'}`}
      style={active ? { boxShadow: '0 0 0 2px rgba(247,201,72,0.8), 0 0 24px rgba(247,201,72,0.25), 0 4px 16px rgba(0,0,0,0.4)' } : {}}
    >
      {name || '—'}
      {sub && <div className={`text-[11px] font-body font-semibold mt-1 ${active ? 'opacity-60' : 'text-gold/60'}`}>{sub}</div>}
    </button>
  );
}
