import type { StationKind } from '../types';
import { CUSTOMERS } from './customers';
import { EFFECTS } from './effects';
import { FORMS } from './forms';
import { MATERIALS } from './materials';
import { NAMES, PERSONALITIES } from './names';
import { STATIONS } from './stations';
import { TRAITS } from './traits';
import { UNLOCKS } from './unlocks';

export { CUSTOMERS, EFFECTS, FORMS, MATERIALS, NAMES, PERSONALITIES, STATIONS, TRAITS, UNLOCKS };
export type { FormDef } from './forms';
export type { MaterialDef } from './materials';
export type { StationDef } from './stations';
export type { TraitDef } from './traits';
export type { EffectDef, RecipeInput } from './effects';
export type { UnlockDef } from './unlocks';
export type { CustomerDef } from './customers';

/** Own-property lookup: never resolves prototype keys like "__proto__" or "constructor". */
export function own<T>(table: Record<string, T>, id: unknown): T | undefined {
  return typeof id === 'string' && Object.hasOwn(table, id) ? table[id] : undefined;
}

function lookup<T>(table: Record<string, T>, id: string, what: string): T {
  const v = own(table, id);
  if (!v) throw new Error(`Unbekannt: ${what} "${id}"`);
  return v;
}

export const getForm = (id: string) => lookup(FORMS, id, 'Form');
export const getStationDef = (kind: StationKind) => lookup(STATIONS, kind, 'Station');
export const getMaterial = (id: string) => lookup(MATERIALS, id, 'Material');
export const getTrait = (id: string) => lookup(TRAITS, id, 'Eigenschaft');
export const getEffect = (id: string) => lookup(EFFECTS, id, 'Effekt');
export const getUnlock = (id: string) => lookup(UNLOCKS, id, 'Freischaltung');
