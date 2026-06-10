// ============================================================
// Post-game (PRD 7.12–7.14): Win screen → Podium → Stat Cards.
// Both phones browse freely; navigation here is local-only.
// ============================================================
import { useMemo, useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { assignTitles } from '../engine/titles.js';
import { winLines } from '../engine/winLines.js';
import { Btn } from '../components/ui.jsx';
import { Shell } from './Home.jsx';

const fmtPct = (v) => (v === null ? 'N/A' : `${Math.round(v * 100)}%`);

export function PostGame() {
  const { gameState: s, myTeam, newGame } = useGame();
  const [view, setView] = useState('win'); // win | podium | card
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

// ---------------- Win Screen (7.12) ----------------
function WinScreen({ s, myTeam, lines, onNext }) {
  const won = s.winner === myTeam;
  return (
    <Shell>
      <button className="flex-1 flex flex-col items-center justify-center gap-4 px-6" onClick={onNext}>
        <div className={`font-display text-2xl ${won ? 'text-gold' : 'text-white/40'}`}>
          {s.teams[s.winner].name} wins {s.scores[s.winner]}–{s.scores[s.winner === 'A' ? 'B' : 'A']}
        </div>
        <div className={`text-center leading-tight animate-pop ${won ? 'text-3d text-6xl' : 'text-3d-light text-5xl'}`} style={won ? null : { color: '#FF6A60' }}>
          {won ? lines.winLine : lines.loseLine}
        </div>
        {s.endedBySelfSink && (
          <div className="font-body text-white/50 text-sm">
            ended by self sink — {s.teams[s.endedBySelfSink.team].players[s.endedBySelfSink.playerIndex]} 🫡
          </div>
        )}
        <div className="text-white/30 font-body text-sm mt-10">tap for the podium</div>
      </button>
    </Shell>
  );
}

// ---------------- Podium (7.13) ----------------
function heroStats(p) {
  const candidates = [
    p.sinkCount > 0 && { label: 'Sinks', value: p.sinkCount, weight: 5 + p.sinkCount },
    p.cupCount > 0 && { label: 'Cups', value: p.cupCount, weight: 4 + p.cupCount },
    p.longestStreak >= 3 && { label: 'Streak', value: `${p.longestStreak}🔥`, weight: 3 + p.longestStreak },
    p.catchRatio !== null && { label: 'Catch', value: fmtPct(p.catchRatio), weight: p.catchRatio >= 0.7 ? 4 : 1 },
    { label: 'Score rate', value: fmtPct(p.scoreRate), weight: p.scoreRate >= 0.5 ? 3 : 2 },
    { label: 'Points', value: p.pointsContributed, weight: 2 + p.pointsContributed / 3 },
    p.heightCount >= 3 && { label: 'Heights', value: p.heightCount, weight: 3 },
  ].filter(Boolean);
  return candidates.sort((a, b) => b.weight - a.weight).slice(0, 3);
}

function Podium({ s, stats, titles, mvpKey, onOpen, onNewGame }) {
  const winners = stats.filter((p) => p.team === s.winner);
  const losers = stats.filter((p) => p.team !== s.winner);

  const Card = ({ p }) => {
    const k = `${p.team}${p.playerIndex}`;
    return (
      <button onClick={() => onOpen(k)}
        className="relative bg-navy-card border border-navy-line rounded-2xl p-3 text-left w-full active:border-gold transition-colors">
        {k === mvpKey && (
          <div className="absolute -top-2 -right-2 bg-gold text-navy-deep font-display text-[10px] rounded-full px-2 py-1 rotate-6">MVP</div>
        )}
        <div className="font-display text-white text-lg truncate">{p.name}</div>
        {titles[k] && <div className="font-body text-gold text-xs font-semibold mt-0.5">{titles[k]}</div>}
        <div className="flex gap-3 mt-2">
          {heroStats(p).map((h) => (
            <div key={h.label}>
              <div className="font-display text-white text-base">{h.value}</div>
              <div className="text-white/40 text-[10px] font-body uppercase">{h.label}</div>
            </div>
          ))}
        </div>
      </button>
    );
  };

  return (
    <Shell>
      <div className="px-4 pt-8 text-center">
        <div className="font-display text-3xl text-gold">Podium</div>
        <div className="text-white/40 font-body text-xs mt-1">tap a card for the full stat sheet</div>
      </div>
      <div className="flex-1 px-4 py-6 flex flex-col justify-center gap-3">
        <div className="grid grid-cols-2 gap-3 -translate-y-3">
          {winners.map((p) => <Card key={p.playerIndex} p={p} />)}
        </div>
        <div className="text-center font-display text-white/20 text-sm">— {s.teams[s.winner === 'A' ? 'B' : 'A'].name} —</div>
        <div className="grid grid-cols-2 gap-3 translate-y-2 opacity-80">
          {losers.map((p) => <Card key={p.playerIndex} p={p} />)}
        </div>
      </div>
      <div className="px-4 pb-8">
        <Btn variant="outline" className="w-full" onClick={onNewGame}>New Game</Btn>
      </div>
    </Shell>
  );
}

// ---------------- Individual Stat Card (7.14, screenshottable) ----------------
function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-baseline border-b border-navy-line/60 py-2.5">
      <span className="text-white/55 font-body text-sm">{label}</span>
      <span className="font-display text-white text-lg">{value}</span>
    </div>
  );
}

function StatCard({ p, title, mvp, s, onBack }) {
  return (
    <Shell>
      <div className="px-4 pt-4">
        <button onClick={onBack} className="text-white/50 font-body text-sm py-2">← back to podium</button>
      </div>
      <div className="flex-1 px-4 pb-8 overflow-y-auto">
        <div className="bg-gradient-to-b from-navy-card to-navy-deep border-2 border-gold/60 rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gold/10" />
          <div className="font-body text-gold/70 text-[10px] uppercase tracking-[0.3em]">Die Up · {s.teams[p.team].name}</div>
          <div className="font-display text-4xl text-white mt-1">{p.name}</div>
          <div className="flex items-center gap-2 mt-2">
            {title && <span className="bg-gold text-navy-deep font-display text-sm rounded-full px-3 py-1">{title}</span>}
            {mvp && <span className="border border-gold text-gold font-display text-sm rounded-full px-3 py-1">MVP</span>}
            {p.onWinningTeam && <span className="text-white/40 font-body text-xs">W {s.scores[p.team]}–{s.scores[p.team === 'A' ? 'B' : 'A']}</span>}
          </div>

          <div className="mt-5">
            <div className="font-display text-gold text-xs uppercase tracking-widest mb-1">Throwing</div>
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
            <div className="font-display text-gold text-xs uppercase tracking-widest mb-1">Defending</div>
            <StatRow label="Catch / drop ratio" value={p.catchRatio === null ? 'N/A' : `${fmtPct(p.catchRatio)} (${p.catches}C / ${p.drops}D)`} />
          </div>

          {p.redemptionPoints > 0 && (
            <div className="mt-5">
              <div className="font-display text-gold text-xs uppercase tracking-widest mb-1">Redemption</div>
              <StatRow label="Points in redemption" value={p.redemptionPoints} />
            </div>
          )}

          <div className="mt-6 text-center font-display text-white/15 text-xs tracking-[0.4em]">DIE UP</div>
        </div>
      </div>
    </Shell>
  );
}
