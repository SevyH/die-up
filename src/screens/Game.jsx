// ============================================================
// In-game screens — redesigned. Game logic 100% unchanged.
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

// Redemption banner shown inside game screens
function RedemptionBanner({ s }) {
  if (!s.inRedemption) return null;
  return (
    <div className="mx-4 mt-2 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2" style={{ background: 'rgba(232,50,60,0.12)', border: '1px solid rgba(232,50,60,0.25)' }}>
      <div className="w-1.5 h-1.5 rounded-full bg-hot animate-pulse" />
      <span className="font-display italic text-hot text-sm tracking-[0.2em]">
        REDEMPTION · {s.redemption.mode === 'pong' ? 'PONG — NO MISSES' : 'SHOOTOUT'}
      </span>
    </div>
  );
}

// ── Throwing Screen — two-step ──
function ThrowingScreen({ onDieUp }) {
  const { gameState: s, dispatch } = useGame();
  const [step, setStep] = useState(null);
  const team = s.possession;
  const players = s.teams[team].players;
  const defTeam = team === 'A' ? 'B' : 'A';
  const defPlayers = s.teams[defTeam].players;
  const idx = s.round.throwerIndex;
  const cfg = s.config;
  const throwingHouseRules = (cfg.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'throwing');

  const logThrow = (outcome, opts = {}) => {
    setStep(null);
    dispatch({ type: 'throw', outcome, ...opts });
  };

  const eliminated = (i) =>
    s.inRedemption && s.redemption?.mode === 'shootout' && s.redemption.turnMissed?.[i];

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      <RedemptionBanner s={s} />

      <div className="flex-1 flex flex-col justify-center gap-3 px-4">
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

      <div className="px-4 pb-8 min-h-[240px]">
        {step === 'top' && (
          <div className="grid grid-cols-2 gap-2 animate-pop">
            <Btn variant="gold" className="col-span-2 text-3xl py-6" onClick={() => setStep('hit')}>
              Hit
            </Btn>
            <Btn variant="ghost" className="py-5 text-xl" onClick={() => logThrow('short')}>Short</Btn>
            <Btn variant="ghost" className="py-5 text-xl" onClick={() => logThrow('height')}>Height</Btn>
            <Btn variant="ghost" className="py-5 text-xl" onClick={() => logThrow('miss')}>Miss</Btn>
            {cfg.selfSink.enabled ? (
              <Btn variant="danger" className="py-5 text-xl" onClick={() => logThrow('selfSink')}>Self Sink</Btn>
            ) : <div />}
          </div>
        )}

        {step === 'hit' && (
          <div className="animate-pop">
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="gold" className="py-6" onClick={() => logThrow('score')}>
                <span className="text-2xl btn-label-3d-dark">Score</span>
                <div className="text-[11px] font-body font-semibold opacity-60 mt-1 not-italic">+1</div>
              </Btn>
              <Btn variant="ghost" className="py-6" onClick={() => setStep('caught')}>
                <span className="text-2xl btn-label-3d">Caught</span>
                <div className="text-[11px] font-body font-semibold opacity-55 mt-1 not-italic">nullified · 0</div>
              </Btn>
              {cfg.cup.enabled && (
                <Btn variant="gold" className="py-6" onClick={() => logThrow('cup')}>
                  <span className="text-2xl btn-label-3d-dark">Dink</span>
                  <div className="text-[11px] font-body font-semibold opacity-60 mt-1 not-italic">+{cfg.cup.points}</div>
                </Btn>
              )}
              {cfg.sink.enabled && (
                <Btn variant="gold" className="py-6" onClick={() => logThrow('sink')}>
                  <span className="text-2xl btn-label-3d-dark">Sink</span>
                  <div className="text-[11px] font-body font-semibold opacity-60 mt-1 not-italic">+{cfg.sink.points}</div>
                </Btn>
              )}
            </div>
            {throwingHouseRules.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {throwingHouseRules.map((r) => (
                  <Btn key={r.id} variant="outline" className="py-4"
                    onClick={() => { setStep(null); dispatch({ type: 'houseRule', ruleId: r.id }); }}>
                    {r.name}{r.points !== 'gameOver' ? ` +${r.points}` : ''}
                  </Btn>
                ))}
              </div>
            )}
            <button
              onClick={() => setStep('top')}
              className="w-full mt-2 py-3 text-cream/35 font-body text-sm active:text-cream"
            >
              ← back
            </button>
          </div>
        )}

        {step === 'caught' && (
          <div className="animate-pop">
            <div className="text-center text-cream/50 font-body text-xs mb-3 tracking-[0.25em] uppercase">
              Who caught it?
            </div>
            <div className="flex flex-col gap-2">
              {defPlayers.map((p, i) => (
                <Btn
                  key={i}
                  variant="ghost"
                  className="py-6 text-2xl"
                  onClick={() => logThrow('caught', { catcherIndex: i })}
                >
                  {p || `Player ${i + 1}`}
                </Btn>
              ))}
            </div>
            <button
              onClick={() => setStep('hit')}
              className="w-full mt-2 py-3 text-cream/35 font-body text-sm active:text-cream"
            >
              ← back
            </button>
          </div>
        )}

        {step === null && (
          <div className="text-center text-cream/25 font-body text-sm pt-16">
            {players[idx]} is up — tap their name to throw
          </div>
        )}
      </div>
    </>
  );
}

// ── Defending Screen ──
function DefendingScreen() {
  const { gameState: s, dispatch } = useGame();
  const team = other(s.possession);
  const players = s.teams[team].players;
  const [fifaOpen, setFifaOpen] = useState(false);
  const [fifaPts, setFifaPts] = useState(s.config.fifa.defaultPoints);
  const [dropFlash, setDropFlash] = useState({});
  const defendingHouseRules = (s.config.houseRules || []).filter((r) => r.enabled && r.awardsTo === 'defending');

  const dropCounts = players.map((_, i) =>
    s.defenseLog.filter((d) => d.team === team && d.playerIndex === i && d.kind === 'drop').length
  );

  const logDrop = (i) => {
    dispatch({ type: 'defense', playerIndex: i, kind: 'drop' });
    setDropFlash((prev) => ({ ...prev, [i]: true }));
    setTimeout(() => setDropFlash((prev) => ({ ...prev, [i]: false })), 600);
  };

  return (
    <>
      <Scoreboard state={s} highlight={team} />
      <div className="text-center text-cream/35 font-body text-xs mt-2 uppercase tracking-[0.25em]">
        Defending — {s.teams[s.possession].name} throwing
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3 px-4">
        {players.map((p, i) => (
          <button
            key={i}
            onClick={() => logDrop(i)}
            className={`w-full rounded-3xl px-4 py-6 text-center font-display italic text-2xl
              border transition-all select-none
              ${dropFlash[i]
                ? 'bg-hot/15 border-hot/50 scale-[0.98]'
                : 'bg-navy-card border-navy-line text-cream/80 active:border-cream/20 active:bg-navy-mid'}`}
          >
            <span className={dropFlash[i] ? 'text-hot' : ''}>{p || '—'}</span>
            {dropCounts[i] > 0 && (
              <div className="text-[11px] font-body font-semibold mt-1 text-hot/70 tracking-wide">
                {dropCounts[i]} drop{dropCounts[i] !== 1 ? 's' : ''}
              </div>
            )}
            {dropCounts[i] === 0 && (
              <div className="text-[10px] font-body mt-1 text-cream/20 tracking-wide">
                tap to log drop
              </div>
            )}
          </button>
        ))}
        <p className="text-center text-cream/25 font-body text-xs px-6 mt-1">
          Catches are logged by the throwing team. Tap your name to log a drop — optional.
        </p>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-2">
        {defendingHouseRules.map((r) => (
          <Btn key={r.id} variant="outline" className="py-4" onClick={() => dispatch({ type: 'houseRule', ruleId: r.id })}>
            {r.name} (+{r.points === 'gameOver' ? 'W' : r.points})
          </Btn>
        ))}
        {s.config.fifa.enabled && (
          <Btn variant="outline" className="py-5 text-2xl" onClick={() => { setFifaPts(s.config.fifa.defaultPoints); setFifaOpen(true); }}>
            FIFA ⚽
          </Btn>
        )}
      </div>

      {fifaOpen && (
        <Modal onClose={() => setFifaOpen(false)}>
          <div className="font-display italic text-2xl text-gold text-center mb-1">FIFA</div>
          <p className="text-cream/45 text-xs font-body text-center mb-4">Points for the kick-save (default 1)</p>
          <div className="flex justify-center">
            <DrumWheel options={[1,2,3,4,5,6,7,8,9,10]} value={fifaPts} onChange={setFifaPts} />
          </div>
          <Btn className="mt-5 text-xl py-5" onClick={() => { dispatch({ type: 'fifa', points: fifaPts }); setFifaOpen(false); }}>
            Confirm +{fifaPts}
          </Btn>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-navy-deep/85 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-navy-card border border-navy-line rounded-t-3xl w-full max-w-md p-6 pb-10 animate-pop"
        style={{ boxShadow: '0 -4px 40px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Die Back ──
function DieBackScreen() {
  const { dispatch } = useGame();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-6">
      <div className="text-3d text-center" style={{ fontSize: 'clamp(60px, 18vw, 88px)', lineHeight: 1 }}>
        Die Back?
      </div>
      <p className="text-cream/40 font-body text-sm text-center max-w-[240px]">
        Did the die fly back past the line?
      </p>
      <div className="flex gap-5">
        <button
          onClick={() => dispatch({ type: 'dieBackAnswer', confirmed: true })}
          className="w-28 h-28 rounded-full text-navy-deep font-display italic text-5xl active:scale-95 transition-transform"
          style={{ background: 'var(--gold)', boxShadow: '0 6px 0 #8a6800, 0 10px 24px rgba(0,0,0,0.5)' }}
        >
          ✓
        </button>
        <button
          onClick={() => dispatch({ type: 'dieBackAnswer', confirmed: false })}
          className="w-28 h-28 rounded-full bg-navy-card border-2 border-navy-line text-cream font-display italic text-5xl active:scale-95 transition-transform"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function WaitingForDieBack() {
  const { gameState: s } = useGame();
  return (
    <>
      <Scoreboard state={s} />
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        <div className="font-display italic text-2xl text-cream/60">Waiting for Die Back…</div>
        <div className="text-cream/30 font-body text-sm">The throwing team is deciding.</div>
      </div>
    </>
  );
}

// ── Continue Prompt ──
function ContinuePrompt({ interactive }) {
  const { gameState: s, dispatch } = useGame();
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
      <div className="text-center animate-pop">
        <div className="text-3d-light leading-tight" style={{ fontSize: 'clamp(36px, 12vw, 60px)' }}>
          Continue with
        </div>
        <div className="text-3d leading-tight" style={{ fontSize: 'clamp(44px, 14vw, 72px)' }}>
          {nextName}?
        </div>
      </div>
      <p className="text-cream/45 font-body text-sm text-center max-w-xs">{sub}</p>
      {interactive ? (
        <div className="flex gap-4 w-full px-2 max-w-md">
          <Btn className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: true })}>Yes</Btn>
          <Btn variant="ghost" className="flex-1 py-6 text-2xl" onClick={() => dispatch({ type: 'continueAnswer', yes: false })}>No</Btn>
        </div>
      ) : (
        <div className="text-cream/30 font-body text-sm">{s.teams[team].name} is deciding…</div>
      )}
    </div>
  );
}

// ── Switch Possession ──
function SwitchPossession() {
  const { gameState: s, dispatch } = useGame();
  return (
    <button
      className="flex-1 flex flex-col items-center justify-center gap-5 active:bg-navy-mid transition-colors"
      onClick={() => dispatch({ type: 'confirmSwitch' })}
    >
      {/* Arrow indicator */}
      <div className="w-16 h-16 rounded-full border-2 border-gold/40 flex items-center justify-center">
        <div className="font-display italic text-gold text-3xl">⇄</div>
      </div>
      <div>
        <div className="font-display italic text-4xl text-cream text-center leading-none">Switch Possession</div>
        <div className="font-body text-gold text-center text-sm mt-2">{s.teams[other(s.possession)].name} throws next</div>
      </div>
      <div className="text-cream/25 font-body text-xs mt-4 tracking-widest uppercase">tap anywhere to continue</div>
    </button>
  );
}

// ── Redemption Mode Select ──
function RedemptionModeSelect() {
  const { gameState: s, dispatch, role } = useGame();
  const shooting = s.redemption?.shootingTeam;
  if (role !== 'creator') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="text-3d-red" style={{ fontSize: 'clamp(56px, 18vw, 88px)', lineHeight: 1 }}>REDEMPTION</div>
        <div className="text-cream/40 font-body text-sm">Game creator is picking the mode…</div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center px-5 gap-5">
      <div className="text-center mb-2">
        <div className="text-3d-red leading-none" style={{ fontSize: 'clamp(56px, 18vw, 86px)' }}>REDEMPTION</div>
        <div className="text-cream/50 font-body text-sm mt-2">
          {s.teams[shooting].name} gets a last chance. Pick the mode:
        </div>
      </div>
      <Btn className="py-7 text-2xl" onClick={() => dispatch({ type: 'selectRedemptionMode', mode: 'shootout' })}>
        Shootout
        <div className="text-xs font-body font-semibold opacity-55 mt-1 not-italic">Throw until you miss, then next player</div>
      </Btn>
      <Btn variant="ghost" className="py-7 text-2xl" onClick={() => dispatch({ type: 'selectRedemptionMode', mode: 'pong' })}>
        Pong
        <div className="text-xs font-body font-semibold opacity-55 mt-1 not-italic">No misses allowed — one miss ends it</div>
      </Btn>
    </div>
  );
}

// ── Score & Turn Override ──
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
        className="fixed top-3 right-3 z-30 w-9 h-9 rounded-full bg-navy-card border border-navy-line text-cream/40 text-sm active:text-gold transition-colors"
      >
        ✎
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="font-display italic text-2xl text-cream text-center mb-5">Score Override</div>
          <div className="flex justify-around mb-6">
            {['A', 'B'].map((t) => (
              <div key={t} className="text-center">
                <div className="text-cream/45 font-body text-xs mb-2 uppercase tracking-wide">{s.teams[t].name}</div>
                <div className="flex items-center gap-3">
                  <button
                    className="w-12 h-12 rounded-full bg-navy-deep border border-navy-line font-display italic text-2xl text-cream active:bg-navy-line"
                    onClick={() => setScores({ ...scores, [t]: Math.max(0, scores[t] - 1) })}
                  >−</button>
                  <div className="font-display italic text-5xl text-gold w-14 text-center">{scores[t]}</div>
                  <button
                    className="w-12 h-12 rounded-full bg-navy-deep border border-navy-line font-display italic text-2xl text-cream active:bg-navy-line"
                    onClick={() => setScores({ ...scores, [t]: scores[t] + 1 })}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Btn onClick={() => { dispatch({ type: 'scoreOverride', scores }); setOpen(false); }}>Apply</Btn>
            <Btn variant="ghost" onClick={() => { undo(); setOpen(false); }}>Undo Last Action</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
