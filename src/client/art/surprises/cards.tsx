import { inkStyle } from '../ink';
import type { AlbumCard } from '../../panels/albumLogic';
import { CatGift, WorkshopCat, type CatPose } from './Cat';
import { BirthdayCake, ChristmasTree } from './Seasonal';
import { Burst, Owl, SillBird } from './WindowLayer';
import './surprises.css';

const S = inkStyle(2.2);
const D = inkStyle(1.2);

/** Album card art per curiosity id, each drawn in `viewBox="0 0 160 120"`. The surprise art tasks add their entries. */
export const CARD_ART: Record<string, () => preact.JSX.Element> = {
  'katze-streicheln': () => <CatCard pose="purr" />,
  'katze-beleidigt': () => <CatCard pose="swat" />,
  'katze-ofen': () => <KilnNapCard />,
  'katze-topf': () => <PotCatCard />,
  'katze-geschenk': () => (
    <g>
      <path d="M14 108 Q80 100 146 108 Q150 114 144 118 Q80 122 16 118 Q10 114 14 108 Z" fill="var(--rug)" style={inkStyle(1.6)} />
      <g transform="translate(100 108) scale(0.86)"><WorkshopCat x={0} y={0} pose="gift" still /></g>
      <CatGift x={30} y={108} kind={2} still />
    </g>
  ),
  'katze-schubs': () => <NudgeCard />,
  dezember: () => <DecemberCard />,
  abendlicht: () => <EveningCard />,
  eule: () => <WindowCard sky="#33457a" tint={['#1d2748', 0.35]}><Moon x={118} y={30} /><g transform="translate(64 91) scale(1.15) translate(-64 -91)"><Owl x={64} y={91} still /></g></WindowCard>,
  morgenvoegel: () => (
    <WindowCard sky="#fbe2cc" sun>
      <SillBird x={44} y={91} color="var(--g1)" /><SillBird x={70} y={91} color="var(--g3)" flip /><SillBird x={112} y={91} color="var(--sun)" flip />
      <CardNote x={56} y={64} /><CardNote x={98} y={56} />
    </WindowCard>
  ),
  silvester: () => (
    <WindowCard sky="#33457a" tint={['#1d2748', 0.35]}>
      <Burst x={52} y={36} r={18} color="#ff8fb1" /><Burst x={110} y={30} r={15} color="#ffd166" /><Burst x={86} y={66} r={13} color="#8fd3ff" />
    </WindowCard>
  ),
  geburtstag: () => (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M0 100 Q80 96 160 100 L160 120 L0 120 Z" fill="var(--floor)" style={inkStyle(1.6)} />
      {[[22, 18, 'var(--g3)'], [46, 30, 'var(--sun)'], [118, 26, 'var(--g1)'], [140, 16, 'var(--g2)']].map(([x, y, c]) => <path d={`M${x} ${y} l7 -2 l-1 7 Z`} fill={c as string} style={inkStyle(1)} />)}
      <g transform="translate(70 112) scale(1.05) translate(-612 -480)"><BirthdayCake x={612} y={480} years={1} still /></g>
    </g>
  ),
};

/** A window on the wall in the card: frame, sky, hills, the glass's tint, then the scene inside, the muntins and the sill. */
function WindowCard({ sky, tint, sun, children }: { sky: string; tint?: [string, number]; sun?: boolean; children?: preact.ComponentChildren }) {
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <rect x="12" y="4" width="136" height="96" fill="var(--woodDark)" style={S} />
      <rect x="18" y="10" width="124" height="84" fill={sky} />
      {sun && <circle cx="118" cy="30" r="11" fill="var(--sun)" />}
      <path d="M18 74 Q50 58 82 70 Q112 58 142 72 L142 94 L18 94 Z" fill="var(--hill)" />
      <path d="M18 84 Q80 74 142 84 L142 94 L18 94 Z" fill="var(--g2)" opacity="0.9" />
      {tint && <rect x="18" y="10" width="124" height="84" fill={tint[0]} opacity={tint[1]} />}
      {children}
      <path d="M80 10 L80 94 M18 52 L142 52" stroke="var(--woodDark)" stroke-width="4" opacity="0.55" />
      <rect x="18" y="10" width="124" height="84" fill="none" style={S} />
      <path d="M6 100 L154 100 L150 108 L10 108 Z" fill="var(--wood)" style={S} />
    </g>
  );
}

/** A sleepy crescent moon. */
function Moon({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r="16" fill="#fff6d8" opacity="0.18" />
      <path d={`M${x + 3} ${y - 12} A12 12 0 1 0 ${x + 3} ${y + 12} A9.5 11 0 1 1 ${x + 3} ${y - 12} Z`} fill="#fbf1cf" style={inkStyle(1.2)} />
      {[[30, 20], [56, 16], [96, 40], [134, 50]].map(([sx, sy]) => <circle cx={sx} cy={sy} r="1.6" fill="#fff3b8" />)}
    </g>
  );
}

/** A tiny eighth note. */
function CardNote({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx="3.4" ry="2.6" fill="var(--line)" transform={`rotate(-20 ${x} ${y})`} />
      <path d={`M${x + 3} ${y - 0.6} L${x + 3} ${y - 13} q3.6 1.6 5.2 5.4`} fill="none" stroke="var(--line)" stroke-width="1.5" stroke-linecap="round" />
    </g>
  );
}

/** The workshop at evening: a window with a sunset, string lights glowing, a warm wash over it all. */
function EveningCard() {
  const bulbs: [number, number, string][] = [[20, 24, 'var(--g3)'], [52, 34, 'var(--sun)'], [84, 28, 'var(--g1)'], [116, 36, 'var(--g2)'], [146, 26, 'var(--g3)']];
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M0 98 Q80 94 160 98 L160 120 L0 120 Z" fill="var(--floor)" style={inkStyle(1.6)} />
      <rect x="44" y="40" width="72" height="54" fill="var(--woodDark)" style={S} />
      <rect x="49" y="45" width="62" height="44" fill="#f6b99c" />
      <circle cx="92" cy="74" r="10" fill="#ffb36b" />
      <path d="M49 78 Q66 70 82 76 Q98 70 111 77 L111 89 L49 89 Z" fill="var(--hill)" />
      <rect x="49" y="45" width="62" height="44" fill="#f08a6a" opacity="0.2" />
      <path d="M80 45 L80 89 M49 67 L111 67" stroke="var(--woodDark)" stroke-width="3" />
      <rect x="49" y="45" width="62" height="44" fill="none" style={D} />
      <path d="M0 14 Q20 32 52 30 Q84 22 116 32 Q140 34 160 18" fill="none" style={{ ...D, opacity: 0.7 }} />
      {bulbs.map(([x, y, c]) => (
        <g>
          <circle cx={x} cy={y + 8} r="11" fill={c} opacity="0.55" />
          <path d={`M${x - 3} ${y} L${x + 3} ${y} L${x + 4} ${y + 10} Q${x} ${y + 14} ${x - 4} ${y + 10} Z`} fill={c} style={inkStyle(1.4)} />
        </g>
      ))}
      <rect x="0" y="0" width="160" height="120" fill="var(--sun)" opacity="0.14" />
    </g>
  );
}

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

/** The cat curled up on the warm kiln dome, the chimney beside it. */
function KilnNapCard() {
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M96 66 L94 20 L120 20 L118 66 Z" fill="var(--kilnDark)" style={S} />
      <path d="M90 20 L124 20 L124 13 L90 13 Z" fill="var(--kiln)" style={S} />
      <path d="M6 120 L6 104 Q10 62 80 60 Q150 62 154 104 L154 120 Z" fill="var(--kiln)" style={S} />
      <path d="M24 100 Q80 70 136 100" fill="none" style={D} />
      {[[30, 108], [62, 104], [94, 104], [126, 108]].map(([x, y]) => <rect x={x - 12} y={y} width="24" height="10" rx="2" fill="var(--kilnDark)" style={D} />)}
      <ellipse cx="62" cy="62" rx="44" ry="10" fill="url(#glow)" opacity="0.7" />
      <g transform="translate(62 66) scale(1.05) translate(-996 -222)"><WorkshopCat x={996} y={222} pose="kiln" still /></g>
    </g>
  );
}

/** The cat peeking out of a fresh pot on the wheel head. */
function PotCatCard() {
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M10 120 L18 104 L142 104 L150 120 Z" fill="var(--wood)" style={S} />
      <ellipse cx="80" cy="104" rx="52" ry="9" fill="var(--woodDark)" style={S} />
      <g transform="translate(80 104) scale(0.95) translate(-520 -578)"><WorkshopCat x={520} y={578} pose="pot" still /></g>
    </g>
  );
}

/** The cat on the shelf top, a pot tumbling over the edge (it will be caught). */
function NudgeCard() {
  return (
    <g>
      <rect x="0" y="0" width="160" height="120" fill="var(--wall)" />
      <path d="M0 62 L108 62 L108 120 L0 120 Z" fill="var(--wood)" style={S} />
      <rect x="8" y="70" width="92" height="50" fill="var(--woodDark)" opacity="0.5" />
      <g transform="translate(52 62) scale(0.62)"><WorkshopCat x={0} y={0} pose="shelf" still /></g>
      <g transform="rotate(32 128 80)">
        <path d="M118 66 Q114 80 120 92 L136 92 Q142 80 138 66 Z" fill="var(--g1)" style={S} />
        <ellipse cx="128" cy="66" rx="11" ry="3.5" fill="var(--g1)" style={D} />
      </g>
      <path d="M140 52 q6 8 2 16 M148 58 q5 6 2 12" fill="none" style={{ ...D, opacity: 0.6 }} />
      <text x="134" y="114" text-anchor="middle" font-size="22" font-family="var(--font-hand)" fill="var(--kiln)">!</text>
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
