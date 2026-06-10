// ============================================================
// In-game screens (V1). One router keyed off state.phase +
// which team this phone belongs to.
//
// Throwing screen is now a TWO-STEP flow:
//   Step 1 — Hit · Short · Height · Miss · Self Sink
//   Step 2 — (only after Hit) Score · Caught · Dink · Sink
//            + throwing-side house rules
// "Caught" on the throwing screen replaces the old defending-team
// catch log, so the defending screen is FIFA + defending rules only.
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

// ---------------- Redemption banner ----------------
function RedemptionBanner({ s }) {
  if (!s.inRedemption) return null;
  return (
    <div className="text-center mt-1">
      <span className="font-hero italic text-[13px] tracking-[.2em] text-red-400">
        REDEMPTION · {s.redemption.mode === 'pong' ? 'PONG — NO MISSES' : 'SHOOTOUT'}
      </span>
    </div>
  );
}

// ---------------- Throwing Screen — two-step ----------------
function ThrowingScreen({ onDieUp }) {
  const { gameState: s, dispatch } = useGame();
  const [step, setStep] = useState(null); // null = pick player, 'top' = step1, 'hit' = step2
  const team = s.possession;
  const players = s.teams[team].players;
  const idx = s.round.throwerIndex;
  const cfg = s.config;

  const throwingHouseRules = (cfg.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'throwing');

  const logThrow = (outcome) => { setStep(null); dispatch({ type: 'throw', outcome }); };

  const eliminated = (i) =>
    s.inRedemption && s.redemption?.mode === 'shootout' && s.redemption.turnMissed?.[i];

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      <RedemptionBanner s={s} />
      <div className="flex-1 flex flex-col justify-center gap-3 px-5">
        {players.map((p, i) => (
          <PlayerBubble
            key={i}
            name={p}
            active={i === idx}
            dim={i !== idx || eliminated(i)}
            sub={eliminated(i) ? 'out' : i === idx && step === null ? 'Tap to Throw' : null}
            onClick={() => {
              if (i !== idx || step !== null) return;
              onDieUp();
              setStep('top');
            }}
          />
        ))}
      </div>

      <div className="px-4 pb-8 min-h-[232px]">
        {step === 'top' && (
          <div className="grid grid-cols-2 gap-2 animate-pop">
            <Btn variant="gold" className="col-span-2 text-2xl py-5" onClick={() => setStep('hit')}>
              Hit
            </Btn>
            <Btn variant="ghost" className="py-4" onClick={() => logThrow('short')}>Short</Btn>
            <Btn variant="ghost" className="py-4" onClick={() => logThrow('height')}>Height</Btn>
            <Btn variant="ghost" className="py-4" onClick={() => logThrow('miss')}>Miss</Btn>
            {cfg.selfSink.enabled ? (
              <Btn variant="danger" className="py-4" onClick={() => logThrow('selfSink')}>Self Sink</Btn>
            ) : (
              <div />
            )}
          </div>
        )}

        {step === 'hit' && (
          <div className="animate-pop">
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="gold" className="text-xl py-5" onClick={() => logThrow('score')}>
                Score
                <div className="text-[11px] font-body font-semibold opacity-70 mt-0.5">+1</div>
              </Btn>
              <Btn variant="ghost" className="text-xl py-5" onClick={() => logThrow('caught')}>
                Caught
                <div className="text-[11px] font-body font-semibold opacity-70 mt-0.5">nullified · 0</div>
              </Btn>
              {cfg.cup.enabled && (
                <Btn variant="gold" className="text-xl py-5" onClick={() => logThrow('cup')}>
                  Dink
                  <div className="text-[11px] font-body font-semibold opacity-70 mt-0.5">+{cfg.cup.points}</div>
                </Btn>
              )}
              {cfg.sink.enabled && (
                <Btn variant="gold" className="text-xl py-5" onClick={() => logThrow('sink')}>
                  Sink
                  <div className="text-[11px] font-body font-semibold opacity-70 mt-0.5">+{cfg.sink.points}</div>
                </Btn>
              )}
            </div>
            {throwingHouseRules.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {throwingHouseRules.map((r) => (
                  <Btn key={r.id} variant="outline" className="py-3"
                    onClick={() => { setStep(null); dispatch({ type: 'houseRule', ruleId: r.id }); }}>
                    {r.name}{r.points !== 'gameOver' ? ` +${r.points}` : ''}
                  </Btn>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep('top')}
              className="w-full mt-2 py-3 text-white/45 font-body text-sm active:text-white"
            >
              ← back
            </button>
          </div>
        )}

        {step === null && (
          <div className="text-center text-white/30 font-body text-sm pt-16">
            {players[idx]} is up — tap their name to throw
          </div>
        )}
      </div>
    </>
  );
}

// ---------------- Defending Screen — FIFA + defending house rules ----------------
function DefendingScreen() {
  const { gameState: s, dispatch } = useGame();
  const team = other(s.possession);
  const players = s.teams[team].players;
  const [fifaOpen, setFifaOpen] = useState(false);
  const [fifaPts, setFifaPts] = useState(s.config.fifa.defaultPoints);
  const defendingHouseRules = (s.config.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'defending');

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      <div className="text-center text-white/40 font-body text-xs mt-1 uppercase tracking-widest">
        Defending — {s.teams[s.possession].name} throwing
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3 px-5">
        {players.map((p, i) => (
          <div key={i} className="w-full rounded-3xl px-4 py-6 text-center font-display text-2xl bg-navy-card text-white/80 border border-navy-line">
            {p || '—'}
          </div>
        ))}
        <p className="text-center text-white/30 font-body text-xs px-6">
          Catches are now logged by the throwing team. This side handles FIFA and defending house rules only.
        </p>
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

// ---------------- Die Back ----------------
function DieBackScreen() {
  const { dispatch } = useGame();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-3d text-6xl text-center leading-none">Die Back?</div>
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

// ---------------- Continue with [Player]? ----------------
// Shared by Game Point and Redemption (identical Yes/No behaviour).
function ContinuePrompt({ interactive }) {
  const { gameState: s } = useGame();
  const { dispatch } = useGame();
  const kind = s.pendingContinue?.kind;
  const team = s.possession;
  const roster = s.teams[team].players;

  let nextName, sub;
  if (kind === 'redemptionStrike') {
    nextName = roster[s.round.throwerIndex];
    sub = 'One off the lead — keep shooting, or turn it over.';
  } else if (kind === 'redemptionMiss') {
    nextName = roster[s.pendingContinue.nextIdx];
    sub = 'Missed. Send up the next shooter, or turn it over.';
  } else {
    nextName = roster[1];
    sub = 'Game in hand — let them throw, or begin redemption.';
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-3d-light text-4xl sm:text-5xl text-center leading-tight animate-pop">
        Continue with<br /><span className="text-3d">{nextName}</span>?
      </div>
      <p className="text-white/50 font-body text-sm text-center max-w-xs">{sub}</p>
      {interactive ? (
        <div className="flex gap-4 w-full px-4 max-w-md">
          <Btn className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: true })}>Yes</Btn>
          <Btn variant="ghost" className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: false })}>No</Btn>
        </div>
      ) : (
        <div className="text-white/30 font-body text-sm">{s.teams[team].name} is deciding…</div>
      )}
    </div>
  );
}

// ---------------- Switch Possession ----------------
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

// ---------------- Redemption mode select (creator only) ----------------
function RedemptionModeSelect() {
  const { gameState: s, dispatch, role } = useGame();
  const shooting = s.redemption?.shootingTeam;
  if (role !== 'creator') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="text-3d text-4xl" style={{ color: '#FF5247' }}>REDEMPTION</div>
        <div className="text-white/40 font-body text-sm">Game creator is picking the mode…</div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center px-6 gap-4">
      <div className="text-center text-4xl mb-2 text-3d" style={{ color: '#FF5247' }}>REDEMPTION</div>
      <div className="text-center text-white/60 font-body mb-4">
        {s.teams[shooting].name} gets a last chance. Pick the mode:
      </div>
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

// ---------------- Score & Turn Override (creator only) ----------------
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
