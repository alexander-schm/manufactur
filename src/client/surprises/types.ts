import type { GameState } from '../../shared/types';

export type Rarity = 'C' | 'R' | 'L';
export type Where = 'workshop' | 'window' | 'village';
export type ClickTarget = 'cat' | 'radio' | 'kettle' | 'lights' | 'mouseHole' | 'worker';

export interface LocalTime { year: number; month: number /* 1-12 */; day: number; hour: number; minute: number }

export interface Mood {
  daypart: 'morning' | 'day' | 'evening' | 'night';
  december: boolean; newYear: boolean; birthday: boolean; rain: boolean;
}

export interface SurpriseCtx {
  s: GameState; now: number; local: LocalTime; mood: Mood;
  readOnly: boolean; touch: boolean; reducedMotion: boolean;
}

export type Trigger =
  | { kind: 'click'; target: ClickTarget; combo?: { count: number; withinMs: number } }
  | { kind: 'ambient' }
  | { kind: 'calendar' };

export interface SurpriseDef {
  id: string; where: Where; trigger: Trigger; rarity: Rarity; durationMs: number; cooldownMs?: number;
  when?: (c: SurpriseCtx) => boolean;
  /** Every album id this def can record; album[0] is recorded unless pickAlbum is given. */
  album: string[];
  pickAlbum?: (c: SurpriseCtx) => string | null;
}

export interface Play {
  id: string; startedAt: number; until: number; seed: number /* uint32 */; held: boolean;
  data?: Record<string, string | number>;
}

export interface SurpriseEnv {
  now(): number; random(): number; local(t: number): LocalTime;
  visible(): boolean; touch(): boolean; reducedMotion(): boolean;
  store: { load(): Record<string, number>; save(v: Record<string, number>): void };
}
