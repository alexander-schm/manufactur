import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import { collectionEntries } from '../../src/shared/collection';
import { EFFECTS, FRAMES, UNLOCKS, getForm, isGreatKilnEffect } from '../../src/shared/content';
import { DECOR } from '../../src/shared/village/decor';
import { validateDesign } from '../../src/shared/design';
import { shelfCapacity } from '../../src/shared/market';
import { checkMilestones, MILESTONES, touchSeen } from '../../src/shared/progression';
import type { GameState } from '../../src/shared/types';
import { hofGame, manufakturGame, plainGame, T0 } from './helpers';

const MIN = 60_000;
const H = 60 * MIN;

describe('touchSeen', () => {
  it('gives a 30 min ×2 boost after ≥24 h away', () => {
    const s = plainGame();
    const t = touchSeen(s, s.lastSeen + 25 * H);
    expect(t.boostUntil).toBe(s.lastSeen + 25 * H + 30 * MIN);
    expect(t.lastSeen).toBe(s.lastSeen + 25 * H);
  });
  it('no boost after 2 h', () => {
    const s = plainGame();
    expect(touchSeen(s, s.lastSeen + 2 * H).boostUntil).toBe(0);
  });
});

describe('milestones', () => {
  it('first sale unlocks the orders board and creates an unacked milestone', () => {
    const s = plainGame();
    s.stats.sold = 1;
    const r = checkMilestones(s);
    expect(r.state.unlocks).toContain('orders');
    expect(r.events.some((e) => e.kind === 'unlock')).toBe(true);
    expect(r.state.milestonesDone).toContain('firstSale');
  });
  it('workers gain a second trait at 150 xp', () => {
    const s = plainGame();
    s.workers[0].traits = ['geduldig'];
    s.workers[0].xp = 150;
    const r = checkMilestones(s);
    expect(r.state.workers[0].traits).toHaveLength(2);
    expect(r.events.some((e) => e.kind === 'levelUp')).toBe(true);
  });
  it('passive progress (advance) also unlocks', () => {
    const s = plainGame();
    s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
    expect(advance(s, T0 + 10 * MIN).unlocks).toContain('orders');
  });
  it('every milestone unlock exists', async () => {
    const { UNLOCKS } = await import('../../src/shared/content');
    for (const m of MILESTONES) for (const u of m.unlocks) expect(UNLOCKS[u], u).toBeDefined();
  });
});

/** A simple casual bot: standing order, deliver what fits, follow unlocks, follow glaze hints. */
export function playthrough(minutes: number) {
  let s: GameState = plainGame(11);
  let t = T0;
  const unlockTimes: number[] = [];
  const log: string[] = [];
  const rufLog: string[] = [];
  const firstSeen = new Map<string, number>();
  const act = (a: Action) => { const r = applyAction(s, a, t); if (r.ok) s = r.state; return r.ok; };
  act({ type: 'setStanding', designId: s.designs[0].id, batchSize: 6, autoBuy: true });
  let hintRecipe: Extract<Action, { type: 'experiment' }>['recipe'] | null = { base: 'opak', colorant: null, colorantPct: 0, firing: { temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' } };
  for (; t <= T0 + minutes * MIN; t += 30_000) {
    const before = s.unlocks.length;
    s = advance(s, t);
    for (const o of [...s.orders]) {
      for (const g of [...s.goods].sort((a, b) => b.quality - a.quality)) {
        const d = s.designs.find((x) => x.id === g.designId)!;
        if (d.form === o.form && g.quality >= o.minQuality && g.count >= o.count) {
          act({ type: 'deliverOrder', orderId: o.id, designId: g.designId, quality: g.quality, effect: g.effect });
          break;
        }
      }
    }
    if (s.unlocks.includes('studio') && s.stats.designsSaved === 0) {
      act({ type: 'saveDesign', design: { ...s.designs[0], id: 'new', name: 'Streifenbecher', pattern: 'stripes' } });
    }
    if (s.unlocks.includes('studio') && hintRecipe && s.stats.effectsFound === 0) {
      act({ type: 'buyMaterial', material: 'glasurbasis', amount: 4 });
      act({ type: 'experiment', recipe: hintRecipe });
      // follow Greta's hint for craquelé
      hintRecipe = { base: 'transparent', colorant: null, colorantPct: 0, firing: { temp: 'mittel', atmosphere: 'oxidierend', cooling: 'schnell' } };
    }
    if (s.unlocks.includes('hiring') && s.workers.length < 3 && s.taler > 80) {
      const ok = act({ type: 'hire', workerId: s.hirePool[0].id });
      if (ok) act({ type: 'assign', workerId: s.workers[s.workers.length - 1].id, stationId: s.stations.find((x) => x.kind === (s.workers.length === 2 ? 'prepBench' : 'glazeTable'))!.id });
    }
    // design for newly unlocked forms so orders for them can be served
    for (const f of ['schale', 'teller', 'vase', 'krug']) {
      if (s.unlocks.includes(f) && s.unlocks.includes('studio') && !s.designs.some((d) => d.form === f)) {
        act({ type: 'saveDesign', design: { ...s.designs[0], id: 'n' + f, name: f, form: f, handle: getForm(f).handleAllowed ? 'round' : 'none', pattern: 'none', profile: { ...getForm(f).profileDefaults } } });
      }
    }
    // a casual player taps "sell all" when the shelf is nearly full, and upgrades the stall/shelf when rich
    const onShelf = s.goods.reduce((n, g) => n + g.count, 0);
    if (onShelf >= shelfCapacity(s) - 6) {
      const big = [...s.goods].sort((x, y) => y.count - x.count)[0];
      if (big) act({ type: 'sellNow', designId: big.designId, quality: big.quality, effect: big.effect, count: big.count });
    }
    if (s.unlocks.includes('upgrades')) for (const k of ['marketStall', 'shelf'] as const) {
      const st = s.stations.find((x) => x.kind === k)!;
      if (s.taler > 400) act({ type: 'upgradeStation', stationId: st.id });
    }
    // a casual player declines orders that have been impossible for a while
    for (const o of s.orders) {
      firstSeen.set(o.id, firstSeen.get(o.id) ?? t);
      if (t - firstSeen.get(o.id)! > 6 * MIN) act({ type: 'declineOrder', orderId: o.id });
    }
    // a casual player produces whatever the oldest open order asks for
    const want = s.orders[0]?.form;
    const d = want && s.designs.find((x) => x.form === want);
    if (d && s.standing?.designId !== d.id) act({ type: 'setStanding', designId: d.id, batchSize: 6, autoBuy: true });
    if ((t - T0) % (150_000) === 0) rufLog.push(`${(t - T0) / MIN}:${s.ruf}`);
    for (let i = before; i < s.unlocks.length; i++) { unlockTimes.push(t); log.push(`${s.unlocks[i]}@${((t - T0) / MIN).toFixed(1)}`); }
  }
  return { s, unlockTimes, log, rufLog };
}

describe('pacing playthrough', () => {
  it('a casual first 45 minutes keeps unlocking: ≥8 unlocks, no gap over 8 minutes, still unlocking after minute 25', () => {
    const { s, unlockTimes } = playthrough(45);
    expect(s.unlocks.length - 1).toBeGreaterThanOrEqual(8);
    const times = [T0, ...unlockTimes];
    for (let i = 1; i < times.length; i++) expect((times[i] - times[i - 1]) / MIN, `gap before unlock #${i}`).toBeLessThanOrEqual(8);
    expect((unlockTimes[unlockTimes.length - 1] - T0) / MIN).toBeGreaterThanOrEqual(25);
  });
});

describe('milestone ladder (Manufaktur range)', () => {
  it('every milestone unlock and decor exists', () => {
    for (const m of MILESTONES) {
      for (const u of m.unlocks) expect(UNLOCKS[u], u).toBeDefined();
      for (const d of m.decor ?? []) expect(DECOR[d], d).toBeDefined();
    }
    for (const f of Object.values(FRAMES)) expect(UNLOCKS[f.unlock]).toBeDefined();
    expect(Object.keys(FRAMES)).toEqual(['punkte', 'doppel', 'kranz', 'sonne', 'gold', 'krone']);
  });
  it('ruf milestones fire and unlock their rewards', () => {
    const s = plainGame(); s.ruf = 600;
    const r = checkMilestones(s).state;
    for (const id of ['ruf250', 'ruf400', 'ruf600']) expect(r.milestonesDone).toContain(id);
    for (const u of ['rahmen-punkte', 'muster-ranken', 'kunde-sammlerin']) expect(r.unlocks).toContain(u);
  });
  it('collection milestones derive from the book size and stay done when it grows', () => {
    const book = collectionEntries().filter((e) => !isGreatKilnEffect(e.effect));
    const total = book.length;
    const s = manufakturGame();
    s.collection = book.slice(0, Math.ceil(total * 0.25)).map((e) => e.key);
    const r = checkMilestones(s).state;
    expect(r.milestonesDone).toContain('sammlung25');
    expect(r.milestonesDone).not.toContain('sammlung50');
    expect(r.unlocks).toContain('rahmen-doppel');
    const full = manufakturGame(); full.collection = book.map((e) => e.key);
    const f = checkMilestones(full).state;
    expect(f.decor).toContain('papierlampions');
    expect(f.unlocks).toEqual(expect.arrayContaining(['muster-karo', 'rahmen-kranz']));
    expect(f.milestonesDone).toContain('sammlung100');
    // a book that later grows: shrink the collection, nothing is taken back
    f.collection = f.collection.slice(0, 3);
    expect(checkMilestones(f).state.milestonesDone).toContain('sammlung100');
  });
  it('first stoneware piece and body effects reward decor and mangan', () => {
    const s = manufakturGame();
    s.collection.push('becher|steinzeug|-');
    const bodyEffect = Object.values(EFFECTS).find((e) => e.body === 'steinzeug')!;
    s.glazes.push({ ...s.glazes[0], id: 'gx', effect: bodyEffect.id });
    const r = checkMilestones(s);
    expect(r.state.decor).toContain('steinzeugtopf');
    expect(r.state.decorPlaced).toContain('steinzeugtopf');
    expect(r.state.unlocks).toContain('mangan');
    expect(r.events.some((e) => e.kind === 'unlock' && e.text === 'Neue Dekoration: Steinzeug-Vorratstopf')).toBe(true);
    expect(r.state.milestonesDone).not.toContain('allStonewareEffects');
    for (const e of Object.values(EFFECTS)) if (e.body === 'steinzeug' && e.id !== bodyEffect.id) r.state.glazes.push({ ...s.glazes[0], id: `g-${e.id}`, effect: e.id });
    expect(checkMilestones(r.state).state.decor).toContain('glasurproben');
  });
  it('masterwork milestones follow prestige', () => {
    const s = manufakturGame();
    const rec = { id: 'm1', commissionId: 'c', patronName: 'X', design: s.designs[0], glazeColor: '#fff', effect: null, quality: 2 as const, met: 3, total: 3, prestige: 'bronze' as const, finishedAt: T0, acked: false };
    s.masterworks = [rec];
    const a = checkMilestones(s).state;
    expect(a.decor).toContain('meisterbrief');
    expect(a.decorPlaced).toContain('meisterbrief');
    expect(a.milestonesDone).not.toContain('masterworkSilver');
    a.masterworks.push({ ...rec, id: 'm2', prestige: 'silver' });
    const b = checkMilestones(a).state;
    expect(b.unlocks).toContain('rahmen-sonne');
    expect(b.unlocks).not.toContain('rahmen-gold');
    b.masterworks.push({ ...rec, id: 'm3', prestige: 'gold' });
    expect(checkMilestones(b).state.unlocks).toContain('rahmen-gold');
  });
  it('frames and new patterns are gated', () => {
    const s = manufakturGame();
    const mark = { shape: 'circle' as const, letter: 'A', color: '#aa0000' };
    const run = (st: GameState, frame: string) => applyAction(st, { type: 'setMakerMark', mark: { ...mark, frame } }, T0);
    expect(run(s, 'nope')).toMatchObject({ ok: false, error: 'Unbekannter Rahmen' });
    expect(run(s, 'kranz')).toMatchObject({ ok: false, error: 'Diesen Rahmen hast du noch nicht' });
    const u = { ...s, unlocks: [...s.unlocks, 'rahmen-kranz'] };
    const r = run(u, 'kranz');
    expect(r.ok && r.state.makerMark.frame).toBe('kranz');
    const plain = applyAction(s, { type: 'setMakerMark', mark }, T0);
    expect(plain.ok && 'frame' in plain.state.makerMark).toBe(false);
    expect(validateDesign({ ...s.designs[0], pattern: 'karo' }, s)).toBe('Dieses Muster ist noch nicht freigeschaltet');
    expect(validateDesign({ ...s.designs[0], pattern: 'karo' }, { ...s, unlocks: [...s.unlocks, 'muster-karo'] })).toBeNull();
  });
});

describe('milestone ladder (court range)', () => {
  it('the court ladder fires', () => {
    const s = hofGame();
    expect(s.milestonesDone).toContain('ruf1000');
    s.milestonesDone = s.milestonesDone.filter((id) => id !== 'ruf1000');
    s.ruf = 2500;
    s.collection.push('figur|porzellan|-');
    for (const e of Object.values(EFFECTS)) if (e.body === 'porzellan') s.glazes.push({ ...s.glazes[0], id: `g-${e.id}`, effect: e.id });
    const r = checkMilestones(s);
    for (const id of ['ruf1000', 'firstPorcelain', 'allPorcelainEffects', 'ruf1500', 'ruf2500']) expect(r.state.milestonesDone).toContain(id);
    expect(r.state.decor).toEqual(expect.arrayContaining(['porzellanvoegel', 'kronleuchter']));
    expect(r.state.decorPlaced).toEqual(expect.arrayContaining(['porzellanvoegel', 'kronleuchter']));
    expect(r.state.unlocks).toEqual(expect.arrayContaining(['muster-schuppen', 'kunde-hofgaertnerin', 'rahmen-krone']));
    expect(r.events.some((e) => e.kind === 'unlock' && e.id === 'kronleuchter')).toBe(true);
  });
  it('court milestones wait for their conditions', () => {
    const s = hofGame();
    s.ruf = 1499;
    s.collection.push('figur|steinzeug|-');
    const blau = Object.values(EFFECTS).find((e) => e.body === 'porzellan')!;
    s.glazes.push({ ...s.glazes[0], id: 'g-one', effect: blau.id });
    const r = checkMilestones(s).state;
    for (const id of ['firstPorcelain', 'allPorcelainEffects', 'ruf1500', 'ruf2500']) expect(r.milestonesDone).not.toContain(id);
    expect(r.unlocks).not.toContain('rahmen-krone');
    expect(r.decor).not.toContain('kronleuchter');
  });
  it('the court ladder sits after the Hofmanufaktur and every Part 2 cosmetic is granted by some milestone', () => {
    const ids = MILESTONES.map((m) => m.id);
    expect(ids.indexOf('ruf1000')).toBeLessThan(ids.indexOf('tierHofmanufaktur'));
    expect(ids.indexOf('tierHofmanufaktur')).toBeLessThan(ids.indexOf('firstPorcelain'));
    const granted = MILESTONES.flatMap((m) => [...m.unlocks, ...(m.decor ?? [])]);
    for (const c of ['rahmen-krone', 'muster-schuppen', 'kunde-hofgaertnerin', 'porzellanvoegel', 'kronleuchter']) expect(granted, c).toContain(c);
  });
});
