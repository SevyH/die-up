// ============================================================
// Die Up — Real-time session layer (Firebase Realtime Database)
//
// One node per game: games/{id}
//   createdAt        ms epoch — invite expires 15 min after this
//   config           game config (set by creator)
//   teams            { A: {name, players:[..]}, B: {...} }
//   joined           true once Team B's phone connects
//   firstPossession  'A' | 'B' | null
//   state            serialized engine state (null until game starts)
//
// V1 is stateless beyond the live session: nothing persists after
// the game ends (PRD §11). Last-write-wins is acceptable for V1.
//
// DEV FALLBACK: if no Firebase env config is present, a
// BroadcastChannel + localStorage mock lets you test the two-phone
// flow in two browser tabs on one machine.
// ============================================================
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, onValue, get, child } from 'firebase/database';
import { INVITE_EXPIRY_MS } from '../engine/config.js';

const env = import.meta.env;
const firebaseConfig = env.VITE_FIREBASE_API_KEY
  ? {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: env.VITE_FIREBASE_DATABASE_URL,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    }
  : null;

export const USING_MOCK = !firebaseConfig;

// ---------------- Firebase implementation ----------------
function firebaseAdapter() {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  return {
    async createGame(id, data) { await set(ref(db, `games/${id}`), data); },
    async updateGame(id, patch) { await update(ref(db, `games/${id}`), patch); },
    async readGame(id) {
      const snap = await get(child(ref(db), `games/${id}`));
      return snap.exists() ? snap.val() : null;
    },
    subscribe(id, cb) {
      return onValue(ref(db, `games/${id}`), (snap) => cb(snap.val()));
    },
  };
}

// ---------------- Local two-tab mock ----------------
function mockAdapter() {
  const channel = new BroadcastChannel('die-up-mock');
  const keyFor = (id) => `die-up-game-${id}`;
  const readLocal = (id) => {
    const raw = localStorage.getItem(keyFor(id));
    return raw ? JSON.parse(raw) : null;
  };
  const writeLocal = (id, data) => {
    localStorage.setItem(keyFor(id), JSON.stringify(data));
    channel.postMessage({ id });
  };
  return {
    async createGame(id, data) { writeLocal(id, data); },
    async updateGame(id, patch) { writeLocal(id, { ...(readLocal(id) || {}), ...patch }); },
    async readGame(id) { return readLocal(id); },
    subscribe(id, cb) {
      cb(readLocal(id));
      const handler = (e) => { if (e.data.id === id) cb(readLocal(id)); };
      channel.addEventListener('message', handler);
      const storageHandler = (e) => { if (e.key === keyFor(id)) cb(readLocal(id)); };
      window.addEventListener('storage', storageHandler);
      return () => {
        channel.removeEventListener('message', handler);
        window.removeEventListener('storage', storageHandler);
      };
    },
  };
}

export const adapter = firebaseConfig ? firebaseAdapter() : mockAdapter();

export const newGameId = () =>
  Math.random().toString(36).slice(2, 8).toUpperCase();

export const inviteUrl = (id) =>
  `${window.location.origin}${window.location.pathname}#/join/${id}`;

export const isExpired = (game) =>
  !game?.joined && Date.now() - game.createdAt > INVITE_EXPIRY_MS;

// Engine state is stored serialized so Firebase never strips empty
// arrays/undefined fields out of the engine's JSON shape.
export const packState = (s) => JSON.stringify(s);
export const unpackState = (raw) => (raw ? JSON.parse(raw) : null);
