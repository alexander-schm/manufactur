import { getStationDef, getUnlock } from '../../shared/content';
import { view } from '../store';
import { T } from '../strings';
import { Icon } from '../ui/Icons';
import { Sheet } from '../ui/Sheet';
import { OrdersPanel } from './OrdersPanel';
import { ShopPanel } from './ShopPanel';
import { StationPanel, WorkshopPanel } from './StationPanel';
import { WorkersPanel } from './WorkersPanel';
import './panels.css';

export type PanelId = 'orders' | 'workshop' | 'people' | 'studio' | 'recipes' | 'shop' | 'station' | 'market';

const UNLOCK: Partial<Record<PanelId, string>> = { orders: 'orders', studio: 'studio', recipes: 'recipes' };
export const panelUnlock = (id: PanelId) => UNLOCK[id];

/** Late-bound panels (Task 16 adds studio + recipes). */
export const extraPanels: Partial<Record<PanelId, (p: { arg?: string; onOpen: (id: PanelId, arg?: string) => void }) => preact.JSX.Element>> = {};

export function LockedNote({ unlock }: { unlock: string }) {
  return (
    <div class="locked-note">
      <Icon name="lock" size={56} />
      <h3>{getUnlock(unlock).title}</h3>
      <p class="muted">{lockHint(unlock)}</p>
    </div>
  );
}

function lockHint(unlock: string): string {
  return ({
    orders: 'Verkaufe dein erstes Stück, dann kommen die Bestellungen.',
    studio: 'Erledige deinen ersten Auftrag.',
    recipes: 'Mach deinen ersten Glasurversuch im Entwurfsstudio.',
  } as Record<string, string>)[unlock] ?? 'Kommt bald.';
}

export function PanelHost({ id, arg, onClose, onOpen }: { id: PanelId; arg?: string; onClose: () => void; onOpen: (id: PanelId, arg?: string) => void }) {
  const s = view.value!;
  const lock = UNLOCK[id];
  const station = id === 'station' ? s.stations.find((x) => x.id === arg) : undefined;
  const title = id === 'station' ? (station ? `${getStationDef(station.kind).name} · Stufe ${station.level}` : 'Station') : id === 'market' ? 'Regal & Markt' : T.tabs[id as keyof typeof T.tabs];
  let body: preact.JSX.Element;
  if (lock && !s.unlocks.includes(lock)) body = <LockedNote unlock={lock} />;
  else if (id === 'orders') body = <OrdersPanel s={s} />;
  else if (id === 'people') body = <WorkersPanel s={s} focus={arg} />;
  else if (id === 'shop') body = <ShopPanel s={s} />;
  else if (id === 'workshop') body = <WorkshopPanel s={s} onOpen={onOpen} />;
  else if (id === 'station') body = <StationPanel s={s} stationId={arg ?? ''} onOpen={onOpen} />;
  else {
    const P = extraPanels[id];
    body = P ? <P arg={arg} onOpen={onOpen} /> : <p class="muted">Kommt gleich …</p>;
  }
  return <Sheet title={title} onClose={onClose}>{body}</Sheet>;
}
