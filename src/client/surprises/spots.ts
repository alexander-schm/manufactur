import { SLOTS, STATION_BOX } from '../art/workshop/stations/Stations';
import type { StationKind } from '../../shared/types';
import type { ClickTarget, Play } from './types';

export type Rect = { x: number; y: number; w: number; h: number };
type Spot = { x: number; y: number };

/**
 * Every surprise anchor in room 1 (viewBox units, 1200×720). Starting values; art tasks adjust them after screenshots.
 * Kiln spots sit on top of the room-1 kiln (slot 3: centre 1060, top 210), the pot spot on the wheel head (slot 1: top 580).
 */
export const SPOTS = {
  /** Where the cat has always slept, in front of the glaze table. */
  catHome: { x: 760, y: 652 },
  catKiln: { x: 1010, y: 224 },
  catPot: { x: 520, y: 578 },
  catShelf: { x: 90, y: 180 },
  gift: { x: 860, y: 690 },
  radio: { x: 205, y: 178 },
  kettle: { x: 1112, y: 228 },
  plant: { x: 614, y: 266 },
  mouseHole: { x: 805, y: 466 },
  /** Centre of the wall cabinet's crown; on the wall between the broom and the drying rack. */
  cabinet: { x: 345, y: 300 },
  cake: { x: 660, y: 600 },
  accident: { x: 905, y: 500 },
  ghost: { x: 900, y: 470 },
  /** The December tree, where the broom leans the rest of the year: between the shelf and the kaolin stand, under the cabinet. */
  tree: { x: 282, y: 488 },
  window: { x: 420, y: 78, w: 200, h: 180, sill: 266 },
};

/** The December tree's drawn boxes around its spot (pot and lower tiers; the narrow top with the star). */
export const TREE_BOXES = (p: Spot): Rect[] => [
  { x: p.x - 32, y: p.y - 80, w: 64, h: 84 },
  { x: p.x - 20, y: p.y - 128, w: 40, h: 48 },
];

/**
 * Village map anchors (1400×1200). The Christmas stall stands at the square's north-west edge, between plots 0, 1 and 8
 * and above the maypole's flag: clear of every plot, building, project site, the well, the notice board, the level decorations and the lanes.
 */
export const VILLAGE_SPOTS = {
  xmasStall: { x: 532, y: 310 },
};

/** The Christmas stall's drawn box around its spot (base centre): 100 wide, star on the roof 112 up, shadow 4 below. */
export const xmasStallRect = (p: Spot): Rect => ({ x: p.x - 50, y: p.y - 112, w: 100, h: 116 });

/** The cat's clickable ellipse around its anchor (bottom centre of the loaf). */
export const CAT_HIT = { dx: -6, dy: -26, rx: 58, ry: 40 };
const catRect = (p: Spot): Rect => ({ x: p.x + CAT_HIT.dx - CAT_HIT.rx, y: p.y + CAT_HIT.dy - CAT_HIT.ry, w: 2 * CAT_HIT.rx, h: 2 * CAT_HIT.ry });

/**
 * Every surprise hit area in room 1. Only the cat's may overlap a station (it is drawn above them and catches only its own clicks);
 * every other one stays clear of `stationRect` for every station. Each is at least 60×60.
 */
export const HIT_RECTS: Partial<Record<ClickTarget | 'cabinet' | 'plant' | 'fog' | 'pigeon', Rect>> = {
  cat: catRect(SPOTS.catHome),
  cabinet: { x: SPOTS.cabinet.x - 34, y: SPOTS.cabinet.y - 14, w: 68, h: 118 },
};

/** Where the cat is drawn for these plays. Later tasks add the kiln, the pot and the shelf. */
export function catSpot(_plays: Play[]): Spot {
  return SPOTS.catHome;
}

/** The full drawn box of a station in its slot (see `STATION_BOX`). */
export function stationRect(kind: StationKind, slot: number): Rect {
  const p = SLOTS[slot]!, b = STATION_BOX[kind];
  return { x: p.x - b.w / 2, y: p.y - b.h, w: b.w, h: b.h + b.below };
}

/** The spot a dev `&surprise=` shot centres on. */
export function anchorOf(id: string): Spot {
  if (id.startsWith('katze-')) return SPOTS.catHome;
  if (id === 'dezember') return { x: SPOTS.window.x + SPOTS.window.w / 2, y: SPOTS.window.y + SPOTS.window.h / 2 };
  return { x: 600, y: 360 };
}
