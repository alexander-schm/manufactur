import { useState } from 'preact/hooks';
import { WorkshopScene } from '../art/workshop/WorkshopScene';
import { api } from '../api';
import { me, now, view } from '../store';
import { T } from '../strings';
import { Counter } from '../ui/Counter';
import { Icon } from '../ui/Icons';
import { Paper } from '../ui/Paper';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { inviteLink } from './AuthScreen';
import { PanelHost, type PanelId, panelUnlock } from '../panels/PanelHost';
import './screens.css';

const TOOLS: { id: PanelId; icon: Parameters<typeof Icon>[0]['name'] }[] = [
  { id: 'orders', icon: 'orders' }, { id: 'workshop', icon: 'workshop' }, { id: 'people', icon: 'people' },
  { id: 'studio', icon: 'studio' }, { id: 'recipes', icon: 'recipes' }, { id: 'shop', icon: 'shop' },
];

export function GameScreen({ onLogout }: { onLogout: () => void }) {
  const s = view.value;
  const [panel, setPanel] = useState<{ id: PanelId; arg?: string } | null>(initialPanel());
  const [menu, setMenu] = useState(false);
  if (!s) return <div class="loading">{T.loading}</div>;
  const open = (id: PanelId, arg?: string) => setPanel({ id, arg });
  return (
    <div class="game">
      <header class="topbar">
        <div class="title">
          <strong>{me.value?.villageName ?? T.appName}</strong>
          <span>Manufaktur von {me.value?.name}</span>
        </div>
        <Counter icon="coin" value={s.taler} label={T.taler} />
        <Counter icon="star" value={s.ruf} label={T.ruf} />
        <button class="icon-btn" aria-label="Menü" onClick={() => setMenu(true)}><Icon name="menu" size={26} /></button>
      </header>
      <div class="scene-frame">
        <Paper seed={21}>
          <WorkshopScene state={s} now={now.value} onStation={(id) => open('station', id)} onWorker={(id) => open('people', id)} />
        </Paper>
      </div>
      <nav class="toolbar" aria-label="Werkzeuge">
        {TOOLS.map((t) => {
          const lock = panelUnlock(t.id);
          const locked = !!lock && !s.unlocks.includes(lock);
          const count = t.id === 'orders' && !locked ? s.orders.length : 0;
          return (
            <button class="tool" onClick={() => open(t.id)} aria-label={T.tabs[t.id as keyof typeof T.tabs]} title={locked ? T.locked : undefined} style={{ borderRadius: '14px 9px 12px 8px' }}>
              <Icon name={locked ? 'lock' : t.icon} />
              {T.tabs[t.id as keyof typeof T.tabs]}
              {count > 0 && <span class="badge-count">{count}</span>}
            </button>
          );
        })}
      </nav>
      {panel && <PanelHost id={panel.id} arg={panel.arg} onClose={() => setPanel(null)} onOpen={open} />}
      {menu && (
        <Sheet title={T.village} onClose={() => setMenu(false)}>
          <p>Einladungscode für <strong>{me.value?.villageName}</strong>:</p>
          <div class="invite-code">{me.value?.inviteCode}</div>
          <p class="muted small">{me.value && inviteLink(me.value.inviteCode)}</p>
          <div class="row">
            <Button onClick={() => me.value && navigator.clipboard?.writeText(inviteLink(me.value.inviteCode))}>{T.copy}</Button>
            <Button variant="quiet" onClick={async () => { await api.logout().catch(() => undefined); onLogout(); }}>{T.logout}</Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Deep links like #panel=orders (used for screenshots). */
function initialPanel(): { id: PanelId; arg?: string } | null {
  const m = /panel=([a-z]+)(?:&arg=([\w-]+))?/.exec(location.hash);
  return m ? { id: m[1] as PanelId, arg: m[2] } : null;
}
