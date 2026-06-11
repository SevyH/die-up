// ============================================================
// Animation overlay — full-screen takeovers for every hero moment.
// pointer-events-none keeps gameplay unblocked underneath.
// Driven by state.fx (Firebase-synced) + a local 'dieUp' trigger.
// ============================================================
import { useEffect, useState } from 'react';

const DURATIONS = {
  dieUp:      1300,
  gamePoint:  1600,
  dieBack:    1500,
  sink:       1800,
  selfSink:   2000,
  redemption: 2000,
};

export function useFx(fx) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!fx) return;
    if (!DURATIONS[fx.type]) return;
    setActive(fx);
    const t = setTimeout(() => setActive(null), DURATIONS[fx.type]);
    return () => clearTimeout(t);
  }, [fx?.id]);
  return active;
}

// Shared backdrop for all FX takeovers
function Takeover({ dur, children, tint = 'rgba(4,9,22,0.82)', edgeGlow = false }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ '--fx-dur': `${dur}ms` }}
      aria-hidden
    >
      <div
        className={`absolute inset-0 animate-fadeDim ${edgeGlow ? 'animate-edgeGlow' : ''}`}
        style={{ background: tint, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      />
      <div className="relative animate-fadeDim flex items-center justify-center w-full px-6">
        {children}
      </div>
    </div>
  );
}

// "DIE UP!" with staggered letter animation
function DieUpAnim() {
  const letters = ['D', 'I', 'E', '\u00a0', 'U', 'P', '!'];
  return (
    <div className="text-center">
      <div className="flex items-baseline justify-center" style={{ fontSize: 'clamp(80px, 24vw, 120px)' }}>
        {letters.map((l, i) => (
          <span
            key={i}
            className="inline-block font-display italic"
            style={{
              color: i < 3 ? 'var(--gold)' : 'var(--cream)',
              textShadow: i < 3
                ? '2px 2px 0 #080f1a, 4px 4px 0 #040a14, 6px 6px 0 #020609, 7px 10px 20px rgba(0,0,0,0.7)'
                : '2px 2px 0 #080f1a, 4px 4px 0 #040a14, 6px 6px 0 #020609, 7px 10px 20px rgba(0,0,0,0.7)',
              animation: `letterPop 0.5s cubic-bezier(.34,1.56,.64,1) ${i * 80}ms both`,
              display: 'inline-block',
            }}
          >
            {l}
          </span>
        ))}
      </div>
      {/* Shockwave ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-gold/40 animate-shockwave"
        style={{ animationDelay: '200ms' }}
      />
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
      <Takeover dur={DURATIONS.dieUp} tint="rgba(4,9,22,0.78)">
        <DieUpAnim />
      </Takeover>
    );
  }

  if (!active) return null;

  switch (active.type) {
    case 'gamePoint':
      return (
        <Takeover dur={DURATIONS.gamePoint} tint="rgba(4,9,22,0.85)" edgeGlow>
          <div className="text-center">
            <div
              className="font-display italic leading-none animate-heroSlam"
              style={{ fontSize: 'clamp(64px, 20vw, 104px)', color: 'var(--cream)',
                textShadow: '2px 2px 0 #0a1525, 4px 4px 0 #060e1a, 6px 6px 0 #030a14, 7px 10px 22px rgba(0,0,0,0.7)' }}
            >
              GAME
              <br />
              POINT
            </div>
            <div className="font-body font-bold uppercase tracking-[0.35em] text-gold/80 mt-5 animate-heroSub text-xs">
              one to win it
            </div>
            {/* Red edge glow vignette */}
            <div
              className="fixed inset-0 pointer-events-none animate-edgeGlow"
              style={{ boxShadow: 'inset 0 0 80px 30px rgba(232,50,60,0.3)', zIndex: -1 }}
            />
          </div>
        </Takeover>
      );

    case 'dieBack':
      return (
        <Takeover dur={DURATIONS.dieBack} tint="rgba(4,9,22,0.8)">
          <div className="text-center">
            <div
              className="font-display italic leading-none animate-heroSlam"
              style={{ fontSize: 'clamp(72px, 22vw, 112px)', color: 'var(--cream)',
                textShadow: '2px 2px 0 #0a1525, 4px 4px 0 #060e1a, 6px 8px 22px rgba(0,0,0,0.7)' }}
            >
              DIE BACK?
            </div>
            <div className="font-body font-bold uppercase tracking-[0.35em] text-cream/60 mt-5 animate-heroSub text-xs">
              settle it on the table
            </div>
          </div>
        </Takeover>
      );

    case 'redemption':
      return (
        <Takeover dur={DURATIONS.redemption} tint="rgba(28,4,8,0.88)">
          <div className="text-center">
            <div
              className="font-display italic leading-none animate-heroSlam animate-redemptionPulse"
              style={{ fontSize: 'clamp(64px, 20vw, 108px)', color: 'var(--hot)',
                textShadow: '2px 2px 0 #2a0608, 3px 3px 0 #1c0404, 5px 5px 0 #120303, 6px 8px 20px rgba(0,0,0,0.75)' }}
            >
              REDEMPTION
            </div>
            <div className="font-body font-bold uppercase tracking-[0.35em] text-cream/60 mt-5 animate-heroSub text-xs">
              one shot to claw back
            </div>
          </div>
        </Takeover>
      );

    case 'sink':
      return (
        <Takeover dur={DURATIONS.sink} tint="rgba(4,9,22,0.84)">
          <SinkAnim />
        </Takeover>
      );

    case 'selfSink':
      return (
        <Takeover dur={DURATIONS.selfSink} tint="rgba(28,4,8,0.85)">
          <div className="text-center">
            <div className="text-7xl mb-3 animate-selfSinkShake inline-block" style={{ animationIterationCount: 3 }}>🤡</div>
            <div
              className="font-display italic leading-tight animate-heroSlam"
              style={{ fontSize: 'clamp(48px, 16vw, 88px)', color: 'var(--hot)',
                textShadow: '2px 2px 0 #2a0608, 4px 4px 0 #120303, 5px 8px 18px rgba(0,0,0,0.7)' }}
            >
              YOUR OWN<br />CUP?!
            </div>
            <div className="font-body font-bold uppercase tracking-[0.3em] text-gold/70 mt-4 animate-heroSub text-xs">
              incredible work, truly
            </div>
          </div>
        </Takeover>
      );

    default:
      return null;
  }
}

// Die falls into red solo cup; liquid splashes; SINK! punches in
function SinkAnim() {
  return (
    <div className="relative flex flex-col items-center gap-0">
      <div className="relative" style={{ width: 130, height: 240 }}>
        {/* Falling die */}
        <div
          className="absolute left-1/2 -translate-x-1/2 text-5xl select-none"
          style={{
            animation: 'sinkDieFall 0.7s cubic-bezier(.55,0,.8,.7) forwards',
            top: 0,
            filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.7))',
            zIndex: 10,
          }}
        >
          🎲
        </div>

        {/* Splash */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 112, zIndex: 20, animation: 'sinkSplash 1s ease-out forwards' }}
        >
          <div style={{ position: 'relative', width: 110, height: 70 }}>
            <span style={{ position:'absolute', left:'50%', top:0, transform:'translateX(-50%)', width:7, height:32, borderRadius:4, background:'rgba(180,222,255,0.92)' }} />
            <span style={{ position:'absolute', left:'28%', top:7, width:11, height:11, borderRadius:'50%', background:'rgba(160,212,255,0.88)' }} />
            <span style={{ position:'absolute', left:'12%', top:18, width:8, height:8, borderRadius:'50%', background:'rgba(180,228,255,0.78)' }} />
            <span style={{ position:'absolute', left:'2%',  top:30, width:5, height:5, borderRadius:'50%', background:'rgba(160,204,255,0.68)' }} />
            <span style={{ position:'absolute', right:'28%', top:7, width:11, height:11, borderRadius:'50%', background:'rgba(160,212,255,0.88)' }} />
            <span style={{ position:'absolute', right:'12%', top:18, width:8, height:8, borderRadius:'50%', background:'rgba(180,228,255,0.78)' }} />
            <span style={{ position:'absolute', right:'2%',  top:30, width:5, height:5, borderRadius:'50%', background:'rgba(160,204,255,0.68)' }} />
            <span style={{ position:'absolute', left:'38%', top:3, width:5, height:5, borderRadius:'50%', background:'rgba(200,238,255,0.72)' }} />
            <span style={{ position:'absolute', right:'38%', top:3, width:5, height:5, borderRadius:'50%', background:'rgba(200,238,255,0.72)' }} />
          </div>
        </div>

        {/* Red solo cup */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 0, animation: 'cupShake 1.5s ease-in-out forwards', zIndex: 5 }}
        >
          {/* White rim */}
          <div style={{
            width: 96, height: 15,
            background: 'linear-gradient(180deg, #ffffff 0%, #e0e0e0 55%, #c4c4c4 100%)',
            borderRadius: '50% 50% 0 0 / 8px 8px 0 0',
            boxShadow: '0 -1px 5px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.15)',
            position: 'relative', zIndex: 3,
          }} />
          {/* Cup body */}
          <div style={{
            width: 96, height: 118,
            background: 'linear-gradient(158deg, #ff5252 0%, #e82222 32%, #c41a1a 68%, #9b1010 100%)',
            clipPath: 'polygon(8% 0%, 92% 0%, 83% 100%, 17% 100%)',
            position: 'relative', zIndex: 2, marginTop: -1,
          }}>
            {[18, 34, 50, 66, 82].map((pct, i) => (
              <div key={i} style={{ position:'absolute', top:`${pct}%`, left:'6%', right:'6%', height:2, background:'rgba(0,0,0,0.18)', borderRadius:1 }} />
            ))}
            <div style={{ position:'absolute', top:0, left:'10%', width:'14%', height:'100%', background:'linear-gradient(90deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }} />
          </div>
          {/* Bottom */}
          <div style={{ width:56, height:9, background:'linear-gradient(180deg, #7a0e0e 0%, #5a0a0a 100%)', borderRadius:'0 0 4px 4px', margin:'0 auto', zIndex:2 }} />
        </div>
      </div>

      {/* SINK! */}
      <div
        className="font-display italic leading-none animate-heroSlam"
        style={{ fontSize: 'clamp(72px, 22vw, 110px)', color: 'var(--cream)',
          textShadow: '2px 2px 0 #080f1a, 4px 4px 0 #040a14, 6px 8px 22px rgba(0,0,0,0.75)' }}
      >
        SINK!
      </div>
    </div>
  );
}
