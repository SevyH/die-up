// Game Config — creator only. Redesigned with premium feel.
import { useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { Btn, Toggle, DrumWheel } from '../components/ui.jsx';
import { Shell } from './Home.jsx';

const POINTS_1_99 = Array.from({ length: 99 }, (_, i) => i + 1);
const TSP_POINTS = [...Array.from({ length: 10 }, (_, i) => i + 1), 'gameOver'];
const renderTsp = (v) => (v === 'gameOver' ? 'Game Over' : String(v));

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3 px-1 mt-2 mb-1">
      <div className="font-display italic text-gold/60 text-xs tracking-[0.3em] uppercase">{children}</div>
      <div className="flex-1 h-px bg-navy-line" />
    </div>
  );
}

function Row({ label, sub, children }) {
  return (
    <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line flex items-center justify-between">
      <div className="flex-1 mr-4">
        <div className="font-display italic text-cream text-lg leading-none">{label}</div>
        {sub && <div className="text-cream/35 text-xs font-body mt-1">{sub}</div>}
      </div>
      {children}
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
        <div className="text-cream/40 text-xs font-body mb-1.5">Awards points to</div>
        <select
          value={rule.awardsTo}
          onChange={(e) => onChange({ ...rule, awardsTo: e.target.value })}
          className="w-full bg-navy-deep border border-navy-line rounded-xl px-3 py-3 text-cream font-body text-sm outline-none focus:border-gold/60"
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
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button onClick={() => setLocalScreen('home')} className="text-cream/40 font-body text-sm py-1 px-0 active:text-cream">
          ←
        </button>
        <div>
          <div className="font-display italic text-gold text-4xl leading-none">Game Setup</div>
          <div className="text-cream/40 text-xs font-body mt-1">Defaults are house standard — tweak or just hit Next</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-2.5 no-scrollbar">
        <SectionLabel>Core Rules</SectionLabel>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line flex items-center justify-between">
          <div className="font-display italic text-cream text-lg">Points to Win</div>
          <DrumWheel options={POINTS_1_99} value={cfg.pointsToWin} onChange={(pointsToWin) => set({ pointsToWin })} />
        </div>

        <Row label="Win by Two">
          <Toggle on={cfg.winByTwo} onChange={(winByTwo) => set({ winByTwo })} />
        </Row>
        <Row label="Redemption">
          <Toggle on={cfg.redemption} onChange={(redemption) => set({ redemption })} />
        </Row>

        <SectionLabel>Special Shots</SectionLabel>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div className="font-display italic text-cream text-lg">Sink</div>
            <Toggle on={cfg.sink.enabled} onChange={(enabled) => set({ sink: { ...cfg.sink, enabled } })} />
          </div>
          {cfg.sink.enabled && <TspPackage rule={cfg.sink} onChange={(sink) => set({ sink })} />}
        </div>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display italic text-cream text-lg">Self Sink</div>
              <div className="text-cream/35 text-xs font-body mt-0.5">No points — consequence only</div>
            </div>
            <Toggle on={cfg.selfSink.enabled} onChange={(enabled) => set({ selfSink: { ...cfg.selfSink, enabled } })} />
          </div>
          {cfg.selfSink.enabled && (
            <div className="mt-3 flex items-center justify-between pt-3 border-t border-navy-line">
              <div className="font-body text-cream/60 text-sm">
                Game loss
                <div className="text-cream/30 text-xs">Off: scores for the other team instead</div>
              </div>
              <Toggle on={cfg.selfSink.gameLoss} onChange={(gameLoss) => set({ selfSink: { ...cfg.selfSink, gameLoss } })} />
            </div>
          )}
        </div>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          <div className="flex items-center justify-between">
            <div className="font-display italic text-cream text-lg">Cup / Dink</div>
            <Toggle on={cfg.cup.enabled} onChange={(enabled) => set({ cup: { ...cfg.cup, enabled } })} />
          </div>
          {cfg.cup.enabled && <TspPackage rule={cfg.cup} onChange={(cup) => set({ cup })} />}
        </div>

        <Row label="FIFA" sub="Point value set in the moment (default 1)">
          <Toggle on={cfg.fifa.enabled} onChange={(enabled) => set({ fifa: { ...cfg.fifa, enabled } })} />
        </Row>

        <SectionLabel>House Rules</SectionLabel>

        <div className="bg-navy-card rounded-2xl px-4 py-4 border border-navy-line">
          {cfg.houseRules.map((r, i) => (
            <div key={r.id} className="border-b border-navy-line pb-3 mb-3 last:border-0 last:mb-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="font-body font-semibold text-cream">{r.name}</div>
                <div className="flex items-center gap-3">
                  <Toggle on={r.enabled} onChange={(enabled) => {
                    const houseRules = cfg.houseRules.map((x, j) => (j === i ? { ...x, enabled } : x));
                    set({ houseRules });
                  }} />
                  <button
                    className="text-cream/30 text-xs font-body underline active:text-hot"
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
          <div className="flex gap-2 mt-1">
            <input
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="Rule name (e.g. Field Goal)"
              className="flex-1 bg-navy-deep border border-navy-line rounded-xl px-3 py-3 text-cream font-body text-sm outline-none focus:border-gold/60 placeholder:text-white/25"
            />
            <button
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
              className="font-display italic text-gold text-lg px-4 py-3 rounded-xl border border-gold/40 bg-transparent active:bg-gold/10 disabled:opacity-30"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="h-4" />
      </div>

      <div className="px-4 pb-8 pt-2">
        <Btn
          className="text-2xl py-5"
          disabled={busy}
          onClick={async () => { setBusy(true); await createGame(pendingName); }}
        >
          Next →
        </Btn>
      </div>
    </Shell>
  );
}
