// ============================================================
// Animation overlay (§4 V1). Every hero moment is a FULL-SCREEN
// takeover: the game blurs + dims behind bold 3D text, the beat
// plays for ~1.2–1.8s, then snaps back. pointer-events-none keeps
// gameplay unblocked underneath; overlays auto-dismiss.
//
// Driven by state.fx (Firebase-synced) + a local 'dieUp' trigger.
// ============================================================
import { useEffect, useState } from 'react';

// duration per beat (ms). Kept to the 1–2s window from the spec.
const DURATIONS = {
  dieUp: 1300,
  gamePoint: 1500,
  dieBack: 1400,
  sink: 1700,
  selfSink: 1700,
  redemption: 1600,
};

export function useFx(fx) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!fx) return;
    if (!DURATIONS[fx.type]) return;   // win/switch are dedicated screens
    setActive(fx);
    const t = setTimeout(() => setActive(null), DURATIONS[fx.type]);
    return () => clearTimeout(t);
  }, [fx?.id]);
  return active;
}

// Shared full-screen backdrop: blur + dim takeover.
function Takeover({ dur, children, tint = 'rgba(4,9,18,.74)' }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ '--fx-dur': `${dur}ms` }}
      aria-hidden
    >
      <div
        className="absolute inset-0 animate-fadeDim"
        style={{ background: tint, backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }}
      />
      <div className="relative animate-fadeDim flex items-center justify-center w-full px-6">
        {children}
      </div>
    </div>
  );
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

  if (dieUp) {
    return (
      <Takeover dur={DURATIONS.dieUp} tint="rgba(4,9,18,.7)">
        <div className="text-3d-light text-7xl sm:text-8xl animate-heroSlam text-center leading-none">
          DIE UP!
        </div>
      </Takeover>
    );
  }

  if (!active) return null;

  switch (active.type) {
    case 'gamePoint':
      return (
        <Takeover dur={DURATIONS.gamePoint}>
          <div className="text-center">
            <div className="text-3d-light text-6xl sm:text-7xl animate-heroSlam leading-none">GAME POINT</div>
            <div className="font-body font-extrabold uppercase tracking-[.35em] text-gold/90 mt-5 animate-heroSub text-sm">
              one to win it
            </div>
          </div>
        </Takeover>
      );
    case 'dieBack':
      return (
        <Takeover dur={DURATIONS.dieBack}>
          <div className="text-center">
            <div className="text-3d-light text-6xl sm:text-7xl animate-heroSlam leading-none">DIE BACK?</div>
            <div className="font-body font-extrabold uppercase tracking-[.35em] text-white/70 mt-5 animate-heroSub text-sm">
              settle it on the table
            </div>
          </div>
        </Takeover>
      );
    case 'redemption':
      return (
        <Takeover dur={DURATIONS.redemption} tint="rgba(26,4,8,.78)">
          <div className="text-center">
            <div
              className="text-6xl sm:text-7xl animate-heroSlam leading-none font-hero italic"
              style={{
                color: '#FF5247',
                textShadow:
                  '1px 1px 0 #2a0606,2px 2px 0 #1c0404,3px 3px 0 #120303,4px 5px 0 #0a0202,5px 8px 16px rgba(0,0,0,.6)',
              }}
            >
              REDEMPTION
            </div>
            <div className="font-body font-extrabold uppercase tracking-[.35em] text-white/70 mt-5 animate-heroSub text-sm">
              one shot to claw back
            </div>
          </div>
        </Takeover>
      );
    case 'sink':
      return (
        <Takeover dur={DURATIONS.sink}>
          <SinkAnim />
        </Takeover>
      );
    case 'selfSink':
      return (
        <Takeover dur={DURATIONS.selfSink} tint="rgba(4,9,18,.8)">
          <div className="text-center animate-heroSlam">
            <div className="text-7xl sm:text-8xl mb-2">🤡</div>
            <div className="text-3d-light text-5xl sm:text-6xl leading-none">SELF SINK</div>
            <div className="font-body font-extrabold uppercase tracking-[.3em] text-gold/80 mt-4 text-sm">
              incredible work, truly
            </div>
          </div>
        </Takeover>
      );
    default:
      return null;
  }
}

// Die drops into a red solo cup; liquid splashes out on impact; "Sink!" 3D text.
function SinkAnim() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative h-40 w-32 flex items-end justify-center">
        {/* falling die */}
        <div className="absolute left-1/2 -translate-x-1/2 animate-sinkDrop text-5xl drop-shadow-[0_6px_8px_rgba(0,0,0,.5)]">
          🎲
        </div>
        {/* splash droplets */}
        <div className="absolute left-1/2 top-16 -translate-x-1/2 animate-liquidSplash">
          <div className="relative w-24 h-10">
            <span className="absolute left-1 top-3 w-2.5 h-2.5 rounded-full bg-amber-300/90" />
            <span className="absolute left-6 top-0 w-2 h-2 rounded-full bg-amber-200/90" />
            <span className="absolute right-6 top-0 w-2 h-2 rounded-full bg-amber-200/90" />
            <span className="absolute right-1 top-3 w-2.5 h-2.5 rounded-full bg-amber-300/90" />
            <span className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-100" />
          </div>
        </div>
        {/* red solo cup */}
        <div className="animate-cupShake relative">
          <div
            className="w-20 h-24"
            style={{
              background: 'linear-gradient(180deg,#ef4444 0%,#dc2626 55%,#b91c1c 100%)',
              clipPath: 'polygon(12% 0,88% 0,78% 100%,22% 100%)',
              borderRadius: '4px',
            }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[4.6rem] h-3 rounded-[50%] bg-red-300/90" />
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-2 rounded-[50%] bg-[#7a1414]" />
        </div>
      </div>
      <div className="text-3d-light text-6xl sm:text-7xl mt-3 animate-heroSlam leading-none">SINK!</div>
    </div>
  );
}
