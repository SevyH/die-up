import { useEffect, useState } from 'react';
import { useGame } from './state/GameContext.jsx';
import { Home, JoinScreen, Expired } from './screens/Home.jsx';
import { GameConfig } from './screens/GameConfig.jsx';
import { CreateTeams, WhoThrowsFirst } from './screens/CreateTeams.jsx';
import { GameRouter } from './screens/Game.jsx';
import { PostGame } from './screens/PostGame.jsx';

export default function App() {
  const { gameState, expired, localScreen, role } = useGame();
  const [joinId, setJoinId] = useState(null);

  useEffect(() => {
    const read = () => {
      const m = window.location.hash.match(/#\/join\/([A-Za-z0-9]+)/);
      setJoinId(m ? m[1] : null);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  if (expired) return <Expired />;

  // Live game running (both phones)
  if (gameState) return gameState.phase === 'gameOver' ? <PostGame /> : <GameRouter />;

  // Joiner entry point via invite link
  if (joinId && role === null) return <JoinScreen joinId={joinId} />;

  // Pre-game local navigation
  switch (localScreen) {
    case 'config': return <GameConfig />;
    case 'createTeams': return <CreateTeams />;
    case 'whoFirst': return <WhoThrowsFirst />;
    default: return <Home />;
  }
}
