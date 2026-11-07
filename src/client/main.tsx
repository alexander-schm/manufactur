import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { ArtDefs } from './art/ArtDefs';
import './art/tokens.css';
import './ui/ui.css';
import { ToastStack } from './ui/Toast';

const devPages: Record<string, () => Promise<{ default: () => preact.JSX.Element }>> = {
  '#kit': () => import('./dev/KitPage').then((m) => ({ default: m.KitPage })),
};

function useHash() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const on = () => setHash(location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

function App() {
  const hash = useHash();
  const [Dev, setDev] = useState<null | (() => preact.JSX.Element)>(null);
  useEffect(() => {
    const key = hash.split('&')[0];
    if (import.meta.env.DEV && devPages[key]) devPages[key]().then((m) => setDev(() => m.default));
    else setDev(null);
  }, [hash]);
  return (
    <>
      <ArtDefs />
      {Dev ? <Dev /> : <h1 style={{ padding: '24px' }}>Manufaktur</h1>}
      <ToastStack />
    </>
  );
}

render(<App />, document.getElementById('app')!);
