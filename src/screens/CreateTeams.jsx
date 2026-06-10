// Create Teams (PRD 7.3) — live on both phones. Captains add their
// teammate by name; team names are editable; invite expires in 15 min.
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
    <div className={`rounded-3xl border p-4 ${mine ? 'border-gold bg-navy-card' : 'border-navy-line bg-navy-card/50'}`}>
      <input
        disabled={!mine}
        value={team.name}
        onChange={(e) => {
          const teams = structuredClone(doc.teams);
          teams[id].name = e.target.value;
          onUpdate(teams);
        }}
        className="bg-transparent font-display text-xl text-gold w-full outline-none disabled:opacity-100"
      />
      <div className="mt-3 flex flex-col gap-2">
        {team.players.map((p, i) =>
          p ? (
            <div key={i} className="bg-navy-deep rounded-xl px-3 py-3 font-body font-semibold">{p}</div>
          ) : mine && i === 1 ? (
            addingMate ? (
              <div key={i} className="flex gap-2">
                <input
                  autoFocus
                  value={mateName}
                  onChange={(e) => setMateName(e.target.value)}
                  placeholder="Teammate name"
                  className="flex-1 bg-navy-deep border border-navy-line rounded-xl px-3 py-2 font-body text-sm outline-none focus:border-gold"
                />
                <button
                  className="font-display text-gold px-2"
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
                className="border-2 border-dashed border-navy-line rounded-xl px-3 py-3 text-white/50 font-display"
              >
                + Add teammate
              </button>
            )
          ) : (
            <div key={i} className="border-2 border-dashed border-navy-line/50 rounded-xl px-3 py-3 text-white/20 font-body text-sm">
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
      <div className="px-4 pt-6">
        <div className="font-display text-3xl text-gold">Teams</div>
      </div>
      <div className="flex-1 px-4 py-4 flex flex-col gap-4">
        <TeamCard id="A" doc={doc} mine={role === 'creator'} onUpdate={updateTeams} />
        <div className="text-center font-display text-white/30">VS</div>
        {doc.joined ? (
          <TeamCard id="B" doc={doc} mine={role === 'joiner'} onUpdate={updateTeams} />
        ) : role === 'creator' ? (
          <div className="rounded-3xl border border-dashed border-navy-line p-5 text-center">
            <p className="font-body text-white/60 text-sm mb-3">
              Send your opponent the link — it expires in{' '}
              <span className="text-gold font-semibold">{mins}:{secs}</span>
            </p>
            <Btn
              className="w-full"
              onClick={async () => {
                const url = inviteUrl(gameId);
                try {
                  if (navigator.share) await navigator.share({ title: 'Die Up', text: 'Join my beer die game', url });
                  else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
                } catch { /* user cancelled share */ }
              }}
            >
              {copied ? 'Link copied ✓' : 'Invite Opponent'}
            </Btn>
          </div>
        ) : null}
      </div>
      {role === 'creator' && (
        <div className="px-4 pb-8">
          <Btn className="w-full text-xl" disabled={!ready} onClick={() => setLocalScreen('whoFirst')}>
            {ready ? 'Next →' : 'Waiting for all 4 players…'}
          </Btn>
        </div>
      )}
      {role === 'joiner' && (
        <p className="text-center text-white/40 font-body text-sm pb-8 px-4">
          {ready ? 'Waiting for the creator to start…' : 'Add your teammate with the + button.'}
        </p>
      )}
    </Shell>
  );
}

// Who Throws First (PRD 7.4) — creator's phone only.
export function WhoThrowsFirst() {
  const { doc, startGame } = useGame();
  const [busy, setBusy] = useState(false);
  const pick = async (first) => { setBusy(true); await startGame(first); };
  return (
    <Shell>
      <div className="flex-1 flex flex-col justify-center px-6 gap-4">
        <div className="font-display text-3xl text-gold text-center mb-4">Who throws first?</div>
        <Btn disabled={busy} className="py-8 text-2xl" onClick={() => pick('A')}>
          We Throw First
          <div className="text-sm font-body font-semibold opacity-60 mt-1">{doc.teams.A.name}</div>
        </Btn>
        <Btn disabled={busy} variant="ghost" className="py-8 text-2xl" onClick={() => pick('B')}>
          They Throw First
          <div className="text-sm font-body font-semibold opacity-60 mt-1">{doc.teams.B.name}</div>
        </Btn>
      </div>
    </Shell>
  );
}
