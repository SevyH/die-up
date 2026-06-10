// Win screen lines (PRD 7.12). Comeback overrides the differential tiers.
import { WIN_LINES, TITLE_TUNABLES } from './config.js';

export function winLines(state) {
  const winner = state.winner;
  const loser = winner === 'A' ? 'B' : 'A';
  const diff = Math.abs(state.scores[winner] - state.scores[loser]);
  // "4+ pt comeback win": winning team was down 4+ at some point.
  const comeback = state.maxDeficit[winner] >= TITLE_TUNABLES.comebackDeficitForLine;
  const tier = WIN_LINES.find((l) => l.test(diff, comeback));
  return { winLine: tier.win, loseLine: tier.lose, diff, comeback };
}
