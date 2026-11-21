import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameState } from '../../shared/types';
import { dispatch } from '../store';
import { moodAt } from './calendar';
import { SURPRISES } from './defs';
import { browserEnv, devFlags, type BrowserEnv, type DevFlags } from './env';
import { createScheduler, type Scheduler } from './scheduler';
import type { SurpriseCtx, SurpriseView, Where } from './types';

const AREAS: Record<'workshop' | 'village', { where: Where[]; firstRollMs: [number, number] }> = {
  workshop: { where: ['workshop', 'window'], firstRollMs: [20_000, 40_000] },
  village: { where: ['village'], firstRollMs: [3_000, 8_000] },
};
const TICK_MS = 1000;

/** Album ids this page has already sent, so a second play (or a second scene) never sends again. */
const SENT = new Set<string>();

/** Record a first discovery only at home, once, and only when the server doesn't have it yet. */
export function shouldRecord(album: string | null, s: GameState, readOnly: boolean, sent: Set<string>): album is string {
  return !!album && !readOnly && s.curiosities?.[album] === undefined && !sent.has(album);
}

/**
 * Runs a surprise scheduler for the workshop (incl. the window) or the village map.
 * Ticks once a second, re-renders only when something changed, and records first discoveries quietly.
 */
export function useSurprises(area: 'workshop' | 'village', s: GameState, readOnly: boolean): SurpriseView {
  const live = useRef({ s, readOnly });
  live.current = { s, readOnly };
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  const ref = useRef<{ env: BrowserEnv; flags: DevFlags; sx: Scheduler } | null>(null);
  if (!ref.current) {
    const env = browserEnv();
    const sx = createScheduler(SURPRISES, env, {
      ...AREAS[area],
      onStart: (_play, album) => {
        const { s: cur, readOnly: ro } = live.current;
        if (!shouldRecord(album, cur, ro, SENT)) return;
        SENT.add(album);
        void dispatch({ type: 'discoverCuriosity', id: album }, { quiet: true });
      },
    });
    ref.current = { env, flags: devFlags(), sx };
  }
  const { env, flags, sx } = ref.current;

  const ctx = (): SurpriseCtx => {
    const { s: cur, readOnly: ro } = live.current;
    const now = env.now();
    const local = env.local(now);
    const mood = moodAt(local, env.local(cur.createdAt));
    if (flags.rain) mood.rain = true;
    return { s: cur, now, local, mood, readOnly: ro, touch: env.touch(), reducedMotion: env.reducedMotion() };
  };

  useEffect(() => {
    const forced = flags.force && SURPRISES.find((d) => d.id === flags.force && AREAS[area].where.includes(d.where));
    if (forced && sx.force(forced.id, ctx())) bump();
    const t = setInterval(() => { if (sx.tick(ctx())) bump(); }, TICK_MS);
    return () => clearInterval(t);
  }, []);

  const c = ctx();
  const plays = sx.plays();
  return {
    plays, calendar: sx.calendar(), mood: c.mood, local: c.local, now: c.now, created: env.local(c.s.createdAt),
    still: c.reducedMotion || plays.some((p) => p.held),
    touch: c.touch, readOnly,
    click: (target, data) => { if (sx.click(target, ctx(), data)) bump(); },
  };
}
