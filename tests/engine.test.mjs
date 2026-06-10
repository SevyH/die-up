// Engine verification against V1 rules. Run: node tests/engine.test.mjs
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
// Drive a redemption from a winning board position up to the mode selector.
const toRedemption = (s) => {
  s = T(s, 'score');                                  // P1 crosses the line
  if (s.phase === 'continuePrompt') s = reduce(s, { type: 'continueAnswer', yes: false });
  return s;
};

console.log('— basic round / possession —');
{
  let s = initialState(init());
  s = T(s, 'score');
  ok(s.scores.A === 1, 'P1 score = 1 point');
  ok(s.round.throwerIndex === 1, 'second player highlighted');
  s = T(s, 'miss');
  ok(s.phase === 'switch', 'one score → possession switches after both throws');
  s = reduce(s, { type: 'confirmSwitch' });
  ok(s.possession === 'B' && s.phase === 'play', 'possession flipped to B');
}

console.log('— die back —');
{
  let s = initialState(init());
  s = T(s, 'score'); s = T(s, 'cup');
  ok(s.phase === 'dieBack', 'both throws score → Die Back surfaces');
  ok(s.scores.A === 3, 'score 1 + dink 2 = 3');
  const kept = reduce(s, { type: 'dieBackAnswer', confirmed: true });
  ok(kept.possession === 'A' && kept.round.throwerIndex === 0, '✓ keeps possession, P1 re-highlighted');
  const sw = reduce(s, { type: 'dieBackAnswer', confirmed: false });
  ok(sw.phase === 'switch', 'X → switch possession');
}

console.log('— two-step throw: caught nullifies, no points —');
{
  let s = initialState(init());
  s = T(s, 'caught');
  ok(s.scores.A === 0, 'caught (on-table catch) awards 0 points');
  ok(s.round.throwerIndex === 1, 'caught is a resolved throw → next player up');
  const stats = computeAllStats(s);
  const al = stats.find((p) => p.name === 'Al');
  ok(al.caughtCount === 1 && al.hitRate === 1, 'caught counts as a table hit, not a score');
}

console.log('— defense catch path still nullifies —');
{
  let s = initialState(init());
  s = T(s, 'sink');
  ok(s.scores.A === 3, 'sink = 3');
  s = reduce(s, { type: 'defense', kind: 'catch', playerIndex: 0 });
  ok(s.scores.A === 0, 'catch nullifies the sink');
  s = reduce(s, { type: 'defense', kind: 'drop', playerIndex: 1 });
  ok(s.scores.A === 0, 'drop changes nothing on score');
}

console.log('— self sink = game over —');
{
  let s = initialState(init());
  s = T(s, 'selfSink');
  ok(s.phase === 'gameOver' && s.winner === 'B', 'self sink → throwing team loses instantly');
  const cfg = init(); cfg.config.selfSink.gameLoss = false;
  let s2 = initialState(cfg);
  s2 = T(s2, 'selfSink');
  ok(s2.phase !== 'gameOver' && s2.scores.B === 3, 'gameLoss off → other team gets sink points');
}

console.log('— game point + continue prompt → redemption —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 3 };
  s = T(s, 'score');                                  // A hits 11
  ok(s.phase === 'continuePrompt' && s.pendingContinue.kind === 'gamePoint', 'P1 winning score → Continue with P2?');
  const no = reduce(s, { type: 'continueAnswer', yes: false });
  ok(no.phase === 'redemptionModeSelect', 'No → straight to Begin Redemption (no End Game prompt)');
  let yes = reduce(s, { type: 'continueAnswer', yes: true });
  ok(yes.round.throwerIndex === 1 && yes.phase === 'play', 'Yes → P2 throws');
  yes = T(yes, 'score');
  ok(yes.phase === 'dieBack', 'both scored at game point → Die Back still surfaces (no exceptions)');
}

console.log('— no manual end-game phase exists —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 0 };
  s = toRedemption(s);
  ok(s.phase === 'redemptionModeSelect', 'reaching the threshold never lands on an endGameConfirm phase');
}

console.log('— win by two —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 10 };
  s = T(s, 'score'); s = T(s, 'miss');
  ok(s.phase === 'switch', '11–10 with win-by-two → game continues, no prompt');
}

console.log('— redemption: trailing team shoots, mode is fixed —');
{
  let s = initialState(init());
  s.scores = { A: 10, B: 8 };
  s = toRedemption(s);                                // A → 11, B begins redemption
  ok(s.phase === 'redemptionModeSelect' && s.redemption.shootingTeam === 'B', 'trailing team B enters redemption');
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'shootout' });
  ok(s.redemption.mode === 'shootout' && s.possession === 'B', 'mode fixed, B on the line');
  s = T(s, 'score');                                  // B 9 (down 2) — keep shooting
  ok(s.round.throwerIndex === 0 && s.phase === 'play', 'down 2+ → scorer keeps throwing');
  s = T(s, 'score');                                  // B 10 (down 1) — striking distance
  ok(s.phase === 'continuePrompt' && s.pendingContinue.kind === 'redemptionStrike', 'one below opponent → strike prompt');
  s = reduce(s, { type: 'continueAnswer', yes: true });
  s = T(s, 'score');                                  // B 11 (tied) — same shooter
  ok(s.phase === 'play' && s.round.throwerIndex === 0, 'tie → same player keeps shooting');
  s = T(s, 'score');                                  // B 12 (surpass) — turnover to A
  ok(s.possession === 'A' && s.inRedemption, 'surpass → turnover, A must now answer');
}

console.log('— redemption: shootout strike-No turns it over —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 10 };                        // B already within one
  // hand-build a redemption turn for B
  s.inRedemption = true;
  s.redemptionStats = { A: { points: [0,0], misses: [0,0] }, B: { points: [0,0], misses: [0,0] } };
  s.redemption = { mode: 'shootout', shootingTeam: 'B', originalTrailing: 'B', turnMissed: [false,false] };
  s.possession = 'B'; s.phase = 'play'; s.round = { throwerIndex: 0, throwIds: [] };
  s = T(s, 'score');                                  // B 11 (tie) — keeps shooting
  s = T(s, 'score');                                  // B 12 (lead 1) — turnover to A
  ok(s.possession === 'A', 'B surpasses → A answers');
  ok(s.phase === 'continuePrompt' && s.pendingContinue.kind === 'redemptionStrike', 'A opens down one → strike prompt');
  s = reduce(s, { type: 'continueAnswer', yes: false });
  ok(s.possession === 'B' && s.inRedemption, 'A declines → turnover back to B (B leads by 1, not over yet)');
}

console.log('— redemption: shootout falls short → win by two —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 9 };
  s.inRedemption = true;
  s.redemptionStats = { A: { points: [0,0], misses: [0,0] }, B: { points: [0,0], misses: [0,0] } };
  s.redemption = { mode: 'shootout', shootingTeam: 'B', originalTrailing: 'B', turnMissed: [false,false] };
  s.possession = 'B'; s.phase = 'play'; s.round = { throwerIndex: 0, throwIds: [] };
  s = T(s, 'miss');                                   // Bo out
  ok(s.phase === 'continuePrompt' && s.pendingContinue.kind === 'redemptionMiss', 'miss → continue with next player?');
  s = reduce(s, { type: 'continueAnswer', yes: true });
  ok(s.round.throwerIndex === 1, 'yes → next player shoots');
  s = T(s, 'miss');                                   // Bea out → both missed
  ok(s.phase === 'gameOver' && s.winner === 'A', 'both miss while down 2 → A wins by two');
  ok(s.redemptionResult.succeeded === false, 'comeback failed → not marked successful');
}

console.log('— redemption: comeback succeeds (originally-trailing team wins) —');
{
  // A=11, B=13: B (the originally trailing team) already leads by 2. A answers and
  // misses out → B completes the comeback and is marked successful.
  let s = initialState(init());
  s.scores = { A: 11, B: 13 };
  s.inRedemption = true;
  s.redemptionStats = { A: { points: [0,0], misses: [0,0] }, B: { points: [2,1], misses: [0,0] } };
  s.redemption = { mode: 'shootout', shootingTeam: 'A', originalTrailing: 'B', turnMissed: [false,false] };
  s.possession = 'A'; s.phase = 'play'; s.round = { throwerIndex: 0, throwIds: [] };
  s = T(s, 'miss');                                   // Al out (down 2, no strike prompt)
  ok(s.phase === 'continuePrompt' && s.pendingContinue.kind === 'redemptionMiss', 'down 2 → still gets a continue-with-next prompt');
  s = reduce(s, { type: 'continueAnswer', yes: true });
  s = T(s, 'miss');                                   // Amy out → both missed → B wins by 2
  ok(s.winner === 'B', 'A fails to answer → B wins');
  ok(s.redemptionResult.succeeded === true && s.redemptionResult.originalTrailing === 'B', 'comeback marked successful');
}

console.log('— redemption: pong, one miss ends the turn —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 4 };
  s = T(s, 'score'); s = reduce(s, { type: 'continueAnswer', yes: false });
  s = reduce(s, { type: 'selectRedemptionMode', mode: 'pong' });
  s = T(s, 'score');                                  // Bo
  ok(s.round.throwerIndex === 1, 'pong: next player up');
  s = T(s, 'miss');                                   // Bea misses → turn ends, no prompt
  ok(s.phase === 'gameOver' && s.winner === 'A', 'pong: one miss ends it, A wins');
}

console.log('— redemption: pong both score → Die Back → volley —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 10 };
  s.inRedemption = true;
  s.redemptionStats = { A: { points: [0,0], misses: [0,0] }, B: { points: [0,0], misses: [0,0] } };
  s.redemption = { mode: 'pong', shootingTeam: 'B', originalTrailing: 'B', turnMissed: [false,false] };
  s.possession = 'B'; s.phase = 'play'; s.round = { throwerIndex: 0, throwIds: [] };
  s = T(s, 'score'); s = T(s, 'score');               // both score → 12
  ok(s.phase === 'dieBack', 'pong: both score → Die Back');
  s = reduce(s, { type: 'dieBackAnswer', confirmed: true });
  ok(s.possession === 'A' || s.phase === 'play', 'pong volley resolves (surpass → turnover)');
}

console.log('— redemption: self sink ends immediately —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 9 };
  s = T(s, 'score'); s = reduce(s, { type: 'continueAnswer', yes: false });
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
  let guard = 0;
  while (s.phase !== 'gameOver' && guard++ < 500) {
    if (s.phase === 'play') {
      if (s.possession === 'A') s = T(s, s.round.throwerIndex === 0 ? 'sink' : 'miss');
      else s = T(s, 'miss');
    }
    else if (s.phase === 'switch') s = reduce(s, { type: 'confirmSwitch' });
    else if (s.phase === 'dieBack') s = reduce(s, { type: 'dieBackAnswer', confirmed: false });
    else if (s.phase === 'continuePrompt') s = reduce(s, { type: 'continueAnswer', yes: false });
    else if (s.phase === 'redemptionModeSelect') s = reduce(s, { type: 'selectRedemptionMode', mode: 'pong' });
    else break;
  }
  ok(s.winner === 'A', 'A wins the sim');
  const { titles, mvpKey } = assignTitles(s);
  ok(mvpKey === 'A0' && titles['A0'] === 'MVP', 'Al = MVP (most points)');
  const names = Object.values(titles);
  ok(names.length === new Set(names).size, 'no two players share a title');
  ok(!('B0' in titles && titles['B0'] === 'MVP'), 'MVP is unique and on the dominant team');
  const lines = winLines(s);
  ok(!!lines.winLine, `win line resolved (“${lines.winLine}” at +${lines.diff})`);
}

console.log('— Team Carry sits opposite the MVP —');
{
  // A wins, but B's Bo genuinely produced → Team Carry should land on B.
  let s = initialState(init());
  s.scores = { A: 11, B: 8 };
  s.throwLog = [
    { id:0, team:'A', playerIndex:0, outcome:'sink', points:3, scores:true, nullified:false },
    { id:1, team:'A', playerIndex:0, outcome:'sink', points:3, scores:true, nullified:false },
    { id:2, team:'A', playerIndex:1, outcome:'miss', points:0, scores:false, nullified:false },
    { id:3, team:'B', playerIndex:0, outcome:'sink', points:3, scores:true, nullified:false },
    { id:4, team:'B', playerIndex:0, outcome:'cup',  points:2, scores:true, nullified:false },
    { id:5, team:'B', playerIndex:1, outcome:'miss', points:0, scores:false, nullified:false },
  ];
  s.winner = 'A'; s.phase = 'gameOver';
  const { titles, mvpKey } = assignTitles(s);
  ok(mvpKey === 'A0', 'MVP on A');
  ok(titles['B0'] === 'Team Carry', 'Team Carry on the opposite team (B0)');
  ok(!Object.entries(titles).some(([k,v]) => v === 'Team Carry' && k[0] === 'A'), 'Team Carry never shares MVP team');
}

console.log('— Team Carry not forced when nobody carried —');
{
  let s = initialState(init());
  s.scores = { A: 11, B: 1 };
  s.throwLog = [
    { id:0, team:'A', playerIndex:0, outcome:'sink', points:3, scores:true, nullified:false },
    { id:1, team:'B', playerIndex:0, outcome:'score', points:1, scores:true, nullified:false },
    { id:2, team:'B', playerIndex:1, outcome:'miss', points:0, scores:false, nullified:false },
  ];
  s.winner = 'A'; s.phase = 'gameOver';
  const { titles } = assignTitles(s);
  ok(!Object.values(titles).includes('Team Carry'), 'no genuine carry → Team Carry not assigned');
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
