import { getUnlock } from '../../shared/content';
import { view } from '../store';
import { T } from '../strings';
import { Icon } from '../ui/Icons';
import { Sheet } from '../ui/Sheet';

export type PanelId = 'orders' | 'workshop' | 'people' | 'studio' | 'recipes' | 'shop' | 'station';

const UNLOCK: Partial<Record<PanelId, string>> = { orders: 'orders', studio: 'studio', recipes: 'recipes' };
export const panelUnlock = (id: PanelId) => UNLOCK[id];

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
    recipes: 'Mach deinen ersten Glasurversuch.',
  } as Record<string, string>)[unlock] ?? 'Kommt bald.';
}

export function PanelHost({ id, onClose }: { id: PanelId; arg?: string; onClose: () => void; onOpen: (id: PanelId, arg?: string) => void }) {
  const s = view.value!;
  const lock = UNLOCK[id];
  const title = id === 'station' ? 'Station' : T.tabs[id as keyof typeof T.tabs];
  return (
    <Sheet title={title} onClose={onClose}>
      {lock && !s.unlocks.includes(lock) ? <LockedNote unlock={lock} /> : <p class="muted">Kommt gleich …</p>}
    </Sheet>
  );
}
