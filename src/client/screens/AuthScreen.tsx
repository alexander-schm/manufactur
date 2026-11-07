import { useState } from 'preact/hooks';
import { makeCharacter } from '../../shared/character';
import { FORMS } from '../../shared/content';
import { ApiError, api } from '../api';
import { Character } from '../art/character/Character';
import { Pot } from '../art/Pot';
import { loadMe } from '../store';
import { T } from '../strings';
import { Button } from '../ui/Button';
import { Paper } from '../ui/Paper';
import { Tabs } from '../ui/Tabs';
import './screens.css';

type Mode = 'found' | 'join' | 'login';

function inviteFromUrl(): string {
  const p = new URLSearchParams(location.search);
  return (p.get('einladung') ?? '').toUpperCase().slice(0, 6);
}

export function inviteLink(code: string) {
  return `${location.origin}/?einladung=${code}`;
}

function Hero() {
  const pots: [string, string][] = [['vase', '#4f7fc4'], ['becher', '#e9708d'], ['krug', '#7fb85c'], ['schale', '#f2b84b']];
  return (
    <div class="hero" aria-hidden="true">
      <Character look={makeCharacter(4242)} pose="wave" seed={1} size={92} />
      <div class="hero-pots">
        {pots.map(([f, c], i) => (
          <Pot design={{ id: `h${i}`, form: f, profile: FORMS[f].profileDefaults, handle: FORMS[f].handleAllowed ? 'round' : 'none', rim: 'plain', pattern: (['waves', 'dots', 'stripes', 'leaves'] as const)[i], patternColor: '#fff8ec' }} glazeColor={c} size={64} />
        ))}
      </div>
      <Character look={makeCharacter(777)} pose="idle" seed={2} size={86} />
    </div>
  );
}

export function AuthScreen({ onReady }: { onReady: () => void }) {
  const preset = inviteFromUrl();
  const [mode, setMode] = useState<Mode>(preset ? 'join' : localStorageGet('mf_known') ? 'login' : 'found');
  const [village, setVillage] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState(preset);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [founded, setFounded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'found') {
        const r = await api.found(village.trim(), name.trim(), pw);
        localStorageSet('mf_known', '1');
        setFounded(r.inviteCode);
      } else {
        if (mode === 'join') await api.join(code.trim(), name.trim(), pw);
        else await api.login(name.trim(), pw);
        localStorageSet('mf_known', '1');
        history.replaceState(null, '', '/');
        await loadMe();
        onReady();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Da ist etwas schiefgegangen');
    } finally {
      setBusy(false);
    }
  }

  if (founded) {
    return (
      <main class="auth">
        <Hero />
        <Paper tape seed={11} class="auth-card">
          <h2>{T.inviteTitle}</h2>
          <p>{T.inviteText}</p>
          <div class="invite-code" aria-label={T.inviteCode}>{founded}</div>
          <p class="muted small">{inviteLink(founded)}</p>
          <div class="row">
            <Button onClick={async () => { try { await navigator.clipboard.writeText(inviteLink(founded)); setCopied(true); } catch { /* ignore */ } }}>{copied ? T.copied : T.copy}</Button>
            <Button variant="primary" onClick={async () => { await loadMe(); onReady(); }}>{T.go}</Button>
          </div>
        </Paper>
      </main>
    );
  }

  return (
    <main class="auth">
      <h1 class="logo">{T.appName}</h1>
      <p class="tagline">{T.tagline}</p>
      <Hero />
      <Paper tape seed={9} class="auth-card">
        <Tabs tabs={[{ id: 'found', label: 'Gründen' }, { id: 'join', label: 'Beitreten' }, { id: 'login', label: 'Anmelden' }]} value={mode} onChange={(m) => { setMode(m); setError(''); }} />
        <form onSubmit={submit} class="auth-form">
          <h2>{mode === 'found' ? T.found : mode === 'join' ? T.join : T.login}</h2>
          <p class="muted">{mode === 'found' ? T.foundHint : mode === 'join' ? T.joinHint : T.loginHint}</p>
          {mode === 'found' && <label class="field"><span>{T.villageName}</span><input value={village} onInput={(e) => setVillage(e.currentTarget.value)} placeholder="z. B. Tonhausen" required minLength={2} maxLength={30} /></label>}
          {mode === 'join' && <label class="field"><span>{T.inviteCode}</span><input value={code} onInput={(e) => setCode(e.currentTarget.value.toUpperCase())} placeholder="ABC234" required minLength={6} maxLength={6} autoCapitalize="characters" class="code-input" /></label>}
          <label class="field"><span>{T.yourName}</span><input value={name} onInput={(e) => setName(e.currentTarget.value)} autoComplete="username" required minLength={2} maxLength={20} /></label>
          <label class="field"><span>{T.password}</span><input type="password" value={pw} onInput={(e) => setPw(e.currentTarget.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={6} /></label>
          {error && <p class="form-error" role="alert">{error}</p>}
          <Button variant="primary" type="submit" disabled={busy}>{busy ? '…' : mode === 'found' ? T.found : mode === 'join' ? 'Beitreten' : T.login}</Button>
        </form>
      </Paper>
    </main>
  );
}

function localStorageGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
