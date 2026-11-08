import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../src/shared/types';
import { applyDelta, applyVillageAction } from '../../../src/shared/village/apply';
import { ensureJointOrders, isComplete, JOINT_TEMPLATES, payout } from '../../../src/shared/village/joint';
import { SPECIALTIES } from '../../../src/shared/village/specialties';
import type { JointOrder, VillageAction, VillageState } from '../../../src/shared/village/types';
import { T0, village } from './helpers';

function run(v: VillageState, ws: Record<string, GameState>, actor: string, a: VillageAction) {
  const r = applyVillageAction(v, actor, ws[actor], a, T0 + 1000);
  if (typeof r === 'string') return { v, ws, error: r };
  const next = { ...ws, [actor]: r.actor };
  for (const d of r.deliveries) next[d.to] = applyDelta(next[d.to], d.delta);
  return { v: r.v, ws: next, error: null as string | null };
}

/** Give a player plenty of everything a joint order could ask for. */
function stock(g: GameState, o: JointOrder) {
  g.taler = 100_000;
  for (const m of Object.keys(SPECIALTIES)) g.materials[m] = 1000;
  for (const p of o.parts) if (p.kind === 'goods') {
    const d = { ...g.designs[0], id: `d-${p.form}-${p.colorFamily ?? 'x'}`, form: p.form, glazeId: 'gcol' };
    if (!g.designs.some((x) => x.id === d.id)) g.designs.push(d);
    const color = ({ blau: '#3f6fb5', rot: '#c0392b', gruen: '#5aa05a', braun: '#8a5a3a', weiss: '#f8f5ee' } as Record<string, string>)[p.colorFamily ?? ''] ?? '#e9c9a6';
    g.glazes.push({ ...g.glazes[0], id: 'gcol', color });
    g.goods.push({ designId: d.id, quality: 3, effect: null, count: 500 });
  }
}

function fill(v: VillageState, ws: Record<string, GameState>, actors: string[], o: JointOrder) {
  let st = { v, ws };
  o.parts.forEach((p, i) => {
    let left = p.count - p.filled;
    let k = 0;
    while (left > 0) {
      const actor = actors[k++ % actors.length];
      const n = Math.max(1, Math.ceil(left / 2));
      const a: VillageAction = p.kind === 'goods'
        ? { type: 'contribute', jointId: o.id, part: i, count: n, source: 'own', designId: `d-${p.form}-${p.colorFamily ?? 'x'}`, quality: 3, effect: null }
        : { type: 'contribute', jointId: o.id, part: i, count: n, source: 'own' };
      const r = run(st.v, st.ws, actor, a);
      if (r.error) throw new Error(r.error);
      st = { v: r.v, ws: r.ws };
      left -= n;
    }
  });
  return st;
}

describe('joint orders', () => {
  it('templates exist and span at least two specialties or forms', () => {
    expect(JOINT_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });
  it('a one-member village has none; two members get two', () => {
    expect(ensureJointOrders(village(1).v, T0).jointOrders).toHaveLength(0);
    expect(ensureJointOrders(village(2).v, T0).jointOrders).toHaveLength(2);
  });
  it('one player filling everything does not complete it; two players do', () => {
    let { v, ws } = village(3);
    v = ensureJointOrders(v, T0);
    const o = v.jointOrders[0];
    for (const id of ['p1', 'p2']) stock(ws[id], o);
    const solo = fill(v, ws, ['p1'], o);
    const left = solo.v.jointOrders.find((x) => x.id === o.id);
    expect(left).toBeDefined();
    expect(isComplete(left!)).toBe(false);
    const both = fill(v, ws, ['p1', 'p2'], o);
    expect(both.v.jointOrders.find((x) => x.id === o.id)).toBeUndefined();
    expect(both.v.completedJoint).toBe(1);
    // [Review Focus 4] p3 never contributed but gets the base share
    const share = Math.floor((o.reward.taler * 0.4) / 3);
    expect(both.ws.p3.taler - ws.p3.taler).toBeGreaterThanOrEqual(share - 1);
    expect(both.ws.p3.decor).toContain(o.reward.decor);
  });
  it('the village store covers a material part without any specialty holder', () => {
    let { v, ws } = village(2);
    v = ensureJointOrders(v, T0);
    const o = v.jointOrders.find((x) => x.parts.some((p) => p.kind === 'material'))!;
    const i = o.parts.findIndex((p) => p.kind === 'material');
    const p = o.parts[i] as { material: string; count: number };
    ws.p1.materials[p.material] = 0;
    ws.p1.taler = 100_000;
    const r = run(v, ws, 'p1', { type: 'contribute', jointId: o.id, part: i, count: p.count, source: 'store' });
    expect(r.error).toBeNull();
    expect(r.v.jointOrders.find((x) => x.id === o.id)!.parts[i].filled).toBe(p.count);
    expect(r.ws.p1.taler).toBeLessThan(100_000);
  });
  it('payouts add up to the reward', () => {
    let { v } = village(4);
    v = ensureJointOrders(v, T0);
    const o = { ...v.jointOrders[0], contributions: { p1: 300, p2: 100 } };
    const pays = payout(v, o);
    expect(pays).toHaveLength(4);
    const sum = pays.reduce((n, p) => n + (p.delta.taler ?? 0), 0);
    expect(Math.abs(sum - o.reward.taler)).toBeLessThanOrEqual(4);
  });
  it('the second completion builds the clay pit and tells every workshop', () => {
    let { v, ws } = village(2);
    v = ensureJointOrders(v, T0);
    for (let n = 0; n < 2; n++) {
      const o = v.jointOrders[0];
      for (const id of ['p1', 'p2']) stock(ws[id], o);
      const r = fill(v, ws, ['p1', 'p2'], o);
      v = r.v; ws = r.ws;
    }
    expect(v.buildings).toContain('tongrube');
    expect(ws.p1.village!.buildings).toContain('tongrube');
    expect(ws.p2.village!.buildings).toContain('tongrube');
  });
  it('rejects wrong goods for a part', () => {
    let { v, ws } = village(2);
    v = ensureJointOrders(v, T0);
    const o = v.jointOrders[0];
    const i = o.parts.findIndex((p) => p.kind === 'goods');
    const r = run(v, ws, 'p1', { type: 'contribute', jointId: o.id, part: i, count: 1, source: 'own', designId: ws.p1.designs[0].id, quality: 1, effect: null });
    expect(r.error).toBeTruthy();
  });
});

describe('first joint orders fit a brand-new village', () => {
  it('until two are done, joint orders only ask for cups and raw materials', () => {
    for (let seed = 0; seed < 30; seed++) {
      let { v } = village(2);
      v.rng = seed * 7919 + 1;
      v = ensureJointOrders(v, T0);
      for (const o of v.jointOrders) for (const p of o.parts) if (p.kind === 'goods') {
        expect(p.form).toBe('becher');
        expect(p.colorFamily).toBeUndefined();
        expect(p.minQuality).toBe(1);
      }
    }
  });
});
