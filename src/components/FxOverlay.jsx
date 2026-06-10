// ============================================================
// Animation overlay (PRD §10). Fast, celebratory, never blocking:
// pure overlays with pointer-events-none that auto-dismiss.
// Driven by state.fx (synced) + local 'dieUp' trigger.
// ============================================================
import { useEffect, useState } from 'react';

const DURATIONS = { dieUp: 1100, gamePoint: 1400, sink: 1300, selfSink: 1800, redemption: 1600 };

export function useFx(fx) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!fx) return;
    // dieBack / win / switch are full screens, not overlays
    if (!DURATIONS[fx.type]) return;
    setActive(fx);
    const t = setTimeout(() => setActive(null), DURATIONS[fx.type]);
    return () => clearTimeout(t);
  }, [fx?.id]);
  return active;
}

export function FxOverlay({ fx, localDieUp }) {
  const active = useFx(fx);
  const [dieUp, setDieUp] = useState(false);
  useEffect(() => {
    if (!localDieUp) return;
    setDieUp(true);
    const t = setTimeout(() => setDieUp(false), DURATIONS.dieUp);
    return () => clearTimeout(t);
  }, [localDieUp]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden" aria-hidden>
      {dieUp && (
        <div className="font-display text-6xl text-gold animate-swipe whitespace-nowrap drop-shadow-[0_0_24px_rgba(255,210,63,.5)]">
          DIE UP!
        </div>
      )}
      {active?.type === 'gamePoint' && (
        <div className="font-display text-5xl text-white animate-pop tracking-widest">
          GAME&nbsp;POINT
        </div>
      )}
      {active?.type === 'redemption' && (
        <div className="font-display text-5xl text-red-500 animate-shake tracking-widest drop-shadow-[0_0_30px_rgba(239,68,68,.6)]">
          REDEMPTION
        </div>
      )}
      {active?.type === 'sink' && <SinkAnim />}
      {active?.type === 'selfSink' && (
        <div className="text-center animate-pop">
          <div className="text-7xl">🤡</div>
          <div className="font-display text-4xl text-gold mt-2">SELF SINK</div>
          <div className="font-body text-white/70 mt-1">incredible work, truly</div>
        </div>
      )}
    </div>
  );
}

function SinkAnim() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="animate-sinkDrop text-4xl">🎲</div>
      <div className="relative mt-1">
        <div className="w-16 h-20 bg-red-600 rounded-b-lg rounded-t-sm border-t-4 border-red-400" />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 rounded-full border-4 border-gold animate-splash" />
      </div>
      <div className="font-display text-5xl text-gold mt-3 animate-pop">SINK!</div>
    </div>
  );
}
