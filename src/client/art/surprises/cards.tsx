import { inkStyle } from '../ink';
import type { AlbumCard } from '../../panels/albumLogic';
import { WorkshopCat, type CatPose } from './Cat';
import { ChristmasTree } from './Seasonal';
import './surprises.css';

const S = inkStyle(2.2);
const D = inkStyle(1.2);

/** Album card art per curiosity id, each drawn in `viewBox="0 0 160 120"`. The surprise art tasks add their entries. */
export const CARD_ART: Record<string, () => preact.JSX.Element> = {
  'katze-streicheln': () => <CatCard pose="purr" />,
  'katze-beleidigt': () => <CatCard pose="swat" />,
  dezember: () => <DecemberCard />,
};

/** A snowy window on the wall with the little tree beside it. */
function DecemberCard() {
  const flakes: [number, number, number][] = [[24, 26, 2.4], [44, 50, 2], [62, 22, 2.6], [80, 44, 2], [34, 70, 2.2], [70, 66, 2.4], [52, 34, 1.6], [86, 74, 1.8]];
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M0 104 Q80 100 160 104 L160 120 L0 120 Z" fill="var(--floor)" style={inkStyle(1.6)} />
      {/* the window */}
      <rect x="10" y="10" width="88" height="80" fill="var(--woodDark)" style={S} />
      <rect x="16" y="16" width="76" height="68" fill="var(--sky)" />
      <rect x="16" y="16" width="76" height="68" fill="#e4eef6" opacity="0.4" />
      <path d="M16 66 Q36 52 56 62 Q74 54 92 62 L92 84 L16 84 Z" fill="#fbfdff" />
      <path d="M16 76 Q52 68 92 75 L92 84 L16 84 Z" fill="#eef5fa" />
      <path d="M36 64 L36 56" style={D} />
      <circle cx="36" cy="51" r="6" fill="var(--g2)" style={D} />
      <path d="M30 50 Q36 43 42 50 Q39 48 36 51 Q33 48 30 50 Z" fill="#fbfdff" />
      {flakes.map(([x, y, r]) => <circle class="flake" cx={x} cy={y} r={r} fill="#fff" stroke="#b9cfdf" stroke-width="0.7" />)}
      <path d="M54 16 L54 84 M16 50 L92 50" stroke="var(--woodDark)" stroke-width="4" />
      <path d="M54 16 L54 84 M16 50 L92 50" fill="none" style={D} />
      <rect x="16" y="16" width="76" height="68" fill="none" style={S} />
      <path d="M6 92 L102 92 L98 98 L10 98 Z" fill="var(--wood)" style={S} />
      {/* the tree */}
      <g transform="translate(128 112) scale(0.78) translate(-282 -488)"><ChristmasTree x={282} y={488} still /></g>
    </g>
  );
}

/** The scene's cat in a still pose, on a little rug, centred in the card. */
function CatCard({ pose }: { pose: CatPose }) {
  // the cat with its yarn ball spans about −72…+95 × −104…+12 around its anchor
  return (
    <g>
      <path d="M14 108 Q80 100 146 108 Q150 114 144 118 Q80 122 16 118 Q10 114 14 108 Z" fill="var(--rug)" style={inkStyle(1.6)} />
      <g transform="translate(70 108) scale(0.86)"><WorkshopCat x={0} y={0} pose={pose} still /></g>
    </g>
  );
}

/** Fallback art: a stoppered glass jar with a ribbon. */
export function GenericCard() {
  return (
    <g>
      <ellipse cx="82" cy="108" rx="40" ry="5" fill="url(#hatch)" opacity="0.5" />
      {/* jar */}
      <path d="M58 40 Q56 48 50 56 Q42 68 44 86 Q46 106 80 106 Q114 106 116 86 Q118 68 110 56 Q104 48 102 40 Z" fill="#dcecf3" style={S} />
      <path d="M56 40 L104 40" fill="none" style={S} />
      <path d="M58 33 Q58 29 62 29 L98 29 Q102 29 102 33 L102 40 L58 40 Z" fill="#cfe4ee" style={S} />
      {/* cork */}
      <path d="M64 29 L66 14 Q66 11 70 11 L90 11 Q94 11 94 14 L96 29 Z" fill="var(--cork)" style={S} />
      <path d="M72 17 l2 1 M84 15 l1 2 M80 23 l2 0 M88 22 l1 1" fill="none" style={D} />
      {/* ribbon with a bow */}
      <path d="M57 44 Q80 52 103 44 L104 50 Q80 58 56 50 Z" fill="var(--g3)" style={inkStyle(1.6)} />
      <path d="M80 52 Q66 42 64 56 Q66 64 80 54 Q94 64 96 56 Q94 42 80 52 Z" fill="var(--g3)" style={inkStyle(1.6)} />
      <path d="M78 55 L72 72 L77 69 L80 74 L82 56" fill="var(--g3)" style={inkStyle(1.4)} />
      <circle cx="80" cy="53" r="3.4" fill="#f59ab0" style={inkStyle(1.2)} />
      {/* glints */}
      <path d="M54 70 Q52 82 58 94" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.85" />
      <path d="M62 64 l0 4" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      <path d="M124 26 l0 10 M119 31 l10 0 M30 52 l0 7 M26.5 55.5 l7 0" stroke="var(--g5)" stroke-width="2" stroke-linecap="round" />
    </g>
  );
}

/** A hand-drawn question mark over a silhouette. */
function QuestionMark() {
  return (
    <g class="curio-q">
      <path d="M66 46 Q66 26 82 26 Q98 26 98 42 Q98 52 86 58 Q80 62 80 72" fill="none" stroke="var(--paper)" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M66 46 Q66 26 82 26 Q98 26 98 42 Q98 52 86 58 Q80 62 80 72" fill="none" stroke="var(--line)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="80" cy="88" r="6" fill="var(--line)" stroke="var(--paper)" stroke-width="3" />
    </g>
  );
}

/** Found: the card's art. Unfound: the same art as a faint silhouette with a "?" on top. */
export function CuriosityCard({ card }: { card: AlbumCard }) {
  const Art = CARD_ART[card.id] ?? GenericCard;
  return (
    <svg class={`curio-art${card.found ? '' : ' unfound'}`} viewBox="0 0 160 120" aria-hidden="true">
      <g class="curio-art-body"><Art /></g>
      {!card.found && <QuestionMark />}
    </svg>
  );
}
