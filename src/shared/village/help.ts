import { addNews } from './state';
import { MAX_GUESTBOOK } from './state';
import type { Delivery, VillageState } from './types';

export const HELPS_PER_DAY = 3;
export const HELP_EXTENDS_MS = 15 * 60_000;
export const HELP_MAX_AHEAD_MS = 60 * 60_000;
const DAY = 24 * 3_600_000;
export const STICKER_EMOJI: Record<string, string> = { herz: '❤️', stern: '⭐', blume: '🌼', daumen: '👍', katze: '🐱', vase: '🏺' };

export const helpKey = (helper: string, target: string, now: number) => `${helper}>${target}@${Math.floor(now / DAY)}`;
export const helpsLeft = (v: VillageState, helper: string, target: string, now: number) => HELPS_PER_DAY - (v.helpsGiven[helpKey(helper, target, now)] ?? 0);

/** A friend lends a hand. Mutates v; returns deliveries or a German error. */
export function lendAHand(v: VillageState, helperId: string, target: string, sticker: string, now: number): Delivery[] | string {
  if (helpsLeft(v, helperId, target, now) <= 0) return 'Für heute hast du genug geholfen – morgen wieder!';
  const key = helpKey(helperId, target, now);
  v.helpsGiven[key] = (v.helpsGiven[key] ?? 0) + 1;
  // forget yesterday's counters
  const today = Math.floor(now / DAY);
  for (const k of Object.keys(v.helpsGiven)) if (Number(k.split('@')[1]) < today) delete v.helpsGiven[k];
  const until = Math.min(Math.max(now, v.helpBoostUntil[target] ?? 0) + HELP_EXTENDS_MS, now + HELP_MAX_AHEAD_MS);
  v.helpBoostUntil[target] = until;
  const helper = v.members.find((m) => m.playerId === helperId)!;
  const book = (v.guestbooks[target] ??= []);
  book.push({ from: helperId, fromName: helper.name, sticker, at: now });
  if (book.length > MAX_GUESTBOOK) book.splice(0, book.length - MAX_GUESTBOOK);
  addNews(v, `${helper.name} hat in deiner Werkstatt mit angepackt ${STICKER_EMOJI[sticker] ?? ''}`.trim(), target, now);
  return [{ to: target, delta: { helpBoostUntil: until } }, { to: helperId, delta: { ruf: 1 } }];
}
