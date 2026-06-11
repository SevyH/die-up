import { useRef, useEffect } from 'react';

// ---------- Big tap-target button ----------
// Complex multi-value box-shadows live in index.css as .btn-3d-* classes
// because Tailwind v3 can't parse commas inside arbitrary [] values.
export function Btn({ children, onClick, variant = 'gold', className = '', disabled }) {
  const styles = {
    gold:    'bg-gold text-navy-deep border-t border-t-[#ffe880] border-b-[3px] border-b-[#a07800] btn-3d-gold',
    ghost:   'bg-navy-card text-white border border-navy-line border-b-[3px] border-b-[#0a1628] btn-3d-ghost',
    danger:  'bg-red-500/90 text-white border-t border-t-red-400 border-b-[3px] border-b-red-800 btn-3d-danger',
    outline: 'bg-transparent text-gold border-2 border-gold btn-3d-outline',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`font-display rounded-2xl px-5 py-4 text-lg tracking-wide select-none
        btn-3d-base disabled:opacity-40
        ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ---------- Toggle ----------
export function Toggle({ on, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex items-center gap-3 select-none"
      aria-pressed={on}
    >
      {label && <span className="text-white font-body font-semibold">{label}</span>}
      <span className={`w-14 h-8 rounded-full p-1 transition-colors ${on ? 'bg-gold' : 'bg-navy-line'}`}>
        <span
          className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-6' : ''}`}
        />
      </span>
    </button>
  );
}

// ---------- iOS-style drum scroll wheel ----------
// options: array of values; render: optional formatter
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
      <div className="pointer-events-none absolute inset-x-0 top-[44px] h-[44px] border-y-2 border-gold/70" />
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
            className={`h-[44px] flex items-center justify-center snap-center font-display
              ${o === value ? 'text-gold text-xl' : 'text-white/40 text-base'}`}
          >
            {render(o)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Scoreboard ----------
export function Scoreboard({ state, highlight }) {
  const Team = ({ id }) => {
    const live = state.possession === id;
    return (
      <div className={`flex-1 text-center py-2.5 rounded-xl transition-colors ${highlight === id ? 'bg-navy-card' : ''}`}>
        <div className={`text-[11px] font-body font-bold uppercase tracking-[.18em] truncate px-1 ${live ? 'text-gold/80' : 'text-white/50'}`}>
          {state.teams[id].name}
        </div>
        <div className={`text-6xl leading-none mt-0.5 select-none ${live ? 'text-3d' : 'text-3d-light text-3d-sm'}`}>
          {state.scores[id]}
        </div>
      </div>
    );
  };
  return (
    <div className="flex items-stretch gap-2 px-3 pt-3">
      <Team id="A" />
      <div className="self-center font-hero italic text-white/25 text-2xl pb-2">–</div>
      <Team id="B" />
    </div>
  );
}

// ---------- Player bubble ----------
export function PlayerBubble({ name, active, dim, onClick, sub }) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-3xl px-4 py-6 text-center font-display text-2xl transition-all select-none
        ${active
          ? 'bg-gold text-navy-deep animate-pulseGold scale-[1.02]'
          : dim
            ? 'bg-navy-card text-white/35'
            : 'bg-navy-card text-white border border-navy-line active:bg-navy-line'}`}
    >
      {name || '—'}
      {sub && <div className="text-xs font-body font-semibold mt-1 opacity-70">{sub}</div>}
    </button>
  );
}
