// ============================================================
// Die Up — Game Engine (pure module: no UI, no Firebase)
//
// Design notes
// - State is plain JSON (survives Firebase round-trips intact).
// - Every throw lives in state.throwLog; the current round holds
//   *indices* into that log.
// - Undo replays the event log minus the last event.
// - All point values / thresholds come from config (tunable).
//
// V1 redemption is a full win-by-two ping-pong shootout. The
// "Continue with [player]?" prompt and Game Point share ONE engine
// path (continuePrompt + continueAnswer). See README §"Redemption".
// ============================================================
import { THROW_OUTCOMES } from './config.js';

// ---------- phases ----------
// play                 throwing/defending screens live
// dieBack              both throws scored, awaiting ✓/X on throwing phone
// continuePrompt       "Continue with [player]?" (game point OR redemption)
// switch               full-screen possession-change confirm
// redemptionModeSelect creator picks Shootout / Pong ("Begin Redemption")
// gameOver             win screen → podium
//
// continuePrompt kinds (s.pendingContinue.kind):
//   gamePoint         a team met the win threshold on P1's throw
//   redemptionStrike  shooting team reached one below the opponent (striking distance)
//   redemptionMiss    a shootout shooter missed → continue with next player?

export const other = (t) => (t === 'A' ? 'B' : 'A');

export function initialState({ config, teams, firstPossession }) {
  return {
    config,
    teams,                                   // { A:{name,players:[n1,n2]}, B:{...} }
    scores: { A: 0, B: 0 },
    possession: firstPossession,             // 'A' | 'B'
    phase: 'play',
    round: { throwerIndex: 0, throwIds: [] },
    pendingContinue: null,                   // { kind, ... } when phase === continuePrompt
    inRedemption: false,
    redemption: null,                        // live redemption turn state
    redemptionStats: null,                   // { A:{points:[],misses:[]}, B:{...} }
    redemptionResult: null,                  // kept after redemption resolves
    maxDeficit: { A: 0, B: 0 },
    lastScorer: null,                        // { team, playerIndex } — "The Closer"
    winner: null,
    endedBySelfSink: null,                   // { team, playerIndex } | null
    fx: null,                                // { id, type, payload } animation bus
    throwLog: [],                            // every throw, final truth for stats
    defenseLog: [],                          // { team, playerIndex, kind } (FIFA-era; usually empty in V1)
    teamPointsLog: [],                       // FIFA / house-rule team awards
    log: [],                                 // raw event log (undo)
  };
}

export function meetsWin(state, team) {
  const { pointsToWin, winByTwo } = state.config;
  return (
    state.scores[team] >= pointsToWin &&
    (!winByTwo || state.scores[team] - state.scores[other(team)] >= 2)
  );
}

export function isGamePoint(state, team) {
  const { pointsToWin, winByTwo } = state.config;
  const s = state.scores[team], o = state.scores[other(team)];
  return s + 1 >= pointsToWin && (!winByTwo || s + 1 - o >= 2);
}

const leaderMeetingWin = (s) => (meetsWin(s, 'A') ? 'A' : meetsWin(s, 'B') ? 'B' : null);

function updateDeficits(s) {
  for (const t of ['A', 'B']) {
    const d = s.scores[other(t)] - s.scores[t];
    if (d > s.maxDeficit[t]) s.maxDeficit[t] = d;
  }
}

function fx(s, type, payload = {}) {
  s.fx = { id: (s.fx?.id || 0) + 1, type, payload };
}

function addPoints(s, team, points, playerIndex = null) {
  if (!points || points <= 0) return;
  s.scores[team] += points;
  if (playerIndex !== null) s.lastScorer = { team, playerIndex };
  if (s.inRedemption && playerIndex !== null && s.redemptionStats?.[team]) {
    s.redemptionStats[team].points[playerIndex] += points;
  }
  updateDeficits(s);
}

function outcomePoints(s, key) {
  if (key === 'score') return 1;
  if (key === 'cup') return s.config.cup.enabled ? s.config.cup.points : 0;
  if (key === 'sink') return s.config.sink.enabled ? s.config.sink.points : 0;
  return 0;
}

function endGame(s, winner, selfSinkInfo = null) {
  s.winner = winner;
  s.endedBySelfSink = selfSinkInfo;
  s.phase = 'gameOver';
  s.pendingContinue = null;
  fx(s, 'win', { winner });
}

// triggerWin: a team has met the win threshold. With redemption on (and
// not already resolved), hand the trailing team their shootout; otherwise
// end the game. Single source of truth for "the math says someone won".
function triggerWin(s) {
  const leader = leaderMeetingWin(s);
  if (!leader) return false;
  if (s.config.redemption && !s.redemptionResult) {
    startRedemption(s, leader);
    return true;
  }
  endGame(s, leader);
  return true;
}

// ============================================================
// Round / possession flow (normal play)
// ============================================================
function roundThrows(s) {
  return s.round.throwIds.map((i) => s.throwLog[i]);
}

function goToSwitchOrEnd(s) {
  if (triggerWin(s)) return;
  s.phase = 'switch';
}

function confirmSwitch(s) {
  s.possession = other(s.possession);
  s.round = { throwerIndex: 0, throwIds: [] };
  s.phase = 'play';
  if (isGamePoint(s, 'A') || isGamePoint(s, 'B')) fx(s, 'gamePoint');
}

function finishRound(s) {
  const live = roundThrows(s).filter((t) => !t.nullified);
  const scoring = live.filter((t) => t.scores);
  // Die Back ALWAYS surfaces if both throws score — no exceptions.
  if (live.length >= 2 && scoring.length >= 2) {
    s.phase = 'dieBack';
    fx(s, 'dieBack');
    return;
  }
  goToSwitchOrEnd(s);
}

// ============================================================
// Throws
// ============================================================
function recordThrow(s, team, playerIndex, outcome, points, scores) {
  const id = s.throwLog.length;
  s.throwLog.push({ id, team, playerIndex, outcome, points, scores, nullified: false, inRedemption: s.inRedemption });
  s.round.throwIds.push(id);
  return id;
}

function applyThrow(s, ev) {
  if (s.phase !== 'play') return;
  const team = s.possession;
  const playerIndex = s.round.throwerIndex;
  const key = ev.outcome;
  const def = THROW_OUTCOMES[key];
  if (!def) return;

  // ----- Self Sink -----
  if (key === 'selfSink') {
    if (!s.config.selfSink.enabled) return;
    recordThrow(s, team, playerIndex, key, 0, false);
    fx(s, 'selfSink', { team, playerIndex });
    if (s.inRedemption) {
      // "Self sink during redemption → game ends immediately. No exceptions."
      return resolveRedemption(s, other(team), { team, playerIndex });
    }
    if (s.config.selfSink.gameLoss) {
      return endGame(s, other(team), { team, playerIndex });
    }
    // gameLoss OFF → scores for the opposing team instead (sink value).
    addPoints(s, other(team), s.config.sink.points);
    s.teamPointsLog.push({ team: other(team), points: s.config.sink.points, source: 'selfSink' });
    if (triggerWin(s)) return;
    return advanceNormalRound(s, false);
  }

  const points = outcomePoints(s, key);
  const scores = !!def.scores && points > 0;
  recordThrow(s, team, playerIndex, key, points, scores);
  if (scores) {
    addPoints(s, team, points, playerIndex);
    if (key === 'sink') fx(s, 'sink', { team, playerIndex });
  }

  // Log the catch to the individual defender when catcherIndex is provided.
  if (key === 'caught' && ev.catcherIndex != null) {
    const defTeam = other(team);
    s.defenseLog.push({ team: defTeam, playerIndex: ev.catcherIndex, kind: 'catch' });
  }

  if (s.inRedemption) return advanceRedemption(s, scores);
  return advanceNormalRound(s, scores);
}

function advanceNormalRound(s, justScored) {
  const team = s.possession;
  const idx = s.round.throwerIndex;

  // Game point: P1 scores and the win condition is now met → "Continue with P2?"
  if (idx === 0 && justScored && meetsWin(s, team)) {
    s.pendingContinue = { kind: 'gamePoint' };
    s.phase = 'continuePrompt';
    return;
  }

  if (idx === 0) { s.round.throwerIndex = 1; return; }
  finishRound(s);
}

// ============================================================
// Redemption — win-by-two ping-pong shootout
//
// The shooting team is always the team trying to overcome a deficit.
// They shoot until they take the lead (turn flips to the opponent, who
// must now answer) or fall short. The game ends only when one team
// leads by 2 AND the trailing team has finished a turn without catching
// up. Self sink ends it instantly (shooter loses).
// ============================================================
function startRedemption(s, leader) {
  const trailing = other(leader);
  s.inRedemption = true;
  s.redemptionStats = {
    A: { points: [0, 0], misses: [0, 0] },
    B: { points: [0, 0], misses: [0, 0] },
  };
  s.redemption = {
    mode: null,                 // 'shootout' | 'pong' — picked once, fixed for the cycle
    shootingTeam: trailing,
    originalTrailing: trailing, // who started behind (for "comeback succeeded")
    turnMissed: [false, false], // shootout: players eliminated for THIS turn
  };
  s.possession = trailing;
  s.round = { throwerIndex: 0, throwIds: [] };
  s.phase = 'redemptionModeSelect';
  fx(s, 'redemption');
}

// Begin a fresh redemption turn for `team`. Fires the striking-distance
// prompt immediately if they open the turn one point below the opponent.
function startRedemptionTurn(s, team) {
  const r = s.redemption;
  r.shootingTeam = team;
  r.turnMissed = [false, false];
  s.possession = team;
  s.round = { throwerIndex: 0, throwIds: [] };
  s.phase = 'play';
  if (r.mode === 'shootout' && s.scores[team] === s.scores[other(team)] - 1) {
    s.pendingContinue = { kind: 'redemptionStrike' };
    s.phase = 'continuePrompt';
  }
}

// A turn just ended. Decide game-over vs. hand the turn to the opponent.
function redemptionTurnover(s) {
  const from = s.redemption.shootingTeam;
  const to = other(from);
  s.pendingContinue = null;
  // The team about to receive the turn already leads by 2+ → the team that
  // just finished missed out. Game over.
  if (s.scores[to] - s.scores[from] >= 2) {
    return resolveRedemption(s, to);
  }
  startRedemptionTurn(s, to);
}

function resolveRedemption(s, winner, selfSinkInfo = null) {
  const r = s.redemption;
  s.redemptionResult = {
    mode: r.mode,
    winner,
    loser: other(winner),
    originalTrailing: r.originalTrailing,
    succeeded: winner === r.originalTrailing, // the comeback team won
    stats: structuredClone(s.redemptionStats),
  };
  s.inRedemption = false;
  s.redemption = null;
  endGame(s, winner, selfSinkInfo);
}

function advanceRedemption(s, scored) {
  if (s.redemption.mode === 'pong') return advanceRedemptionPong(s, scored);
  return advanceRedemptionShootout(s, scored);
}

function advanceRedemptionShootout(s, scored) {
  const r = s.redemption;
  const team = r.shootingTeam;
  const opp = other(team);
  const idx = s.round.throwerIndex;

  if (scored) {
    const lead = s.scores[team] - s.scores[opp];
    if (lead >= 1) return redemptionTurnover(s);   // surpassed → opponent answers
    if (lead === 0) return;                         // tied → same player keeps shooting
    if (lead === -1) {                              // striking distance → prompt
      s.pendingContinue = { kind: 'redemptionStrike' };
      s.phase = 'continuePrompt';
      return;
    }
    return;                                         // down 2+ → keep shooting
  }

  // missed (or caught)
  r.turnMissed[idx] = true;
  s.redemptionStats[team].misses[idx] += 1;
  const nextIdx = r.turnMissed.findIndex((m) => !m);
  if (nextIdx === -1) return redemptionTurnover(s); // both missed → fell short
  s.pendingContinue = { kind: 'redemptionMiss', nextIdx };
  s.phase = 'continuePrompt';
}

function advanceRedemptionPong(s, scored) {
  const r = s.redemption;
  const team = r.shootingTeam;
  const idx = s.round.throwerIndex;

  if (!scored) {
    // One miss ends this team's turn immediately — no prompt.
    s.redemptionStats[team].misses[idx] += 1;
    return redemptionTurnover(s);
  }
  if (idx === 0) { s.round.throwerIndex = 1; return; } // P1 scored → P2 must score
  // Both scored → Die Back (resolved in person), then re-evaluate the volley.
  s.phase = 'dieBack';
  fx(s, 'dieBack');
}

function pongRoundResolved(s) {
  const r = s.redemption;
  const team = r.shootingTeam;
  if (s.scores[team] > s.scores[other(team)]) return redemptionTurnover(s); // surpassed
  s.round = { throwerIndex: 0, throwIds: [] };                              // volley again
  s.phase = 'play';
}

// ============================================================
// Defense (FIFA-era; catches are now logged on the throwing screen).
// The catch path stays functional for completeness / tooling.
// ============================================================
function applyDefense(s, ev) {
  const defTeam = other(s.possession);
  s.defenseLog.push({ team: defTeam, playerIndex: ev.playerIndex, kind: ev.kind });
  if (ev.kind !== 'catch') return; // Drop: score stands, stat only.

  const t = roundThrows(s).reverse().find((x) => x.scores && !x.nullified);
  if (!t) return;
  t.nullified = true;
  s.scores[t.team] -= t.points;
  if (s.inRedemption && s.redemptionStats?.[t.team]) {
    s.redemptionStats[t.team].points[t.playerIndex] -= t.points;
  }
  updateDeficits(s);

  if (s.phase === 'continuePrompt' && s.pendingContinue?.kind === 'gamePoint') {
    s.pendingContinue = null;
    s.phase = 'play';
    s.round.throwerIndex = 1; // P1's score was caught; P2 still throws
  } else if (s.phase === 'dieBack' && !s.inRedemption) {
    s.phase = 'play';
    finishRound(s);
  }
}

// ============================================================
// Reducer
// ============================================================
export function reduce(prev, ev) {
  const s = structuredClone(prev);
  s.log.push(ev);

  switch (ev.type) {
    case 'throw': applyThrow(s, ev); break;
    case 'defense': applyDefense(s, ev); break;

    case 'fifa': {
      if (!s.config.fifa.enabled) break;
      const defTeam = other(s.possession);
      addPoints(s, defTeam, ev.points);
      s.teamPointsLog.push({ team: defTeam, points: ev.points, source: 'fifa' });
      if (!s.inRedemption) triggerWin(s);
      break;
    }

    case 'houseRule': {
      const rule = (s.config.houseRules || []).find((r) => r.id === ev.ruleId);
      if (!rule || !rule.enabled) break;
      const team = rule.awardsTo === 'throwing' ? s.possession : other(s.possession);
      if (rule.points === 'gameOver') { endGame(s, team); break; }
      addPoints(s, team, rule.points);
      s.teamPointsLog.push({ team, points: rule.points, source: rule.name });
      if (!s.inRedemption) triggerWin(s);
      break;
    }

    case 'dieBackAnswer': {
      if (s.phase !== 'dieBack') break;
      if (s.inRedemption) { pongRoundResolved(s); break; } // pong volley complete
      if (triggerWin(s)) break;                            // a team won → redemption/end
      if (ev.confirmed) {
        s.round = { throwerIndex: 0, throwIds: [] };
        s.phase = 'play';
      } else {
        goToSwitchOrEnd(s);
      }
      break;
    }

    case 'continueAnswer': {
      if (s.phase !== 'continuePrompt') break;
      const pending = s.pendingContinue;
      s.pendingContinue = null;
      if (pending?.kind === 'redemptionStrike') {
        if (ev.yes) s.phase = 'play';        // current player keeps shooting
        else redemptionTurnover(s);          // No → immediate turnover
      } else if (pending?.kind === 'redemptionMiss') {
        if (ev.yes) { s.round.throwerIndex = pending.nextIdx; s.phase = 'play'; }
        else redemptionTurnover(s);          // No → turnover
      } else {
        // game point
        if (ev.yes) { s.round.throwerIndex = 1; s.phase = 'play'; } // P2 throws
        else if (!triggerWin(s)) s.phase = 'switch';                // No → begin redemption / win
      }
      break;
    }

    case 'confirmSwitch':
      if (s.phase === 'switch') confirmSwitch(s);
      break;

    case 'selectRedemptionMode': {
      if (s.phase !== 'redemptionModeSelect') break;
      s.redemption.mode = ev.mode; // 'shootout' | 'pong'
      startRedemptionTurn(s, s.redemption.shootingTeam);
      break;
    }

    case 'scoreOverride': {
      s.scores = { A: Math.max(0, ev.scores.A | 0), B: Math.max(0, ev.scores.B | 0) };
      updateDeficits(s);
      break;
    }

    default: break;
  }
  return s;
}

// Undo last logged action (creator only): replay log minus one.
export function undoLast(init, log) {
  let s = initialState(init);
  for (const ev of log.slice(0, -1)) s = reduce(s, ev);
  return s;
}
