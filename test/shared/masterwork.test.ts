import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { advance, startWork } from '../../src/shared/advance';
import { collectionKey } from '../../src/shared/collection';
import { FORMS, PATRONS, bodyOf, getTier } from '../../src/shared/content';
import { colorFamily, validateDesign } from '../../src/shared/design';
import {
  COMMISSION_SWAP_COST, MASTERWORK_QUALITY_BONUS, PRESTIGE_MUL, finishMasterwork, criteriaMet, describeCriterion, generateCommission, masterworkBusy, masterworkInProgress, predictMasterwork, prestigeFor,
} from '../../src/shared/masterwork';
import { MASTERWORK_KILN_SHARE, batchQuality, kilnCapacity, kilnLoad, productionWorkers } from '../../src/shared/production';
import { newId } from '../../src/shared/state';
import type { Batch, Commission, Design, GameState, GlazeRecipe, Stage } from '../../src/shared/types';
import { manufakturGame, plainGame, T0 } from './helpers';

const H = 3_600_000;
const NOW = T0 + 1000;

function ok(s: GameState, a: Action, now = NOW): GameState {
  const r = applyAction(s, a, now);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}

function rejected(s: GameState, a: Action, now = NOW): string {
  const before = structuredClone(s);
  const r = applyAction(s, a, now);
  expect(r.ok).toBe(false);
  expect(s).toEqual(before);
  return r.ok ? '' : r.error;
}

const OELFLECK: GlazeRecipe = {
  id: 'oel', name: 'Ölfleck', base: 'opak', colorant: 'eisenoxid', colorantPct: 8,
  firing: { temp: 'hoch', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#1b1a1f', effect: 'oelfleck', body: 'steinzeug',
};
const KOBALT: GlazeRecipe = {
  id: 'kob', name: 'Kobaltblau', base: 'transparent', colorant: 'kobalt', colorantPct: 3,
  firing: { temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' }, color: '#2a4fa0', effect: null, body: 'irdenware',
};

/** Builds a design from the player's own glazes and forms that meets every criterion. */
function solve(s: GameState, c: Commission): Design {
  const want = <K extends Commission['criteria'][number]['kind']>(k: K) =>
    c.criteria.find((x) => x.kind === k) as Extract<Commission['criteria'][number], { kind: K }> | undefined;
  const body = want('body'), effect = want('effect'), color = want('color'), form = want('form'), tall = want('tall'), pattern = want('pattern');
  const glaze = s.glazes.find((g) => (!body || bodyOf(g) === body.body) && (!effect || g.effect === effect.effect) && (!color || colorFamily(g.color) === color.colorFamily));
  if (!glaze) throw new Error('no glaze fits');
  const formId = form?.form ?? 'becher';
  const profile = { ...FORMS[formId].profileDefaults };
  if (tall) profile.height = tall.tall ? 0.9 : 0.2;
  return {
    id: newId(s, 'd'), name: 'Meisterstück', form: formId, profile, handle: 'none', rim: 'plain', body: bodyOf(glaze), glazeId: glaze.id,
    pattern: pattern?.pattern ?? 'none', patternColor: '#2b2420',
  };
}

function stonewareBecher(s: GameState): Design {
  const d: Design = { ...structuredClone(s.designs[0]), id: newId(s, 'd'), name: 'Steinbecher', body: 'steinzeug', glazeId: 'klar-steinzeug' };
  s.designs.push(d);
  return d;
}

const waiting = (s: GameState, id: string, stage: Stage, count: number, masterwork?: boolean): Batch => ({
  id, designId: s.designs[0].id, count, stage, stationId: null, startedAt: null, durationMs: 0, quality: 70, ...(masterwork ? { masterwork } : {}),
});

describe('masterworks', () => {
  it('prestige rules', () => {
    expect(prestigeFor(4, 4, 3)).toBe('gold');
    expect(prestigeFor(4, 4, 2)).toBe('silver');
    expect(prestigeFor(3, 4, 3)).toBe('silver');
    expect(prestigeFor(3, 4, 2)).toBe('bronze');
    expect(prestigeFor(0, 3, 1)).toBe('bronze');
    expect(prestigeFor(3, 3, 1)).toBe('bronze');
  });

  it("every generated commission is reachable with the player's own glazes and forms", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = manufakturGame(seed);
      s.glazes.push(structuredClone(OELFLECK), structuredClone(KOBALT));
      const before = s.rng;
      const c = generateCommission(s);
      expect(s.rng).not.toBe(before);
      expect(c.criteria.length).toBe(3);
      expect(c.costTaler).toBe(3000);
      expect(c.rewardRuf).toBe(30);
      expect(PATRONS.some((p) => p.name === c.patronName && p.job === c.patronJob)).toBe(true);
      const d = solve(s, c);
      expect(validateDesign(d, s)).toBeNull();
      expect(criteriaMet(s, d, c).every(Boolean)).toBe(true);
    }
  });

  it('commissions are deterministic and grow with each masterwork', () => {
    const a = manufakturGame(7), b = manufakturGame(7);
    expect(generateCommission(a)).toEqual(generateCommission(b));
    const s = manufakturGame(3);
    s.glazes.push(structuredClone(OELFLECK));
    // only tall forms: every commission has at least form, tall, pattern and colour to pick from
    s.unlocks = s.unlocks.filter((u) => u !== 'schale' && u !== 'teller');
    const fake = { id: 'x', commissionId: 'c', patronName: 'p', design: s.designs[0], glazeColor: '#fff', effect: null, quality: 2 as const, met: 3, total: 3, prestige: 'silver' as const, finishedAt: 0, acked: true };
    s.masterworks = [fake, fake];
    for (let i = 0; i < 30; i++) {
      const c = generateCommission(s);
      expect(c.criteria.length).toBe(4);
      expect(c.costTaler).toBe(6000);
      expect(c.rewardRuf).toBe(40);
      const body = c.criteria.find((x) => x.kind === 'body');
      expect(c.rewardTaler).toBe(body ? Math.round(18000 * 1.8) : 18000);
    }
    s.masterworks = [fake, fake, fake];
    let sawEffect = false;
    for (let i = 0; i < 30; i++) {
      const c = generateCommission(s);
      const body = c.criteria.find((x) => x.kind === 'body');
      // from the third masterwork on, a stoneware commission picks an effect glaze and always asks for its effect
      if (body) { expect(c.criteria.some((x) => x.kind === 'effect' && x.effect === 'oelfleck')).toBe(true); sawEffect = true; }
      const order = ['body', 'form', 'tall', 'effect', 'pattern', 'color'];
      expect(c.criteria.map((x) => order.indexOf(x.kind))).toEqual(c.criteria.map((x) => order.indexOf(x.kind)).sort((p, q) => p - q));
    }
    expect(sawEffect).toBe(true);
  });

  it('describes criteria in German', () => {
    expect(describeCriterion({ kind: 'body', body: 'steinzeug' })).toBe('aus Steinzeug');
    expect(describeCriterion({ kind: 'form', form: 'teekanne' })).toBe('als Teekanne');
    expect(describeCriterion({ kind: 'tall', tall: true })).toBe('schön hoch');
    expect(describeCriterion({ kind: 'tall', tall: false })).toBe('eher niedrig');
    expect(describeCriterion({ kind: 'effect', effect: 'oelfleck' })).toBe('mit Ölfleck');
    expect(describeCriterion({ kind: 'pattern', pattern: 'leaves' })).toBe('mit Blättern');
    expect(describeCriterion({ kind: 'color', colorFamily: 'blau' })).toBe('in Blau');
  });

  it('validateDesign gates patterns through PATTERN_UNLOCK', () => {
    const s = plainGame(); s.unlocks.push('studio');
    expect(validateDesign({ ...s.designs[0], pattern: 'zigzag' as never }, s)).toBe('Unbekanntes Muster');
    expect(validateDesign({ ...s.designs[0], pattern: 'waves' }, s)).toBe('Dieses Muster ist noch nicht freigeschaltet');
    expect(validateDesign({ ...s.designs[0], pattern: 'dots' }, s)).toBeNull();
  });

  it('starting costs the fee and materials; one at a time; not in a Werkstatt', () => {
    const s = manufakturGame();
    s.commission = generateCommission(s);
    const d = stonewareBecher(s);
    const taler = s.taler, clay = s.materials.steinzeugton, base = s.materials.glasurbasis;
    const a = ok(s, { type: 'startMasterwork', designId: d.id });
    expect(a.taler).toBe(taler - 3000);
    expect(a.materials.steinzeugton).toBe(clay - 12);
    expect(a.materials.glasurbasis).toBe(base - 3);
    expect(a.batches).toHaveLength(1);
    expect(a.batches[0]).toMatchObject({ count: 1, stage: 'prepare', masterwork: true, designId: d.id });
    expect(a.batches[0].quality).toBe(Math.min(100, batchQuality(a, d, productionWorkers(a)) + MASTERWORK_QUALITY_BONUS));
    expect(masterworkInProgress(a)).toBe(a.batches[0]);
    expect(rejected(a, { type: 'startMasterwork', designId: d.id })).toMatch(/schon ein Meisterstück/);
    expect(rejected(plainGame(), { type: 'startMasterwork', designId: plainGame().designs[0].id })).toMatch(/ab der Manufaktur/);
    const none = manufakturGame();
    expect(rejected(none, { type: 'startMasterwork', designId: none.designs[0].id })).toMatch(/kein Gönner/);
    const gift = manufakturGame(); gift.commission = generateCommission(gift);
    gift.designs[0].origin = { playerName: 'Ida', makerMark: { shape: 'circle', letter: 'I', color: '#000000' }, glazeColor: '#ffffff' };
    expect(rejected(gift, { type: 'startMasterwork', designId: gift.designs[0].id })).toMatch(/Geschenkte Stücke/);
  });

  it('missing materials are bought from the shop as part of the price', () => {
    const s = manufakturGame();
    s.commission = generateCommission(s);
    const d = stonewareBecher(s);
    s.materials.steinzeugton = 2; // 10 missing at 3 Taler
    s.taler = 3029;
    expect(rejected(s, { type: 'startMasterwork', designId: d.id })).toBe('Dafür brauchst du 3.030 Taler');
    s.taler = 3030;
    const a = ok(s, { type: 'startMasterwork', designId: d.id });
    expect(a.taler).toBe(0);
    expect(a.materials.steinzeugton).toBe(0);
  });

  it('takes exactly 18 h however many workers and boosts', () => {
    const s = manufakturGame();
    s.commission = generateCommission(s); s.boostUntil = T0 + 10 * H; s.standing = null; s.batches = [];
    for (const st of s.stations) if (st.kind === 'wheel') s.workers.push({ id: 'wx', seed: 1, name: 'X', traits: [], xp: 900, stationId: st.id });
    const r = applyAction(s, { type: 'startMasterwork', designId: s.designs[0].id }, T0);
    expect(r.ok).toBe(true);
    const a = advance(r.ok ? r.state : s, T0 + 18 * H - 1);
    expect(a.masterworks.length).toBe(0);
    expect(a.batches[0]).toMatchObject({ stage: 'glazeFire', durationMs: 4 * H, startedAt: T0 + 14 * H });
    expect(advance(a, T0 + 18 * H).masterworks.length).toBe(1);
  });

  it('a masterwork starts 10 quality points above a normal batch of the same design', () => {
    const s = manufakturGame();
    s.commission = generateCommission(s);
    const d = s.designs[0];
    expect(MASTERWORK_QUALITY_BONUS).toBe(10);
    // compare against the state the action ran on (catch-up may grow the worker first)
    const a = ok(s, { type: 'startMasterwork', designId: d.id });
    const normal = batchQuality(a, d, productionWorkers(a));
    expect(normal).toBeLessThan(90);
    expect(masterworkInProgress(a)!.quality).toBe(normal + 10);
    expect(predictMasterwork(a, d).quality).toBe(normal + 10 >= 75 ? 3 : normal + 10 >= 40 ? 2 : 1);
    // a very skilled hand: the bonus is capped at 100
    s.workers[0].traits = ['perfektionist', 'perfektionist'];
    const strong = ok(s, { type: 'startMasterwork', designId: d.id });
    const base = batchQuality(strong, d, productionWorkers(strong));
    expect(base).toBeGreaterThan(90);
    expect(masterworkInProgress(strong)!.quality).toBe(100);
  });

  it('[Review Focus 5] a busy kiln drains for the waiting masterwork instead of refilling with small batches', () => {
    const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null; s.stallDesignIds = [];
    const kiln = s.stations.find((x) => x.kind === 'kiln')!;
    expect(kilnCapacity(s)).toBe(72);
    const running = (id: string, endH: number): Batch => ({ ...waiting(s, id, 'bisque', 20), stationId: kiln.id, startedAt: T0, durationMs: endH * H });
    // 60 of 72 in the kiln, ending one after another; five more small batches queue behind
    s.batches = [running('r1', 1), running('r2', 2), running('r3', 3), waiting(s, 'm', 'bisque', 1, true)];
    for (let i = 1; i <= 5; i++) s.batches.push(waiting(s, `w${i}`, 'bisque', 20));
    const a = advance(s, T0 + 1 * H + 1);
    // 40 used after r1: the masterwork (36) does not fit yet, and no small batch takes the freed room
    expect(a.batches.find((b) => b.id === 'm')!.startedAt).toBeNull();
    expect(a.batches.filter((b) => b.id.startsWith('w') && b.startedAt !== null)).toHaveLength(0);
    const b = advance(a, T0 + 2 * H + 1);
    expect(b.batches.find((x) => x.id === 'm')!.startedAt).toBe(T0 + 2 * H);
    // afterwards everything still gets fired: 8 batches of 20
    const done = advance(b, T0 + 40 * H);
    expect(done.masterworks).toHaveLength(1);
    expect(done.goods.reduce((n, g) => n + g.count, 0)).toBe(160);
    expect(done.batches).toHaveLength(0);
  });

  it('finishing without a commission keeps the piece, pays nothing and brings a new patron', () => {
    const s = manufakturGame();
    s.commission = null;
    const b = { ...waiting(s, 'm', 'glazeFire', 1, true), startedAt: T0, durationMs: 4 * H };
    s.batches = [b];
    const taler = s.taler, ruf = s.ruf;
    finishMasterwork(s, b, T0 + 4 * H);
    expect(s.batches).toHaveLength(0);
    expect(s.masterworks).toHaveLength(1);
    expect(s.masterworks[0]).toMatchObject({ commissionId: '', prestige: 'bronze', met: 0, total: 0, finishedAt: T0 + 4 * H });
    expect(s.masterworks[0].reward).toBeUndefined();
    expect(s.taler).toBe(taler);
    expect(s.ruf).toBe(ruf);
    expect(s.commission).not.toBeNull();
    // and without its design: no record, but still a commission
    const t = manufakturGame();
    t.commission = null;
    const lost = { ...waiting(t, 'm', 'glazeFire', 1, true), designId: 'gone' };
    t.batches = [lost];
    finishMasterwork(t, lost, T0);
    expect(t.batches).toHaveLength(0);
    expect(t.masterworks).toHaveLength(0);
    expect(t.commission).not.toBeNull();
  });

  it('a masterwork takes half the kiln', () => {
    const s = manufakturGame();
    expect(MASTERWORK_KILN_SHARE).toBe(0.5);
    expect(kilnLoad(s, waiting(s, 'm', 'bisque', 1, true))).toBe(Math.ceil(kilnCapacity(s) / 2));
    expect(kilnLoad(s, waiting(s, 'n', 'bisque', 5))).toBe(5);
  });

  it('finishing pays by prestige, records it, fills the book and brings a harder commission after two', () => {
    let s = manufakturGame(5);
    s.glazes.push(structuredClone(OELFLECK));
    s.unlocks = s.unlocks.filter((u) => u !== 'schale' && u !== 'teller');
    s.stallDesignIds = [];
    s.commission = generateCommission(s);
    let t = T0;
    for (let i = 0; i < 3; i++) {
      const c = s.commission!;
      const d = solve(s, c);
      s.designs.push(d);
      const predicted = predictMasterwork(s, d);
      expect(predicted.met.every(Boolean)).toBe(true);
      s = ok(s, { type: 'startMasterwork', designId: d.id }, t);
      const taler = s.taler, ruf = s.ruf, made = s.stats.made;
      t += 18 * H;
      s = advance(s, t);
      expect(s.masterworks).toHaveLength(i + 1);
      const m = s.masterworks[i];
      expect(m).toMatchObject({ commissionId: c.id, patronName: c.patronName, prestige: predicted.prestige, quality: predicted.quality, met: c.criteria.length, total: c.criteria.length, finishedAt: t, acked: false });
      expect(m.prestige).toBe(prestigeFor(c.criteria.length, c.criteria.length, predicted.quality));
      expect(m.design).toEqual(d);
      expect(m.glazeColor).toBe(s.glazes.find((g) => g.id === d.glazeId)!.color);
      expect(m.effect).toBe(s.glazes.find((g) => g.id === d.glazeId)!.effect);
      expect(s.taler).toBe(taler + Math.round(c.rewardTaler * PRESTIGE_MUL[m.prestige]));
      expect(s.ruf).toBe(ruf + Math.round(c.rewardRuf * PRESTIGE_MUL[m.prestige]));
      expect(m.reward).toEqual({ taler: Math.round(c.rewardTaler * PRESTIGE_MUL[m.prestige]), ruf: Math.round(c.rewardRuf * PRESTIGE_MUL[m.prestige]) });
      expect(s.stats.made).toBe(made + 1);
      expect(s.collection).toContain(collectionKey(d.form, bodyOf(d), m.effect));
      expect(s.batches).toHaveLength(0);
      expect(s.goods).toHaveLength(0);
      expect(s.commission!.id).not.toBe(c.id);
      expect(s.commission!.costTaler).toBe(3000 + 1500 * (i + 1));
    }
    // only tall forms are unlocked, so the third commission has at least four candidates
    expect(s.masterworks).toHaveLength(3);
    const third = s.masterworks[2];
    expect(third.total).toBe(4);
    s = ok(s, { type: 'ackMasterwork', id: third.id }, t);
    expect(s.masterworks[2].acked).toBe(true);
    expect(s.masterworks[0].acked).toBe(false);
  });

  it('[Review Focus 5] one-bay wheel: the masterwork goes first, the normal batch waits 4 h, then runs', () => {
    const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null; s.stallDesignIds = [];
    s.batches = [waiting(s, 'n', 'form', 6), waiting(s, 'm', 'form', 1, true)];
    startWork(s, T0);
    expect(s.batches.find((b) => b.id === 'm')!.startedAt).toBe(T0);
    expect(s.batches.find((b) => b.id === 'n')!.startedAt).toBeNull();
    const a = advance(s, T0 + 4 * H + 1);
    expect(a.batches.find((b) => b.id === 'n')!.startedAt).toBe(T0 + 4 * H);
    expect(a.batches.find((b) => b.id === 'm')!.stage).toBe('dry');
    const done = advance(a, T0 + 30 * H);
    expect(done.masterworks).toHaveLength(1);
    expect(done.goods.reduce((n, g) => n + g.count, 0)).toBe(6);
  });

  it("[Review Focus 5] kiln: a full-capacity batch waits for the masterwork's share, nothing spins", () => {
    const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null; s.stallDesignIds = [];
    s.batches = [waiting(s, 'n', 'bisque', kilnCapacity(s)), waiting(s, 'm', 'bisque', 1, true)];
    const t = performance.now();
    const mid = advance(s, T0 + 1);
    expect(mid.batches.find((b) => b.id === 'm')!.startedAt).toBe(T0);
    expect(mid.batches.find((b) => b.id === 'n')!.startedAt).toBeNull();
    const a = advance(s, T0 + 30 * H);
    expect(performance.now() - t).toBeLessThan(200);
    expect(a.masterworks.length).toBe(1);
    expect(a.goods.reduce((n, g) => n + g.count, 0)).toBe(kilnCapacity(s));
    expect(a.batches).toHaveLength(0);
  });

  it('[Review Focus 5] a small batch fires next to the masterwork in the kiln', () => {
    const s = manufakturGame(); s.commission = generateCommission(s); s.standing = null; s.stallDesignIds = [];
    s.batches = [waiting(s, 'm', 'bisque', 1, true), waiting(s, 'n', 'bisque', kilnCapacity(s) - Math.ceil(kilnCapacity(s) / 2))];
    startWork(s, T0);
    expect(s.batches.every((b) => b.startedAt === T0)).toBe(true);
  });

  it('the standing order ignores the masterwork when keeping the pipeline fed', () => {
    const s = manufakturGame(); s.commission = generateCommission(s); s.stallDesignIds = [];
    s.standing = { designId: s.designs[0].id, batchSize: 6, autoBuy: true };
    s.batches = [waiting(s, 'm', 'prepare', 1, true)];
    startWork(s, T0);
    expect(s.batches.filter((b) => !b.masterwork)).toHaveLength(1);
  });

  it('swap costs 250 and is locked while a masterwork is in progress; handTouch cannot rush it', () => {
    const s = manufakturGame();
    const c0 = generateCommission(s);
    s.commission = c0;
    const swapped = ok(s, { type: 'swapCommission' });
    expect(COMMISSION_SWAP_COST).toBe(250);
    expect(swapped.taler).toBe(s.taler - 250);
    expect(swapped.commission!.id).not.toBe(c0.id);
    const poor = structuredClone(s); poor.taler = 249;
    expect(rejected(poor, { type: 'swapCommission' })).toMatch(/Taler/);
    expect(rejected(plainGame(), { type: 'swapCommission' })).toMatch(/ab der Manufaktur/);

    const started = ok(swapped, { type: 'startMasterwork', designId: swapped.designs[0].id });
    expect(rejected(started, { type: 'swapCommission' })).toMatch(/bleibt der Auftrag/);
    const running = advance(started, NOW + 1000);
    const mw = masterworkInProgress(running)!;
    expect(mw.startedAt).toBe(NOW);
    expect(mw.durationMs).toBe(H);
    expect(rejected(running, { type: 'handTouch', stationId: mw.stationId! }, NOW + 1000)).toMatch(/nicht hetzen/);

    // with a second bay, a normal batch next to it is rushed and the masterwork is not
    const two = structuredClone(started);
    const bench = two.stations.find((x) => x.kind === 'prepBench')!;
    bench.level = 6;
    two.batches.push(waiting(two, 'n', 'prepare', 6));
    const both = advance(two, NOW + 1000);
    const nBefore = both.batches.find((b) => b.id === 'n')!.durationMs;
    const touched = ok(both, { type: 'handTouch', stationId: bench.id }, NOW + 1000);
    expect(masterworkInProgress(touched)!.durationMs).toBe(H);
    expect(touched.batches.find((b) => b.id === 'n')!.durationMs).toBeLessThan(nBefore);
  });

  it('reaching the Manufaktur brings the first commission', () => {
    const s = plainGame(); s.ruf = 300; s.taler = getTier('manufaktur').price;
    const a = ok(s, { type: 'upgradeTier' });
    expect(a.commission).not.toBeNull();
    expect(a.commission!.criteria.length).toBe(3);
  });
});

describe('masterworks and the great kiln', () => {
  const fakeRecord = (s: GameState) => ({ id: 'x', commissionId: 'c', patronName: 'p', design: s.designs[0], glazeColor: '#fff', effect: null, quality: 2 as const, met: 3, total: 3, prestige: 'silver' as const, finishedAt: 0, acked: true });
  const KILN_FX = ['ascheanflug', 'flammenspur', 'ascheglasur'];

  it('criteriaMet accepts either the glaze effect or the kiln effect', () => {
    const s = manufakturGame();
    s.glazes.push(structuredClone(OELFLECK));
    const d = stonewareBecher(s);
    d.glazeId = 'oel';
    const c: Commission = { ...generateCommission(s), criteria: [{ kind: 'effect', effect: 'oelfleck' }, { kind: 'effect', effect: 'ascheglasur' }] };
    expect(criteriaMet(s, d, c)).toEqual([true, false]);
    expect(criteriaMet(s, d, c, 'ascheglasur')).toEqual([true, true]);
    expect(criteriaMet(s, d, c, 'flammenspur')).toEqual([true, false]);
    d.glazeId = 'klar-steinzeug';
    expect(criteriaMet(s, d, c, 'ascheglasur')).toEqual([false, true]);
  });

  it('commissions name a great-kiln effect only with a kiln in the village and the effect found', () => {
    const setup = (seed: number, kiln: boolean, found: boolean) => {
      const s = manufakturGame(seed);
      s.glazes.push(structuredClone(OELFLECK));
      s.masterworks = [fakeRecord(s), fakeRecord(s), fakeRecord(s)];
      if (found) s.collection.push('becher|irdenware|flammenspur');
      s.village = { villageId: 'v', specialty: null, buildings: kiln ? ['gemeinschaftsofen'] : [], helpBoostUntil: 0, trickleCarry: 0, members: 2 };
      return s;
    };
    const kilnEffects = (c: Commission) => c.criteria.filter((x) => x.kind === 'effect' && KILN_FX.includes(x.effect));
    let flammenspur = 0;
    for (let seed = 1; seed <= 200; seed++) {
      expect(kilnEffects(generateCommission(setup(seed, false, true)))).toEqual([]);
      expect(kilnEffects(generateCommission(setup(seed, true, false)))).toEqual([]);
      // no rng is drawn without kiln or find: the sequence is unchanged
      const a = setup(seed, false, true), b = setup(seed, true, false), base = setup(seed, false, false);
      generateCommission(a); generateCommission(b); generateCommission(base);
      expect(a.rng).toBe(base.rng);
      expect(b.rng).toBe(base.rng);
      const found = kilnEffects(generateCommission(setup(seed, true, true)));
      expect(found.every((x) => x.kind === 'effect' && x.effect === 'flammenspur')).toBe(true);
      if (found.length > 0) flammenspur++;
    }
    expect(flammenspur).toBeGreaterThan(20);
    expect(flammenspur).toBeLessThan(90);
    // too early in the patron line: no kiln wishes
    for (let seed = 1; seed <= 50; seed++) {
      const s = setup(seed, true, true);
      s.masterworks = s.masterworks.slice(0, 2);
      expect(kilnEffects(generateCommission(s))).toEqual([]);
    }
    // without a kiln the commissions for a fixed seed are exactly what they were before
    const s = setup(11, false, true);
    const criteria = [0, 1, 2, 3].map(() => generateCommission(s).criteria);
    expect(criteria).toEqual([
      [{ kind: 'form', form: 'krug' }, { kind: 'tall', tall: true }, { kind: 'pattern', pattern: 'leaves' }, { kind: 'color', colorFamily: 'gelb' }],
      [{ kind: 'form', form: 'teller' }, { kind: 'pattern', pattern: 'waves' }, { kind: 'color', colorFamily: 'gelb' }],
      [{ kind: 'form', form: 'becher' }, { kind: 'tall', tall: true }, { kind: 'pattern', pattern: 'leaves' }, { kind: 'color', colorFamily: 'gelb' }],
      [{ kind: 'form', form: 'vase' }, { kind: 'tall', tall: true }, { kind: 'pattern', pattern: 'leaves' }, { kind: 'color', colorFamily: 'gelb' }],
    ]);
    expect(s.rng).toBe(624259381);
  });

  it('a masterwork in the great kiln blocks starting another and swapping the commission', () => {
    const s = manufakturGame();
    s.commission = generateCommission(s);
    s.kilnMasterwork = { designId: s.designs[0].id, firingId: 'k1' };
    expect(masterworkBusy(s)).toBe(true);
    expect(rejected(s, { type: 'startMasterwork', designId: s.designs[0].id })).toMatch(/schon ein Meisterstück/);
    expect(rejected(s, { type: 'swapCommission' })).toMatch(/bleibt der Auftrag/);
    s.kilnMasterwork = null;
    expect(masterworkBusy(s)).toBe(false);
  });
});
