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

// Die drops into a red solo cup from above; liquid splashes upward; "SINK!" 3D text.
function SinkAnim() {
  return (
    <div className="relative flex flex-col items-center">
      {/* Scene container — cup at bottom, die falls into it from top */}
      <div className="relative" style={{ width: 120, height: 220 }}>

        {/* ── Falling die ── drops from top of screen down into the cup opening */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-5xl select-none"
          style={{
            animation: 'sinkDieFall 0.65s cubic-bezier(.55,0,.8,.7) forwards',
            top: 0,
            filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.6))',
            zIndex: 10,
          }}
        >
          🎲
        </div>

        {/* ── Water splash — erupts upward from the cup opening on impact ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 102, zIndex: 20, animation: 'sinkSplash 0.9s ease-out forwards' }}
        >
          {/* Central tall jet */}
          <div style={{ position: 'relative', width: 100, height: 60 }}>
            <span style={{ position:'absolute', left:'50%', top:0, transform:'translateX(-50%)', width:6, height:28, borderRadius:3, background:'rgba(180,220,255,0.92)' }} />
            {/* Left arcing droplets */}
            <span style={{ position:'absolute', left:'30%', top:8, width:10, height:10, borderRadius:'50%', background:'rgba(160,210,255,0.88)' }} />
            <span style={{ position:'absolute', left:'14%', top:18, width:7, height:7, borderRadius:'50%', background:'rgba(180,225,255,0.80)' }} />
            <span style={{ position:'absolute', left:'4%', top:30, width:5, height:5, borderRadius:'50%', background:'rgba(160,200,255,0.70)' }} />
            {/* Right arcing droplets */}
            <span style={{ position:'absolute', right:'30%', top:8, width:10, height:10, borderRadius:'50%', background:'rgba(160,210,255,0.88)' }} />
            <span style={{ position:'absolute', right:'14%', top:18, width:7, height:7, borderRadius:'50%', background:'rgba(180,225,255,0.80)' }} />
            <span style={{ position:'absolute', right:'4%', top:30, width:5, height:5, borderRadius:'50%', background:'rgba(160,200,255,0.70)' }} />
            {/* Tiny center mist drops */}
            <span style={{ position:'absolute', left:'40%', top:4, width:5, height:5, borderRadius:'50%', background:'rgba(200,235,255,0.75)' }} />
            <span style={{ position:'absolute', right:'40%', top:4, width:5, height:5, borderRadius:'50%', background:'rgba(200,235,255,0.75)' }} />
          </div>
        </div>

        {/* ── Red solo cup ── sits at the bottom center ── */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 0, animation: 'cupShake 1.5s ease-in-out forwards', zIndex: 5 }}
        >
          {/* White rim — the iconic edge at the very top of a solo cup */}
          <div style={{
            width: 90,
            height: 14,
            background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 60%, #cccccc 100%)',
            borderRadius: '50% 50% 0 0 / 7px 7px 0 0',
            boxShadow: '0 -1px 4px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.15)',
            position: 'relative',
            zIndex: 3,
          }} />
          {/* Cup body — classic solo cup trapezoid */}
          <div style={{
            width: 90,
            height: 110,
            background: 'linear-gradient(160deg, #ff4f4f 0%, #e82222 35%, #c41a1a 70%, #9b1010 100%)',
            clipPath: 'polygon(8% 0%, 92% 0%, 82% 100%, 18% 100%)',
            position: 'relative',
            zIndex: 2,
            marginTop: -1,
          }}>
            {/* Horizontal stripe lines — the signature solo cup ribbing */}
            {[18, 34, 50, 66, 82].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${pct}%`,
                left: '6%',
                right: '6%',
                height: 2,
                background: 'rgba(0,0,0,0.18)',
                borderRadius: 1,
              }} />
            ))}
            {/* Subtle highlight on left side */}
            <div style={{
              position: 'absolute', top: 0, left: '10%', width: '15%', height: '100%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, transparent 100%)',
            }} />
          </div>
          {/* Cup bottom */}
          <div style={{
            width: 54,
            height: 8,
            background: 'linear-gradient(180deg, #7a0e0e 0%, #5a0a0a 100%)',
            borderRadius: '0 0 4px 4px',
            margin: '0 auto',
            zIndex: 2,
          }} />
        </div>
      </div>

      {/* SINK! text punches in below */}
      <div className="text-3d-light text-6xl sm:text-7xl mt-3 animate-heroSlam leading-none">SINK!</div>
    </div>
  );
}
