import { bodyOf, getForm, tierRank } from '../content';
import { colorFamily } from '../design';
import { pieceValue } from '../market';
import type { Design, GameState, GoodsStack } from '../types';
import type { GoodsPart } from './types';

export const SUBSTITUTE_FACTOR = 3;
/** Cheap earthenware form that stands in for a fancy one. */
export const SUBSTITUTE_FORM: Record<string, string> = { fliese: 'teller', figur: 'vase', teekanne: 'krug' };

export function allowsSubstitute(p: GoodsPart): boolean {
  if (p.body && p.body !== 'irdenware') return true;
  if (p.effect) return true;
  const tier = getForm(p.form).tier;
  return !!tier && tierRank(tier) > tierRank('werkstatt');
}

export const substituteForm = (p: GoodsPart): string => SUBSTITUTE_FORM[p.form] ?? p.form;

/**
 * Why a shelf stack cannot go into a goods part – as itself or, with `substitute`, as an earthenware stand-in.
 * A German error, or null when it fits. Pure: the client uses it to offer only stacks the village will take.
 */
export function stackMismatch(actor: GameState, p: GoodsPart, d: Design, stack: GoodsStack, substitute: boolean): string | null {
  const colorOk = () => {
    if (!p.colorFamily) return true;
    const color = d.origin?.glazeColor ?? actor.glazes.find((g) => g.id === d.glazeId)?.color ?? '#e9c9a6';
    return colorFamily(color) === p.colorFamily;
  };
  if (substitute) {
    if (!allowsSubstitute(p)) return 'Für diesen Teil gibt es keinen Ersatz';
    if (bodyOf(d) !== 'irdenware') return 'Ersatz geht nur aus Irdenware';
    if (d.form !== substituteForm(p)) return 'Das ist die falsche Form';
    if (stack.quality < p.minQuality) return 'Die Qualität reicht nicht';
    if (!colorOk()) return 'Die Farbe passt nicht';
    return null;
  }
  if (d.form !== p.form) return 'Das ist die falsche Form';
  if (stack.quality < p.minQuality) return 'Die Qualität reicht nicht';
  if (!colorOk()) return 'Die Farbe passt nicht';
  if (p.body && bodyOf(d) !== p.body) return 'Das ist der falsche Ton';
  if (p.effect && stack.effect !== p.effect) return 'Da fehlt der Effekt';
  return null;
}

/**
 * Take `count` pieces from the actor's shelf for a goods part (mutates the actor).
 * `units` is what the part gains: `count` exactly, or `count / 3` for earthenware substitutes.
 */
export function takeGoods(
  actor: GameState, p: GoodsPart, ref: { designId?: string; quality?: 1 | 2 | 3; effect?: string | null }, count: number, substitute: boolean,
): { units: number; points: number } | string {
  const d = actor.designs.find((x) => x.id === ref.designId);
  const stack = actor.goods.find((g) => g.designId === ref.designId && g.quality === ref.quality && g.effect === (ref.effect ?? null));
  if (!d || !stack || stack.count < count) return 'Davon hast du nicht genug im Regal';
  const mismatch = stackMismatch(actor, p, d, stack, substitute);
  if (mismatch) return mismatch;
  if (substitute && count % SUBSTITUTE_FACTOR !== 0) return 'Ersatz aus Irdenware geht nur in Dreierpacks';
  const points = pieceValue(actor, stack) * count;
  stack.count -= count;
  actor.goods = actor.goods.filter((g) => g.count > 0);
  return { units: substitute ? count / SUBSTITUTE_FACTOR : count, points };
}
