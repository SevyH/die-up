import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { Btn } from '../components/ui.jsx';
import { USING_MOCK } from '../firebase/adapter.js';

export function Home() {
  const game = useGame();
  const [name, setName] = useState('');
  const [asking, setAsking] = useState(false);

  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <div className="font-display text-7xl text-gold leading-none -skew-x-6">DIE</div>
        <div className="font-display text-7xl text-white leading-none -skew-x-6">UP</div>
        <div className="font-body text-white/50 mt-3 text-sm">beer die, tracked live</div>
      </div>
      <div className="pb-10 px-6 flex flex-col gap-3">
        {asking ? (
          <>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-navy-card border border-navy-line rounded-2xl px-4 py-4 text-white text-lg font-body outline-none focus:border-gold"
            />
            <Btn
              disabled={!name.trim()}
              onClick={() => { game.setPendingName(name.trim()); game.setLocalScreen('config'); }}
            >
              Let’s go
            </Btn>
          </>
        ) : (
          <Btn onClick={() => setAsking(true)} className="text-2xl py-5">Create Game</Btn>
        )}
        {USING_MOCK && (
          <p className="text-white/30 text-xs font-body text-center">
            Dev mode: no Firebase config found — sync runs locally between browser tabs.
          </p>
        )}
      </div>
    </Shell>
  );
}

export function JoinScreen({ joinId }) {
  const { joinGame, expired } = useGame();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  if (expired) return <Expired />;
  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <div className="font-display text-4xl text-gold">You’re invited</div>
        <p className="font-body text-white/60 text-center">Enter your name to join as Team 2 captain.</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-navy-card border border-navy-line rounded-2xl px-4 py-4 text-white text-lg font-body outline-none focus:border-gold"
        />
        <Btn
          disabled={!name.trim() || busy}
          className="w-full"
          onClick={async () => { setBusy(true); await joinGame(joinId, name.trim()); setBusy(false); }}
        >
          Join Game
        </Btn>
      </div>
    </Shell>
  );
}

export function Expired() {
  const { newGame } = useGame();
  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-4 text-center">
        <div className="font-display text-4xl text-white">Link expired</div>
        <p className="font-body text-white/60">
          Invites are good for 15 minutes. Ask the game creator to start a new game.
        </p>
        <Btn variant="outline" onClick={newGame}>Back to Home</Btn>
      </div>
    </Shell>
  );
}

export function Shell({ children }) {
  return (
    <div className="min-h-dvh bg-navy text-white flex flex-col font-body max-w-md mx-auto">
      {children}
    </div>
  );
}
