import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { Btn } from '../components/ui.jsx';
import { USING_MOCK } from '../firebase/adapter.js';

// Ambient background — slow-drifting glow blobs
function AmbientBg() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Gold blob top-left */}
      <div className="glow-blob-1 absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full opacity-90" />
      {/* Red blob bottom-right */}
      <div className="glow-blob-2 absolute -bottom-40 -right-20 w-[380px] h-[380px] rounded-full opacity-80" />
      {/* Faint center pulse */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(ellipse, rgba(247,201,72,0.05) 0%, transparent 70%)', animation: 'drift 20s ease-in-out infinite' }}
      />
    </div>
  );
}

export function Home() {
  const game = useGame();
  const [name, setName] = useState('');
  const [asking, setAsking] = useState(false);

  return (
    <Shell>
      <AmbientBg />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-0">
        {/* Hero logotype */}
        <div className="text-3d leading-[0.82] select-none" style={{ fontSize: 'clamp(100px, 28vw, 152px)', letterSpacing: '-0.01em' }}>
          DIE
        </div>
        <div className="text-3d-light leading-[0.82] select-none" style={{ fontSize: 'clamp(100px, 28vw, 152px)', letterSpacing: '-0.01em' }}>
          UP
        </div>
        <div className="font-body text-cream/40 mt-6 text-[12px] tracking-[0.32em] uppercase font-semibold">
          huck responsibly
        </div>
      </div>

      <div className="relative z-10 pb-5 px-5 flex flex-col gap-3">
        {asking ? (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && (game.setPendingName(name.trim()), game.setLocalScreen('config'))}
              className="bg-navy-card border border-navy-line rounded-2xl px-5 py-4 text-cream text-lg font-body outline-none focus:border-gold/70 transition-colors placeholder:text-white/25"
            />
            <Btn
              disabled={!name.trim()}
              onClick={() => { game.setPendingName(name.trim()); game.setLocalScreen('config'); }}
              className="py-5 text-2xl"
            >
              Let's Go
            </Btn>
          </>
        ) : (
          <Btn onClick={() => setAsking(true)} className="py-6 text-3xl tracking-widest">
            Create Game
          </Btn>
        )}
        {USING_MOCK && (
          <p className="text-white/25 text-xs font-body text-center px-2">
            Dev mode — Firebase not configured, sync runs between browser tabs
          </p>
        )}
      </div>

      {/* Film-credit style production tag */}
      <SevCredit />
    </Shell>
  );
}

function SevCredit() {
  return (
    <div className="relative z-10 pb-7 text-center select-none">
      <div className="inline-flex items-center gap-2">
        <div className="w-8 h-px bg-white/15" />
        <span className="font-body text-[10px] tracking-[0.38em] text-white/25 uppercase">
          a&nbsp;<span className="text-white/50 font-medium tracking-[0.28em]">Sev Harrington</span>&nbsp;production
        </span>
        <div className="w-8 h-px bg-white/15" />
      </div>
    </div>
  );
}

export function JoinScreen({ joinId }) {
  const { joinGame, expired } = useGame();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  if (expired) return <Expired />;
  return (
    <Shell>
      <AmbientBg />
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-5">
        <div className="text-3d text-5xl text-center leading-none">You're Invited</div>
        <p className="font-body text-cream/50 text-center text-sm max-w-[260px]">Enter your name to join as Team 2 captain.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-navy-card border border-navy-line rounded-2xl px-5 py-4 text-cream text-lg font-body outline-none focus:border-gold/70 transition-colors placeholder:text-white/25"
        />
        <Btn
          disabled={!name.trim() || busy}
          onClick={async () => { setBusy(true); await joinGame(joinId, name.trim()); setBusy(false); }}
          className="text-2xl py-5"
        >
          Join Game
        </Btn>
      </div>
      <SevCredit />
    </Shell>
  );
}

export function Expired() {
  const { newGame } = useGame();
  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 text-center">
        <div className="text-3d-light text-5xl leading-none">Link Expired</div>
        <p className="font-body text-cream/50 text-sm max-w-[280px]">
          Invites are good for 15 minutes. Ask the game creator to start a new game.
        </p>
        <Btn variant="outline" onClick={newGame} className="text-xl py-4 max-w-[240px]">Back to Home</Btn>
      </div>
    </Shell>
  );
}

export function Shell({ children }) {
  return (
    <div className="min-h-dvh bg-navy text-cream flex flex-col font-body max-w-md mx-auto relative overflow-hidden grain">
      {children}
    </div>
  );
}
