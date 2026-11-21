import { describe, expect, it } from 'vitest';
import { COOLDOWN, createScheduler } from '../../src/client/surprises/scheduler';
import type { Play, SurpriseCtx, SurpriseDef, SurpriseEnv } from '../../src/client/surprises/types';
import { plainGame } from '../shared/helpers';

const T0 = Date.UTC(2026, 5, 1, 12, 0, 0);
const MIN = 60_000, HOUR = 60 * MIN;

function fakeEnv(o: { now?: number; randoms?: number[]; store?: Record<string, number> } = {}) {
  const st = { now: o.now ?? T0, visible: true, randoms: [...(o.randoms ?? [])], data: o.store ?? {} };
  const env: SurpriseEnv = {
    now: () => st.now,
    random: () => (st.randoms.length ? st.randoms.shift()! : 0.999),
    local: (t) => { const d = new Date(t); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() }; },
    visible: () => st.visible, touch: () => false, reducedMotion: () => false,
    store: { load: () => ({ ...st.data }), save: (v) => { st.data = { ...v }; } },
  };
  return { env, st };
}
function ctx(now: number, over: Partial<SurpriseCtx> & { daypart?: SurpriseCtx['mood']['daypart'] } = {}): SurpriseCtx {
  const { daypart, ...rest } = over;
  const { env } = fakeEnv();
  return {
    s: plainGame(), now, local: env.local(now),
    mood: { daypart: daypart ?? 'day', december: false, newYear: false, birthday: false, rain: false },
    readOnly: false, touch: false, reducedMotion: false, ...rest,
  };
}
const ambient = (id: string, extra: Partial<SurpriseDef> = {}): SurpriseDef => ({
  id, where: 'workshop', trigger: { kind: 'ambient' }, rarity: 'C', durationMs: 5_000, album: [id], ...extra,
});
const opts = { where: ['workshop' as const], firstRollMs: [20_000, 40_000] as [number, number] };

describe('surprise scheduler', () => {
  it('first ambient roll comes inside the first-roll window; the 20-minute cooldown then blocks the next roll', () => {
    // randoms: first-roll timing, roll, seed, next-roll timing
    const { env } = fakeEnv({ randoms: [0, 0, 0.5, 0] });
    const sx = createScheduler([ambient('a', { durationMs: 1_000 })], env, opts);
    expect(sx.tick(ctx(T0 + 19_999))).toBe(false);
    expect(sx.plays()).toEqual([]);
    expect(sx.tick(ctx(T0 + 20_000))).toBe(true);
    expect(sx.plays().map((p) => p.id)).toEqual(['a']);
    expect(sx.plays()[0]!.seed).toBe(2 ** 31);
    sx.tick(ctx(T0 + 21_000)); // play ended
    expect(sx.plays()).toEqual([]);
    expect(sx.tick(ctx(T0 + 79_999))).toBe(false);
    sx.tick(ctx(T0 + 80_000)); // roll is due, but 'a' is on cooldown
    expect(sx.plays()).toEqual([]);
  });

  it('second roll happens 60 s after the first when off cooldown', () => {
    const { env } = fakeEnv({ randoms: [0, 0, 0.5, 0, 0, 0.5] });
    const sx = createScheduler([ambient('a', { durationMs: 1_000, cooldownMs: 1 })], env, opts);
    sx.tick(ctx(T0 + 20_000));
    sx.tick(ctx(T0 + 21_000));
    expect(sx.tick(ctx(T0 + 79_999))).toBe(false);
    expect(sx.tick(ctx(T0 + 80_000))).toBe(true);
    expect(sx.plays().map((p) => p.id)).toEqual(['a']);
  });

  it('conditions gate ambient defs (owl only at night)', () => {
    const owl = ambient('owl', { when: (c) => c.mood.daypart === 'night' });
    const day = createScheduler([owl], fakeEnv({ randoms: [0, 0] }).env, opts);
    day.tick(ctx(T0 + 20_000, { daypart: 'day' }));
    expect(day.plays()).toEqual([]);
    const night = createScheduler([owl], fakeEnv({ randoms: [0, 0] }).env, opts);
    night.tick(ctx(T0 + 20_000, { daypart: 'night' }));
    expect(night.plays().map((p) => p.id)).toEqual(['owl']);
  });

  it('a common surprise waits out its 20-minute cooldown, also across a new scheduler with the same store', () => {
    expect(COOLDOWN.C).toBe(20 * MIN);
    const { env, st } = fakeEnv({ randoms: [0, 0] });
    const a = createScheduler([ambient('a')], env, opts);
    a.tick(ctx(T0 + 20_000));
    expect(a.plays()).toHaveLength(1);
    expect(st.data.a).toBe(T0 + 20_000);
    // a fresh scheduler (page reload) reads the same store
    st.now = T0 + 30_000; st.randoms = [0, 0];
    const b = createScheduler([ambient('a')], env, opts);
    b.tick(ctx(T0 + 60_000));
    expect(b.plays()).toEqual([]);
    st.randoms = [0, 0];
    const c = createScheduler([ambient('a')], env, opts);
    c.tick(ctx(T0 + 20_000 + 20 * MIN + 30_000));
    expect(c.plays().map((p) => p.id)).toEqual(['a']);
  });

  it('at most one ambient play at a time', () => {
    const { env } = fakeEnv({ randoms: [0, 0, 0, 0, 0] });
    const sx = createScheduler([ambient('a', { durationMs: 10 * MIN }), ambient('b', { durationMs: 10 * MIN })], env, opts);
    sx.tick(ctx(T0 + 20_000));
    expect(sx.plays()).toHaveLength(1);
    sx.tick(ctx(T0 + 5 * MIN)); // roll is due but a play still runs
    expect(sx.plays()).toHaveLength(1);
    expect(sx.plays()[0]!.id).toBe('a');
  });

  it('undiscovered surprises are twice as likely', () => {
    const run = (found: boolean) => {
      const sx = createScheduler([ambient('a')], fakeEnv({ randoms: [0, 0.07] }).env, opts);
      const s = plainGame();
      if (found) s.curiosities.a = T0;
      sx.tick(ctx(T0 + 20_000, { s }));
      return sx.plays().length;
    };
    expect(run(false)).toBe(1); // band 0.12
    expect(run(true)).toBe(0); // band 0.06
  });

  it('[Review Focus 3] after three hidden hours, becoming visible plays at most once and reschedules', () => {
    const { env, st } = fakeEnv({ randoms: [0] });
    const plays: Play[] = [];
    const sx = createScheduler([ambient('a', { durationMs: 1_000, cooldownMs: 1 }), ambient('b', { durationMs: 1_000, cooldownMs: 1 })],
      env, { ...opts, onStart: (p) => plays.push(p) });
    st.visible = false;
    st.randoms = [];
    for (let t = 0; t <= 3 * HOUR; t += 1_000) { st.now = T0 + t; sx.tick(ctx(st.now)); }
    expect(plays).toHaveLength(0);
    st.visible = true;
    // 0.5 hits a CHANCE band for neither def, so use 0 for the roll, then seed, then next-roll timing 0
    st.randoms = [0, 0.5, 0];
    const back = T0 + 3 * HOUR;
    st.now = back; sx.tick(ctx(back));
    expect(plays).toHaveLength(1);
    // keep ticking every second: no burst, nothing new until ≥ 60 s later
    st.randoms = [0, 0.5, 0.5];
    for (let t = 1_000; t < 60_000; t += 1_000) { st.now = back + t; sx.tick(ctx(st.now)); }
    expect(plays).toHaveLength(1);
    st.now = back + 60_000; sx.tick(ctx(st.now));
    expect(plays).toHaveLength(2);
  });

  it('five cat clicks within 4 s play the combo; more clicks are ignored until it ends', () => {
    const pet: SurpriseDef = { id: 'pet', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 1_000, album: ['pet'] };
    const swat: SurpriseDef = { ...pet, id: 'swat', trigger: { kind: 'click', target: 'cat', combo: { count: 5, withinMs: 4_000 } }, durationMs: 3_000, album: ['swat'] };
    const sx = createScheduler([pet, swat], fakeEnv().env, opts);
    const at = (ms: number) => sx.click('cat', ctx(T0 + ms));
    expect([at(0), at(500), at(1000), at(1500)].map((p) => p?.id)).toEqual(['pet', 'pet', 'pet', 'pet']);
    const fifth = at(2000);
    expect(fifth?.id).toBe('swat');
    expect(at(2500)).toBeNull();
    expect(at(4999)).toBeNull();
    expect(at(2000 + fifth!.until - fifth!.startedAt)?.id).toBe('pet');
  });

  it('clicks outside the combo window do not add up', () => {
    const pet: SurpriseDef = { id: 'pet', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 100, album: ['pet'] };
    const swat: SurpriseDef = { ...pet, id: 'swat', trigger: { kind: 'click', target: 'cat', combo: { count: 3, withinMs: 1_000 } } };
    const sx = createScheduler([pet, swat], fakeEnv().env, opts);
    const ids = [0, 600, 1200, 1800, 2400].map((t) => sx.click('cat', ctx(T0 + t))?.id);
    expect(ids).toEqual(['pet', 'pet', 'pet', 'pet', 'pet']);
  });

  it('a click carries data into the play (radio station) and replaces a running play of the same id', () => {
    const radio: SurpriseDef = { id: 'radio', where: 'workshop', trigger: { kind: 'click', target: 'radio' }, rarity: 'C', durationMs: 5_000, album: ['radio'] };
    const sx = createScheduler([radio], fakeEnv().env, opts);
    const a = sx.click('radio', ctx(T0), { station: 2 });
    expect(a?.data).toEqual({ station: 2 });
    const b = sx.click('radio', ctx(T0 + 1_000), { station: 3 });
    expect(b?.data).toEqual({ station: 3 });
    expect(sx.plays()).toEqual([b]);
    expect(sx.click('radio', ctx(T0 + 2_000))?.data).toBeUndefined();
    expect(sx.click('kettle', ctx(T0))).toBeNull();
  });

  it('force holds a play until cleared, ignoring conditions and cooldown', () => {
    const owl = ambient('owl', { when: () => false });
    const { env } = fakeEnv({ store: { owl: T0 } });
    const sx = createScheduler([owl], env, opts);
    const p = sx.force('owl', ctx(T0 + 1_000))!;
    expect(p.held).toBe(true);
    expect(p.until).toBe(Infinity);
    sx.tick(ctx(T0 + 10 * HOUR));
    expect(sx.plays()).toEqual([p]);
    expect(sx.force('nope', ctx(T0))).toBeNull();
  });

  it('calendar defs report while active and call onStart once per session', () => {
    let december = true;
    const cal: SurpriseDef = { id: 'dez', where: 'window', trigger: { kind: 'calendar' }, rarity: 'C', durationMs: 0, album: ['dezember'], when: () => december };
    const started: Array<[string, string | null]> = [];
    const sx = createScheduler([cal], fakeEnv().env, { where: ['window'], firstRollMs: [1, 2], onStart: (p, a) => started.push([p.id, a]) });
    expect(sx.tick(ctx(T0))).toBe(true);
    expect(sx.calendar()).toEqual(['dez']);
    expect(sx.tick(ctx(T0 + 1_000))).toBe(false);
    expect(started).toEqual([['dez', 'dezember']]);
    december = false;
    expect(sx.tick(ctx(T0 + 2_000))).toBe(true);
    expect(sx.calendar()).toEqual([]);
    december = true;
    sx.tick(ctx(T0 + 3_000));
    expect(sx.calendar()).toEqual(['dez']);
    expect(started).toHaveLength(1);
  });

  it('onStart gets pickAlbum’s id when present', () => {
    const maus = ambient('maus', { album: ['maus-a', 'maus-b'], pickAlbum: () => 'maus-b' });
    const started: Array<string | null> = [];
    const sx = createScheduler([maus, ambient('plain', { album: ['x', 'y'] })], fakeEnv({ randoms: [0, 0] }).env, { ...opts, onStart: (_p, a) => started.push(a) });
    sx.tick(ctx(T0 + 20_000));
    expect(started).toEqual(['maus-b']);
    const sy = createScheduler([ambient('plain', { album: ['x', 'y'] })], fakeEnv({ randoms: [0, 0] }).env, { ...opts, onStart: (_p, a) => started.push(a) });
    sy.tick(ctx(T0 + 20_000));
    expect(started).toEqual(['maus-b', 'x']);
  });

  it('weights above 1 are scaled to sum 1', () => {
    // many undiscovered C defs: 20 × 0.12 = 2.4 → scaled; random 0.999 still lands in the last band
    const defs = Array.from({ length: 20 }, (_, i) => ambient(`d${i}`));
    const sx = createScheduler(defs, fakeEnv({ randoms: [0, 0.999] }).env, opts);
    sx.tick(ctx(T0 + 20_000));
    expect(sx.plays().map((p) => p.id)).toEqual(['d19']);
  });

  it('a throwing store neither breaks tick/click nor loses onStart; the cooldown holds in-session', () => {
    const { env } = fakeEnv({ randoms: [0, 0, 0, 0, 0, 0] });
    env.store = { load: () => { throw new Error('denied'); }, save: () => { throw new Error('quota'); } };
    const started: string[] = [];
    const pet: SurpriseDef = { id: 'pet', where: 'workshop', trigger: { kind: 'click', target: 'cat' }, rarity: 'C', durationMs: 100, cooldownMs: 10_000, album: ['pet'] };
    const sx = createScheduler([ambient('a', { durationMs: 1_000 }), pet], env, { ...opts, onStart: (p) => started.push(p.id) });
    expect(() => sx.tick(ctx(T0 + 20_000))).not.toThrow();
    expect(started).toEqual(['a']);
    sx.tick(ctx(T0 + 22_000)); // play ended; next roll not yet due
    sx.tick(ctx(T0 + 80_000)); // roll due, but 'a' is on cooldown (memory fallback)
    expect(sx.plays()).toEqual([]);
    expect(() => sx.click('cat', ctx(T0 + 100_000))).not.toThrow();
    expect(started).toEqual(['a', 'pet']);
    expect(sx.click('cat', ctx(T0 + 101_000))).toBeNull(); // click cooldown holds too
    expect(sx.click('cat', ctx(T0 + 110_001))?.id).toBe('pet');
  });
});
