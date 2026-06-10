// ============================================================
// Die Up — Stats (PRD §8). Pure derivation from final game state.
// ============================================================
import { THROW_OUTCOMES } from './config.js';

const pct = (n, d) => (d > 0 ? n / d : 0);

export function computePlayerStats(state, team, playerIndex) {
  const throws = state.throwLog.filter((t) => t.team === team && t.playerIndex === playerIndex);
  const live = throws.filter((t) => !t.nullified);

  const hits = throws.filter((t) => THROW_OUTCOMES[t.outcome]?.hitsTable).length;
  const scoringThrows = live.filter((t) => t.scores);
  const points = scoringThrows.reduce((a, t) => a + t.points, 0);

  let streak = 0, longestStreak = 0;
  for (const t of throws) {
    if (t.scores && !t.nullified) { streak += 1; longestStreak = Math.max(longestStreak, streak); }
    else streak = 0;
  }

  const defense = state.defenseLog.filter((d) => d.team === team && d.playerIndex === playerIndex);
  const catches = defense.filter((d) => d.kind === 'catch').length;
  const drops = defense.filter((d) => d.kind === 'drop').length;
  const defenseLogged = catches + drops > 0;

  const red = state.redemptionResult;
  const redemptionPoints =
    red && red.team === team ? red.pointsByPlayer[playerIndex] : 0;
  const redemptionMisses =
    red && red.team === team ? red.missesByPlayer[playerIndex] : 0;

  return {
    team,
    playerIndex,
    name: state.teams[team].players[playerIndex],
    throwCount: throws.length,
    hitRate: pct(hits, throws.length),
    scoreRate: pct(scoringThrows.length, throws.length),
    pointsContributed: points,
    shortRate: pct(throws.filter((t) => t.outcome === 'short').length, throws.length),
    heightCount: throws.filter((t) => t.outcome === 'height').length,
    missCount: throws.filter((t) => t.outcome === 'miss').length,
    cupCount: live.filter((t) => t.outcome === 'cup').length,
    sinkCount: live.filter((t) => t.outcome === 'sink').length,
    longestStreak,
    selfSink: throws.some((t) => t.outcome === 'selfSink'),
    catches,
    drops,
    // PRD: if no catch/drop logged the entire game → "N/A", never 0%
    catchRatio: defenseLogged ? pct(catches, catches + drops) : null,
    redemptionPoints,
    redemptionMisses,
    scoredGameWinner:
      state.lastScorer?.team === team && state.lastScorer?.playerIndex === playerIndex && state.winner === team,
    onWinningTeam: state.winner === team,
  };
}

export function computeAllStats(state) {
  const all = [];
  for (const team of ['A', 'B'])
    for (const i of [0, 1]) all.push(computePlayerStats(state, team, i));
  return all;
}

// Comeback Carry (PRD §8): majority of points during a *successful*
// comeback redemption AND a minimum of 3+ points scored in redemption.
export function comebackCarrier(state, minPoints = 3) {
  const red = state.redemptionResult;
  if (!red || !red.succeeded) return null;
  if (state.winner !== red.team) return null; // comeback must succeed (win)
  const total = red.pointsByPlayer[0] + red.pointsByPlayer[1];
  if (total <= 0) return null;
  const topIdx = red.pointsByPlayer[0] >= red.pointsByPlayer[1] ? 0 : 1;
  const topPts = red.pointsByPlayer[topIdx];
  if (topPts < minPoints) return null;
  if (topPts * 2 <= total) return null; // strict majority
  return { team: red.team, playerIndex: topIdx };
}
