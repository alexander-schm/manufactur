import { describe, expect, it } from 'vitest';
import { applyAction } from '../../../src/shared/actions';
import { pieceValue } from '../../../src/shared/market';
import { nextRandom } from '../../../src/shared/rng';
import type { GameState } from '../../../src/shared/types';
import { applyDelta, applyVillageAction, ownDesigns } from '../../../src/shared/village/apply';
import type { VillageAction, VillageState } from '../../../src/shared/village/types';
import { T0, village } from './helpers';

/** Run an action the way the DO will: actor gets the result, deliveries are applied to their recipients. */
function run(v: VillageState, ws: Record<string, GameState>, actor: string, a: VillageAction) {
  const r = applyVillageAction(v, actor, ws[actor], a, T0 + 1000);
  if (typeof r === 'string') return { v, ws, error: r };
  const next = { ...ws, [actor]: r.actor };
  for (const d of r.deliveries) next[d.to] = applyDelta(next[d.to], d.delta);
  return { v: r.v, ws: next, error: null as string | null };
}

function totals(v: VillageState, ws: Record<string, GameState>) {
  let taler = 0, ton = 0, holz = 0, pieces = 0;
  for (const g of Object.values(ws)) { taler += g.taler; ton += g.materials.ton ?? 0; holz += g.materials.holz ?? 0; pieces += g.goods.reduce((n, x) => n + x.count, 0); }
  for (const o of v.offers) {
    const gv = o.give;
    if (gv.kind === 'taler') taler += gv.amount;
    if (gv.kind === 'material' && gv.material === 'ton') ton += gv.count;
    if (gv.kind === 'material' && gv.material === 'holz') holz += gv.count;
    if (gv.kind === 'goods') pieces += gv.stack.count;
  }
  return { taler: Math.round(taler * 100) / 100, ton, holz, pieces };
}

describe('trades and gifts', () => {
  it('a material gift moves material from giver to recipient', () => {
    const { v, ws } = village();
    const r = run(v, ws, 'p1', { type: 'gift', to: 'p2', give: { kind: 'material', material: 'holz', count: 4 } });
    expect(r.error).toBeNull();
    expect(r.ws.p1.materials.holz).toBe(6);
    expect(r.ws.p2.materials.holz).toBe(14);
    expect(r.v.news.some((n) => n.for === 'p2' && /Anna hat dir 4 Brennholz geschenkt/.test(n.text))).toBe(true);
  });
  it('you cannot give what you do not have', () => {
    const { v, ws } = village();
    expect(run(v, ws, 'p1', { type: 'gift', to: 'p2', give: { kind: 'material', material: 'holz', count: 400 } }).error).toMatch(/nicht genug/i);
  });
  it('[Review Focus 3] gifted pieces carry the sender’s design and mark and stay usable', () => {
    const { v, ws } = village();
    const d = ws.p1.designs[0];
    const r = run(v, ws, 'p1', { type: 'gift', to: 'p2', give: { kind: 'goods', designId: d.id, quality: 2, effect: null, count: 5 } });
    expect(r.error).toBeNull();
    const b = r.ws.p2;
    const stack = b.goods.find((g) => g.designId.startsWith('f:'))!;
    expect(stack.count).toBe(5);
    const foreign = b.designs.find((x) => x.id === stack.designId)!;
    expect(foreign.origin?.playerName).toBe('Anna');
    expect(foreign.origin?.makerMark.letter).toBe('A');
    expect(pieceValue(b, stack)).toBeGreaterThan(0);
    expect(ownDesigns(b).some((x) => x.id === foreign.id)).toBe(false);
    expect(applyAction(b, { type: 'saveDesign', design: { ...foreign, name: 'Meins' } }, T0 + 2000).ok).toBe(false);
    expect(applyAction(b, { type: 'setStanding', designId: foreign.id }, T0 + 2000).ok).toBe(false);
    // a matching order can be served with gifted pieces
    const o = { ...b.orders[0], form: foreign.form, count: 5, minQuality: 1 as const };
    b.orders = [o];
    expect(applyAction(b, { type: 'deliverOrder', orderId: o.id, designId: stack.designId, quality: 2, effect: null }, T0 + 2000).ok).toBe(true);
    // gifting the same design twice reuses the foreign copy
    const r2 = run(r.v, r.ws, 'p1', { type: 'gift', to: 'p2', give: { kind: 'goods', designId: d.id, quality: 2, effect: null, count: 2 } });
    expect(r2.ws.p2.designs.filter((x) => x.origin).length).toBe(1);
  });
  it('offer → accept swaps through escrow; own offers cannot be accepted; cancelled offers are gone', () => {
    const { v, ws } = village();
    let r = run(v, ws, 'p1', { type: 'postOffer', give: { kind: 'material', material: 'ton', count: 20 }, want: { kind: 'material', material: 'holz', count: 5 } });
    expect(r.error).toBeNull();
    expect(r.ws.p1.materials.ton).toBe(30);
    const id = r.v.offers[0].id;
    expect(run(r.v, r.ws, 'p1', { type: 'acceptOffer', offerId: id }).error).toMatch(/eigenes/);
    const acc = run(r.v, r.ws, 'p2', { type: 'acceptOffer', offerId: id });
    expect(acc.error).toBeNull();
    expect(acc.ws.p2.materials.ton).toBe(70);
    expect(acc.ws.p2.materials.holz).toBe(5);
    expect(acc.ws.p1.materials.holz).toBe(15);
    expect(acc.v.offers).toHaveLength(0);
    r = run(v, ws, 'p1', { type: 'postOffer', give: { kind: 'taler', amount: 50 }, want: { kind: 'material', material: 'holz', count: 5 } });
    const c = run(r.v, r.ws, 'p1', { type: 'cancelOffer', offerId: r.v.offers[0].id });
    expect(c.ws.p1.taler).toBe(1000);
    expect(run(c.v, c.ws, 'p2', { type: 'acceptOffer', offerId: r.v.offers[0].id }).error).toMatch(/schon weg/);
  });
  it('requests can be posted and removed by their author only', () => {
    const { v, ws } = village();
    const r = run(v, ws, 'p1', { type: 'postRequest', material: 'holz', count: 10 });
    expect(r.v.requests).toHaveLength(1);
    expect(run(r.v, r.ws, 'p2', { type: 'removeRequest', requestId: r.v.requests[0].id }).error).toBeTruthy();
    expect(run(r.v, r.ws, 'p1', { type: 'removeRequest', requestId: r.v.requests[0].id }).v.requests).toHaveLength(0);
  });
  it('conservation: random trades and gifts never create or destroy value', () => {
    let { v, ws } = village(3);
    const start = totals(v, ws);
    let seed = 99;
    const rnd = () => { const [x, n] = nextRandom(seed); seed = n; return x; };
    const ids = ['p1', 'p2', 'p3'];
    for (let i = 0; i < 300; i++) {
      const actor = ids[Math.floor(rnd() * 3)];
      const other = ids.filter((x) => x !== actor)[Math.floor(rnd() * 2)];
      const k = Math.floor(rnd() * 5);
      let a: VillageAction;
      if (k === 0) a = { type: 'gift', to: other, give: { kind: 'material', material: rnd() < 0.5 ? 'ton' : 'holz', count: 1 + Math.floor(rnd() * 6) } };
      else if (k === 1) a = { type: 'postOffer', give: { kind: 'taler', amount: 1 + Math.floor(rnd() * 30) }, want: { kind: 'material', material: 'ton', count: 1 + Math.floor(rnd() * 5) } };
      else if (k === 2 && v.offers.length) a = { type: 'acceptOffer', offerId: v.offers[Math.floor(rnd() * v.offers.length)].id };
      else if (k === 3 && v.offers.length) a = { type: 'cancelOffer', offerId: v.offers[Math.floor(rnd() * v.offers.length)].id };
      else a = { type: 'gift', to: other, give: { kind: 'goods', designId: ws[actor].goods[0]?.designId ?? 'x', quality: 2, effect: null, count: 1 } };
      const r = run(v, ws, actor, a);
      v = r.v; ws = r.ws;
    }
    expect(totals(v, ws)).toEqual(start);
  });
});

describe('decor rewards', () => {
  it('new decor is set up in the workshop automatically while there is room', () => {
    const { ws } = village(2);
    let s = applyDelta(ws.p1, { decor: ['laterne'] });
    expect(s.decorPlaced).toEqual(['laterne']);
    s = { ...s, decorPlaced: ['a', 'b', 'c', 'd'] };
    s = applyDelta(s, { decor: ['vogelhaus'] });
    expect(s.decor).toContain('vogelhaus');
    expect(s.decorPlaced).not.toContain('vogelhaus');
  });
});

describe('[Final review #6] gifted pieces are scored with their own glaze colour', () => {
  it('a gifted blue cup pleases a customer who wants blue', async () => {
    const { glazeForDesign } = await import('../../../src/shared/design');
    const { ws } = village(2);
    const b = ws.p2;
    const foreign = { ...b.designs[0], id: 'f:blue', glazeId: 'g1', origin: { playerName: 'Anna', makerMark: { shape: 'heart' as const, letter: 'A', color: '#b44c36' }, glazeColor: '#3f6fb5' } };
    b.designs.push(foreign);
    b.glazes.push({ ...b.glazes[0], id: 'g1', color: '#c0392b' }); // an unrelated red glaze with the same id
    expect(glazeForDesign(b, foreign)?.color).toBe('#3f6fb5');
  });
});
