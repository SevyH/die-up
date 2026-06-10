// ============================================================
// Die Up — Player Titles (PRD §9)
// One title per player. Self sink overrides ALL other logic.
// Priority order is explicit and tunable — reorder TITLE_ORDER
// or tweak TITLE_TUNABLES in config.js to re-balance.
// ============================================================
import { TITLE_TUNABLES as T } from './config.js';
import { computeAllStats, comebackCarrier } from './stats.js';

const cmpMvp = (a, b) =>
  b.pointsContributed - a.pointsContributed ||
  b.hitRate - a.hitRate ||
  b.scoreRate - a.scoreRate ||
  (b.catchRatio ?? -1) - (a.catchRatio ?? -1);

// Per-player conditional titles, checked top-down after the special
// assignments (Absolute Ass override, MVP, Team Carry, Comeback Kid).
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
    test: (p) => p.scoreRate >= T.glueGuyMin && p.scoreRate <= T.glueGuyMax },
  { name: 'The Closer', // "no other title applies" → sits below performance titles
    test: (p) => p.scoredGameWinner },
  { name: 'Has Trouble Getting It Up',
    test: (p) => p.heightCount >= T.heightTroubleMin },
  { name: 'Butterfingers',
    test: (p) => p.drops > p.catches },
  { name: 'Liability',
    test: (p) =>
      p.hitRate < T.liabilityHitRate &&
      p.catchRatio !== null && 1 - p.catchRatio >= T.liabilityDropRate },
  { name: 'Shit Luck',
    test: (p) => p.hitRate >= T.shitLuckHitRate && p.scoreRate <= T.shitLuckScoreRate },
  { name: 'Clueless',
    test: (p) => p.hitRate < T.cluelessHitRate && p.missCount >= p.throwCount / 2 },
  { name: 'One Hit Wonder',
    test: (p, ctx) => p.pointsContributed > 0 &&
      p.throwCount > 1 &&
      ctx.scoringThrowCount(p) === 1 },
  { name: 'Passenger',
    test: (p, ctx) => p.pointsContributed > 0 && ctx.teamCarryTeammate(p) },
  { name: 'Dead Weight',
    test: (p) => p.pointsContributed < T.deadWeightMaxPoints },
  { name: 'Ole Reliable', // solid, nothing flashy — also the safety net
    test: () => true },
];

export function assignTitles(state) {
  const stats = computeAllStats(state);
  const titles = {}; // key `${team}${playerIndex}` -> title
  const key = (p) => `${p.team}${p.playerIndex}`;

  // 1) Self sink overrides everything. Absolute Ass also covers 0 points.
  for (const p of stats) if (p.selfSink) titles[key(p)] = 'Absolute Ass';

  // 2) MVP — highest points; tiebreak: hit rate → score rate → catch ratio.
  const eligible = stats.filter((p) => !titles[key(p)]);
  const mvp = [...eligible].sort(cmpMvp)[0];
  if (mvp) titles[key(mvp)] = 'MVP';

  // 3) Team Carry — runner-up on the winning team, same team as MVP only.
  if (mvp && mvp.team === state.winner) {
    const mate = stats.find((p) => p.team === mvp.team && p.playerIndex !== mvp.playerIndex);
    if (mate && !titles[key(mate)]) titles[key(mate)] = 'Team Carry';
  }

  // 4) Comeback Kid — carried a successful comeback redemption.
  const carrier = comebackCarrier(state, T.comebackCarryMinPoints);
  if (carrier) {
    const p = stats.find((x) => x.team === carrier.team && x.playerIndex === carrier.playerIndex);
    if (p && !titles[key(p)]) titles[key(p)] = 'Comeback Kid';
  }

  // 5) Everything else, in priority order.
  const ctx = {
    scoringThrowCount: (p) =>
      state.throwLog.filter(
        (t) => t.team === p.team && t.playerIndex === p.playerIndex && t.scores && !t.nullified
      ).length,
    teamCarryTeammate: (p) => {
      const mateKey = `${p.team}${p.playerIndex === 0 ? 1 : 0}`;
      return titles[mateKey] === 'Team Carry';
    },
  };
  for (const p of stats) {
    if (titles[key(p)]) continue;
    if (p.pointsContributed === 0) { titles[key(p)] = 'Absolute Ass'; continue; }
    if (
      !TITLE_ORDER.some((t) => {
        if (t.test(p, ctx)) { titles[key(p)] = t.name; return true; }
        return false;
      })
    ) titles[key(p)] = 'Ole Reliable';
  }

  return { titles, stats, mvpKey: mvp ? key(mvp) : null };
}
