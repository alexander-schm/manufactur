import { describe, expect, it } from 'vitest';
import { fmtTaler } from '../../../src/shared/format';
import { batchMaterials, missingMaterialCost } from '../../../src/shared/production';
import { applyDelta } from '../../../src/shared/village/apply';
import { GREAT_KILN_CAPACITY, KILN_FIRING_MS, KILN_WAIT_MS, heatFor, kilnPieces, loadKiln, nextKilnWake, rollKilnEffect, shareLeft, tickGreatKiln } from '../../../src/shared/village/kiln';
import { newVillage } from '../../../src/shared/village/state';
import { tickVillage } from '../../../src/shared/village/tick';
import { BUILDINGS, BUILDING_ORDER } from '../../../src/shared/village/buildings';
import type { GameState } from '../../../src/shared/types';
import type { VillageState } from '../../../src/shared/village/types';
import { T0, runAction, setTier, village } from './helpers';

/** A village whose first member reached the Manufaktur and the kiln stands. */
function kilnVillage(n = 3) {
  const { v, ws } = village(n);
  setTier(v, ws, 'p1', 'manufaktur');
  tickVillage(v, T0);
  for (const id of Object.keys(ws)) { ws[id].taler = 100_000; ws[id].materials = { ton: 500, glasurbasis: 100, holz: 500 }; }
  return { v, ws };
}

const load = (v: VillageState, ws: Record<string, GameState>, id: string, count: number, wood: number, now = T0 + 1000) =>
  runAction(v, ws, id, { type: 'loadKiln', designId: ws[id].designs[0].id, count, wood }, now);

describe('great kiln', () => {
  it('the kiln appears once a member reaches the Manufaktur, with news and a snapshot for everyone', () => {
    const { v, ws } = village(3);
    expect(tickVillage(v, T0).changed).toBe(false);
    setTier(v, ws, 'p2', 'manufaktur');
    const r = tickVillage(v, T0);
    expect(r.changed).toBe(true);
    expect(v.buildings).toContain('gemeinschaftsofen');
    expect(v.news.at(-1)!.text).toBe('Im Dorf steht jetzt ein Gemeinschaftsofen! Wer mitbrennt, macht das Feuer heißer.');
    expect(r.deliveries.map((d) => d.to).sort()).toEqual(['p1', 'p2', 'p3']);
    for (const d of r.deliveries) expect(d.delta.village?.buildings).toContain('gemeinschaftsofen');
    expect(tickVillage(v, T0 + 1).changed).toBe(false);
    expect(BUILDINGS.gemeinschaftsofen.name).toBe('Gemeinschaftsofen');
    expect(BUILDING_ORDER as readonly string[]).not.toContain('gemeinschaftsofen');
  });

  it('refuses loading before the kiln exists', () => {
    const { v, ws } = village(2);
    const r = load(v, ws, 'p1', 5, 10);
    expect(r.error).toBe('Den Gemeinschaftsofen gibt es erst, wenn jemand im Dorf die Manufaktur erreicht hat');
  });

  it('loading pays materials and wood up front, buying what is missing', () => {
    const { v, ws } = kilnVillage(2);
    ws.p1.materials = { ton: 50, glasurbasis: 20, holz: 0 };
    ws.p1.taler = 1000;
    const design = ws.p1.designs[0];
    const need = { ...batchMaterials(ws.p1, design, 5), holz: 10 };
    const cost = missingMaterialCost(ws.p1, need);
    expect(cost).toBeGreaterThan(0);
    const r = load(v, ws, 'p1', 5, 10);
    expect(r.error).toBeNull();
    expect(r.events).toEqual(['Eingeräumt – jetzt heißt es warten, bis der Ofen brennt.']);
    expect(r.ws.p1.taler).toBeCloseTo(1000 - cost);
    expect(r.ws.p1.materials.ton).toBe(50 - 5);
    expect(r.ws.p1.materials.holz).toBe(0);
    expect(r.v.greatKiln.loads[0].count).toBe(5);
    expect(r.v.greatKiln.loads[0].wood).toBe(10);
    expect(r.v.greatKiln.loads[0].design.origin).toBeUndefined();
    expect(r.v.greatKiln.firesAt).toBe(T0 + 1000 + KILN_WAIT_MS);
    expect(r.v.news.at(-1)!.text).toBe('Anna hat 5 Becher in den Gemeinschaftsofen geräumt.');
  });

  it('checks wood per piece and Taler', () => {
    const { v, ws } = kilnVillage(2);
    expect(load(v, ws, 'p1', 5, 9).error).toBe('Pro Stück braucht es 2 bis 6 Holz');
    expect(load(v, ws, 'p1', 5, 31).error).toBe('Pro Stück braucht es 2 bis 6 Holz');
    ws.p1.taler = 0;
    ws.p1.materials = {};
    const cost = missingMaterialCost(ws.p1, { ...batchMaterials(ws.p1, ws.p1.designs[0], 5), holz: 10 });
    expect(load(v, ws, 'p1', 5, 10).error).toBe(`Dafür brauchst du ${fmtTaler(cost)} Taler`);
  });

  it('refuses gifted designs', () => {
    const { v, ws } = kilnVillage(2);
    ws.p1.designs.push({ ...structuredClone(ws.p2.designs[0]), id: 'f:x', origin: { playerName: 'Ben', makerMark: ws.p2.makerMark, glazeColor: '#fff' } });
    const r = runAction(v, ws, 'p1', { type: 'loadKiln', designId: 'f:x', count: 2, wood: 4 });
    expect(r.error).toBe('Geschenkte Stücke kannst du nicht nachmachen');
  });

  it('a member may load at most 20; the kiln holds 60 and fires at once when full', () => {
    let { v, ws } = kilnVillage(4);
    let r = load(v, ws, 'p1', 15, 30);
    expect(r.error).toBeNull();
    ({ v, ws } = r);
    expect(shareLeft(v.greatKiln, 'p1')).toBe(5);
    expect(load(v, ws, 'p1', 6, 12).error).toBe('Dein Platz im Ofen reicht noch für 5 Stück');
    expect(runAction(v, ws, 'p1', { type: 'loadKiln', designId: ws.p1.designs[0].id, count: 21, wood: 42 }).error).toBe('Ungültige Menge');
    ({ v, ws } = load(v, ws, 'p1', 5, 10));
    ({ v, ws } = load(v, ws, 'p2', 20, 40));
    ({ v, ws } = load(v, ws, 'p3', 10, 20));
    expect(load(v, ws, 'p4', 11, 22).error).toBe('Der Ofen hat nur noch Platz für 10 Stück');
    const firesBefore = v.greatKiln.firesAt;
    expect(firesBefore).toBe(T0 + 1000 + KILN_WAIT_MS);
    r = load(v, ws, 'p4', 10, 20, T0 + 5000);
    expect(r.error).toBeNull();
    expect(kilnPieces(r.v.greatKiln)).toBe(GREAT_KILN_CAPACITY);
    expect(r.v.greatKiln.firesAt).toBe(T0 + 5000);
  });

  it('heat: alone with little wood 0.35, three with little wood 0.75, three with full wood 1', () => {
    expect(heatFor(1, 40, 20)).toBeCloseTo(0.35);
    expect(heatFor(3, 120, 60)).toBeCloseTo(0.75);
    expect(heatFor(3, 360, 60)).toBeCloseTo(1);
    expect(heatFor(6, 360, 60)).toBe(1);
  });

  it('rolls effects with the given odds', () => {
    let rng = 1;
    let hits = 0;
    let asche = 0;
    for (let i = 0; i < 5000; i++) {
      const [e, r] = rollKilnEffect(rng, 1, false);
      rng = r;
      if (e) hits++;
      if (e === 'ascheglasur') asche++;
    }
    expect(hits / 5000).toBeGreaterThan(0.76);
    expect(hits / 5000).toBeLessThan(0.84);
    expect(asche / hits).toBeGreaterThan(6 / 14 - 0.04);
    expect(asche / hits).toBeLessThan(6 / 14 + 0.04);
  });

  it('fires 24 h after the first piece, cools 2 h later, pieces return to their own design and the collection', () => {
    let { v, ws } = kilnVillage(2);
    const made = ws.p1.stats.made;
    ({ v, ws } = load(v, ws, 'p1', 5, 30, T0));
    const firesAt = T0 + KILN_WAIT_MS;
    expect(nextKilnWake(v)).toBe(firesAt);
    expect(tickVillage(v, firesAt - 1)).toEqual({ changed: false, deliveries: [] });
    const fire = tickVillage(v, firesAt);
    expect(fire).toEqual({ changed: true, deliveries: [] });
    expect(v.greatKiln.doneAt).toBe(firesAt + KILN_FIRING_MS);
    expect(v.greatKiln.heat).toBeCloseTo(heatFor(1, 30, 5));
    expect(v.news.at(-1)!.text).toBe('Der Gemeinschaftsofen brennt! In zwei Stunden ist er abgekühlt.');
    expect(nextKilnWake(v)).toBe(firesAt + KILN_FIRING_MS);
    expect(load(v, ws, 'p2', 2, 4, firesAt + 1).error).toBe('Der Ofen brennt gerade – danach kannst du wieder einräumen');
    const firingId = v.greatKiln.firingId;
    const done = tickVillage(v, firesAt + KILN_FIRING_MS);
    expect(done.changed).toBe(true);
    expect(done.deliveries).toHaveLength(1);
    const d = done.deliveries[0];
    expect(d.to).toBe('p1');
    const returns = d.delta.kilnGoods!;
    expect(returns.reduce((n, x) => n + x.count, 0)).toBe(5);
    expect(v.greatKiln.loads).toEqual([]);
    expect(v.greatKiln.firingId).not.toBe(firingId);
    expect(v.lastFiring).toMatchObject({ firingId, pieces: 5, contributors: ['p1'], at: firesAt + KILN_FIRING_MS });
    expect(nextKilnWake(v)).toBeNull();
    const after = applyDelta(ws.p1, d.delta);
    const designId = ws.p1.designs[0].id;
    expect(after.designs.filter((x) => x.id.startsWith('f:'))).toHaveLength(0);
    expect(after.stats.made).toBe(made + 5);
    for (const ret of returns) {
      expect(after.goods.find((g) => g.designId === designId && g.effect === ret.effect && g.quality === ret.quality)?.count).toBeGreaterThanOrEqual(ret.count);
      expect(after.collection).toContain(`becher|irdenware|${ret.effect ?? '-'}`);
    }
    const best = v.lastFiring!.best!;
    const last = v.news.at(-1)!.text;
    expect(last.startsWith('Der Gemeinschaftsofen ist abgekühlt: 5 Stücke von 1 Leuten. Schönstes Stück: Annas Becher')).toBe(true);
    expect(last.endsWith(best.effect ? '!' : '.')).toBe(true);
  });

  it('both transitions can happen in one tick', () => {
    let { v, ws } = kilnVillage(2);
    ({ v, ws } = load(v, ws, 'p1', 5, 10, T0));
    const r = tickVillage(v, T0 + KILN_WAIT_MS + KILN_FIRING_MS + 10);
    expect(r.deliveries).toHaveLength(1);
    expect(v.lastFiring!.at).toBe(T0 + KILN_WAIT_MS + KILN_FIRING_MS);
    expect(v.news.slice(-2)[0].text).toBe('Der Gemeinschaftsofen brennt! In zwei Stunden ist er abgekühlt.');
  });

  it('a village action runs the tick first and keeps its deliveries', () => {
    let { v, ws } = kilnVillage(2);
    ({ v, ws } = load(v, ws, 'p1', 5, 10, T0));
    const before = goodsCount(ws.p1);
    const r = runAction(v, ws, 'p2', { type: 'postRequest', material: 'ton', count: 3 }, T0 + KILN_WAIT_MS + KILN_FIRING_MS);
    expect(r.error).toBeNull();
    expect(r.v.lastFiring?.pieces).toBe(5);
    expect(goodsCount(r.ws.p1)).toBe(before + 5);
  });

  it('three contributors make Ascheglasur likely; a lone potter rarely gets it', () => {
    const { ws } = village(1);
    const design = ws.p1.designs[0];
    const trial = (members: number, perMember: number, woodPer: number) => {
      let hits = 0;
      for (let seed = 0; seed < 300; seed++) {
        const v = newVillage('v', 'Tonhausen', seed * 7919 + 1);
        v.greatKiln.firesAt = T0;
        for (let i = 0; i < members; i++) v.greatKiln.loads.push({ playerId: `p${i}`, design, glazeColor: '#fff', count: perMember, wood: perMember * woodPer, qualityScore: 50, makerName: 'X', makerMark: { shape: 'heart', letter: 'X', color: '#000' } });
        const ds = tickGreatKiln(v, T0 + KILN_FIRING_MS);
        if (ds.some((d) => d.delta.kilnGoods!.some((k) => k.effect === 'ascheglasur'))) hits++;
      }
      return hits / 300;
    };
    expect(trial(3, 20, 6)).toBeGreaterThanOrEqual(0.99);
    expect(trial(1, 20, 2)).toBeLessThan(0.65);
  });

  it('a village of 1 can fire alone', () => {
    const { v, ws } = village(1);
    setTier(v, ws, 'p1', 'manufaktur');
    const r = load(v, ws, 'p1', 3, 6, T0);
    expect(r.error).toBeNull();
    const t = tickVillage(r.v, T0 + KILN_WAIT_MS + KILN_FIRING_MS);
    expect(t.deliveries.map((d) => d.to)).toEqual(['p1']);
    expect(t.deliveries[0].delta.kilnGoods!.reduce((n, x) => n + x.count, 0)).toBe(3);
  });

  it('a piece whose design was deleted meanwhile comes back as a foreign copy', () => {
    let { v, ws } = kilnVillage(2);
    ({ v, ws } = load(v, ws, 'p1', 4, 8, T0));
    const { deliveries } = tickVillage(v, T0 + KILN_WAIT_MS + KILN_FIRING_MS);
    const deleted = ws.p1.designs[0];
    const w = structuredClone(ws.p1);
    w.designs = w.designs.filter((d) => d.id !== deleted.id);
    w.goods = [];
    const glazeColor = ws.p1.glazes.find((g) => g.id === deleted.glazeId)!.color;
    const after = applyDelta(w, deliveries[0].delta);
    const copies = after.designs.filter((d) => d.id.startsWith('f:'));
    expect(copies).toHaveLength(1);
    expect(copies[0].origin).toEqual({ playerName: 'Anna', makerMark: v.members[0].makerMark, glazeColor });
    expect(after.goods.filter((g) => g.designId === copies[0].id).reduce((n, g) => n + g.count, 0)).toBe(4);
  });

  it('a design edited during the wait gets the fired one back as a new own design', () => {
    let { v, ws } = kilnVillage(2);
    ({ v, ws } = load(v, ws, 'p1', 4, 8, T0));
    const fired = structuredClone(ws.p1.designs[0]);
    // saveDesign edits in place when nothing on the shelf or in the pipeline uses the design
    const w = structuredClone(ws.p1);
    w.goods = [];
    w.glazes.push({ ...structuredClone(w.glazes[0]), id: 'g-blau', color: '#3355aa' });
    w.designs[0] = { ...w.designs[0], form: 'schale', glazeId: 'g-blau' };
    const ownBefore = w.designs.filter((d) => !d.origin).length;
    const { deliveries } = tickVillage(v, T0 + KILN_WAIT_MS + KILN_FIRING_MS);
    const after = applyDelta(w, deliveries[0].delta);
    expect(after.designs.filter((d) => !d.origin)).toHaveLength(ownBefore + 1);
    const back = after.designs.at(-1)!;
    expect(back.id).not.toBe(fired.id);
    expect(back.origin).toBeUndefined();
    expect({ ...back, id: fired.id }).toEqual(fired);
    expect(after.goods.filter((g) => g.designId === back.id).reduce((n, g) => n + g.count, 0)).toBe(4);
    expect(after.goods.filter((g) => g.designId === fired.id)).toEqual([]);
    for (const ret of deliveries[0].delta.kilnGoods!) expect(after.collection).toContain(`becher|irdenware|${ret.effect ?? '-'}`);
    expect(after.collection.some((k) => k.startsWith('schale|'))).toBe(false);
  });

  it('the hotter the fire, the better the pieces: score 70 at heat 1 comes back at the top quality', () => {
    const { ws } = village(1);
    const v = newVillage('v', 'Tonhausen', 3);
    v.greatKiln.firesAt = T0;
    // three people with full wood make the hottest fire; 70 alone would be the middle quality
    for (const id of ['p1', 'p2', 'p3']) v.greatKiln.loads.push({ playerId: id, design: ws.p1.designs[0], glazeColor: '#fff', count: 10, wood: 60, qualityScore: 70, makerName: id, makerMark: { shape: 'heart', letter: 'X', color: '#000' } });
    const ds = tickGreatKiln(v, T0 + KILN_FIRING_MS);
    expect(v.lastFiring!.heat).toBe(1);
    const all = ds.flatMap((d) => d.delta.kilnGoods!);
    expect(all.length).toBeGreaterThan(0);
    for (const r of all) expect(r.quality).toBe(3);
  });

  it('no loading while it fires', () => {
    let { v, ws } = kilnVillage(2);
    ({ v, ws } = load(v, ws, 'p1', 5, 10, T0));
    tickVillage(v, T0 + KILN_WAIT_MS);
    expect(load(v, ws, 'p2', 5, 10, T0 + KILN_WAIT_MS + 5).error).toBe('Der Ofen brennt gerade – danach kannst du wieder einräumen');
    expect(tickVillage(v, T0 + KILN_WAIT_MS + 1)).toEqual({ changed: false, deliveries: [] });
  });
});

const goodsCount = (s: GameState) => s.goods.reduce((n, g) => n + g.count, 0);
