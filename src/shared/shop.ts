import { MATERIALS, own } from './content';
import { shopPrice } from './village/specialties';
import type { GameState } from './types';

export const MAX_BUY = 100_000;

/** Why this material cannot be bought right now, or null. */
export function buyError(s: GameState, material: string): string | null {
  const m = own(MATERIALS, material);
  if (!m) return 'Unbekanntes Material';
  if (m.locked || (m.unlock && !s.unlocks.includes(m.unlock))) return `${m.name} gibt es hier noch nicht zu kaufen`;
  return null;
}

/** How many units to buy to reach `target`: target - have, clamped at 0 and limited by what the Taler afford. */
export function missingAmount(s: GameState, material: string, target: number): number {
  const missing = target - Math.floor(s.materials[material] ?? 0);
  if (missing <= 0 || buyError(s, material)) return 0;
  const price = shopPrice(s, material);
  let n = Math.min(missing, Math.floor(s.taler / price));
  while (n > 0 && Math.round(price * n * 100) / 100 > s.taler) n--;
  return n;
}

/** Tops up every keep-in-stock material as far as the Taler allow. */
export function restock(s: GameState): void {
  for (const material in s.keepStock) {
    const n = missingAmount(s, material, s.keepStock[material]);
    if (n <= 0) continue;
    s.taler = Math.round((s.taler - shopPrice(s, material) * n) * 100) / 100;
    s.materials[material] = (s.materials[material] ?? 0) + n;
  }
}
