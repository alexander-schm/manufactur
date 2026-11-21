import { applyAction, type Action } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import { getStationDef, nextTier, stationTierGate } from '../../src/shared/content';
import { glazeForDesign } from '../../src/shared/design';
import { goodsTotal, pieceValue, shelfCapacity } from '../../src/shared/market';
import { kilnCapacity } from '../../src/shared/production';
import type { GameState } from '../../src/shared/types';

const H = 3_600_000;
const DAY = 24 * H;
/** Game-time hours of the three daily check-ins, counted from the state's `lastTick` as midnight of day 1. */
const CHECK_INS = [8, 13, 20];

/**
 * A mid/late-game player who looks in three times a day: delivers what fits, sells out a full shelf,
 * keeps the best own design in production (turning down orders it can never fill), buys the next tier as soon as it can and upgrades the cheapest station it can afford.
 * `tierDay[tier]` is the 1-based day on which that tier was bought.
 */
export function endgameBot(state: GameState, days: number): { state: GameState; tierDay: Record<string, number> } {
  let s = state;
  const start = state.lastTick;
  const tierDay: Record<string, number> = {};
  for (let day = 0; day < days; day++) {
    for (const hour of CHECK_INS) {
      const t = start + day * DAY + hour * H;
      const act = (a: Action) => { const r = applyAction(s, a, t); if (r.ok) s = r.state; return r.ok; };
      s = advance(s, t);
      deliverAll(s, act);
      if (goodsTotal(s) >= 0.9 * shelfCapacity(s)) for (const g of [...s.goods]) act({ type: 'sellNow', designId: g.designId, quality: g.quality, effect: g.effect, count: g.count });
      const best = bestDesign(s);
      if (best && s.standing?.designId !== best) act({ type: 'setStanding', designId: best, batchSize: kilnCapacity(s), autoBuy: true });
      // orders the standing design can never fill would block the board for good, so they are turned down
      const made = s.designs.find((d) => d.id === s.standing?.designId);
      for (const o of [...s.orders]) if (made && (o.form !== made.form || (o.body && o.body !== made.body))) act({ type: 'declineOrder', orderId: o.id });
      const next = nextTier(s);
      if (next && s.ruf >= next.ruf && s.taler >= next.price && act({ type: 'upgradeTier' })) tierDay[next.id] = day + 1;
      const cheapest = cheapestUpgrade(s);
      if (cheapest) act({ type: 'upgradeStation', stationId: cheapest });
    }
  }
  return { state: s, tierDay };
}

/** Deliver every order some stack on the shelf can fill, using the highest-quality fitting stack. */
function deliverAll(s: GameState, act: (a: Action) => boolean): void {
  for (const o of [...s.orders]) {
    const fits = s.goods
      .filter((g) => {
        const d = s.designs.find((x) => x.id === g.designId);
        return d && d.form === o.form && (!o.body || d.body === o.body) && g.quality >= o.minQuality && g.count >= o.count;
      })
      .sort((a, b) => b.quality - a.quality || (b.effect ? 1 : 0) - (a.effect ? 1 : 0));
    const g = fits[0];
    if (g) act({ type: 'deliverOrder', orderId: o.id, designId: g.designId, quality: g.quality, effect: g.effect });
  }
}

/** The own design with the highest piece value at quality 2 (with its glaze's effect). */
function bestDesign(s: GameState): string | null {
  let best: string | null = null;
  let bestValue = -1;
  for (const d of s.designs) {
    if (d.origin) continue;
    const v = pieceValue(s, { designId: d.id, quality: 2, effect: glazeForDesign(s, d)?.effect ?? null });
    if (v > bestValue) { bestValue = v; best = d.id; }
  }
  return best;
}

/** The station whose next level is cheapest among those the player can buy right now. */
function cheapestUpgrade(s: GameState): string | null {
  if (!s.unlocks.includes('upgrades')) return null;
  let best: string | null = null;
  let bestCost = Infinity;
  for (const st of s.stations) {
    const def = getStationDef(st.kind);
    if (st.level >= def.piecesPerMinute.length || stationTierGate(s, st.level)) continue;
    const cost = def.upgradeCost[st.level - 1];
    if (s.ruf < def.rufRequired[st.level - 1] || cost > s.taler || cost >= bestCost) continue;
    best = st.id;
    bestCost = cost;
  }
  return best;
}
