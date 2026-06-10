// ============================================================
// In-game screens (PRD 7.5–7.11). One router keyed off
// state.phase + which team this phone belongs to.
// ============================================================
import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { other } from '../engine/engine.js';
import { Btn, Scoreboard, PlayerBubble, DrumWheel } from '../components/ui.jsx';
import { FxOverlay } from '../components/FxOverlay.jsx';
import { Shell } from './Home.jsx';

export function GameRouter() {
  const { gameState: s, myTeam } = useGame();
  const [dieUpTick, setDieUpTick] = useState(0);

  let body;
  switch (s.phase) {
    case 'play':
      body = s.possession === myTeam
        ? <ThrowingScreen onDieUp={() => setDieUpTick(Date.now())} />
        : <DefendingScreen />;
      break;
    case 'dieBack':
      body = s.possession === myTeam ? <DieBackScreen /> : <WaitingForDieBack />;
      break;
    case 'continuePrompt':
      body = <ContinuePrompt interactive={s.possession === myTeam} />;
      break;
    case 'switch':
      body = <SwitchPossession />;
      break;
    case 'endGameConfirm':
      body = <EndGameConfirm />;
      break;
    case 'redemptionModeSelect':
      body = <RedemptionModeSelect />;
      break;
    default:
      body = null;
  }

  return (
    <Shell>
      {body}
      <FxOverlay fx={s.fx} localDieUp={dieUpTick} />
      <ScoreOverride />
    </Shell>
  );
}

// ---------------- Throwing Screen (7.5) ----------------
function ThrowingScreen({ onDieUp }) {
  const { gameState: s, dispatch } = useGame();
  const [armed, setArmed] = useState(false); // bubble tapped → outcomes showing
  const team = s.possession;
  const players = s.teams[team].players;
  const idx = s.round.throwerIndex;
  const cfg = s.config;

  const throwingHouseRules = (cfg.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'throwing');

  const logThrow = (outcome) => { setArmed(false); dispatch({ type: 'throw', outcome }); };

  const outcomes = [
    { key: 'score', label: 'Score', big: true },
    cfg.cup.enabled && { key: 'cup', label: 'Cup/Dink' },
    cfg.sink.enabled && { key: 'sink', label: 'Sink' },
    { key: 'short', label: 'Short' },
    { key: 'height', label: 'Height' },
    { key: 'miss', label: 'Miss' },
    cfg.selfSink.enabled && { key: 'selfSink', label: 'Self Sink', danger: true },
  ].filter(Boolean);

  const eliminated = (i) =>
    s.inRedemption && s.redemption?.mode === 'shootout' && s.redemption.missed[i];

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      {s.inRedemption && (
        <div className="text-center font-display text-red-400 text-sm tracking-widest mt-1">
          REDEMPTION · {s.redemption.mode === 'pong' ? 'PONG — NO MISSES' : 'SHOOTOUT'}
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center gap-4 px-5">
        {players.map((p, i) => (
          <PlayerBubble
            key={i}
            name={p}
            active={i === idx}
            dim={i !== idx || eliminated(i)}
            sub={eliminated(i) ? 'out' : i === idx && !armed ? 'Tap to Throw' : null}
            onClick={() => {
              if (i !== idx || armed) return;
              onDieUp();
              setArmed(true);
            }}
          />
        ))}
      </div>
      <div className="px-4 pb-8 min-h-[200px]">
        {armed ? (
          <div className="grid grid-cols-2 gap-2 animate-pop">
            {outcomes.map((o) => (
              <Btn
                key={o.key}
                variant={o.big ? 'gold' : o.danger ? 'danger' : 'ghost'}
                className={o.big ? 'col-span-2 text-2xl py-5' : 'py-4'}
                onClick={() => logThrow(o.key)}
              >
                {o.label}
              </Btn>
            ))}
            {throwingHouseRules.map((r) => (
              <Btn key={r.id} variant="outline" className="py-4"
                onClick={() => { setArmed(false); dispatch({ type: 'houseRule', ruleId: r.id }); }}>
                {r.name}
              </Btn>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/30 font-body text-sm pt-16">
            {players[idx]} is up — tap their name to throw
          </div>
        )}
      </div>
    </>
  );
}

// ---------------- Defending Screen (7.6) ----------------
function DefendingScreen() {
  const { gameState: s, dispatch } = useGame();
  const team = other(s.possession);
  const players = s.teams[team].players;
  const [defending, setDefending] = useState(null); // playerIndex tapped
  const [fifaOpen, setFifaOpen] = useState(false);
  const [fifaPts, setFifaPts] = useState(s.config.fifa.defaultPoints);
  const defendingHouseRules = (s.config.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'defending');

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      <div className="text-center text-white/40 font-body text-xs mt-1 uppercase tracking-widest">
        Defending — {s.teams[s.possession].name} throwing
      </div>
      <div className="flex-1 flex flex-col justify-center gap-4 px-5">
        {players.map((p, i) => (
          <PlayerBubble key={i} name={p} onClick={() => setDefending(i)} sub="Tap to log catch / drop" />
        ))}
      </div>
      <div className="px-4 pb-8 flex flex-col gap-2">
        {defendingHouseRules.map((r) => (
          <Btn key={r.id} variant="outline" onClick={() => dispatch({ type: 'houseRule', ruleId: r.id })}>
            {r.name} (+{r.points === 'gameOver' ? 'W' : r.points})
          </Btn>
        ))}
        {s.config.fifa.enabled && (
          <Btn variant="outline" className="text-xl py-5" onClick={() => { setFifaPts(s.config.fifa.defaultPoints); setFifaOpen(true); }}>
            FIFA ⚽
          </Btn>
        )}
      </div>

      {defending !== null && (
        <Modal onClose={() => setDefending(null)}>
          <div className="font-display text-2xl text-white text-center mb-4">{players[defending]}</div>
          <div className="grid grid-cols-2 gap-3">
            <Btn onClick={() => { dispatch({ type: 'defense', kind: 'catch', playerIndex: defending }); setDefending(null); }}>
              Catch
            </Btn>
            <Btn variant="ghost" onClick={() => { dispatch({ type: 'defense', kind: 'drop', playerIndex: defending }); setDefending(null); }}>
              Drop
            </Btn>
          </div>
          <p className="text-white/35 text-xs font-body text-center mt-3">Catch wipes the score. Drop keeps it. Optional either way.</p>
        </Modal>
      )}

      {fifaOpen && (
        <Modal onClose={() => setFifaOpen(false)}>
          <div className="font-display text-2xl text-gold text-center">FIFA</div>
          <p className="text-white/50 text-xs font-body text-center mb-3">Points for the kick-save (default 1)</p>
          <div className="flex justify-center">
            <DrumWheel options={[1,2,3,4,5,6,7,8,9,10]} value={fifaPts} onChange={setFifaPts} />
          </div>
          <Btn className="w-full mt-4" onClick={() => { dispatch({ type: 'fifa', points: fifaPts }); setFifaOpen(false); }}>
            Confirm +{fifaPts}
          </Btn>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-navy-deep/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-navy-card border border-navy-line rounded-t-3xl w-full max-w-md p-6 pb-10 animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ---------------- Die Back (7.8) ----------------
function DieBackScreen() {
  const { dispatch } = useGame();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
      <div className="font-display text-6xl text-gold animate-pop text-center">Die Back?</div>
      <div className="flex gap-6">
        <button onClick={() => dispatch({ type: 'dieBackAnswer', confirmed: true })}
          className="w-28 h-28 rounded-full bg-gold text-navy-deep font-display text-5xl active:scale-95 transition-transform">✓</button>
        <button onClick={() => dispatch({ type: 'dieBackAnswer', confirmed: false })}
          className="w-28 h-28 rounded-full bg-navy-card border-2 border-navy-line text-white font-display text-5xl active:scale-95 transition-transform">✕</button>
      </div>
    </div>
  );
}

function WaitingForDieBack() {
  const { gameState: s } = useGame();
  return (
    <>
      <Scoreboard state={s} />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
        <div className="font-display text-2xl text-white/70">Waiting for Die Back confirmation…</div>
        <div className="text-white/30 font-body text-sm">The throwing team is deciding.</div>
      </div>
    </>
  );
}

// ---------------- Continue with [Player]? (screen 9) ----------------
function ContinuePrompt({ interactive }) {
  const { gameState: s, dispatch } = useGame();
  const isRedemptionReached = s.pendingContinue?.kind === 'redemptionReached';
  const team = s.possession;
  const nextName = isRedemptionReached
    ? s.teams[team].players[s.round.throwerIndex]
    : s.teams[team].players[1];
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="font-display text-4xl text-white text-center animate-pop">
        Continue with <span className="text-gold">{nextName}</span>?
      </div>
      {isRedemptionReached && (
        <p className="text-white/50 font-body text-sm text-center">You’ve tied it up — keep throwing or bank it.</p>
      )}
      {interactive ? (
        <div className="flex gap-4 w-full px-4">
          <Btn className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: true })}>Yes</Btn>
          <Btn variant="ghost" className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: false })}>No</Btn>
        </div>
      ) : (
        <div className="text-white/30 font-body text-sm">Throwing team is deciding…</div>
      )}
    </div>
  );
}

// ---------------- Switch Possession (7.7) ----------------
function SwitchPossession() {
  const { gameState: s, dispatch } = useGame();
  return (
    <button
      className="flex-1 flex flex-col items-center justify-center gap-4 active:bg-navy-card transition-colors"
      onClick={() => dispatch({ type: 'confirmSwitch' })}
    >
      <div className="font-display text-4xl text-white">Switch Possession</div>
      <div className="font-body text-gold">{s.teams[other(s.possession)].name} throws next</div>
      <div className="text-white/30 font-body text-sm mt-6">tap anywhere to continue</div>
    </button>
  );
}

// ---------------- End Game confirm (7.10) ----------------
function EndGameConfirm() {
  const { gameState: s, dispatch } = useGame();
  const leader = s.scores.A >= s.scores.B ? 'A' : 'B';
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="font-display text-4xl text-gold text-center">{s.teams[leader].name} hits {s.scores[leader]}</div>
      <div className="font-body text-white/60">End the game?</div>
      <div className="flex flex-col gap-3 w-full px-4">
        <Btn className="py-6 text-2xl" onClick={() => dispatch({ type: 'endGameAnswer', confirmed: true })}>
          {s.config.redemption && !s.redemptionResult ? 'Confirm → Redemption' : 'Confirm Win'}
        </Btn>
        <Btn variant="ghost" onClick={() => dispatch({ type: 'endGameAnswer', confirmed: false })}>Keep playing</Btn>
      </div>
    </div>
  );
}

// ---------------- Redemption mode select (7.11, creator only) ----------------
function RedemptionModeSelect() {
  const { gameState: s, dispatch, role } = useGame();
  if (role !== 'creator') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="font-display text-4xl text-red-500 animate-shake">REDEMPTION</div>
        <div className="text-white/40 font-body text-sm">Game creator is picking the mode…</div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center px-6 gap-4">
      <div className="font-display text-4xl text-red-500 text-center mb-2">REDEMPTION</div>
      <div className="text-center text-white/60 font-body mb-4">{s.teams[s.redemption.team].name} gets a last chance. Pick the mode:</div>
      <Btn className="py-7 text-2xl" onClick={() => dispatch({ type: 'selectRedemptionMode', mode: 'shootout' })}>
        Shootout
        <div className="text-xs font-body font-semibold opacity-60 mt-1">Throw until you miss, then next player</div>
      </Btn>
      <Btn variant="ghost" className="py-7 text-2xl" onClick={() => dispatch({ type: 'selectRedemptionMode', mode: 'pong' })}>
        Pong
        <div className="text-xs font-body font-semibold opacity-60 mt-1">No misses allowed — one miss ends it</div>
      </Btn>
    </div>
  );
}

// ---------------- Score & Turn Override (7.9, creator only) ----------------
function ScoreOverride() {
  const { gameState: s, dispatch, undo, role } = useGame();
  const [open, setOpen] = useState(false);
  const [scores, setScores] = useState(null);
  if (role !== 'creator' || s.phase === 'gameOver') return null;
  return (
    <>
      <button
        aria-label="Score override"
        onClick={() => { setScores({ ...s.scores }); setOpen(true); }}
        className="fixed top-3 right-3 z-30 w-9 h-9 rounded-full bg-navy-card border border-navy-line text-white/50 text-sm"
      >
        ✎
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="font-display text-xl text-white text-center mb-4">Score Override</div>
          <div className="flex justify-around mb-5">
            {['A', 'B'].map((t) => (
              <div key={t} className="text-center">
                <div className="text-white/50 font-body text-xs mb-2">{s.teams[t].name}</div>
                <div className="flex items-center gap-3">
                  <button className="w-12 h-12 rounded-full bg-navy-deep border border-navy-line font-display text-xl"
                    onClick={() => setScores({ ...scores, [t]: Math.max(0, scores[t] - 1) })}>−</button>
                  <div className="font-display text-4xl text-gold w-12">{scores[t]}</div>
                  <button className="w-12 h-12 rounded-full bg-navy-deep border border-navy-line font-display text-xl"
                    onClick={() => setScores({ ...scores, [t]: scores[t] + 1 })}>+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Btn onClick={() => { dispatch({ type: 'scoreOverride', scores }); setOpen(false); }}>Apply</Btn>
            <Btn variant="ghost" onClick={() => { undo(); setOpen(false); }}>Undo last action</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
