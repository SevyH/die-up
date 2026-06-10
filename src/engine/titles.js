// ============================================================
// Die Up — Player Titles (§8, V1 rewrite)
//
// Rules:
//   • MVP            — ALWAYS assigned. One per game, either team.
//                      Tiebreak: points → hitRate → scoreRate → catchRatio.
//   • Absolute Ass   — ALWAYS assigned if a player self sinks. Overrides
//                      every other title for that player.
//   • Team Carry     — any team, but ALWAYS the opposite team from MVP.
//                      NOT guaranteed: only if a player genuinely carried
//                      (teamCarryMinPoints + outscored their teammate).
//   • Everything else — earned only, no duplicates, never forced. A player
//                      may finish with no title at all.
//
// No two players ever share a title (each name assigned at most once).
// ============================================================
import { TITLE_TUNABLES as T } from './config.js';
import { computeAllStats, comebackCarrier } from './stats.js';

const key = (p) => `${p.team}${p.playerIndex}`;

const cmpMvp = (a, b) =>
  b.pointsContributed - a.pointsContributed ||
  b.hitRate - a.hitRate ||
  b.scoreRate - a.scoreRate ||
  (b.catchRatio ?? -1) - (a.catchRatio ?? -1);

// Earned titles, checked in priority order. First qualifying, still-untitled
// player claims each title; a title is awarded at most once per game.
const TITLE_ORDER = [
  { name: 'Ice Man',
    test: (p) => p.redemptionPoints > 0 && p.redemptionMisses === 0 && p.onWinningTeam },
  { name: 'Sniper',
    test: (p) => p.throwCount > 0 && p.scoreRate >= T.sniperScoreRate },
  { name: 'Mr. Reliable',
    test: (p) => p.throwCount > 0 && p.hitRate === 1 },
  { name: 'Brick Fucking Wall',
    test: (p) => p.catchRatio !== null && p.catchRatio >= T.brickWallCatchRatio },
  { name: 'Heat Check',
    test: (p) => p.longestStreak >= T.heatCheckStreak },
  { name: 'Cup Hunter',
    test: (p) => p.cupCount >= T.cupHunterMin },
  { name: 'Plumber',
    test: (p) => p.sinkCount >= 1 },
  { name: 'Glue Guy',
    test: (p) => p.throwCount > 0 && p.scoreRate >= T.glueGuyMin && p.scoreRate <= T.glueGuyMax },
  { name: 'The Closer',
    test: (p) => p.scoredGameWinner },
  { name: 'Has Trouble Getting It Up',
    test: (p) => p.heightCount >= T.heightTroubleMin },
  { name: 'Butterfingers',
    test: (p) => p.catchRatio !== null && p.drops > p.catches },
  { name: 'Liability',
    test: (p) =>
      p.throwCount > 0 && p.hitRate < T.liabilityHitRate &&
      p.catchRatio !== null && 1 - p.catchRatio >= T.liabilityDropRate },
  { name: 'Shit Luck',
    test: (p) => p.throwCount > 0 && p.hitRate >= T.shitLuckHitRate && p.scoreRate <= T.shitLuckScoreRate },
  { name: 'Clueless',
    test: (p) => p.throwCount > 0 && p.hitRate < T.cluelessHitRate && p.missCount >= p.throwCount / 2 },
];

export function assignTitles(state) {
  const stats = computeAllStats(state);
  const titles = {};                 // `${team}${idx}` -> title string
  const usedNames = new Set();       // enforce "no two players share a title"

  const give = (p, name) => {
    if (!p || titles[key(p)] || usedNames.has(name)) return false;
    titles[key(p)] = name;
    usedNames.add(name);
    return true;
  };

  // 1) Absolute Ass — any self sink. Overrides all other logic for that player.
  for (const p of stats) {
    if (p.selfSink) { titles[key(p)] = 'Absolute Ass'; usedNames.add('Absolute Ass'); }
  }

  // 2) MVP — always assigned, best player not already locked as Absolute Ass.
  //    (If literally everyone self-sank, MVP is simply skipped.)
  const mvpPool = stats.filter((p) => !titles[key(p)]);
  const mvp = [...mvpPool].sort(cmpMvp)[0] || null;
  if (mvp) give(mvp, 'MVP');

  // 3) Team Carry — opposite team from MVP, genuine carry only, not guaranteed.
  if (mvp) {
    const carryTeam = mvp.team === 'A' ? 'B' : 'A';
    const candidates = stats
      .filter((p) => p.team === carryTeam && !titles[key(p)])
      .filter((p) => p.pointsContributed >= T.teamCarryMinPoints)
      .sort(cmpMvp);
    const best = candidates[0];
    if (best) {
      const mate = stats.find((p) => p.team === carryTeam && p.playerIndex !== best.playerIndex);
      // a genuine carry: clearly outproduced the teammate (or teammate did nothing)
      if (!mate || best.pointsContributed > mate.pointsContributed) give(best, 'Team Carry');
    }
  }

  // 4) Comeback Kid — carried a successful comeback redemption.
  const carrier = comebackCarrier(state, T.comebackCarryMinPoints);
  if (carrier) {
    const p = stats.find((x) => x.team === carrier.team && x.playerIndex === carrier.playerIndex);
    give(p, 'Comeback Kid');
  }

  // 5) Everything else — earned only, each name once, never forced.
  for (const def of TITLE_ORDER) {
    if (usedNames.has(def.name)) continue;
    const winner = stats
      .filter((p) => !titles[key(p)])
      .find((p) => def.test(p));
    if (winner) give(winner, def.name);
  }

  return { titles, stats, mvpKey: mvp ? key(mvp) : null };
}
