import { ALBUM_PRIZES, CURIOSITIES, CURIOSITY_GROUPS, type CuriosityGroup } from '../../shared/content/curiosities';
import type { GameState } from '../../shared/types';
import type { Rarity } from '../surprises/types';

/** One album entry. Unfound entries never leak their name or caption: name is '???' and text is the hint. */
export interface AlbumCard { id: string; found: boolean; name: string; text: string; rarity: Rarity; foundAt: number | null }

export interface AlbumView {
  found: number;
  total: number;
  groups: { id: CuriosityGroup; title: string; cards: AlbumCard[] }[];
  nextPrize: { at: number; decor: string; left: number } | null;
}

export function albumView(s: GameState): AlbumView {
  const defs = Object.values(CURIOSITIES);
  const seen = s.curiosities ?? {};
  const found = defs.filter((d) => seen[d.id] !== undefined).length;
  const groups = CURIOSITY_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    cards: defs.filter((d) => d.group === g.id).map((d): AlbumCard => {
      const at = seen[d.id];
      return at === undefined
        ? { id: d.id, found: false, name: '???', text: d.hint, rarity: d.rarity, foundAt: null }
        : { id: d.id, found: true, name: d.name, text: d.caption, rarity: d.rarity, foundAt: at };
    }),
  }));
  const prize = ALBUM_PRIZES.find((p) => p.at > found);
  return { found, total: defs.length, groups, nextPrize: prize ? { at: prize.at, decor: prize.decor, left: prize.at - found } : null };
}
