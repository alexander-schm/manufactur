import type { ClickTarget, Play, Rarity, SurpriseCtx, SurpriseDef, SurpriseEnv, Where } from './types';

const MIN = 60_000;
export const CHANCE: Record<Rarity, number> = { C: 0.06, R: 0.01, L: 0.0008 };
export const UNDISCOVERED_BOOST = 2;
export const COOLDOWN: Record<Rarity, number> = { C: 20 * MIN, R: 6 * 60 * MIN, L: 3 * 24 * 60 * MIN };
export const ROLL_MS: [number, number] = [60_000, 120_000];

export interface Scheduler {
  /** True when plays or the calendar set changed. */
  tick(c: SurpriseCtx): boolean;
  click(target: ClickTarget, c: SurpriseCtx, data?: Play['data']): Play | null;
  force(id: string, c: SurpriseCtx): Play | null;
  plays(): Play[];
  calendar(): string[];
}

interface Opts {
  where: Where[]; firstRollMs: [number, number];
  onStart?: (p: Play, album: string | null) => void;
}

export function createScheduler(defs: SurpriseDef[], env: SurpriseEnv, opts: Opts): Scheduler {
  const mine = defs.filter((d) => opts.where.includes(d.where));
  const byId = new Map(defs.map((d) => [d.id, d]));
  let plays: Play[] = [];
  let calendar: string[] = [];
  const calendarSeen = new Set<string>();
  const clicks = new Map<ClickTarget, number[]>();
  const comboLock = new Map<ClickTarget, number>();
  const span = (r: [number, number]) => r[0] + env.random() * (r[1] - r[0]);
  let nextRollAt = env.now() + span(opts.firstRollMs);

  const cooldownOf = (d: SurpriseDef, dflt: number) => d.cooldownMs ?? dflt;
  // Storage can throw (private mode, quota); the in-memory copy keeps cooldowns working in-session.
  const mem: Record<string, number> = {};
  const loadStore = (): Record<string, number> => {
    let stored: Record<string, number> = {};
    try { stored = env.store.load(); } catch { /* fall back to memory */ }
    return { ...stored, ...mem };
  };
  const offCooldown = (d: SurpriseDef, now: number, dflt: number, store: Record<string, number>) => {
    const last = store[d.id];
    return last === undefined || last + cooldownOf(d, dflt) <= now;
  };
  const albumOf = (d: SurpriseDef, c: SurpriseCtx) => (d.pickAlbum ? d.pickAlbum(c) : (d.album[0] ?? null));

  function start(d: SurpriseDef, c: SurpriseCtx, held: boolean, data?: Play['data']): Play {
    const play: Play = {
      id: d.id, startedAt: c.now, until: held ? Infinity : c.now + d.durationMs,
      seed: Math.floor(env.random() * 2 ** 32), held,
    };
    if (data) play.data = data;
    plays = plays.filter((p) => p.id !== d.id).concat(play);
    mem[d.id] = c.now;
    try { env.store.save(loadStore()); } catch { /* memory copy still holds */ }
    opts.onStart?.(play, albumOf(d, c));
    return play;
  }

  function roll(c: SurpriseCtx): Play | null {
    const store = loadStore();
    const eligible = mine.filter((d) => d.trigger.kind === 'ambient' && (!d.when || d.when(c)) && offCooldown(d, c.now, COOLDOWN[d.rarity], store));
    const weights = eligible.map((d) => CHANCE[d.rarity] * (d.album.some((a) => c.s.curiosities[a] !== undefined) ? 1 : UNDISCOVERED_BOOST));
    const sum = weights.reduce((a, b) => a + b, 0);
    const scale = sum > 1 ? 1 / sum : 1;
    const r = env.random();
    let acc = 0;
    for (let i = 0; i < eligible.length; i++) {
      acc += weights[i]! * scale;
      if (r < acc) return start(eligible[i]!, c, false);
    }
    return null;
  }

  return {
    tick(c) {
      let changed = false;
      const alive = plays.filter((p) => p.until > c.now);
      if (alive.length !== plays.length) { plays = alive; changed = true; }
      if (!env.visible()) return changed;

      const active = mine.filter((d) => d.trigger.kind === 'calendar' && (!d.when || d.when(c))).map((d) => d.id);
      if (active.length !== calendar.length || active.some((id, i) => id !== calendar[i])) { calendar = active; changed = true; }
      for (const id of active) {
        if (calendarSeen.has(id)) continue;
        calendarSeen.add(id);
        const d = byId.get(id)!;
        opts.onStart?.({ id, startedAt: c.now, until: Infinity, seed: 0, held: false }, albumOf(d, c));
      }

      const ambientRunning = plays.some((p) => byId.get(p.id)?.trigger.kind === 'ambient');
      if (c.now >= nextRollAt && !ambientRunning) {
        if (roll(c)) changed = true;
        nextRollAt = c.now + span(ROLL_MS);
      }
      return changed;
    },

    click(target, c, data) {
      const lock = comboLock.get(target);
      if (lock !== undefined && lock > c.now) return null;
      const store = loadStore();
      const cands = mine.filter((d) => d.trigger.kind === 'click' && d.trigger.target === target
        && (!d.when || d.when(c)) && offCooldown(d, c.now, 0, store));
      const maxWindow = Math.max(0, ...cands.map((d) => (d.trigger.kind === 'click' && d.trigger.combo?.withinMs) || 0));
      const times = (clicks.get(target) ?? []).filter((t) => t > c.now - maxWindow).concat(c.now);
      clicks.set(target, times);

      const combo = cands.find((d) => {
        const cb = d.trigger.kind === 'click' ? d.trigger.combo : undefined;
        return cb && times.filter((t) => t > c.now - cb.withinMs).length >= cb.count;
      });
      if (combo) {
        clicks.set(target, []);
        const play = start(combo, c, false, data);
        comboLock.set(target, play.until);
        return play;
      }
      const plain = cands.find((d) => d.trigger.kind === 'click' && !d.trigger.combo);
      return plain ? start(plain, c, false, data) : null;
    },

    force(id, c) {
      const d = byId.get(id);
      return d ? start(d, c, true) : null;
    },

    plays: () => plays,
    calendar: () => calendar,
  };
}
