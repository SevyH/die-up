// Game Config (PRD §6) — creator only. Everything has a default;
// "Next" works without touching a thing.
import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { Btn, Toggle, DrumWheel } from '../components/ui.jsx';
import { Shell } from './Home.jsx';

const POINTS_1_99 = Array.from({ length: 99 }, (_, i) => i + 1);
const TSP_POINTS = [...Array.from({ length: 10 }, (_, i) => i + 1), 'gameOver'];
const renderTsp = (v) => (v === 'gameOver' ? 'Game Over' : String(v));

function Row({ label, children, sub }) {
  return (
    <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-white text-base">{label}</div>
          {sub && <div className="text-white/40 text-xs font-body mt-0.5">{sub}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function TspPackage({ rule, onChange, allowGameOver = true }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <DrumWheel
        options={allowGameOver ? TSP_POINTS : TSP_POINTS.filter((p) => p !== 'gameOver')}
        value={rule.points}
        onChange={(points) => onChange({ ...rule, points })}
        render={renderTsp}
      />
      <div className="flex-1">
        <div className="text-white/50 text-xs font-body mb-1">Awards points to</div>
        <select
          value={rule.awardsTo}
          onChange={(e) => onChange({ ...rule, awardsTo: e.target.value })}
          className="w-full bg-navy-deep border border-navy-line rounded-xl px-3 py-3 text-white font-body"
        >
          <option value="throwing">Throwing team</option>
          <option value="defending">Defending team</option>
        </select>
      </div>
    </div>
  );
}

export function GameConfig() {
  const { draftConfig: cfg, setDraftConfig, createGame, pendingName, setLocalScreen } = useGame();
  const set = (patch) => setDraftConfig({ ...cfg, ...patch });
  const [newRuleName, setNewRuleName] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Shell>
      <div className="px-4 pt-6 pb-2">
        <div className="font-display text-3xl text-gold">Game Setup</div>
        <div className="text-white/50 text-sm font-body mt-1">Defaults are house standard — tweak or just hit Next.</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        <Row label="Points to win">
          <DrumWheel options={POINTS_1_99} value={cfg.pointsToWin} onChange={(pointsToWin) => set({ pointsToWin })} />
        </Row>

        <Row label="Win by two"><Toggle on={cfg.winByTwo} onChange={(winByTwo) => set({ winByTwo })} /></Row>
        <Row label="Redemption"><Toggle on={cfg.redemption} onChange={(redemption) => set({ redemption })} /></Row>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div className="font-display text-white">Sink</div>
            <Toggle on={cfg.sink.enabled} onChange={(enabled) => set({ sink: { ...cfg.sink, enabled } })} />
          </div>
          {cfg.sink.enabled && <TspPackage rule={cfg.sink} onChange={(sink) => set({ sink })} />}
        </div>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-white">Self Sink</div>
              <div className="text-white/40 text-xs font-body mt-0.5">No points — consequence only</div>
            </div>
            <Toggle on={cfg.selfSink.enabled} onChange={(enabled) => set({ selfSink: { ...cfg.selfSink, enabled } })} />
          </div>
          {cfg.selfSink.enabled && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-white/70 font-body text-sm">
                Game loss
                <div className="text-white/35 text-xs">Off: scores for the other team instead</div>
              </div>
              <Toggle on={cfg.selfSink.gameLoss} onChange={(gameLoss) => set({ selfSink: { ...cfg.selfSink, gameLoss } })} />
            </div>
          )}
        </div>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div className="font-display text-white">Cup / Dink</div>
            <Toggle on={cfg.cup.enabled} onChange={(enabled) => set({ cup: { ...cfg.cup, enabled } })} />
          </div>
          {cfg.cup.enabled && <TspPackage rule={cfg.cup} onChange={(cup) => set({ cup })} />}
        </div>

        <Row label="FIFA" sub="Point value set in the moment (default 1)">
          <Toggle on={cfg.fifa.enabled} onChange={(enabled) => set({ fifa: { ...cfg.fifa, enabled } })} />
        </Row>

        {/* ---- House rules ---- */}
        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="font-display text-white mb-2">House Rules</div>
          {cfg.houseRules.map((r, i) => (
            <div key={r.id} className="border-t border-navy-line pt-3 mt-3 first:border-0 first:mt-0 first:pt-0">
              <div className="flex items-center justify-between">
                <div className="font-body font-semibold text-white">{r.name}</div>
                <div className="flex items-center gap-3">
                  <Toggle on={r.enabled} onChange={(enabled) => {
                    const houseRules = cfg.houseRules.map((x, j) => (j === i ? { ...x, enabled } : x));
                    set({ houseRules });
                  }} />
                  <button
                    className="text-white/40 text-sm font-body underline"
                    onClick={() => set({ houseRules: cfg.houseRules.filter((_, j) => j !== i) })}
                  >
                    remove
                  </button>
                </div>
              </div>
              {r.enabled && (
                <TspPackage rule={r} onChange={(nr) => {
                  const houseRules = cfg.houseRules.map((x, j) => (j === i ? nr : x));
                  set({ houseRules });
                }} />
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <input
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="Rule name (e.g. Field Goal)"
              className="flex-1 bg-navy-deep border border-navy-line rounded-xl px-3 py-3 text-white font-body text-sm outline-none focus:border-gold"
            />
            <Btn
              variant="outline"
              className="py-2 px-4 text-sm"
              disabled={!newRuleName.trim()}
              onClick={() => {
                set({
                  houseRules: [
                    ...cfg.houseRules,
                    { id: `hr-${Date.now()}`, name: newRuleName.trim(), enabled: true, points: 1, awardsTo: 'defending' },
                  ],
                });
                setNewRuleName('');
              }}
            >
              + Add
            </Btn>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-2">
        <Btn
          className="w-full text-xl"
          disabled={busy}
          onClick={async () => { setBusy(true); await createGame(pendingName); }}
        >
          Next →
        </Btn>
      </div>
    </Shell>
  );
}
