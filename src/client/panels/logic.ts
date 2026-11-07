import type { Action } from '../../shared/actions';
import { COLOR_FAMILY_NAMES, appeal, type ColorFamily } from '../../shared/design';
import { FORMS, getStationDef, getTrait } from '../../shared/content';
import { orderReward } from '../../shared/orders';
import type { Design, GameState, GoodsStack, Order, Taste } from '../../shared/types';

const PATTERN_TEXT: Record<string, string> = { stripes: 'mit Streifen', dots: 'mit Punkten', waves: 'mit Wellen', leaves: 'mit Blättern', none: 'ohne Muster' };

export function describeTaste(taste: Taste, form: string, count: number): string {
  const parts = [`${count} ${count === 1 ? FORMS[form].name : FORMS[form].plural}`];
  if (taste.tall !== undefined) parts.push(taste.tall ? 'schön hoch' : 'eher niedrig');
  if (taste.colorFamily) parts.push(`in ${COLOR_FAMILY_NAMES[taste.colorFamily as ColorFamily]}`);
  if (taste.pattern) parts.push(PATTERN_TEXT[taste.pattern]);
  if (taste.simple) parts.push('ganz schlicht');
  return `Ich hätte gern ${parts.join(', ')}!`;
}

const glazeOf = (s: GameState, d: Design) => s.glazes.find((g) => g.id === d.glazeId);

/** The stack that earns the most for this order, or null if nothing fits. */
export function bestStackForOrder(s: GameState, o: Order): GoodsStack | null {
  let best: GoodsStack | null = null;
  let bestReward = -1;
  for (const g of s.goods) {
    const d = s.designs.find((x) => x.id === g.designId);
    if (!d || d.form !== o.form || g.quality < o.minQuality || g.count < o.count) continue;
    const r = orderReward(o, g, d, glazeOf(s, d)).taler;
    if (r > bestReward) { best = g; bestReward = r; }
  }
  return best;
}

export function deliverActionFor(s: GameState, o: Order): Action | null {
  const g = bestStackForOrder(s, o);
  return g ? { type: 'deliverOrder', orderId: o.id, designId: g.designId, quality: g.quality, effect: g.effect } : null;
}

/** Your design that this customer would like most (same form). */
export function bestDesignForOrder(s: GameState, o: Order): Design | null {
  let best: Design | null = null, score = -1;
  for (const d of s.designs) {
    if (d.form !== o.form) continue;
    const a = appeal(d, glazeOf(s, d), o.taste);
    if (a > score) { best = d; score = a; }
  }
  return best;
}

/** Assign unassigned workers to the station where their traits help most (free seats only). */
export function autoAssignPlan(s: GameState): Extract<Action, { type: 'assign' }>[] {
  const seats = new Map<string, number>();
  for (const st of s.stations) {
    const def = getStationDef(st.kind);
    if (!def.usesWorkers) continue;
    seats.set(st.id, def.maxWorkers - s.workers.filter((w) => w.stationId === st.id).length);
  }
  const plan: Extract<Action, { type: 'assign' }>[] = [];
  for (const w of s.workers.filter((x) => !x.stationId)) {
    let bestId: string | null = null, bestScore = -Infinity;
    for (const st of s.stations) {
      if ((seats.get(st.id) ?? 0) <= 0) continue;
      const stage = getStationDef(st.kind).stage;
      let score = -s.workers.filter((x) => x.stationId === st.id).length; // spread people out
      for (const t of w.traits) {
        const tr = getTrait(t);
        if (tr.favStage === stage) score += 3;
        if (st.kind === 'glazeTable' && tr.effectChanceAdd) score += 2;
        if (st.kind === 'wheel' && tr.qualityAdd > 0) score += 1;
      }
      if (score > bestScore) { bestScore = score; bestId = st.id; }
    }
    if (!bestId) break;
    seats.set(bestId, (seats.get(bestId) ?? 1) - 1);
    plan.push({ type: 'assign', workerId: w.id, stationId: bestId });
  }
  return plan;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60 ? `${s % 60} s` : ''}`.trim();
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const QUALITY_LABEL: Record<1 | 2 | 3, string> = { 1: 'einfach', 2: 'gut', 3: 'meisterlich' };
