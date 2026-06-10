# Die Up 🎲

Mobile-first PWA for live beer die tracking. Two phones, one game, synced through
Firebase Realtime Database. Built to PRD v4.0.

## Quick start

```bash
npm install
npm run dev          # local dev — runs in MOCK sync mode (see below)
npm run build        # production PWA build → dist/
node tests/engine.test.mjs   # 41 rule tests against the PRD
```

### Dev without Firebase (mock mode)
If no Firebase env vars are present, the app automatically uses a
BroadcastChannel/localStorage mock so you can test the full two-phone flow in
**two browser tabs on one machine**. Tab 1: Create Game → Invite Opponent (link
copied). Tab 2: paste the link. Everything syncs locally.

### Connecting real Firebase
1. Create a Firebase project → enable **Realtime Database** (test mode to start).
2. Copy `.env.example` to `.env` and fill in your values:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

3. `npm run dev` — sync now runs through Firebase. No further code changes.

Suggested database rules for V1 (no auth, sessions are short-lived and unguessable-ish):

```json
{ "rules": { "games": { "$id": { ".read": true, ".write": true } } } }
```

## Architecture

```
src/
  engine/            ← pure game logic, zero UI/Firebase imports
    config.js          all defaults, point values, title thresholds, win lines (TUNE HERE)
    engine.js          state machine reducer + undo (replay event log)
    stats.js           per-player stats (PRD §8)
    titles.js          22 titles, priority-ordered, self-sink override (PRD §9)
    winLines.js        win/lose lines by differential + comeback (PRD 7.12)
  firebase/adapter.js  Firebase RTDB + local mock fallback, 15-min invite expiry
  state/GameContext.jsx session lifecycle, roles, dispatch→sync
  components/          ui primitives, FxOverlay (animation bus)
  screens/             Home/Join, GameConfig, CreateTeams, WhoThrowsFirst,
                       Game (phase router), PostGame (Win/Podium/StatCard)
tests/engine.test.mjs  rule verification
```

**How sync works.** The engine is a pure reducer over an event log. Any phone
that takes an action reads the latest state, applies `reduce(state, event)`,
and writes the new state back to `games/{id}`. Both phones subscribe to that
node, so scores, phase changes, and animations (`state.fx`) land on both
screens simultaneously. Undo replays the event log minus the last event.
Last-write-wins is the accepted V1 concurrency model.

**Two-phone routing.** Creator's phone = Team A (Team 1), joiner's = Team B.
The in-game router keys off `state.phase` + `state.possession` vs `myTeam`:
the possessing team's phone gets the Throwing Screen, the other gets the
Defending Screen, Die Back shows ✓/✕ only on the throwing phone (the other
shows the "Waiting for Die Back confirmation…" holding state), redemption mode
select and the score-override pencil exist only on the creator's phone.

## Tuning guide
Everything game-balance-related lives in `src/engine/config.js`:
- `DEFAULT_CONFIG` — point values, toggles, FIFA default
- `TITLE_TUNABLES` — every title threshold (Sniper %, streak length, etc.)
- `WIN_LINES` — win-screen tiers and copy
- Title **priority order** is the `TITLE_ORDER` array in `titles.js` — reorder freely.

## PRD ambiguities — decisions made (flagging per build instructions)
These weren't fully specified; each is implemented one way and trivially changeable:

1. **Self sink with "game loss" toggled OFF** — PRD says it "scores for the
   opposing team instead" but assigns no point value. Implemented: opposing
   team receives the **sink** point value (default 3). One-line change in
   `engine.js` if you want a flat 1.
2. **Height vs hit rate** — a height call is treated as *not* hitting the table
   (it's a fault). Flip `hitsTable` in `THROW_OUTCOMES` to change.
3. **"Continue with [next player]?" during redemption** — interpreted as: when
   the trailing team ties/surpasses, they choose to keep throwing (Yes) or bank
   it and resume normal play (No). This mirrors the game-point semantics.
4. **End Game confirmation declined** — PRD only specifies Confirm. A "Keep
   playing" option switches possession and continues the game.
5. **Switch Possession / End Game confirm** — PRD lists both screens as seen by
   both phones; either phone's tap confirms.
6. **FIFA attribution** — points go to the defending *team* (the PRD's FIFA
   button isn't per-player), so FIFA doesn't count toward an individual's
   "points contributed."
7. **A caught throw during redemption** counts as a miss (Shootout) / ends the
   attempt (Pong).
8. **Title fallback** — if a player matches nothing, they get "Ole Reliable."
   Full priority order is documented in `titles.js`.
9. **Comeback win line ("4+ pt comeback")** — defined as: the winning team
   trailed by 4+ at some point in the game (`maxDeficit`).

## V1 non-goals honored
No accounts, no persistence after the game, no leaderboards, no push, no
sharing buttons, no 3v3, no spectator mode, no disconnect recovery (per PRD §14 —
a phone that drops mid-game re-syncs only if it still holds the session in memory).
