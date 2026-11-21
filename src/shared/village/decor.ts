import type { GameState } from '../types';

export interface DecorDef { id: string; name: string; spot: 'wall' | 'window' | 'floor' | 'ceiling' }

export const DECOR: Record<string, DecorDef> = {
  wimpelkette: { id: 'wimpelkette', name: 'Wimpelkette', spot: 'ceiling' },
  blumenkasten: { id: 'blumenkasten', name: 'Blumenkasten', spot: 'window' },
  vogelhaus: { id: 'vogelhaus', name: 'Vogelhäuschen', spot: 'wall' },
  laterne: { id: 'laterne', name: 'Laterne', spot: 'ceiling' },
  'teppich-blau': { id: 'teppich-blau', name: 'Blauer Teppich', spot: 'floor' },
  'grosse-vase': { id: 'grosse-vase', name: 'Große Bodenvase', spot: 'floor' },
  wandteller: { id: 'wandteller', name: 'Wandteller', spot: 'wall' },
  haengekorb: { id: 'haengekorb', name: 'Hängekorb', spot: 'ceiling' },
  steinzeugtopf: { id: 'steinzeugtopf', name: 'Steinzeug-Vorratstopf', spot: 'floor' },
  glasurproben: { id: 'glasurproben', name: 'Glasurproben-Brett', spot: 'wall' },
  papierlampions: { id: 'papierlampions', name: 'Papierlampions', spot: 'ceiling' },
  meisterbrief: { id: 'meisterbrief', name: 'Meisterbrief', spot: 'wall' },
  porzellanvoegel: { id: 'porzellanvoegel', name: 'Porzellanvögel', spot: 'window' },
  kronleuchter: { id: 'kronleuchter', name: 'Kronleuchter', spot: 'ceiling' },
  // grand projects (art follows in the map/decor art task)
  brunnenfliese: { id: 'brunnenfliese', name: 'Brunnenfliese', spot: 'wall' },
  tischglocke: { id: 'tischglocke', name: 'Kleine Messingglocke', spot: 'window' },
  museumsplakat: { id: 'museumsplakat', name: 'Museumsplakat', spot: 'wall' },
  kaolinbrocken: { id: 'kaolinbrocken', name: 'Kaolinbrocken', spot: 'floor' },
  ratssiegel: { id: 'ratssiegel', name: 'Ratssiegel', spot: 'wall' },
};

export const MAX_DECOR_PLACED = 4;

/** Hands a decor item to the workshop and shows it off right away while there is room. False when already owned. */
export function grantDecor(s: GameState, id: string): boolean {
  if (s.decor.includes(id)) return false;
  s.decor.push(id);
  if (s.decorPlaced.length < MAX_DECOR_PLACED) s.decorPlaced.push(id);
  return true;
}
