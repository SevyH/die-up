// Quick engine verification against PRD rules. Run: node tests/engine.test.mjs
import { initialState, reduce, undoLast, meetsWin } from '../src/engine/engine.js';
import { DEFAULT_CONFIG } from '../src/engine/config.js';
import { computeAllStats } from '../src/engine/stats.js';
import { assignTitles } from '../src/engine/titles.js';
import { winLines } from '../src/engine/winLines.js';

let failures = 0;
const ok = (cond, msg) => {
  if (!cond) { failures++; console.error('  ✗', msg); } else console.log('  ✓', msg);
};

const init = () => ({
  config: structuredClone(DEFAULT_CONFIG),
  teams: {
    A: { name: 'Team 1', players: ['Al', 'Amy'] },
    B: { name: 'Team 2', players: ['Bo', 'Bea'] },
  },
  firstPossession: 'A',
});

const T = (s, outcome) => reduce(s, { type: 'throw', outcome });

console.log('— basic round / possession —');
{
  let s = initialState(init());
  s = T(s, 'score');               // P1 scores
  ok(s.scores.A === 1, 'P1 score = 1 point');
  ok(s.round.throwerIndex === 1, 'second player highlighted');
  s = T(s, 'miss');                // P2 misses
  ok(s.phase === 'switch', 'one score → possession switches after both throws');
  s = reduce(s, { type: 'confirmSwitch' });
  ok(s.possession === 'B' && s.phase === 'play', 'possession flipped to B');
}

console.log('— die back —');
{
  let s = initialState(init());
  s = T(s, 'score'); s = T(s, 'cup');
  ok(s.phase === 'dieBack', 'both throws score → Die Back surfaces');
  ok(s.scores.A === 3, 'score 1 + cup 2 = 3');
  const kept = reduce(s, { type: 'dieBackAnswer', confirmed: true });
  ok(kept.possession === 'A' && kept.round.throwerIndex === 0, '✓ keeps possession, P1 re-highlighted');
  const sw = reduce(s, { type: 'dieBackAnswer', confirmed: false });
  ok(sw.phase === 'switch', 'X → switch possession');
}

console.log('— catch nullifies —');
{
  let s = initialState(init());
  s = T(s, 'sink');
  ok(s.scores.A === 3, 'sink = 3');
  s = reduce(s, { type: 'defense', kind: 'catch', playerIndex: 0 });
  ok(s.scores.A === 0, 'catch nullifies the sink');
  s = reduce(s, { type: 'defense', kind: 'drop', playerIndex: 1 });
  ok(s.scores.A === 0, 'drop changes nothing on score');
  s = T(s, 'score');
  ok(s.phase === 'switch' || s.phase === 'play', 'round continues normally after catch');
}

console.log('— self sink = game over —');
{
  let s = initialState(init());
  s = T(s, 'selfSink');
  ok(s.phase === 'gameOver' && s.winner === 'B', 'self sink → throwing team loses instantly');
  // gameLoss OFF variant
  const cfg = init(); cfg.config.selfSink.gameLoss = false;
  let s2 = initialState(cfg);
  s2 = T(s2, 'selfSink');
  ok(s2.phase !== 'gameOver' && s2.scores.B === 3, 'gameLoss off → other team gets sink points');
}

console.log('— game point + continue prompt —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 3 };       // simulate late game
  s = T(s, 'score');                // P1 hits 11
  ok(s.phase === 'continuePrompt', 'P1 winning score → Continue with P2?');
  const no = reduce(s, { type: 'continueAnswer', yes: false });
  ok(no.phase === 'endGameConfirm', 'No → end game confirm (→ redemption)');
  let yes = reduce(s, { type: 'continueAnswer', yes: true });
  ok(yes.round.throwerIndex === 1 && yes.phase === 'play', 'Yes → P2 throws');
  yes = T(yes, 'score');
  ok(yes.phase === 'dieBack', 'both scored at game point → Die Back still surfaces (no exceptions)');
}

console.log('— win by two —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 10 };
  s = T(s, 'score'); s = T(s, 'miss');
  ok(s.phase === 'switch', '11–10 with win-by-two → game continues, no prompt');
}

console.log('— redemption: shootout —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 8 };
  s = T(s, 'score');                                  // A hits 11, leads by 3
  s = reduce(s, { type: 'continueAnswer', yes: false });
  s = reduce(s, { type: 'endGameAnswer', confirmed: true });
  ok(s.phase === 'redemptionModeSelect' && s.redemption.team === 'B', 'redemption triggered for trailing team');
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'shootout' });
  s = T(s, 'score');                                  // Bo 9
  ok(s.round.throwerIndex === 0 && s.phase === 'play', 'shootout: scorer keeps throwing');
  s = T(s, 'sink');                                   // Bo 12? no: 9+3=12 > 11 → reached
  ok(s.phase === 'continuePrompt', 'tie/surpass → continue prompt');
  s = reduce(s, { type: 'continueAnswer', yes: false });
  ok(s.inRedemption === false && s.phase === 'switch', 'No → bank it, normal play resumes');
  ok(s.redemptionResult.succeeded === true, 'redemption marked successful');
}

console.log('— redemption: shootout elimination —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 5 };
  s.phase = 'endGameConfirm';
  s = reduce(s, { type: 'endGameAnswer', confirmed: true });
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'shootout' });
  s = T(s, 'score');   // Bo 6
  s = T(s, 'miss');    // Bo out → Bea up
  ok(s.round.throwerIndex === 1, 'miss → next player');
  s = T(s, 'short');   // Bea out → all missed
  ok(s.phase === 'gameOver' && s.winner === 'A', 'all missed → game over, leader wins');
}

console.log('— redemption: pong —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 4 };
  s.phase = 'endGameConfirm';
  s = reduce(s, { type: 'endGameAnswer', confirmed: true });
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'pong' });
  s = T(s, 'score'); // Bo
  ok(s.round.throwerIndex === 1, 'pong: next player up');
  s = T(s, 'score'); // Bea — both scored
  ok(s.phase === 'dieBack', 'pong: all score → Die Back, throw again');
  s = reduce(s, { type: 'dieBackAnswer', confirmed: true });
  s = T(s, 'miss');
  ok(s.phase === 'gameOver' && s.winner === 'A', 'pong: one miss ends it');
}

console.log('— redemption: self sink ends immediately —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 9 };
  s.phase = 'endGameConfirm';
  s = reduce(s, { type: 'endGameAnswer', confirmed: true });
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'shootout' });
  s = T(s, 'selfSink');
  ok(s.phase === 'gameOver' && s.winner === 'A', 'self sink in redemption → instant game over');
}

console.log('— FIFA —');
{
  let s = initialState(init());
  s = reduce(s, { type: 'fifa', points: 2 });
  ok(s.scores.B === 2, 'FIFA awards adjustable points to defending team');
}

console.log('— undo + override —');
{
  const i = init();
  let s = initialState(i);
  s = T(s, 'score'); s = T(s, 'score');
  const undone = undoLast(i, s.log);
  ok(undone.scores.A === 1 && undone.round.throwerIndex === 1, 'undo replays minus last event');
  s = reduce(s, { type: 'scoreOverride', scores: { A: 7, B: 2 } });
  ok(s.scores.A === 7 && s.scores.B === 2, 'score override applies');
}

console.log('— stats + N/A catch ratio —');
{
  let s = initialState(init());
  s = T(s, 'score'); s = T(s, 'miss');
  s = reduce(s, { type: 'confirmSwitch' });
  s = T(s, 'height'); s = T(s, 'short');
  const stats = computeAllStats(s);
  const al = stats.find((p) => p.name === 'Al');
  ok(al.pointsContributed === 1 && al.hitRate === 1, 'Al: 1 pt, 100% hit');
  ok(al.catchRatio === null, 'no catch/drop logged → catchRatio N/A (null)');
  const bo = stats.find((p) => p.name === 'Bo');
  ok(bo.heightCount === 1 && bo.hitRate === 0, 'height counts, not a table hit');
}

console.log('— full game → titles + win lines —');
{
  let s = initialState(init());
  // A dominates: Al sinks repeatedly
  while (s.phase !== 'gameOver') {
    if (s.phase === 'play') {
      if (s.possession === 'A') s = T(s, s.round.throwerIndex === 0 ? 'sink' : 'miss');
      else s = T(s, 'miss');
    }
    else if (s.phase === 'switch') s = reduce(s, { type: 'confirmSwitch' });
    else if (s.phase === 'continuePrompt') s = reduce(s, { type: 'continueAnswer', yes: false });
    else if (s.phase === 'endGameConfirm') s = reduce(s, { type: 'endGameAnswer', confirmed: true });
    else if (s.phase === 'redemptionModeSelect') s = reduce(s, { type: 'selectRedemptionMode', mode: 'pong' });
    else break;
  }
  ok(s.winner === 'A', 'A wins the sim');
  const { titles, mvpKey } = assignTitles(s);
  ok(mvpKey === 'A0' && titles['A0'] === 'MVP', 'Al = MVP');
  ok(titles['A1'] === 'Team Carry', 'teammate of MVP on winning team = Team Carry');
  ok(Object.values(titles).length === 4 && Object.values(titles).every(Boolean), 'everyone has exactly one title');
  const lines = winLines(s);
  ok(lines.diff >= 10 ? lines.winLine === 'Belt to ass' : !!lines.winLine, `win line tier ok (“${lines.winLine}” at +${lines.diff})`);
}

console.log('— self sink title override —');
{
  let s = initialState(init());
  s = T(s, 'selfSink');
  const { titles } = assignTitles(s);
  ok(titles['A0'] === 'Absolute Ass', 'self sink → Absolute Ass overrides everything');
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
