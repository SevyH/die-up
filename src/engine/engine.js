// ============================================================
// Die Up — Game Engine (pure module: no UI, no Firebase)
//
// Design notes
// - State is plain JSON (survives Firebase round-trips intact).
// - Every throw lives in state.throwLog; the current round holds
//   *indices* into that log, so a Catch can retroactively nullify
//   a score without fragile object references.
// - Undo replays the event log minus the last event.
// - All point values / thresholds come from config (tunable).
// ============================================================
import { THROW_OUTCOMES } from './config.js';

// ---------- phases ----------
// play                 throwing/defending screens live
// dieBack              both throws scored, awaiting ✓/X on throwing phone
// continuePrompt       win/tie reached mid-round: "Continue with [P]?"
// switch               full-screen possession-change confirm
// endGameConfirm       winning score logged → confirm prompt
// redemptionModeSelect creator picks Shootout / Pong
// gameOver             win screen → podium

export const other = (t) => (t === 'A' ? 'B' : 'A');

export function initialState({ config, teams, firstPossession }) {
  return {
    config,
    teams,                                   // { A:{name,players:[n1,n2]}, B:{...} }
    scores: { A: 0, B: 0 },
    possession: firstPossession,             // 'A' | 'B'
    phase: 'play',
    round: { throwerIndex: 0, throwIds: [] },
    inRedemption: false,
    redemption: null,
    redemptionResult: null,                  // kept after redemption resolves
    maxDeficit: { A: 0, B: 0 },
    lastScorer: null,                        // { team, playerIndex } — "The Closer"
    winner: null,
    endedBySelfSink: null,                   // { team, playerIndex } | null
    fx: null,                                // { id, type, payload } animation bus
    throwLog: [],                            // every throw, final truth for stats
    defenseLog: [],                          // { team, playerIndex, kind }
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
  if (s.inRedemption && team === s.redemption.team && playerIndex !== null) {
    s.redemption.pointsByPlayer[playerIndex] += points;
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
  fx(s, 'win', { winner });
}

// ============================================================
// Round / possession flow
// ============================================================
function roundThrows(s) {
  return s.round.throwIds.map((i) => s.throwLog[i]);
}

function goToSwitchOrEnd(s) {
  // A team's turn just ended. If anyone now meets the win condition,
  // surface the End Game confirmation (PRD 7.10); otherwise switch.
  if (leaderMeetingWin(s)) { s.phase = 'endGameConfirm'; return; }
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
  // Die Back ALWAYS surfaces if both throws score — no exceptions (PRD §4).
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
      // "Self sink during redemption → game ends immediately, no exceptions."
      return failRedemption(s, { team, playerIndex });
    }
    if (s.config.selfSink.gameLoss) {
      return endGame(s, other(team), { team, playerIndex });
    }
    // gameLoss OFF → scores for the opposing team instead (sink value).
    addPoints(s, other(team), s.config.sink.points);
    s.teamPointsLog.push({ team: other(team), points: s.config.sink.points, source: 'selfSink' });
    if (meetsWin(s, other(team))) { s.phase = 'endGameConfirm'; return; }
    return advanceNormalRound(s, false);
  }

  const points = outcomePoints(s, key);
  const scores = !!def.scores && points > 0;
  recordThrow(s, team, playerIndex, key, points, scores);
  if (scores) {
    addPoints(s, team, points, playerIndex);
    if (key === 'sink') fx(s, 'sink', { team, playerIndex });
  }

  if (s.inRedemption) return advanceRedemption(s, scores);
  return advanceNormalRound(s, scores);
}

function advanceNormalRound(s, justScored) {
  const team = s.possession;
  const idx = s.round.throwerIndex;

  // Game point: first thrower scores and the win condition is now met
  // → "Continue with [Player 2]?" (PRD §4 / 7.5).
  if (idx === 0 && justScored && meetsWin(s, team)) {
    s.pendingContinue = { kind: 'gamePoint' };
    s.phase = 'continuePrompt';
    return;
  }

  if (idx === 0) { s.round.throwerIndex = 1; return; }
  finishRound(s);
}

// ============================================================
// Redemption
// ============================================================
function startRedemption(s) {
  const leading = leaderMeetingWin(s);
  const team = other(leading);
  s.inRedemption = true;
  s.redemption = {
    team,
    mode: null,
    missed: [false, false],       // shootout eliminations
    pointsByPlayer: [0, 0],
    missesByPlayer: [0, 0],       // Ice Man
    succeeded: null,
  };
  s.possession = team;
  s.round = { throwerIndex: 0, throwIds: [] };
  s.phase = 'redemptionModeSelect';
  fx(s, 'redemption');
}

function resumeNormalPlay(s) {
  // Trailing team tied/surpassed → normal gameplay resumes, win-by-two on.
  s.redemption.succeeded = true;
  s.redemptionResult = { ...s.redemption };
  s.inRedemption = false;
  s.redemption = null;
  s.possession = other(s.possession);
  s.round = { throwerIndex: 0, throwIds: [] };
  s.phase = 'switch';
}

function failRedemption(s, selfSinkInfo = null) {
  s.redemption.succeeded = false;
  s.redemptionResult = { ...s.redemption };
  const loser = s.redemption.team;
  s.inRedemption = false;
  s.redemption = null;
  endGame(s, other(loser), selfSinkInfo);
}

function advanceRedemption(s, scored) {
  const r = s.redemption;
  if (scored) {
    if (s.scores[r.team] >= s.scores[other(r.team)]) {
      // Tied or surpassed. "Continue with [next player]?" applies during
      // redemption (PRD §5): keep throwing, or bank it and resume play.
      s.pendingContinue = { kind: 'redemptionReached' };
      s.phase = 'continuePrompt';
      return;
    }
    if (r.mode === 'shootout') return;              // score → keep throwing
    // pong: next player must also score
    const next = (s.round.throwerIndex + 1) % 2;
    s.round.throwerIndex = next;
    if (next === 0) { s.phase = 'dieBack'; fx(s, 'dieBack'); } // all scored → Die Back
    return;
  }

  // Missed
  r.missesByPlayer[s.round.throwerIndex] += 1;
  if (r.mode === 'pong') return failRedemption(s);  // one miss ends it

  // shootout: eliminate, advance to next un-missed player
  r.missed[s.round.throwerIndex] = true;
  const next = r.missed.findIndex((m) => !m);
  if (next === -1) return failRedemption(s);        // everyone has missed
  s.round.throwerIndex = next;
}

// ============================================================
// Defense
// ============================================================
function applyDefense(s, ev) {
  const defTeam = other(s.possession);
  s.defenseLog.push({ team: defTeam, playerIndex: ev.playerIndex, kind: ev.kind });
  if (ev.kind !== 'catch') return; // Drop: score stands, stat only.

  // Catch nullifies the most recent live scoring throw of this round.
  const t = roundThrows(s).reverse().find((x) => x.scores && !x.nullified);
  if (!t) return;
  t.nullified = true;
  s.scores[t.team] -= t.points;
  if (s.inRedemption && t.team === s.redemption?.team) {
    s.redemption.pointsByPlayer[t.playerIndex] -= t.points;
  }
  updateDeficits(s);

  // Roll back anything that score had just triggered.
  if (s.phase === 'continuePrompt' && s.pendingContinue?.kind === 'gamePoint') {
    s.pendingContinue = null;
    s.phase = 'play';
    s.round.throwerIndex = 1; // P1's score was caught; P2 still throws
  } else if (s.phase === 'continuePrompt' && s.pendingContinue?.kind === 'redemptionReached') {
    s.pendingContinue = null;
    s.phase = 'play';
    if (s.redemption?.mode === 'shootout') {
      // caught throw counts as a miss for that thrower
      advanceRedemption(s, false);
    } else if (s.redemption) {
      return failRedemption(s); // pong: a caught throw is a failed throw
    }
  } else if (s.phase === 'dieBack') {
    s.phase = 'play';
    finishRound(s); // re-evaluate: now only one scored → switch
  } else if (s.phase === 'endGameConfirm') {
    s.phase = leaderMeetingWin(s) ? 'endGameConfirm' : 'switch';
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
      if (meetsWin(s, defTeam) && !s.inRedemption) s.phase = 'endGameConfirm';
      break;
    }

    case 'houseRule': {
      const rule = (s.config.houseRules || []).find((r) => r.id === ev.ruleId);
      if (!rule || !rule.enabled) break;
      const team = rule.awardsTo === 'throwing' ? s.possession : other(s.possession);
      if (rule.points === 'gameOver') { endGame(s, team); break; }
      addPoints(s, team, rule.points);
      s.teamPointsLog.push({ team, points: rule.points, source: rule.name });
      if (meetsWin(s, team) && team !== s.possession && !s.inRedemption) s.phase = 'endGameConfirm';
      break;
    }

    case 'dieBackAnswer': {
      if (s.phase !== 'dieBack') break;
      if (ev.confirmed) {
        s.round = { throwerIndex: 0, throwIds: [] };
        s.phase = 'play';
      } else if (s.inRedemption) {
        if (s.scores[s.redemption.team] >= s.scores[other(s.redemption.team)]) resumeNormalPlay(s);
        else failRedemption(s);
      } else {
        goToSwitchOrEnd(s);
      }
      break;
    }

    case 'continueAnswer': {
      if (s.phase !== 'continuePrompt') break;
      const pending = s.pendingContinue;
      s.pendingContinue = null;
      if (pending?.kind === 'redemptionReached') {
        if (ev.yes) s.phase = 'play';
        else resumeNormalPlay(s);
      } else {
        if (ev.yes) { s.round.throwerIndex = 1; s.phase = 'play'; }
        else s.phase = 'endGameConfirm'; // → confirm → redemption or win (PRD 7.10)
      }
      break;
    }

    case 'confirmSwitch':
      if (s.phase === 'switch') confirmSwitch(s);
      break;

    case 'endGameAnswer': {
      if (s.phase !== 'endGameConfirm') break;
      if (!ev.confirmed) { s.phase = 'switch'; break; }
      const winner = leaderMeetingWin(s);
      if (s.config.redemption && !s.redemptionResult && winner) startRedemption(s);
      else endGame(s, winner || s.possession);
      break;
    }

    case 'selectRedemptionMode': {
      if (s.phase !== 'redemptionModeSelect') break;
      s.redemption.mode = ev.mode; // 'shootout' | 'pong'
      s.phase = 'play';
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

// Undo last logged action (creator only, PRD 7.9): replay log minus one.
export function undoLast(init, log) {
  let s = initialState(init);
  for (const ev of log.slice(0, -1)) s = reduce(s, ev);
  return s;
}
