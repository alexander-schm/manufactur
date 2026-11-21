import { applyAction, type Action } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import { getStationDef, nextTier, stationTierGate } from '../../src/shared/content';
import { glazeForDesign } from '../../src/shared/design';
import { goodsTotal, pieceValue, shelfCapacity } from '../../src/shared/market';
import { batchMaterials, kilnCapacity } from '../../src/shared/production';
import type { Design, GameState } from '../../src/shared/types';

const H = 3_600_000;
const DAY = 24 * H;
/** Game-time hours of the three daily check-ins, counted from the state's `lastTick` as midnight of day 1. */
const CHECK_INS = [8, 13, 20];

/**
 * A mid/late-game player who looks in three times a day: delivers what fits, sells out a full shelf,
 * keeps the best own design in production, keeps one earthenware line for plain orders (side batches of an own earthenware design, preferably in the standing form),
 * turns down orders it can never fill, buys the next tier as soon as it can and upgrades the cheapest station it can afford.
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
      // An order without a body wants earthenware: like a real player, the bot runs a side batch of its own earthenware design in that form.
      makeEarthenware(s, act);
      // Beyond the plain brief: orders neither the standing design nor the earthenware line can ever fill would take all MAX_ORDERS
      // slots for good and freeze Ruf, so the bot turns them down like a real player would.
      const made = s.designs.find((d) => d.id === s.standing?.designId);
      for (const o of [...s.orders]) {
        const standingFits = made && o.form === made.form && (o.body ?? 'irdenware') === made.body;
        if (made && !standingFits && !(!o.body && earthenwareFor(s, o.form))) act({ type: 'declineOrder', orderId: o.id });
      }
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
        return d && d.form === o.form && (o.body ?? 'irdenware') === d.body && g.quality >= o.minQuality && g.count >= o.count;
      })
      .sort((a, b) => b.quality - a.quality || (b.effect ? 1 : 0) - (a.effect ? 1 : 0));
    const g = fits[0];
    if (g) act({ type: 'deliverOrder', orderId: o.id, designId: g.designId, quality: g.quality, effect: g.effect });
  }
}

/** The bot's one earthenware line: its own earthenware design in the standing design's form (or, failing that, its most valuable one). Null for other forms. */
function earthenwareFor(s: GameState, form: string): Design | null {
  const standing = s.designs.find((d) => d.id === s.standing?.designId);
  let best: Design | null = null, bestScore = -1;
  for (const d of s.designs) {
    if (d.origin || (d.body ?? 'irdenware') !== 'irdenware') continue;
    const score = (standing && d.form === standing.form ? 1000 : 0) + pieceValue(s, { designId: d.id, quality: 2, effect: glazeForDesign(s, d)?.effect ?? null });
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best && best.form === form ? best : null;
}

/** For each form with open plain orders the shelf can't cover, queue one kiln-sized earthenware batch unless one is already under way. */
function makeEarthenware(s: GameState, act: (a: Action) => boolean): void {
  const forms: string[] = [];
  for (const o of s.orders) if (!o.body && !forms.includes(o.form)) forms.push(o.form);
  for (const form of forms) {
    const d = earthenwareFor(s, form);
    if (!d || d.id === s.standing?.designId || s.batches.some((b) => b.designId === d.id)) continue;
    const want = s.orders.filter((o) => !o.body && o.form === form).reduce((n, o) => n + o.count, 0);
    const have = s.goods.filter((g) => g.designId === d.id).reduce((n, g) => n + g.count, 0);
    if (have >= want) continue;
    const count = Math.min(kilnCapacity(s), Math.max(want - have, 6));
    for (const [material, n] of Object.entries(batchMaterials(s, d, count))) {
      const missing = Math.ceil(n - (s.materials[material] ?? 0));
      if (missing > 0) act({ type: 'buyMaterial', material, amount: missing });
    }
    act({ type: 'queueBatch', designId: d.id, count });
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
