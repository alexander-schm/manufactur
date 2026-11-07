import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ArtDefs } from './art/ArtDefs';
import './art/tokens.css';
import { AuthScreen } from './screens/AuthScreen';
import { GameScreen } from './screens/GameScreen';
import { loadMe, loadState, me, serverState, startClock } from './store';
import { T } from './strings';
import './ui/ui.css';
import { toast, ToastStack } from './ui/Toast';

const devPages: Record<string, () => Promise<{ default: () => preact.JSX.Element }>> = {
  '#kit': () => import('./dev/KitPage').then((m) => ({ default: m.KitPage })),
  '#pots': () => import('./dev/PotsPage').then((m) => ({ default: m.PotsPage })),
  '#people': () => import('./dev/PeoplePage').then((m) => ({ default: m.PeoplePage })),
  '#scene': () => import('./dev/ScenePage').then((m) => ({ default: m.ScenePage })),
};

type Phase = 'loading' | 'auth' | 'game';

function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [Dev, setDev] = useState<null | (() => preact.JSX.Element)>(null);

  async function enterGame() {
    try {
      await loadState();
      startClock();
      setPhase('game');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Fehler beim Laden', 'error');
      setPhase('auth');
    }
  }

  useEffect(() => {
    const key = location.hash.split('&')[0];
    if (import.meta.env.DEV && devPages[key]) { devPages[key]().then((m) => setDev(() => m.default)); return; }
    loadMe().then((m) => (m ? enterGame() : setPhase('auth'))).catch(() => setPhase('auth'));
    // refresh from the server when the tab becomes visible again
    const onVis = () => { if (document.visibilityState === 'visible' && me.value) loadState().catch(() => undefined); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <>
      <ArtDefs />
      {Dev ? <Dev /> : phase === 'loading' ? <div class="loading">{T.loading}</div>
        : phase === 'auth' ? <AuthScreen onReady={enterGame} />
        : <GameScreen onLogout={() => { me.value = null; serverState.value = null; setPhase('auth'); }} />}
      <ToastStack />
    </>
  );
}

render(<App />, document.getElementById('app')!);
