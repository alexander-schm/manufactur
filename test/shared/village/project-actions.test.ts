import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../../src/shared/content';
import { fmtTaler } from '../../../src/shared/format';
import type { GameState, MasterworkRecord, Prestige } from '../../../src/shared/types';
import { DECOR } from '../../../src/shared/village/decor';
import { BASE_SHARE } from '../../../src/shared/village/joint';
import { villageLevel } from '../../../src/shared/village/level';
import { PROJECTS, ROMAN, instantiateStage, isStageComplete, maxProjectUnits, partSize, stageReward, stageShares } from '../../../src/shared/village/projects';
import { villageStorePrice } from '../../../src/shared/village/specialties';
import type { ActivePart, VillageAction, VillageState } from '../../../src/shared/village/types';
import { runAction, setTier, T0, village } from './helpers';

const DAY = 86_400_000;
const NOW = T0 + 1000;
type World = { v: VillageState; ws: Record<string, GameState> };

const designId = (p: { form: string; body?: string; colorFamily?: string; effect?: string }, sub = false) =>
  sub ? `sub-${p.form}-${p.colorFamily ?? 'x'}` : `d-${p.form}-${p.body ?? 'irdenware'}-${p.colorFamily ?? 'x'}-${p.effect ?? 'x'}`;
const COLORS: Record<string, string> = { blau: '#3f6fb5', rot: '#c0392b', gruen: '#5aa05a', braun: '#8a5a3a', weiss: '#f8f5ee' };
const SUB_FORM: Record<string, string> = { fliese: 'teller', figur: 'vase', teekanne: 'krug' };

/** Give a player plenty of everything any project stage could ask for (exact pieces and earthenware substitutes). */
function stock(g: GameState) {
  g.taler = 100_000_000;
  for (const m of Object.keys(MATERIALS)) g.materials[m] = 100_000;
  for (const def of Object.values(PROJECTS)) for (const st of def.stages) for (const p of st.parts) {
    if (p.kind !== 'goods') continue;
    const glazeId = `g-${p.colorFamily ?? 'x'}`;
    if (!g.glazes.some((x) => x.id === glazeId)) g.glazes.push({ ...g.glazes[0], id: glazeId, color: COLORS[p.colorFamily ?? ''] ?? '#e9c9a6' });
    for (const sub of [false, true]) {
      const id = designId(p, sub);
      if (g.designs.some((x) => x.id === id)) continue;
      g.designs.push({ ...g.designs[0], id, form: sub ? (SUB_FORM[p.form] ?? p.form) : p.form, body: sub ? 'irdenware' : (p.body ?? 'irdenware'), glazeId });
      g.goods.push({ designId: id, quality: 3, effect: sub ? null : (p.effect ?? null), count: 10_000 });
    }
  }
}

function masterwork(id: string, prestige: Prestige, g: GameState): MasterworkRecord {
  return { id, commissionId: 'c-' + id, patronName: 'Gräfin', design: g.designs[0], glazeColor: '#e9c9a6', effect: null, quality: 3, met: 3, total: 3, prestige, finishedAt: T0, acked: true };
}

/** A Manufaktur village with every member stocked and the offers in place. */
function world(n = 2): World {
  const { v, ws } = village(n);
  for (const id of Object.keys(ws)) { setTier(v, ws, id, 'manufaktur'); stock(ws[id]); }
  return { v, ws };
}

/** The action that gives `count` units (pieces/Taler) of part `i` the ordinary way. */
function give(w: World, actor: string, i: number, count: number): VillageAction {
  const a = w.v.projects.active!, p = a.parts[i];
  const base = { type: 'contributeProject' as const, projectId: a.projectId, part: i, count, source: 'own' as const };
  if (p.kind === 'goods') return { ...base, designId: designId(p), quality: 3, effect: p.effect ?? null };
  if (p.kind === 'masterwork') {
    const free = w.ws[actor].masterworks.filter((m) => !w.v.lentMasterworks.includes(`${actor}:${m.id}`));
    return { ...base, masterworkIds: free.slice(0, count).map((m) => m.id) };
  }
  return base;
}

/** Move the active project straight to `stage` (fresh parts for the current members). */
function toStage(w: World, stage: number) {
  const a = w.v.projects.active!;
  a.stage = stage;
  a.parts = instantiateStage(PROJECTS[a.projectId], a.level, stage, w.v.members.length);
  return a;
}

/** Pick `projectId` with a tiny first contribution, then return the world. */
function pickProject(w: World, projectId: string, actor = 'p1', now = NOW): World {
  w.v.projects.offered = [projectId];
  const r = runAction(w.v, w.ws, actor, { type: 'contributeProject', projectId, part: 0, count: 1, source: 'own' }, now);
  if (r.error) throw new Error(r.error);
  return { v: r.v, ws: r.ws };
}

/** Each actor in turn gives as much as the cap lets them into every part, until nothing moves. */
function fillStage(w: World, actors: string[], now = NOW): World {
  const stage = w.v.projects.active!.stage, projectId = w.v.projects.active!.projectId;
  for (let round = 0; round < 10; round++) {
    let moved = false;
    for (const actor of actors) {
      const a = w.v.projects.active;
      if (!a || a.stage !== stage || a.projectId !== projectId) return w;
      for (let i = 0; i < a.parts.length; i++) {
        const cur = w.v.projects.active;
        if (!cur || cur.stage !== stage) return w;
        let units = maxProjectUnits(cur, i, actor);
        // a masterwork part takes only the actor's own, not yet lent masterworks
        if (cur.parts[i].kind === 'masterwork') units = Math.min(units, w.ws[actor].masterworks.filter((m) => !w.v.lentMasterworks.includes(`${actor}:${m.id}`)).length);
        if (units <= 0) continue;
        const r = runAction(w.v, w.ws, actor, give(w, actor, i, units), now);
        if (r.error) throw new Error(`${actor} part ${i}: ${r.error}`);
        w = { v: r.v, ws: r.ws };
        moved = true;
      }
    }
    if (!moved) return w;
  }
  return w;
}

describe('choosing a project', () => {
  it('the first contribution picks the project; the other offer disappears', () => {
    const w = world(2);
    const notOffered = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'nope', part: 0, count: 1, source: 'own' });
    expect(notOffered.error).toBe('Dieses Projekt steht gerade nicht zur Wahl');
    w.v.projects.offered = ['glockenturm', 'museum'];
    const r = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 10, source: 'own' });
    expect(r.error).toBeNull();
    const a = r.v.projects.active!;
    expect(a.projectId).toBe('glockenturm');
    expect(a.level).toBe(1);
    expect(a.stage).toBe(0);
    expect(a.startedAt).toBe(NOW);
    expect(a.stageStartedAt).toBe(NOW);
    expect(a.parts[0].filled).toBe(10);
    expect(a.parts[0].by).toEqual({ p1: 10 });
    expect(r.v.projects.offered).toEqual([]);
    expect(r.ws.p1.materials.ton).toBe(w.ws.p1.materials.ton - 10);
    expect(r.events).toContain('Beigesteuert – danke!');
    expect(r.v.news.map((n) => n.text)).toContain('Anna hat den ersten Stein gelegt: Das Dorf baut jetzt Glockenturm I!');
  });

  it('[Review Focus 4] a contribution to the other offered project after the pick is refused and costs nothing', () => {
    const w = world(2);
    w.v.projects.offered = ['glockenturm', 'museum'];
    const picked = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 5, source: 'own' });
    expect(picked.error).toBeNull();
    const before = structuredClone(picked.ws.p2);
    const r = runAction(picked.v, picked.ws, 'p2', { type: 'contributeProject', projectId: 'museum', part: 0, count: 5, source: 'own' });
    expect(r.error).toBe('Das Dorf baut gerade schon: Glockenturm');
    expect(r.ws.p2).toEqual(before);
    expect(r.v.projects.active!.projectId).toBe('glockenturm');
  });

  it('a project already at level 1 is picked at level 2', () => {
    const w = world(2);
    w.v.projects.levels.glockenturm = 1;
    const r = pickProject(w, 'glockenturm');
    expect(r.v.projects.active!.level).toBe(2);
    expect(r.v.news.map((n) => n.text)).toContain('Anna hat den ersten Stein gelegt: Das Dorf baut jetzt Glockenturm II!');
  });
});

describe('the 70 % rule', () => {
  it('[Review Focus 3] nobody gives more than 70 % — not with Taler, not with the village store, not with substitutes', () => {
    let w = pickProject(world(2), 'glockenturm');
    const a0 = w.v.projects.active!;
    // p1 fills part 0 but one, part 1 completely and most of part 2: just under 0.69 of the stage
    const sizes = a0.parts.map(partSize);
    const third = Math.floor((0.69 * 4 - (sizes[0] - 1) / sizes[0] - 1) * sizes[2]);
    const plan: [number, number][] = [[0, sizes[0] - 2], [1, sizes[1]], [2, third]];
    for (const [i, n] of plan) {
      const r = runAction(w.v, w.ws, 'p1', give(w, 'p1', i, n));
      expect(r.error, `part ${i}`).toBeNull();
      w = { v: r.v, ws: r.ws };
    }
    const a = w.v.projects.active!;
    const ti = a.parts.findIndex((p) => p.kind === 'taler');
    const max = maxProjectUnits(a, ti, 'p1');
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThan(partSize(a.parts[ti]));
    const cap = 'Mehr als 70 % einer Bauphase darf niemand allein geben – lass den anderen etwas übrig!';
    const over = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: ti, count: max + 1, source: 'own' });
    expect(over.error).toBe(cap);
    expect(over.ws.p1.taler).toBe(w.ws.p1.taler);
    const exact = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: ti, count: max, source: 'own' });
    expect(exact.error).toBeNull();
    expect(exact.ws.p1.taler).toBe(w.ws.p1.taler - max);
    expect(exact.v.projects.active!.parts[ti].by.p1).toBe(max);
    expect(maxProjectUnits(exact.v.projects.active!, 2, 'p1')).toBe(0);
    // the village store is capped the same way
    const store = runAction(exact.v, exact.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 1, source: 'store' });
    expect(store.error).toBe(cap);
    // and substitutes: Turmschaft's stoneware cups at 3× earthenware
    let fresh = pickProject(world(2), 'glockenturm');
    const st1 = toStage(fresh, 1);
    // p1 first fills both material parts (half the stage)
    for (const [i, q] of st1.parts.entries()) {
      if (q.kind !== 'material') continue;
      const r = runAction(fresh.v, fresh.ws, 'p1', give(fresh, 'p1', i, partSize(q)));
      expect(r.error).toBeNull();
      fresh = { v: r.v, ws: r.ws };
    }
    const st = fresh.v.projects.active!;
    const gi = st.parts.findIndex((p) => p.kind === 'goods');
    const gmax = maxProjectUnits(st, gi, 'p1');
    expect(gmax).toBeLessThan(partSize(st.parts[gi]));
    const p = st.parts[gi] as Extract<ActivePart, { kind: 'goods' }>;
    const sub = (count: number) => runAction(fresh.v, fresh.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: gi, count, source: 'substitute', designId: designId(p, true), quality: 3, effect: null });
    const subOver = sub(3 * (gmax + 1));
    expect(sub(3 * gmax).error).toBeNull();
    expect(sub(3 * gmax).v.projects.active!.parts[gi].by.p1).toBe(gmax);
    expect(subOver.error).toBe(cap);
  });

  it('a part that is nearly full says how much is missing', () => {
    const w = pickProject(world(2), 'glockenturm');
    const size = partSize(w.v.projects.active!.parts[0]);
    const r = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: size, source: 'own' });
    expect(r.error).toBe(`Es fehlen nur noch ${size - 1}`);
    // substitutes are counted in earthenware pieces, three per missing piece
    const gi = w.v.projects.active!.parts.findIndex((p) => p.kind === 'goods');
    const gp = w.v.projects.active!.parts[gi] as Extract<ActivePart, { kind: 'goods' }>;
    const most = runAction(w.v, w.ws, 'p2', give(w, 'p2', gi, partSize(gp) - 2));
    expect(most.error).toBeNull();
    const sub = runAction(most.v, most.ws, 'p1', { type: 'contributeProject', projectId: 'glockenturm', part: gi, count: 9, source: 'substitute', designId: designId(gp, true), quality: 3, effect: null });
    expect(sub.error).toBe('Es fehlen nur noch 6');
  });

  it('property: one actor greedily filling everything never completes a stage; a second actor finishes it', () => {
    for (const id of ['glockenturm', 'museum', 'rathaus']) {
      for (const n of [2, 3, 5]) {
        const w0 = world(n);
        let w = pickProject(w0, id);
        for (const m of ['p1', 'p2']) for (const k of ['a', 'b', 'c', 'd']) w.ws[m].masterworks.push(masterwork(`${m}${k}`, 'gold', w.ws[m]));
        w = fillStage(w, ['p1']);
        const a = w.v.projects.active!;
        expect(a.stage, `${id}/${n}`).toBe(0);
        expect(a.parts.every((p, i) => maxProjectUnits(a, i, 'p1') === 0), `${id}/${n}`).toBe(true);
        expect(isStageComplete(a), `${id}/${n}`).toBe(false);
        const done = fillStage(w, ['p2']);
        expect(done.v.stagesDone, `${id}/${n}`).toBe(1);
        expect(done.v.projects.active!.stage, `${id}/${n}`).toBe(1);
      }
    }
  });

  it('the only member with a masterwork can still lend it after giving 70 % of the rest; a second member finishes', () => {
    let w = pickProject(world(2), 'museum');
    const a = toStage(w, 1);
    const mi = a.parts.findIndex((p) => p.kind === 'masterwork');
    expect(w.ws.p2.masterworks).toEqual([]);
    w = fillStage(w, ['p1']);
    const capped = w.v.projects.active!;
    expect(capped.stage).toBe(1);
    expect(stageShares(capped).p1).toBeCloseTo(0.7, 2);
    expect(capped.parts.every((p, i) => p.kind === 'masterwork' || maxProjectUnits(capped, i, 'p1') === 0)).toBe(true);
    w.ws.p1.masterworks.push(masterwork('late', 'bronze', w.ws.p1));
    expect(maxProjectUnits(capped, mi, 'p1')).toBe(partSize(capped.parts[mi]));
    const lent = runAction(w.v, w.ws, 'p1', give(w, 'p1', mi, 1));
    expect(lent.error).toBeNull();
    expect(lent.v.projects.active!.parts[mi].by.p1).toBe(1);
    expect(stageShares(lent.v.projects.active!).p1).toBeCloseTo(stageShares(capped).p1);
    const done = fillStage({ v: lent.v, ws: lent.ws }, ['p2']);
    expect(done.v.stagesDone).toBe(1);
    expect(done.v.projects.active!.stage).toBe(2);
  });
});

describe('sources', () => {
  it('material parts: own stock, the village store at its price, no substitutes; goods never from the store', () => {
    const w = pickProject(world(2), 'glockenturm');
    w.ws.p2.materials.ton = 3;
    const short = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 5, source: 'own' });
    expect(short.error).toBe('Du hast nicht genug Ton');
    const price = villageStorePrice('ton') * 5;
    w.ws.p2.taler = price - 1;
    const poor = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 5, source: 'store' });
    expect(poor.error).toBe(`Im Dorfladen kostet das ${fmtTaler(price)} Taler – so viel hast du nicht`);
    w.ws.p2.taler = price;
    const bought = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 5, source: 'store' });
    expect(bought.error).toBeNull();
    expect(bought.ws.p2.taler).toBe(0);
    expect(bought.ws.p2.materials.ton).toBe(3);
    expect(bought.v.projects.active!.parts[0].by.p2).toBe(5);
    const sub = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 3, source: 'substitute' });
    expect(sub.error).toBe('Dafür gibt es keinen Ersatz');
    const gi = w.v.projects.active!.parts.findIndex((p) => p.kind === 'goods');
    const goodsStore = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: gi, count: 1, source: 'store' });
    expect(goodsStore.error).toBe('Ware gibt es nicht im Dorfladen – die musst du selbst töpfern');
  });

  it('substitutes: 3 earthenware per unit, tiles as plates, packs of three only', () => {
    const { v, ws } = village(2);
    for (const id of Object.keys(ws)) { setTier(v, ws, id, 'hofmanufaktur'); stock(ws[id]); }
    const w = pickProject({ v, ws }, 'dorfbrunnen');
    const a = w.v.projects.active!;
    const ti = a.parts.findIndex((p) => p.kind === 'goods' && p.form === 'fliese');
    const p = a.parts[ti] as Extract<ActivePart, { kind: 'goods' }>;
    const plateStack = () => w.ws.p1.goods.find((g) => g.designId === designId(p, true))!.count;
    const plates = plateStack();
    expect(w.ws.p1.designs.find((d) => d.id === designId(p, true))!.form).toBe('teller');
    const r = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'dorfbrunnen', part: ti, count: 6, source: 'substitute', designId: designId(p, true), quality: 3, effect: null });
    expect(r.error).toBeNull();
    expect(r.v.projects.active!.parts[ti].filled).toBe(2);
    expect(r.v.projects.active!.parts[ti].by.p1).toBe(2);
    expect(r.ws.p1.goods.find((g) => g.designId === designId(p, true))!.count).toBe(plates - 6);
    const odd = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'dorfbrunnen', part: ti, count: 4, source: 'substitute', designId: designId(p, true), quality: 3, effect: null });
    expect(odd.error).toBe('Ersatz aus Irdenware geht nur in Dreierpacks');
    const exact = runAction(w.v, w.ws, 'p1', { type: 'contributeProject', projectId: 'dorfbrunnen', part: ti, count: 4, source: 'own', designId: designId(p), quality: 3, effect: null });
    expect(exact.error).toBeNull();
    expect(exact.v.projects.active!.parts[ti].filled).toBe(4);
  });

  it('a masterwork part lends a masterwork once forever; it stays on the plinth', () => {
    const { v, ws } = village(2);
    for (const id of Object.keys(ws)) { setTier(v, ws, id, 'manufaktur'); stock(ws[id]); }
    ws.p1.masterworks.push(masterwork('mw1', 'bronze', ws.p1), masterwork('mw2', 'bronze', ws.p1));
    let w = pickProject({ v, ws }, 'museum');
    // jump to Ausstellungshalle (bronze), keeping the active project
    const a = toStage(w, 1);
    const mi = a.parts.findIndex((p) => p.kind === 'masterwork');
    const lend = (ids: string[], who = 'p1', world: World = w) => runAction(world.v, world.ws, who, { type: 'contributeProject', projectId: 'museum', part: mi, count: ids.length, source: 'own', masterworkIds: ids });
    const missing = lend(['nope']);
    expect(missing.error).toBe('Dieses Meisterstück gibt es nicht');
    const ok = lend(['mw1']);
    expect(ok.error).toBeNull();
    expect(ok.v.lentMasterworks).toEqual(['p1:mw1']);
    expect(ok.ws.p1.masterworks.map((m) => m.id)).toContain('mw1');
    expect(ok.v.projects.active!.parts[mi].by.p1).toBe(1);
    w = { v: ok.v, ws: ok.ws };
    // the part is full now; a new masterwork part later still refuses mw1
    const later = structuredClone(w.v);
    later.projects.active!.parts[mi].filled = 0;
    later.projects.active!.parts[mi].by = {};
    const again = runAction(later, w.ws, 'p1', { type: 'contributeProject', projectId: 'museum', part: mi, count: 1, source: 'own', masterworkIds: ['mw1'] });
    expect(again.error).toBe('Dieses Meisterstück steht schon im Dorf');
    const none = runAction(later, w.ws, 'p1', { type: 'contributeProject', projectId: 'museum', part: mi, count: 1, source: 'own', masterworkIds: [] });
    expect(none.error).not.toBeNull();
    // Eröffnung wants silver
    const silver = structuredClone(w.v);
    const si = toStage({ v: silver, ws: w.ws }, 3).parts.findIndex((p) => p.kind === 'masterwork');
    const bronze = runAction(silver, w.ws, 'p1', { type: 'contributeProject', projectId: 'museum', part: si, count: 1, source: 'own', masterworkIds: ['mw2'] });
    expect(bronze.error).toBe('Dafür braucht es mindestens Silber');
    const dup = runAction(silver, w.ws, 'p1', { type: 'contributeProject', projectId: 'museum', part: si, count: 2, source: 'own', masterworkIds: ['mw2', 'mw2'] });
    expect(dup.error).not.toBeNull();
  });

  it('Taler parts need the Taler', () => {
    const w = pickProject(world(2), 'glockenturm');
    const ti = w.v.projects.active!.parts.findIndex((p) => p.kind === 'taler');
    w.ws.p2.taler = 99;
    const r = runAction(w.v, w.ws, 'p2', { type: 'contributeProject', projectId: 'glockenturm', part: ti, count: 100, source: 'own' });
    expect(r.error).toBe('Dafür hast du nicht genug Taler');
  });
});

describe('completing stages and projects', () => {
  it('a completed stage pays everyone, absent members included, and raises the village level', () => {
    const w0 = world(3);
    w0.v.members.find((m) => m.playerId === 'p3')!.lastSeen = T0 - 30 * DAY;
    let w = pickProject(w0, 'glockenturm');
    const levelBefore = villageLevel(w.v);
    const stage0 = structuredClone(w.v.projects.active!);
    w = fillStage(w, ['p1', 'p2']);
    expect(w.v.stagesDone).toBe(1);
    expect(villageLevel(w.v)).toBe(levelBefore + 1);
    const reward = stageReward(w0.v, stage0);
    expect(w.ws.p3.taler - w0.ws.p3.taler).toBeGreaterThanOrEqual(Math.round(reward.taler * BASE_SHARE / 3) - 1);
    expect(w.ws.p3.ruf - w0.ws.p3.ruf).toBeGreaterThanOrEqual(1);
    const a = w.v.projects.active!;
    expect(a.stage).toBe(1);
    expect(a.stageStartedAt).toBe(NOW);
    expect(a.parts.every((p) => p.filled === 0)).toBe(true);
    expect(a.parts.map((p) => p.kind)).toEqual(PROJECTS.glockenturm.stages[1].parts.map((p) => p.kind));
    expect(w.v.news.map((n) => n.text)).toContain('Bauphase „Fundament“ am Glockenturm ist fertig! Alle bekommen ihren Anteil.');
  });

  it('with only one active member the stage waits; their contributions stay', () => {
    const w0 = world(2);
    w0.v.members.find((m) => m.playerId === 'p2')!.lastSeen = T0 - 8 * DAY;
    let w = pickProject(w0, 'glockenturm');
    w = fillStage(w, ['p1']);
    const a = w.v.projects.active!;
    expect(a.stage).toBe(0);
    expect(w.v.stagesDone).toBe(0);
    expect(isStageComplete(a)).toBe(false);
    const total = a.parts.reduce((n, p) => n + (p.by.p1 ?? 0) / partSize(p) / a.parts.length, 0);
    expect(total).toBeGreaterThan(0.69);
    expect(total).toBeLessThanOrEqual(0.7 + 1e-9);
  });

  it('a completed project grants the decor, the snapshot level, and offers the next level', () => {
    let w = pickProject(world(2), 'glockenturm');
    for (const m of ['p1', 'p2']) w.ws[m].masterworks.push(masterwork(`${m}-mw`, 'gold', w.ws[m]));
    const decorBefore = { p1: w.ws.p1.decor.length, p2: w.ws.p2.decor.length };
    for (let s = 0; s < PROJECTS.glockenturm.stages.length; s++) w = fillStage(w, s % 2 ? ['p2', 'p1'] : ['p1', 'p2']);
    expect(w.v.projects.active).toBeNull();
    expect(w.v.projects.levels.glockenturm).toBe(1);
    expect(w.v.stagesDone).toBe(PROJECTS.glockenturm.stages.length);
    for (const id of ['p1', 'p2']) {
      expect(w.ws[id].decor).toContain('tischglocke');
      expect(w.ws[id].decor.length).toBe(decorBefore[id as 'p1' | 'p2'] + 1);
      // VillageSnapshot.projects is typed by the benefits task; applyDelta already carries it
      expect((w.ws[id].village as { projects?: Record<string, number> }).projects).toEqual({ glockenturm: 1 });
    }
    expect(w.v.projects.offered.length).toBeGreaterThan(0);
    expect(w.v.projects.offered.every((id) => (w.v.projects.levels[id] ?? 0) < 3)).toBe(true);
    expect(w.v.news.map((n) => n.text)).toContain(`Glockenturm ${ROMAN[0]} ist fertig! ${PROJECTS.glockenturm.benefit(1)}`);
    expect(w.v.lentMasterworks.length).toBe(1);
  });

  it('every project decor exists in DECOR', () => {
    for (const def of Object.values(PROJECTS)) expect(DECOR[def.decor], def.decor).toBeDefined();
    expect(DECOR.tischglocke).toEqual({ id: 'tischglocke', name: 'Kleine Messingglocke', spot: 'window' });
  });
});

describe('validation', () => {
  it('rejects malformed project contributions', () => {
    const w = world(2);
    const bad: unknown[] = [
      { type: 'contributeProject', projectId: 3, part: 0, count: 1, source: 'own' },
      { type: 'contributeProject', projectId: 'glockenturm', part: -1, count: 1, source: 'own' },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 1, source: 'magic' },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 0, source: 'own' },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 100_000_001, source: 'own' },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 1, source: 'own', masterworkIds: 'x' },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 1, source: 'own', masterworkIds: Array(11).fill('x') },
      { type: 'contributeProject', projectId: 'glockenturm', part: 0, count: 1, source: 'own', masterworkIds: [1] },
    ];
    for (const a of bad) expect(runAction(w.v, w.ws, 'p1', a as VillageAction).error, JSON.stringify(a)).not.toBeNull();
  });
});
