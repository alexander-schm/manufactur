import { serverTime } from '../store';
import type { LocalTime, SurpriseEnv } from './types';

const STORE_KEY = 'mf_surprises_v1';
const ALBUM_SEEN_KEY = 'mf_album_seen';

export interface BrowserEnv extends SurpriseEnv {
  /** Server time of the last album visit (0 if never), so the wall cabinet can sparkle for newer entries. */
  albumSeen: { load(): number; save(t: number): void };
}

/** Dev-only URL flags (see `readDevFlags`). */
export interface DevFlags { force?: string; clock?: number; reduced?: boolean; touch?: boolean; rain?: boolean; decorAll?: boolean }

/**
 * Parses `&surprise=<id>`, `&clock=YYYY-MM-DDTHH:MM` (local time), `&reduced`, `&touch`, `&rain`, `&decor=all`.
 * Pure; `devFlags()` decides whether they count.
 */
export function readDevFlags(hash: string): DevFlags {
  const f: DevFlags = {};
  const has = (name: string) => new RegExp(`[#&]${name}(?:&|$)`).test(hash);
  const force = /[#&]surprise=([\w-]+)/.exec(hash)?.[1];
  if (force) f.force = force;
  const c = /[#&]clock=(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(hash);
  if (c) f.clock = new Date(+c[1]!, +c[2]! - 1, +c[3]!, +c[4]!, +c[5]!).getTime();
  if (has('reduced')) f.reduced = true;
  if (has('touch')) f.touch = true;
  if (has('rain')) f.rain = true;
  if (/[#&]decor=all(?:&|$)/.test(hash)) f.decorAll = true;
  return f;
}

/** The dev flags of this page: only in a dev build in a browser. */
export function devFlags(): DevFlags {
  return import.meta.env.DEV && typeof location !== 'undefined' ? readDevFlags(location.hash) : {};
}

/** A cooldown store that lives only as long as the page. */
export function memoryStore(): SurpriseEnv['store'] {
  let data: Record<string, number> = {};
  return { load: () => ({ ...data }), save: (v) => { data = { ...v }; } };
}

const media = (q: string): boolean => {
  try { return typeof matchMedia === 'function' && matchMedia(q).matches; } catch { return false; }
};
const storage = (): Storage | null => {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
};

/**
 * The only place surprise code touches the clock, randomness, media queries, the document or localStorage.
 * Every access is guarded, so it is safe under node (tests, prerender) and with blocked storage.
 * The clock is the server's; `&clock=` (dev) shifts it to the given local time.
 */
export function browserEnv(): BrowserEnv {
  const flags = devFlags();
  const shift = flags.clock !== undefined ? flags.clock - serverTime() : 0;
  return {
    now: () => serverTime() + shift,
    random: () => Math.random(),
    local: (t: number): LocalTime => {
      const d = new Date(t);
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    },
    visible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
    touch: () => flags.touch || media('(pointer: coarse)'),
    reducedMotion: () => flags.reduced || media('(prefers-reduced-motion: reduce)'),
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
