// Create Teams — live on both phones. Redesigned.
import { useEffect, useState } from 'react';
import { useGame } from '../state/GameContext.jsx';
import { Btn } from '../components/ui.jsx';
import { Shell } from './Home.jsx';
import { inviteUrl } from '../firebase/adapter.js';
import { INVITE_EXPIRY_MS } from '../engine/config.js';

function TeamCard({ id, doc, mine, onUpdate }) {
  const team = doc.teams[id];
  const [addingMate, setAddingMate] = useState(false);
  const [mateName, setMateName] = useState('');
  return (
    <div className={`rounded-3xl border-2 p-5 transition-all ${mine
      ? 'border-gold/70 bg-navy-card'
      : 'border-navy-line bg-navy-card/40'}`}
      style={mine ? { boxShadow: '0 0 0 1px rgba(247,201,72,0.15), 0 4px 24px rgba(0,0,0,0.4)' } : {}}
    >
      <input
        disabled={!mine}
        value={team.name}
        onChange={(e) => {
          const teams = structuredClone(doc.teams);
          teams[id].name = e.target.value;
          onUpdate(teams);
        }}
        className={`bg-transparent font-display italic text-2xl w-full outline-none
          ${mine ? 'text-gold' : 'text-cream/60'} disabled:opacity-100`}
      />
      <div className="mt-3 flex flex-col gap-2">
        {team.players.map((p, i) =>
          p ? (
            <div key={i} className="bg-navy-deep rounded-xl px-4 py-3 font-body font-semibold text-cream">
              {p}
            </div>
          ) : mine && i === 1 ? (
            addingMate ? (
              <div key={i} className="flex gap-2">
                <input
                  autoFocus
                  value={mateName}
                  onChange={(e) => setMateName(e.target.value)}
                  placeholder="Teammate name"
                  className="flex-1 bg-navy-deep border border-navy-line rounded-xl px-3 py-3 font-body text-sm text-cream outline-none focus:border-gold/60 placeholder:text-white/25"
                />
                <button
                  className="font-display italic text-gold text-2xl px-3 active:scale-95"
                  onClick={() => {
                    if (!mateName.trim()) return;
                    const teams = structuredClone(doc.teams);
                    teams[id].players[1] = mateName.trim();
                    onUpdate(teams);
                    setAddingMate(false);
                  }}
                >
                  ✓
                </button>
              </div>
            ) : (
              <button
                key={i}
                onClick={() => setAddingMate(true)}
                className="border-2 border-dashed border-gold/25 rounded-xl px-4 py-3 text-gold/50 font-display italic text-lg active:border-gold/60 active:text-gold/80"
              >
                + Add Teammate
              </button>
            )
          ) : (
            <div key={i} className="border border-dashed border-navy-line/50 rounded-xl px-4 py-3 text-cream/20 font-body text-sm">
              waiting…
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function CreateTeams() {
  const { doc, role, updateTeams, gameId, setLocalScreen } = useGame();
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState(INVITE_EXPIRY_MS);

  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, doc.createdAt + INVITE_EXPIRY_MS - Date.now())), 1000);
    return () => clearInterval(t);
  }, [doc?.createdAt]);

  if (!doc) return null;
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
  const ready =
    doc.joined &&
    doc.teams.A.players.every(Boolean) &&
    doc.teams.B.players.every(Boolean);

  return (
    <Shell>
      <div className="px-5 pt-6 pb-4">
        <div className="font-display italic text-gold text-4xl leading-none">Teams</div>
        <div className="text-cream/35 text-xs font-body mt-1">Set your lineup before the first throw</div>
      </div>

      <div className="flex-1 px-4 py-2 flex flex-col gap-3 overflow-y-auto no-scrollbar">
        <TeamCard id="A" doc={doc} mine={role === 'creator'} onUpdate={updateTeams} />

        <div className="flex items-center gap-3 px-2">
          <div className="flex-1 h-px bg-navy-line" />
          <div className="font-display italic text-cream/30 text-sm tracking-widest">VS</div>
          <div className="flex-1 h-px bg-navy-line" />
        </div>

        {doc.joined ? (
          <TeamCard id="B" doc={doc} mine={role === 'joiner'} onUpdate={updateTeams} />
        ) : role === 'creator' ? (
          <div className="rounded-3xl border-2 border-dashed border-navy-line p-6 text-center">
            <p className="font-body text-cream/50 text-sm mb-4 leading-relaxed">
              Send your opponent the invite link.{' '}
              <span className="text-gold font-semibold">Expires in {mins}:{secs}</span>
            </p>
            <Btn
              variant="outline"
              onClick={async () => {
                const url = inviteUrl(gameId);
                try {
                  if (navigator.share) await navigator.share({ title: 'Die Up', text: 'Join my beer die game', url });
                  else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
                } catch { /* user cancelled */ }
              }}
              className="text-xl py-4"
            >
              {copied ? '✓ Link Copied' : 'Invite Opponent'}
            </Btn>
          </div>
        ) : null}
      </div>

      {role === 'creator' && (
        <div className="px-4 pb-8 pt-3">
          <Btn
            className="text-2xl py-5"
            disabled={!ready}
            onClick={() => setLocalScreen('whoFirst')}
          >
            {ready ? 'Next →' : 'Waiting for all 4 players…'}
          </Btn>
        </div>
      )}
      {role === 'joiner' && (
        <p className="text-center text-cream/35 font-body text-sm pb-8 px-6">
          {ready ? 'Waiting for the creator to start…' : 'Add your teammate above.'}
        </p>
      )}
    </Shell>
  );
}

export function WhoThrowsFirst() {
  const { doc, startGame } = useGame();
  const [busy, setBusy] = useState(false);
  const pick = async (first) => { setBusy(true); await startGame(first); };
  return (
    <Shell>
      <div className="flex-1 flex flex-col justify-center px-5 gap-5">
        <div className="text-center mb-2">
          <div className="font-display italic text-4xl text-gold leading-none">Who Throws First?</div>
          <div className="text-cream/40 text-xs font-body mt-2 tracking-wide">The team that goes first has a mild advantage — choose wisely.</div>
        </div>
        <Btn disabled={busy} className="py-8 text-3xl" onClick={() => pick('A')}>
          We Throw First
          <div className="text-sm font-body font-semibold opacity-55 mt-1 not-italic">{doc.teams.A.name}</div>
        </Btn>
        <Btn disabled={busy} variant="ghost" className="py-8 text-3xl" onClick={() => pick('B')}>
          They Throw First
          <div className="text-sm font-body font-semibold opacity-55 mt-1 not-italic">{doc.teams.B.name}</div>
        </Btn>
      </div>
    </Shell>
  );
}
