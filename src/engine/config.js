// ============================================================
// Die Up — Tunables & Defaults
// Everything game-balance-related lives here. Change a number,
// the whole app follows. (PRD: "designed to be easily tunable")
// ============================================================

export const DEFAULT_CONFIG = {
  pointsToWin: 11,          // scroll wheel 1–99
  winByTwo: true,
  redemption: true,

  // TSP packages: { enabled, points (1–10 or 'gameOver'), awardsTo: 'throwing'|'defending' }
  sink:    { enabled: true, points: 3, awardsTo: 'throwing' },
  cup:     { enabled: true, points: 2, awardsTo: 'throwing' },

  // Self sink: consequence only, no point value.
  // gameLoss ON => throwing team loses instantly.
  // gameLoss OFF => self sink scores for the opposing team instead
  // (awarded points = sink value; see README "flagged assumptions").
  selfSink: { enabled: true, gameLoss: true },

  // FIFA: toggle only in config. Point value is set in the moment
  // (default 1) when the FIFA button is tapped mid-game.
  fifa: { enabled: true, defaultPoints: 1 },

  // House rules: [{ id, name, enabled, points, awardsTo }]
  houseRules: [],
};

// Base outcomes always present on the throwing screen.
// points: null means "use config value at runtime".
export const THROW_OUTCOMES = {
  score:    { label: 'Score',     points: 1,    hitsTable: true,  scores: true  },
  cup:      { label: 'Cup/Dink',  points: null, hitsTable: true,  scores: true  },
  sink:     { label: 'Sink',      points: null, hitsTable: true,  scores: true  },
  short:    { label: 'Short',     points: 0,    hitsTable: true,  scores: false },
  height:   { label: 'Height',    points: 0,    hitsTable: false, scores: false },
  miss:     { label: 'Miss',      points: 0,    hitsTable: false, scores: false },
  selfSink: { label: 'Self Sink', points: 0,    hitsTable: false, scores: false },
};

// ---------- Title thresholds (Section 9) ----------
export const TITLE_TUNABLES = {
  sniperScoreRate: 0.70,
  glueGuyMin: 0.55,
  glueGuyMax: 0.6999,
  brickWallCatchRatio: 0.80,
  heatCheckStreak: 4,
  cupHunterMin: 2,            // "multiple cups"
  heightTroubleMin: 3,
  deadWeightMaxPoints: 2,     // "< 2 points contributed" (exclusive)
  oleReliableHitRate: 0.60,   // "solid" — tunable judgment calls
  oleReliableCatchRatio: 0.50,
  shitLuckHitRate: 0.65,      // high hit rate...
  shitLuckScoreRate: 0.35,    // ...but low score rate
  liabilityHitRate: 0.40,     // low hit rate
  liabilityDropRate: 0.50,    // high drop rate
  cluelessHitRate: 0.35,      // low hit rate, mostly misses
  comebackCarryMinPoints: 3,  // min pts during redemption
  comebackDeficitForLine: 4,  // "4+ pt comeback win" win-screen tier
};

export const WIN_LINES = [
  // Checked top-down. comeback overrides differential tiers (PRD 7.12).
  { id: 'comeback', test: (diff, comeback) => comeback && true, win: 'Comeback W',             lose: 'Choked' },
  { id: 'close',    test: (diff) => diff <= 2,                  win: 'Too close for comfort',  lose: 'Almost had it...' },
  { id: 'solid',    test: (diff) => diff <= 4,                  win: 'Solid win',              lose: 'Better luck next time' },
  { id: 'dominant', test: (diff) => diff <= 6,                  win: 'Dominant',               lose: 'Go home' },
  { id: 'untouch',  test: (diff) => diff <= 9,                  win: 'Untouchable',            lose: 'Embarrassing' },
  { id: 'belt',     test: () => true,                           win: 'Belt to ass',            lose: 'Uninstall the app' },
];

export const INVITE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
