import { addNews } from './state';
import type { VillageState } from './types';

export const LEVEL_BONUS_PER_LEVEL = 0.02;
export const LEVEL_BONUS_CAP = 0.4;

export const LEVEL_DECORATIONS: { level: number; id: string; name: string }[] = [
  { level: 5, id: 'blumenbeete', name: 'Blumenbeete' },
  { level: 10, id: 'laternen', name: 'Laternen am Dorfplatz' },
  { level: 15, id: 'maibaum', name: 'Maibaum' },
  { level: 20, id: 'wimpel', name: 'Wimpel über dem Platz' },
  { level: 25, id: 'baenke', name: 'Bänke am Brunnen' },
  { level: 30, id: 'rosenbogen', name: 'Rosenbogen' },
];

export function villageLevel(v: Pick<VillageState, 'completedJoint' | 'stagesDone'>): number {
  return v.completedJoint + v.stagesDone;
}

export function levelBonus(v: Pick<VillageState, 'completedJoint' | 'stagesDone'>): number {
  return 1 + Math.min(LEVEL_BONUS_CAP, LEVEL_BONUS_PER_LEVEL * villageLevel(v));
}

export function decorationsFor(level: number): string[] {
  return LEVEL_DECORATIONS.filter((d) => d.level <= level).map((d) => d.id);
}

/** Announce the new level (and any decorations it unlocked) after `before` changed. */
export function noteLevelUp(v: VillageState, before: number, now: number): void {
  const after = villageLevel(v);
  if (after <= before) return;
  const fresh = LEVEL_DECORATIONS.filter((d) => d.level > before && d.level <= after).map((d) => d.name);
  addNews(v, `Das Dorf ist jetzt auf Stufe ${after}!${fresh.length ? ` Neu auf dem Dorfplatz: ${fresh.join(', ')}.` : ''}`, null, now);
}
