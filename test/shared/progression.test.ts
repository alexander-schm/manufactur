import { describe, expect, it } from 'vitest';
import { applyAction, type Action } from '../../src/shared/actions';
import { advance } from '../../src/shared/advance';
import { getForm } from '../../src/shared/content';
import { shelfCapacity } from '../../src/shared/market';
import { checkMilestones, MILESTONES, touchSeen } from '../../src/shared/progression';
import type { GameState } from '../../src/shared/types';
import { plainGame, T0 } from './helpers';

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
