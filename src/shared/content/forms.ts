import type { ProfileParams, Tier } from '../types';

export interface FormDef {
  id: string;
  name: string;
  plural: string;
  clayPerPiece: number;
  baseValue: number;
  baseDifficulty: number;
  unlock: string;
  /** flat forms (bowl/plate) render wide and low */
  flat: boolean;
  handleAllowed: boolean;
  profileDefaults: ProfileParams;
  /** earliest workshop tier that offers the form (informational; the unlock gates it) */
  tier?: Tier;
  /** multiplies the pieces an order of this form asks for */
  orderCountMul?: number;
}

export const FORMS: Record<string, FormDef> = {
  becher: { id: 'becher', name: 'Becher', plural: 'Becher', clayPerPiece: 1, baseValue: 6, baseDifficulty: 1, unlock: 'becher', flat: false, handleAllowed: true,
    profileDefaults: { height: 0.45, belly: 0.35, neck: 0.4, foot: 0.45, rim: 0.5 } },
  schale: { id: 'schale', name: 'Schale', plural: 'Schalen', clayPerPiece: 1.5, baseValue: 9, baseDifficulty: 1.1, unlock: 'schale', flat: true, handleAllowed: false,
    profileDefaults: { height: 0.35, belly: 0.6, neck: 0.8, foot: 0.3, rim: 0.6 } },
  teller: { id: 'teller', name: 'Teller', plural: 'Teller', clayPerPiece: 1.5, baseValue: 10, baseDifficulty: 1.2, unlock: 'teller', flat: true, handleAllowed: false,
    profileDefaults: { height: 0.1, belly: 0.9, neck: 0.9, foot: 0.4, rim: 0.4 } },
  vase: { id: 'vase', name: 'Vase', plural: 'Vasen', clayPerPiece: 2, baseValue: 18, baseDifficulty: 1.5, unlock: 'vase', flat: false, handleAllowed: false,
    profileDefaults: { height: 0.75, belly: 0.7, neck: 0.25, foot: 0.4, rim: 0.4 } },
  krug: { id: 'krug', name: 'Krug', plural: 'Krüge', clayPerPiece: 2.5, baseValue: 22, baseDifficulty: 1.6, unlock: 'krug', flat: false, handleAllowed: true,
    profileDefaults: { height: 0.65, belly: 0.6, neck: 0.45, foot: 0.5, rim: 0.55 } },
  teekanne: { id: 'teekanne', name: 'Teekanne', plural: 'Teekannen', clayPerPiece: 3, baseValue: 40, baseDifficulty: 1.8, unlock: 'teekanne', tier: 'manufaktur', flat: false, handleAllowed: true,
    profileDefaults: { height: 0.5, belly: 0.75, neck: 0.35, foot: 0.45, rim: 0.3 } },
};
