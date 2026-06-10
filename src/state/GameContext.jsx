// ============================================================
// Die Up — Session context. Owns: role (creator vs joiner),
// live game doc subscription, engine dispatch + sync.
// ============================================================
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { adapter, newGameId, isExpired, packState, unpackState } from '../firebase/adapter.js';
import { DEFAULT_CONFIG } from '../engine/config.js';
import { initialState, reduce, undoLast } from '../engine/engine.js';

const Ctx = createContext(null);
export const useGame = () => useContext(Ctx);

export function GameProvider({ children }) {
  const [gameId, setGameId] = useState(null);
  const [role, setRole] = useState(null); // 'creator' (Team A) | 'joiner' (Team B)
  const [doc, setDoc] = useState(null);   // raw game document
  const [expired, setExpired] = useState(false);
  const [localScreen, setLocalScreen] = useState('home'); // pre-session navigation
  const [draftConfig, setDraftConfig] = useState(structuredClone(DEFAULT_CONFIG));
  const [myName, setMyName] = useState('');
  const [pendingName, setPendingName] = useState('');
  const unsubRef = useRef(null);

  const gameState = useMemo(() => unpackState(doc?.state), [doc?.state]);

  const subscribeTo = useCallback((id) => {
    unsubRef.current?.();
    unsubRef.current = adapter.subscribe(id, (d) => setDoc(d));
  }, []);

  useEffect(() => () => unsubRef.current?.(), []);

  // ---------- lifecycle ----------
  const createGame = useCallback(async (name) => {
    const id = newGameId();
    const data = {
      createdAt: Date.now(),
      config: draftConfig,
      teams: {
        A: { name: 'Team 1', players: [name, ''] },
        B: { name: 'Team 2', players: ['', ''] },
      },
      joined: false,
      firstPossession: null,
      state: null,
    };
    await adapter.createGame(id, data);
    setMyName(name);
    setRole('creator');
    setGameId(id);
    subscribeTo(id);
    setLocalScreen('createTeams');
    return id;
  }, [draftConfig, subscribeTo]);

  const joinGame = useCallback(async (id, name) => {
    const game = await adapter.readGame(id);
    if (!game) { setExpired(true); return false; }
    if (isExpired(game)) { setExpired(true); return false; } // 15-min invite expiry
    const teams = structuredClone(game.teams);
    teams.B.players[0] = name;
    await adapter.updateGame(id, { joined: true, teams });
    setMyName(name);
    setRole('joiner');
    setGameId(id);
    subscribeTo(id);
    setLocalScreen('createTeams');
    return true;
  }, [subscribeTo]);

  const updateTeams = useCallback(
    (teams) => adapter.updateGame(gameId, { teams }),
    [gameId]
  );

  const startGame = useCallback(async (firstPossession) => {
    // creator-only: lock teams + config, spin up the engine
    const init = { config: doc.config, teams: doc.teams, firstPossession };
    const s = initialState(init);
    await adapter.updateGame(gameId, {
      firstPossession,
      init: packState(init),
      state: packState(s),
    });
  }, [gameId, doc]);

  // ---------- engine dispatch (any phone) ----------
  const dispatch = useCallback(async (ev) => {
    const current = unpackState((await adapter.readGame(gameId)).state);
    const next = reduce(current, ev);
    await adapter.updateGame(gameId, { state: packState(next) });
  }, [gameId]);

  const undo = useCallback(async () => {
    const game = await adapter.readGame(gameId);
    const init = unpackState(game.init);
    const current = unpackState(game.state);
    if (!current?.log?.length) return;
    const next = undoLast(init, current.log);
    await adapter.updateGame(gameId, { state: packState(next) });
  }, [gameId]);

  const newGame = useCallback(() => {
    unsubRef.current?.();
    setGameId(null); setRole(null); setDoc(null); setExpired(false);
    setDraftConfig(structuredClone(DEFAULT_CONFIG));
    setLocalScreen('home');
    window.location.hash = '';
  }, []);

  const value = {
    gameId, role, doc, gameState, expired, localScreen, setLocalScreen,
    draftConfig, setDraftConfig, myName, pendingName, setPendingName,
    createGame, joinGame, updateTeams, startGame, dispatch, undo, newGame,
    myTeam: role === 'creator' ? 'A' : 'B',
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
