import type { LocalTime, SurpriseEnv } from './types';

const STORE_KEY = 'mf_surprises';
const ALBUM_SEEN_KEY = 'mf_album_seen';

export interface BrowserEnv extends SurpriseEnv {
  /** Server time of the last album visit (0 if never), so the wall cabinet can sparkle for newer entries. */
  albumSeen: { load(): number; save(t: number): void };
}

const media = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;
const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

/**
 * The only place surprise code touches the clock, randomness, media queries, the document or localStorage.
 * Every access is guarded, so it is safe under node (tests, prerender).
 */
export function browserEnv(): BrowserEnv {
  return {
    now: () => Date.now(),
    random: () => Math.random(),
    local: (t: number): LocalTime => {
      const d = new Date(t);
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    },
    visible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    touch: () => media('(pointer: coarse)'),
    reducedMotion: () => media('(prefers-reduced-motion: reduce)'),
    store: {
      load: () => {
        try { return JSON.parse(storage()?.getItem(STORE_KEY) ?? '{}') as Record<string, number>; } catch { return {}; }
      },
      save: (v) => { try { storage()?.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* ignore */ } },
    },
    albumSeen: {
      load: () => {
        try { return Number(storage()?.getItem(ALBUM_SEEN_KEY) ?? 0) || 0; } catch { return 0; }
      },
      save: (t) => { try { storage()?.setItem(ALBUM_SEEN_KEY, String(t)); } catch { /* ignore */ } },
    },
  };
}
