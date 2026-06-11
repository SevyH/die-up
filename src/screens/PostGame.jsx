// ============================================================
// Post-game: Win screen → Podium → Stat Cards. Redesigned.
// ============================================================
import { useMemo, useState, useEffect } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { assignTitles } from '../engine/titles.js';
import { winLines } from '../engine/winLines.js';
import { Btn } from '../components/ui.jsx';
import { Shell } from './Home.jsx';

const fmtPct = (v) => (v === null ? 'N/A' : `${Math.round(v * 100)}%`);

export function PostGame() {
  const { gameState: s, myTeam, newGame } = useGame();
  const [view, setView] = useState('win');
  const [cardKey, setCardKey] = useState(null);
  const { titles, stats, mvpKey } = useMemo(() => assignTitles(s), [s]);
  const lines = useMemo(() => winLines(s), [s]);

  if (view === 'win') return <WinScreen s={s} myTeam={myTeam} lines={lines} onNext={() => setView('podium')} />;
  if (view === 'card' && cardKey) {
    const p = stats.find((x) => `${x.team}${x.playerIndex}` === cardKey);
    return <StatCard p={p} title={titles[cardKey]} mvp={cardKey === mvpKey} s={s} onBack={() => setView('podium')} />;
  }
  return (
    <Podium s={s} stats={stats} titles={titles} mvpKey={mvpKey}
      onOpen={(k) => { setCardKey(k); setView('card'); }} onNewGame={newGame} />
  );
}

// ── Confetti particles ──
function Confetti() {
  const particles = useMemo(() => {
    const colors = ['#F7C948', '#FFE280', '#F0EDE6', '#E8323C', '#ffffff'];
    return Array.from({ length: 38 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      dur: 2.2 + Math.random() * 1.8,
      delay: Math.random() * 1.2,
      rotate: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.5,
            background: p.color,
            '--fall-dur': `${p.dur}s`,
            animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Win Screen ──
function WinScreen({ s, myTeam, lines, onNext }) {
  const won = s.winner === myTeam;
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <Shell>
      {won && <Confetti />}
      <button className="relative z-20 flex-1 flex flex-col items-center justify-center gap-5 px-6" onClick={onNext}>
        {/* Score line */}
        <div
          className={`font-display italic tracking-wide text-xl transition-all duration-500 ${show ? 'opacity-100' : 'opacity-0'} ${won ? 'text-gold' : 'text-cream/35'}`}
        >
          {s.teams[s.winner].name} wins {s.scores[s.winner]}–{s.scores[s.winner === 'A' ? 'B' : 'A']}
        </div>

        {/* Hero win/lose line */}
        <div
          className={`text-center leading-tight transition-all duration-500 delay-100 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {won ? (
            <div className="text-3d" style={{ fontSize: 'clamp(52px, 17vw, 84px)' }}>
              {lines.winLine}
            </div>
          ) : (
            <div className="text-3d-red" style={{ fontSize: 'clamp(44px, 14vw, 72px)' }}>
              {lines.loseLine}
            </div>
          )}
        </div>

        {s.endedBySelfSink && (
          <div className="font-body text-cream/45 text-sm text-center">
            ended by self sink — {s.teams[s.endedBySelfSink.team].players[s.endedBySelfSink.playerIndex]} 🫡
          </div>
        )}

        <div className="text-cream/25 font-body text-xs mt-8 tracking-[0.25em] uppercase">tap for the podium</div>
      </button>
    </Shell>
  );
}

// Hero stats picker
function heroStats(p) {
  const candidates = [
    p.sinkCount > 0 && { label: 'Sinks', value: p.sinkCount, weight: 5 + p.sinkCount },
    p.cupCount > 0 && { label: 'Cups', value: p.cupCount, weight: 4 + p.cupCount },
    p.longestStreak >= 3 && { label: 'Streak', value: `${p.longestStreak}🔥`, weight: 3 + p.longestStreak },
    p.catchRatio !== null && { label: 'Catch%', value: fmtPct(p.catchRatio), weight: p.catchRatio >= 0.7 ? 4 : 1 },
    { label: 'Score%', value: fmtPct(p.scoreRate), weight: p.scoreRate >= 0.5 ? 3 : 2 },
    { label: 'Points', value: p.pointsContributed, weight: 2 + p.pointsContributed / 3 },
    p.heightCount >= 3 && { label: 'Heights', value: p.heightCount, weight: 3 },
  ].filter(Boolean);
  return candidates.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

// ── Podium ──
function Podium({ s, stats, titles, mvpKey, onOpen, onNewGame }) {
  const winners = stats.filter((p) => p.team === s.winner);
  const losers = stats.filter((p) => p.team !== s.winner);

  const Card = ({ p, isWinner }) => {
    const k = `${p.team}${p.playerIndex}`;
    return (
      <button
        onClick={() => onOpen(k)}
        className={`relative text-left w-full rounded-2xl p-4 transition-all active:scale-[0.98]
          ${isWinner
            ? 'bg-navy-card border border-gold/30 podium-winner'
            : 'bg-navy-card border border-navy-line podium-loser opacity-80'}`}
      >
        {k === mvpKey && (
          <div
            className="absolute -top-2.5 -right-2.5 bg-gold text-navy-deep font-display italic text-[11px] rounded-full px-2.5 py-1 rotate-6 mvp-badge"
          >
            MVP
          </div>
        )}
        <div className="font-display italic text-cream text-xl leading-none truncate">{p.name}</div>
        {titles[k] && <div className="font-body text-gold text-xs font-semibold mt-0.5">{titles[k]}</div>}
        <div className="flex gap-3 mt-3">
          {heroStats(p).map((h) => (
            <div key={h.label} className="text-left">
              <div className="font-display italic text-cream text-lg leading-none">{h.value}</div>
              <div className="text-cream/35 text-[10px] font-body uppercase mt-0.5">{h.label}</div>
            </div>
          ))}
        </div>
      </button>
    );
  };

  return (
    <Shell>
      <div className="px-5 pt-6 pb-3">
        <div className="font-display italic text-gold text-4xl leading-none">Podium</div>
        <div className="text-cream/35 text-xs font-body mt-1">tap a card for the full stat sheet</div>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col justify-center gap-3">
        {/* Winner cards — elevated */}
        <div className="grid grid-cols-2 gap-3">
          {winners.map((p) => <Card key={p.playerIndex} p={p} isWinner />)}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-2 my-1">
          <div className="flex-1 h-px bg-navy-line" />
          <div className="font-display italic text-cream/20 text-xs tracking-widest">
            — {s.teams[s.winner === 'A' ? 'B' : 'A'].name} —
          </div>
          <div className="flex-1 h-px bg-navy-line" />
        </div>

        {/* Loser cards — dimmed */}
        <div className="grid grid-cols-2 gap-3">
          {losers.map((p) => <Card key={p.playerIndex} p={p} isWinner={false} />)}
        </div>
      </div>

      <div className="px-4 pb-8">
        <Btn variant="outline" onClick={onNewGame} className="text-xl py-5">
          New Game
        </Btn>
      </div>
    </Shell>
  );
}

// ── Stat Card ──
function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-baseline border-b border-navy-line/50 py-2.5">
      <span className="text-cream/50 font-body text-sm">{label}</span>
      <span className="font-display italic text-cream text-lg">{value}</span>
    </div>
  );
}

function StatCard({ p, title, mvp, s, onBack }) {
  return (
    <Shell>
      <div className="px-4 pt-4">
        <button onClick={onBack} className="text-cream/40 font-body text-sm py-2 active:text-cream">← back to podium</button>
      </div>
      <div className="flex-1 px-4 pb-8 overflow-y-auto no-scrollbar">
        <div
          className="rounded-3xl p-6 relative overflow-hidden border-2"
          style={{
            background: 'linear-gradient(160deg, #0F2035 0%, #060E1A 100%)',
            borderColor: 'rgba(247,201,72,0.5)',
            boxShadow: '0 0 0 1px rgba(247,201,72,0.08), 0 8px 40px rgba(0,0,0,0.6)',
          }}
        >
          {/* Decorative circle */}
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-gold/8" />
          <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gold/5" />

          {/* Header */}
          <div className="font-body text-gold/60 text-[10px] uppercase tracking-[0.32em]">
            Die Up · {s.teams[p.team].name}
          </div>
          <div className="font-display italic text-4xl text-cream mt-1 leading-tight">{p.name}</div>
          <div className="flex items-center flex-wrap gap-2 mt-2.5">
            {title && (
              <span className="bg-gold text-navy-deep font-display italic text-sm rounded-full px-3 py-1">
                {title}
              </span>
            )}
            {mvp && (
              <span
                className="border-2 border-gold text-gold font-display italic text-sm rounded-full px-3 py-1 mvp-badge"
              >
                MVP
              </span>
            )}
            {p.onWinningTeam && (
              <span className="text-cream/35 font-body text-xs">
                W {s.scores[p.team]}–{s.scores[p.team === 'A' ? 'B' : 'A']}
              </span>
            )}
          </div>

          <div className="mt-5">
            <div className="font-display italic text-gold text-xs uppercase tracking-[0.3em] mb-1">Throwing</div>
            <StatRow label="Hit rate" value={fmtPct(p.hitRate)} />
            <StatRow label="Score rate" value={fmtPct(p.scoreRate)} />
            <StatRow label="Points contributed" value={p.pointsContributed} />
            <StatRow label="Short rate" value={fmtPct(p.shortRate)} />
            <StatRow label="Heights" value={p.heightCount} />
            <StatRow label="Caught" value={p.caughtCount} />
            <StatRow label="Cups" value={p.cupCount} />
            <StatRow label="Sinks" value={p.sinkCount} />
            <StatRow label="Longest streak" value={p.longestStreak} />
            {p.selfSink && <StatRow label="Self sink" value="yes 💀" />}
          </div>

          <div className="mt-5">
            <div className="font-display italic text-gold text-xs uppercase tracking-[0.3em] mb-1">Defending</div>
            <StatRow label="Catch / drop ratio" value={p.catchRatio === null ? 'N/A' : `${fmtPct(p.catchRatio)} (${p.catches}C / ${p.drops}D)`} />
          </div>

          {p.redemptionPoints > 0 && (
            <div className="mt-5">
              <div className="font-display italic text-gold text-xs uppercase tracking-[0.3em] mb-1">Redemption</div>
              <StatRow label="Points in redemption" value={p.redemptionPoints} />
            </div>
          )}

          {/* Subtle footer watermark */}
          <div className="mt-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-navy-line/70" />
            <div className="font-display italic text-cream/10 text-xs tracking-[0.4em]">DIE UP</div>
            <div className="flex-1 h-px bg-navy-line/70" />
          </div>
        </div>
      </div>
    </Shell>
  );
}
