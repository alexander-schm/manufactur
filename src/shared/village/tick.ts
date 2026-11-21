import { nextKilnWake, tickGreatKiln } from './kiln';
import { ensureProjectOffers } from './projects';
import { addNews, maxMemberTier } from './state';
import type { Delivery, VillageState } from './types';

/** Everything in the village that moves with time. Mutates. */
export function tickVillage(v: VillageState, now: number): { changed: boolean; deliveries: Delivery[] } {
  const deliveries: Delivery[] = [];
  let changed = false;
  if (!v.buildings.includes('gemeinschaftsofen') && maxMemberTier(v) !== 'werkstatt') {
    v.buildings.push('gemeinschaftsofen');
    addNews(v, 'Im Dorf steht jetzt ein Gemeinschaftsofen! Wer mitbrennt, macht das Feuer heißer.', null, now);
    for (const m of v.members) deliveries.push({ to: m.playerId, delta: { village: { buildings: [...v.buildings] } } });
    changed = true;
  }
  if (ensureProjectOffers(v)) changed = true;
  const kiln = v.greatKiln;
  const doneAt = kiln.doneAt;
  deliveries.push(...tickGreatKiln(v, now));
  if (v.greatKiln !== kiln || v.greatKiln.doneAt !== doneAt) changed = true;
  return { changed, deliveries };
}

/** When the village next needs a tick, or null if nothing is waiting. */
export function nextVillageWake(v: VillageState): number | null {
  return nextKilnWake(v);
}
