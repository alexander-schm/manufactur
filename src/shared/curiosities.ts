import { ALBUM_PRIZES, CURIOSITIES, DAY_MS, MOUSE_GAP_MS, RARITY_TALER, own } from './content';
import type { GameEvent } from './actions';
import type { GameState } from './types';
import { DECOR, grantDecor } from './village/decor';

export { DAY_MS, MOUSE_GAP_MS };

/** The UTC day number of a server time. */
export const utcDay = (t: number): number => Math.floor(t / DAY_MS);

/** Why a client may not record this curiosity now, or null when it may. */
export function discoverError(s: GameState, id: unknown, now: number): string | null {
  const def = own(CURIOSITIES, id);
  if (!def) return 'Unbekannte Kuriosität';
  if (def.serverOnly) return 'Das zeigt sich von ganz allein';
  if (Object.hasOwn(s.curiosities, def.id)) return 'Schon entdeckt';
  if (def.chain) {
    const prev = Object.hasOwn(s.curiosities, def.chain.prev) ? s.curiosities[def.chain.prev] : undefined;
    if (prev === undefined || now - prev < def.chain.minGapMs) return 'Die Maus ist noch nicht so weit';
  }
  return null;
}

/** Records a curiosity, pays its reward and hands out album prizes. Callers validate first (discoverError). */
export function recordCuriosity(s: GameState, id: string, now: number, events: GameEvent[]): void {
  const def = CURIOSITIES[id];
  s.curiosities[id] = now;
  const taler = def.decor ? 0 : RARITY_TALER[def.rarity];
  if (taler) s.taler = Math.round((s.taler + taler) * 100) / 100;
  events.push({ kind: 'curiosity', id, text: `Neu im Kuriositätenkabinett: ${def.name}` + (taler ? ` (+${taler} Taler)` : '') });
  if (def.decor && grantDecor(s, def.decor)) {
    events.push({ kind: 'curiosity', id: def.decor, text: `Neue Dekoration: ${DECOR[def.decor].name}` });
  }
  const count = Object.keys(s.curiosities).length;
  for (const prize of ALBUM_PRIZES) {
    if (prize.at <= count && grantDecor(s, prize.decor)) {
      events.push({ kind: 'curiosity', id: prize.decor, text: `${prize.at} Kuriositäten entdeckt! Neue Dekoration: ${DECOR[prize.decor].name}` });
    }
  }
}
