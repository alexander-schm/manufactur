import { NAMES, PERSONALITIES } from './content';
import { hashSeed, nextRandom, pick } from './rng';

export interface CharacterLook {
  body: 'round' | 'tall' | 'small' | 'broad';
  skin: string;
  hairStyle: 'bun' | 'short' | 'curly' | 'bald' | 'braids' | 'mohawk' | 'long' | 'cap';
  hairColor: string;
  eyes: 'dot' | 'happy' | 'sleepy' | 'wide' | 'glasses';
  brows: 'thin' | 'bushy' | 'none';
  nose: 'button' | 'long' | 'round';
  mouth: 'smile' | 'grin' | 'gap' | 'o';
  facial: 'none' | 'moustache' | 'beard' | 'freckles' | 'mole';
  quirk: 'headscarf' | 'bigHat' | 'flower' | 'earring' | 'pencilEar' | 'bandana' | 'scarf' | 'none';
  outfit: string;
  apron: string;
  heightMul: number;
}

const SKINS = ['#ffe0c8', '#ffd3b6', '#f1bf98', '#d9a077', '#b97d55', '#8d5a3b', '#6b4229'];
const HAIR = ['#2b1d16', '#5c3a28', '#8a5a34', '#c98b3d', '#e8c26a', '#d9d4cc', '#a8402a', '#3d3d4a'];
const OUTFITS = ['#5f8fcf', '#7fb85c', '#e9708d', '#9a7ccf', '#f2b84b', '#d9674c', '#4f9cc4', '#c8784c', '#55708c'];
const APRONS = ['#efe0c4', '#e2cfa6', '#f6d0c4', '#cfe3ef', '#dfe8c8'];

export function makeCharacter(seed: number): CharacterLook {
  let r = hashSeed(seed, 1);
  const p = <T,>(arr: readonly T[]): T => { const [v, n] = pick(r, arr); r = n; return v; };
  const look: CharacterLook = {
    body: p(['round', 'tall', 'small', 'broad'] as const),
    skin: p(SKINS),
    hairStyle: p(['bun', 'short', 'curly', 'bald', 'braids', 'mohawk', 'long', 'cap'] as const),
    hairColor: p(HAIR),
    eyes: p(['dot', 'dot', 'happy', 'sleepy', 'wide', 'glasses'] as const),
    brows: p(['thin', 'bushy', 'none'] as const),
    nose: p(['button', 'long', 'round'] as const),
    mouth: p(['smile', 'smile', 'grin', 'gap', 'o'] as const),
    facial: p(['none', 'none', 'moustache', 'beard', 'freckles', 'freckles', 'mole'] as const),
    quirk: p(['headscarf', 'bigHat', 'flower', 'earring', 'pencilEar', 'bandana', 'scarf', 'none', 'none'] as const),
    outfit: p(OUTFITS),
    apron: p(APRONS),
    heightMul: 1,
  };
  const [h, r2] = nextRandom(r);
  r = r2;
  look.heightMul = { round: 0.92, tall: 1.08, small: 0.86, broad: 1 }[look.body] * (0.97 + h * 0.06);
  if (look.facial === 'none' && look.quirk === 'none') {
    look.quirk = p(['headscarf', 'bigHat', 'flower', 'earring', 'pencilEar', 'bandana', 'scarf'] as const);
  }
  return look;
}

export function characterName(seed: number): string {
  return pick(hashSeed(seed, 2), NAMES)[0];
}

export function personality(seed: number, _traits: string[]): string {
  return pick(hashSeed(seed, 3), PERSONALITIES)[0];
}
