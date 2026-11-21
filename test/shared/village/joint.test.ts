import { describe, expect, it } from 'vitest';
import type { GameState } from '../../../src/shared/types';
import { applyDelta, applyVillageAction } from '../../../src/shared/village/apply';
import { ensureJointOrders, generateJointOrder, isComplete, JOINT_TEMPLATES, payout } from '../../../src/shared/village/joint';
import { SPECIALTIES } from '../../../src/shared/village/specialties';
import type { JointOrder, VillageAction, VillageState } from '../../../src/shared/village/types';
import { villageLevel } from '../../../src/shared/village/level';
import { runAction, setTier, T0, village } from './helpers';

const run = runAction;

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
      if (r.error && /übrig/.test(r.error)) return; // a lone player has to leave the rest to someone else
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

describe('[Final review #1] one player can never lock a joint order', () => {
  it('a lone contributor must leave the last unit for someone else, who can then finish it', () => {
    let { v, ws } = village(2);
    v = ensureJointOrders(v, T0);
    const o = v.jointOrders[0];
    stock(ws.p1, o); stock(ws.p2, o);
    // p1 tries to fill every part completely
    let st = { v, ws };
    o.parts.forEach((p, i) => {
      const a: VillageAction = p.kind === 'goods'
        ? { type: 'contribute', jointId: o.id, part: i, count: p.count, source: 'own', designId: `d-${p.form}-${p.colorFamily ?? 'x'}`, quality: 3, effect: null }
        : { type: 'contribute', jointId: o.id, part: i, count: p.count, source: 'own' };
      const r = run(st.v, st.ws, 'p1', a);
      if (!r.error) st = { v: r.v, ws: r.ws };
      else {
        expect(r.error).toMatch(/übrig/);
        const smaller = { ...a, count: p.count - 1 };
        const r2 = run(st.v, st.ws, 'p1', smaller);
        expect(r2.error).toBeNull();
        st = { v: r2.v, ws: r2.ws };
      }
    });
    const open = st.v.jointOrders.find((x) => x.id === o.id)!;
    expect(open).toBeDefined();
    const i = open.parts.findIndex((p) => p.filled < p.count);
    expect(i).toBeGreaterThanOrEqual(0);
    const p = open.parts[i];
    const a: VillageAction = p.kind === 'goods'
      ? { type: 'contribute', jointId: o.id, part: i, count: 1, source: 'own', designId: `d-${p.form}-${p.colorFamily ?? 'x'}`, quality: 3, effect: null }
      : { type: 'contribute', jointId: o.id, part: i, count: 1, source: 'own' };
    const fin = run(st.v, st.ws, 'p2', a);
    expect(fin.error).toBeNull();
    expect(fin.v.jointOrders.find((x) => x.id === o.id)).toBeUndefined();
  });
});

const BRANCH = ['bierkeller', 'teestube', 'kurhaus', 'badehaus', 'herbstmarkt'];

function seen(v: VillageState): Set<string> {
  const ids = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    v.rng = seed * 7919 + 1;
    ids.add(generateJointOrder(v, T0).templateId);
  }
  return ids;
}

describe('branch joint orders', () => {
  it('appear only once a member can make them', () => {
    const { v, ws } = village(2);
    v.completedJoint = 4;
    expect(BRANCH.filter((id) => seen(v).has(id))).toEqual([]);
    setTier(v, ws, 'p1', 'manufaktur');
    const s1 = seen(v);
    expect(s1.has('bierkeller') && s1.has('teestube')).toBe(true);
    for (const id of ['kurhaus', 'badehaus', 'herbstmarkt']) expect(s1.has(id)).toBe(false);
    setTier(v, ws, 'p2', 'hofmanufaktur');
    const s2 = seen(v);
    expect(s2.has('kurhaus') && s2.has('badehaus')).toBe(true);
    expect(s2.has('herbstmarkt')).toBe(false);
    v.buildings.push('gemeinschaftsofen');
    expect(seen(v).has('herbstmarkt')).toBe(true);
  });
});

function partOrder(v: VillageState, part: JointOrder['parts'][number]): JointOrder {
  return { id: 'jx', templateId: 'x', title: 'x', client: 'x', clientSeed: 1, parts: [part], contributions: { p2: 1 }, reward: { taler: 100, ruf: 10, decor: 'laterne' }, createdAt: T0 };
}

describe('substitutes and body/effect parts', () => {
  it('a stoneware part refuses earthenware, accepts 3x earthenware as substitute in packs of three', () => {
    const { v, ws } = village(2);
    const g = ws.p1;
    const d = { ...g.designs[0], id: 'dk', form: 'krug' };
    g.designs.push(d);
    g.goods.push({ designId: 'dk', quality: 2, effect: null, count: 10 });
    const o = partOrder(v, { kind: 'goods', form: 'krug', body: 'steinzeug', count: 4, minQuality: 1, filled: 0 });
    v.jointOrders = [o];
    const ref = { designId: 'dk', quality: 2 as const, effect: null };
    expect(run(v, ws, 'p1', { type: 'contribute', jointId: 'jx', part: 0, count: 1, source: 'own', ...ref }).error).toBe('Das ist der falsche Ton');
    expect(run(v, ws, 'p1', { type: 'contribute', jointId: 'jx', part: 0, count: 4, source: 'substitute', ...ref }).error).toBe('Ersatz aus Irdenware geht nur in Dreierpacks');
    // 4 left, 6 substitutes = 2 units: accepted
    const r = run(v, ws, 'p1', { type: 'contribute', jointId: 'jx', part: 0, count: 6, source: 'substitute', ...ref });
    expect(r.error).toBeNull();
    expect(r.v.jointOrders[0].parts[0].filled).toBe(2);
    expect(r.ws.p1.goods.find((x) => x.designId === 'dk')!.count).toBe(4);
  });
  it('a tile part takes plates as substitute; an effect part takes plain pieces of the form x3', () => {
    const { v, ws } = village(2);
    const g = ws.p1;
    g.designs.push({ ...g.designs[0], id: 'dt', form: 'teller' }, { ...g.designs[0], id: 'dkr', form: 'krug' }, { ...g.designs[0], id: 'dst', form: 'teller', body: 'steinzeug' });
    g.goods.push({ designId: 'dt', quality: 1, effect: null, count: 9 }, { designId: 'dkr', quality: 1, effect: 'sprenkel', count: 6 }, { designId: 'dst', quality: 1, effect: null, count: 3 });
    v.jointOrders = [
      partOrder(v, { kind: 'goods', form: 'fliese', count: 10, minQuality: 1, filled: 0 }),
      partOrder(v, { kind: 'goods', form: 'krug', effect: 'ascheanflug', count: 6, minQuality: 1, filled: 0 }),
      partOrder(v, { kind: 'goods', form: 'becher', count: 6, minQuality: 1, filled: 0 }),
    ].map((x, i) => ({ ...x, id: `j${i}` }));
    const tiles = run(v, ws, 'p1', { type: 'contribute', jointId: 'j0', part: 0, count: 9, source: 'substitute', designId: 'dt', quality: 1, effect: null });
    expect(tiles.error).toBeNull();
    expect(tiles.v.jointOrders[0].parts[0].filled).toBe(3);
    // stoneware plates are no earthenware
    expect(run(v, ws, 'p1', { type: 'contribute', jointId: 'j0', part: 0, count: 3, source: 'substitute', designId: 'dst', quality: 1, effect: null }).error).toBe('Ersatz geht nur aus Irdenware');
    // any effect is fine on the substitute pieces
    const fx = run(v, ws, 'p1', { type: 'contribute', jointId: 'j1', part: 0, count: 6, source: 'substitute', designId: 'dkr', quality: 1, effect: 'sprenkel' });
    expect(fx.error).toBeNull();
    expect(fx.v.jointOrders[1].parts[0].filled).toBe(2);
    // exact mode still wants the effect
    expect(run(v, ws, 'p1', { type: 'contribute', jointId: 'j1', part: 0, count: 1, source: 'own', designId: 'dkr', quality: 1, effect: 'sprenkel' }).error).toBe('Da fehlt der Effekt');
    // a plain part has no substitute
    expect(run(v, ws, 'p1', { type: 'contribute', jointId: 'j2', part: 0, count: 3, source: 'substitute', designId: 'dt', quality: 1, effect: null }).error).toBe('Für diesen Teil gibt es keinen Ersatz');
  });
});

describe('orders keep coming', () => {
  it('after the four buildings they continue and raise the village level', () => {
    let { v, ws } = village(2);
    v.completedJoint = 8;
    v.buildings = ['tongrube', 'markthalle', 'glasurbibliothek', 'gildenhaus'];
    v = ensureJointOrders(v, T0);
    const o = v.jointOrders[0];
    for (const id of ['p1', 'p2']) stock(ws[id], o);
    const r = fill(v, ws, ['p1', 'p2'], o)!;
    expect(r.v.completedJoint).toBe(9);
    expect(r.v.jointOrders).toHaveLength(2);
    expect(villageLevel(r.v)).toBe(9);
    expect(r.v.buildings).toHaveLength(4);
  });
  it('payouts grow 2 % per village level, at most 40 %', () => {
    const { v } = village(2);
    const o: JointOrder = { ...ensureJointOrders(structuredClone(v), T0).jointOrders[0], contributions: { p1: 10, p2: 10 }, reward: { taler: 1000, ruf: 100, decor: 'laterne' } };
    const total = (x: VillageState) => payout(x, o).reduce((n, d) => n + (d.delta.taler ?? 0), 0);
    expect(total(v)).toBe(1000);
    expect(Math.abs(total({ ...v, completedJoint: 10 }) - 1200)).toBeLessThanOrEqual(1);
    expect(Math.abs(total({ ...v, completedJoint: 30 }) - 1400)).toBeLessThanOrEqual(1);
    expect(Math.abs(total({ ...v, completedJoint: 60 }) - 1400)).toBeLessThanOrEqual(1);
  });
  it('a Rathaus makes joint orders larger and better paying', () => {
    const a = village(2).v, b = village(2).v;
    b.projects.levels.rathaus = 2;
    const base = generateJointOrder(a, T0), big = generateJointOrder(b, T0);
    expect(big.templateId).toBe(base.templateId);
    big.parts.forEach((p, i) => expect(p.count).toBe(Math.ceil(base.parts[i].count * 1.5)));
    expect(Math.abs(big.reward.taler - base.reward.taler * 2.2)).toBeLessThanOrEqual(1.5);
  });
});
