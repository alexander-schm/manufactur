import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };
const GOLD = '#d9a636';
const PORCELAIN = '#fbf8f2';
const COBALT = '#3f5e8c';

/** A little porcelain songbird on a round foot, facing right, standing at (x, y). */
function PorcelainBird({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={flip ? `translate(${2 * x} 0) scale(-1 1)` : undefined}>
      <ellipse cx={x} cy={y - 12} rx="17" ry="15" fill="url(#porcelain-glow)" />
      <path d={`M${x - 11} ${y - 9} L${x - 20} ${y - 16} L${x - 17} ${y - 6} Z`} fill={PORCELAIN} style={inkStyle(1.4)} />
      <path d={`M${x - 12} ${y - 5} Q${x - 14} ${y - 17} ${x - 2} ${y - 17} Q${x + 9} ${y - 17} ${x + 10} ${y - 9} Q${x + 9} ${y - 2} ${x - 2} ${y - 2} Q${x - 10} ${y - 2} ${x - 12} ${y - 5} Z`} fill={PORCELAIN} style={inkStyle(1.6)} />
      <circle cx={x + 5} cy={y - 19} r="6.2" fill={PORCELAIN} style={inkStyle(1.6)} />
      <path d={`M${x + 10.6} ${y - 20.4} l4.4 1.4 l-4.4 1.8 Z`} fill="var(--g5)" style={inkStyle(0.9)} />
      <circle cx={x + 7} cy={y - 20.4} r="1.3" fill="var(--line)" />
      <ellipse cx={x + 6} cy={y - 16.2} rx="1.8" ry="1.1" fill="var(--cheek)" opacity="0.7" />
      <path d={`M${x - 7} ${y - 12} q5 5 11 0`} fill="none" stroke={COBALT} stroke-width="1.8" stroke-linecap="round" />
      <path d={`M${x - 5} ${y - 8} q3.5 3 7.5 0`} fill="none" stroke={COBALT} stroke-width="1.3" stroke-linecap="round" />
      <path d={`M${x + 1} ${y - 24.5} q1.5 -3 4 -1`} fill="none" stroke={COBALT} stroke-width="1.3" stroke-linecap="round" />
      <ellipse cx={x - 1} cy={y - 1.6} rx="9" ry="2.4" fill={PORCELAIN} style={inkStyle(1.3)} />
    </g>
  );
}

/** Decor items at fixed, hand-picked spots in room 1 (1200×700). */
const DRAW: Record<string, () => preact.JSX.Element> = {
  wimpelkette: () => (
    <g>
      <path d="M620 40 Q860 96 1180 46" fill="none" style={T} />
      {Array.from({ length: 11 }, (_, i) => {
        const x = 650 + i * 48, y = 50 + Math.sin((i / 10) * Math.PI) * 38;
        return <path d={`M${x - 14} ${y} L${x + 14} ${y} L${x} ${y + 26} Z`} fill={['var(--g3)', 'var(--g5)', 'var(--g1)', 'var(--g2)'][i % 4]} style={inkStyle(1.6)} />;
      })}
    </g>
  ),
  laterne: () => (
    <g class="lantern" style={{ transformOrigin: '1000px 20px' }}>
      <path d="M1000 20 L1000 70" style={T} />
      <path d="M986 70 L1014 70 L1018 110 L982 110 Z" fill="var(--fireCore)" style={S} />
      <path d="M980 70 L1020 70 L1012 62 L988 62 Z M980 110 L1020 110 L1016 118 L984 118 Z" fill="var(--woodDark)" style={S} />
      <circle cx="1000" cy="90" r="22" fill="url(#glow)" opacity="0.8" />
    </g>
  ),
  haengekorb: () => (
    <g class="hanging" style={{ transformOrigin: '150px 20px' }}>
      <path d="M150 20 L136 90 M150 20 L164 90" style={T} />
      <path d="M128 90 L172 90 Q168 116 150 116 Q132 116 128 90 Z" fill="var(--wood)" style={S} />
      {[0, 1, 2, 3, 4].map((i) => <circle cx={134 + i * 8} cy={86 - (i % 2) * 6} r="6" fill={i % 2 ? 'var(--g3)' : 'var(--g2)'} style={inkStyle(1.2)} />)}
    </g>
  ),
  blumenkasten: () => (
    <g>
      <path d="M404 286 L636 286 L628 306 L412 306 Z" fill="var(--g1)" style={S} />
      {Array.from({ length: 9 }, (_, i) => <g><path d={`M${420 + i * 26} 286 l0 -12`} stroke="var(--g2Dark)" stroke-width="2" /><circle cx={420 + i * 26} cy="272" r="6" fill={['var(--g3)', 'var(--sun)', '#fff'][i % 3]} style={inkStyle(1.2)} /></g>)}
    </g>
  ),
  vogelhaus: () => (
    <g>
      <path d="M660 300 L660 360" stroke="var(--woodDark)" stroke-width="5" />
      <path d="M636 326 L636 296 L684 296 L684 326 Z" fill="var(--g5)" style={S} />
      <path d="M628 300 L660 274 L692 300 Z" fill="var(--kiln)" style={S} />
      <circle cx="660" cy="310" r="6" fill="var(--kilnInside)" />
      <g><ellipse cx="690" cy="292" rx="9" ry="7" fill="var(--g1)" style={inkStyle(1.4)} /><circle cx="696" cy="288" r="1.5" fill="var(--line)" /><path d="M700 290 l5 1 l-5 2" fill="var(--g5)" /></g>
    </g>
  ),
  wandteller: () => (
    <g>
      <ellipse cx="290" cy="110" rx="34" ry="34" fill="#f4efe4" style={S} />
      <ellipse cx="290" cy="110" rx="24" ry="24" fill="none" stroke="var(--g1)" stroke-width="3" />
      {Array.from({ length: 8 }, (_, i) => <circle cx={290 + 29 * Math.cos((i * Math.PI) / 4)} cy={110 + 29 * Math.sin((i * Math.PI) / 4)} r="2.6" fill="var(--g1)" />)}
      <path d="M290 110 m-8 0 a8 8 0 1 0 16 0 a8 8 0 1 0 -16 0" fill="var(--g3)" />
    </g>
  ),
  'teppich-blau': () => (
    <g>
      <path d="M30 690 Q140 680 250 692 Q256 706 244 716 Q140 724 36 716 Q24 704 30 690 Z" fill="var(--g1)" style={S} />
      <path d="M44 698 Q140 690 236 700 M44 710 Q140 716 236 708" fill="none" style={{ ...T, strokeDasharray: '6 5' }} />
    </g>
  ),
  'grosse-vase': () => (
    <g>
      <ellipse cx="930" cy="712" rx="30" ry="6" fill="url(#hatch)" opacity="0.5" />
      <path d="M914 712 Q896 670 914 640 Q922 628 918 610 L942 610 Q938 628 946 640 Q964 670 946 712 Z" fill="var(--g4)" style={S} />
      <ellipse cx="930" cy="610" rx="12" ry="4" fill="var(--kilnInside)" style={inkStyle(1.6)} />
      <path d="M918 660 q12 8 24 0" fill="none" stroke="#fff" stroke-width="2" />
      {[0, 1, 2].map((i) => <path d={`M${926 + i * 4} 606 Q${918 + i * 10} 570 ${910 + i * 14} 560`} fill="none" stroke="var(--g2Dark)" stroke-width="2.4" />)}
      {[0, 1, 2].map((i) => <circle cx={910 + i * 14} cy={556} r="7" fill={['var(--g3)', 'var(--sun)', 'var(--g3)'][i]} style={inkStyle(1.2)} />)}
    </g>
  ),
  // back floor between the glaze table and the firewood
  steinzeugtopf: () => (
    <g>
      <ellipse cx="866" cy="480" rx="28" ry="5" fill="url(#hatch)" opacity="0.5" />
      <path d="M846 478 Q836 450 846 428 L886 428 Q896 450 886 478 Z" fill="#cfc8bb" style={S} />
      {[[852, 440], [878, 446], [858, 466], [883, 468], [869, 455], [848, 454]].map(([sx, sy]) => <circle cx={sx} cy={sy} r="1.3" fill="#6b5a4c" opacity="0.6" />)}
      <path d="M842 446 Q866 452 890 446 M843 462 Q866 468 889 462" fill="none" stroke="#3f5e8c" stroke-width="2.4" />
      <path d="M852 455 q4 -5 8 0 q4 5 8 0 q4 -5 8 0 q4 5 8 0" fill="none" stroke="#3f5e8c" stroke-width="1.8" />
      <path d="M842 428 Q866 420 890 428 L888 422 Q866 414 844 422 Z" fill="#cfc8bb" style={inkStyle(1.8)} />
      <path d="M860 416 q6 -8 12 0" fill="#3f5e8c" style={inkStyle(1.6)} />
      <path d="M843 434 q-8 2 -6 10 M889 434 q8 2 6 10" fill="none" style={inkStyle(1.8)} />
    </g>
  ),
  // wall above the shelf
  glasurproben: () => (
    <g>
      <path d="M44 106 L74 90 L104 106" fill="none" style={T} />
      <circle cx="74" cy="90" r="2.8" fill="var(--line)" />
      <path d="M30 104 L118 106 L117 164 L31 162 Z" fill="var(--wood)" style={S} />
      {['#4f78b5', '#7fb48c', '#2f2a28', '#c96f4a', '#a8c8b8', '#f1e3c8', '#8a5a3c', '#e2b64c'].map((c, i) => {
        const tx = 38 + (i % 4) * 20, ty = 112 + Math.floor(i / 4) * 25;
        return (
          <g>
            <rect x={tx} y={ty} width="15" height="19" rx="2" fill={c} style={inkStyle(1.3)} />
            <path d={`M${tx + 2} ${ty + 13} L${tx + 13} ${ty + 13}`} stroke="#e8d9c4" stroke-width="3" opacity="0.8" />
            {i === 2 && [0, 1, 2].map((k) => <circle cx={tx + 4 + k * 4} cy={ty + 5 + (k % 2) * 4} r="1.2" fill="#d9dde2" />)}
          </g>
        );
      })}
    </g>
  ),
  // ceiling, left of the hanging plant
  papierlampions: () => (
    <g>
      {([[198, 40, 'var(--g3)'], [238, 46, 'var(--sun)'], [278, 38, 'var(--g1)']] as [number, number, string][]).map(([lx, ly, c], i) => (
        <g class="hanging" style={{ transformOrigin: `${lx}px 22px`, animationDelay: `${i * 1.3}s` }}>
          <path d={`M${lx} 22 L${lx} ${ly - 13}`} style={T} />
          <circle cx={lx} cy={ly} r="18" fill={c} opacity="0.18" />
          <ellipse cx={lx} cy={ly} rx="13" ry="12" fill={c} style={inkStyle(1.8)} />
          <path d={`M${lx - 7} ${ly - 10} Q${lx - 11} ${ly} ${lx - 7} ${ly + 10} M${lx} ${ly - 12} L${lx} ${ly + 12} M${lx + 7} ${ly - 10} Q${lx + 11} ${ly} ${lx + 7} ${ly + 10}`} fill="none" style={{ ...T, opacity: 0.45 }} />
          <path d={`M${lx - 6} ${ly - 12} L${lx + 6} ${ly - 12} M${lx - 6} ${ly + 12} L${lx + 6} ${ly + 12}`} stroke="var(--woodDark)" stroke-width="3" stroke-linecap="round" />
          <path d={`M${lx} ${ly + 13} l0 6`} stroke="var(--kiln)" stroke-width="2" stroke-linecap="round" />
        </g>
      ))}
    </g>
  ),
  // on the window sill between the cactus and the flower pot: two porcelain birds in love
  porzellanvoegel: () => (
    <g>
      <ellipse cx="493" cy="267" rx="34" ry="3" fill="url(#hatch)" opacity="0.4" />
      <PorcelainBird x={479} y={266} />
      <PorcelainBird x={507} y={266} flip />
      <path d="M493 240 c-3 -4 -8 -1 -5 3 l5 4 l5 -4 c3 -4 -2 -7 -5 -3 Z" fill="var(--g3)" style={inkStyle(1.1)} />
    </g>
  ),
  // ceiling between the right curtain and the pinboard
  kronleuchter: () => (
    <g class="hanging" style={{ transformOrigin: '668px 22px', animationDelay: '2s' }}>
      <g transform="translate(668 22) scale(1.3) translate(-668 -22)">
      <path d="M668 22 L668 56" style={T} />
      {[30, 38, 46].map((cy) => <ellipse cx="668" cy={cy} rx="2" ry="3.4" fill="none" stroke={GOLD} stroke-width="1.6" />)}
      {[[642, 76], [668, 70], [694, 76]].map(([cx, cy]) => <circle cx={cx} cy={cy - 12} r="11" fill="url(#glow)" opacity="0.8" />)}
      <path d="M642 80 Q644 98 668 98 Q692 98 694 80" fill="none" stroke={GOLD} stroke-width="4" />
      <path d="M642 80 Q644 98 668 98 Q692 98 694 80" fill="none" style={{ ...inkStyle(1.2), opacity: 0.8 }} />
      <path d="M668 56 L668 98" stroke={GOLD} stroke-width="4" />
      <path d="M668 56 L668 98" fill="none" style={{ ...inkStyle(1), opacity: 0.6 }} />
      <ellipse cx="668" cy="98" rx="7" ry="5" fill={GOLD} style={inkStyle(1.4)} />
      {[[642, 80], [668, 74], [694, 80]].map(([cx, cy]) => (
        <g>
          <path d={`M${cx - 6} ${cy} L${cx + 6} ${cy} L${cx + 4} ${cy + 4} L${cx - 4} ${cy + 4} Z`} fill={GOLD} style={inkStyle(1.2)} />
          <rect x={cx - 2.6} y={cy - 12} width="5.2" height="12" fill={PORCELAIN} style={inkStyle(1.1)} />
          <g class="flame" style={{ transformOrigin: `${cx}px ${cy - 12}px` }}><path d={`M${cx} ${cy - 21} Q${cx + 3.6} ${cy - 15} ${cx} ${cy - 12.5} Q${cx - 3.6} ${cy - 15} ${cx} ${cy - 21} Z`} fill="var(--fireCore)" style={inkStyle(0.8)} /></g>
        </g>
      ))}
      {[650, 659, 677, 686].map((dx, i) => <path d={`M${dx} ${i % 3 ? 97 : 93} l0 4 M${dx} ${(i % 3 ? 101 : 97) + 1} q-2.4 3 0 5.6 q2.4 -2.6 0 -5.6 Z`} fill="#e3f1f6" style={inkStyle(0.8)} />)}
      <path d="M668 103 l0 3 M668 107 q-2.8 3.6 0 6.6 q2.8 -3 0 -6.6 Z" fill="#e3f1f6" style={inkStyle(0.8)} />
      </g>
    </g>
  ),
  // wall between the clock and the kiln
  meisterbrief: () => (
    <g transform="rotate(2 899 200)">
      <path d="M884 164 L899 152 L914 164" fill="none" style={T} />
      <circle cx="899" cy="152" r="2.8" fill="var(--line)" />
      <rect x="870" y="164" width="58" height="74" fill="var(--woodDark)" style={S} />
      <rect x="876" y="170" width="46" height="62" fill="#fdf6e8" style={inkStyle(1.2)} />
      <path d="M884 180 L914 180" stroke="var(--line)" stroke-width="2.4" stroke-linecap="round" />
      <path d="M882 190 L916 190 M882 197 L912 197 M882 204 L916 204 M882 211 L906 211" fill="none" style={{ ...T, opacity: 0.45 }} />
      <path d="M905 220 l-5 14 l5 -3 l4 4 Z M911 220 l5 14 l-5 -3 l-4 4 Z" fill="var(--g1)" style={inkStyle(1)} />
      <circle cx="908" cy="221" r="6.5" fill="var(--kiln)" style={inkStyle(1.3)} />
      <path d="M905 221 l3 -3 l3 3 l-3 3 Z" fill="var(--sun)" />
    </g>
  ),
  // grand projects ---------------------------------------------------------
  // wall above the kiln dome, right of the chimney: a Delft tile with the village fountain
  brunnenfliese: () => (
    <g transform="rotate(-2 1138 126)">
      <path d="M1116 98 L1138 84 L1160 98" fill="none" style={T} />
      <circle cx="1138" cy="84" r="2.8" fill="var(--line)" />
      <rect x="1108" y="96" width="60" height="60" rx="3" fill="var(--woodDark)" style={S} />
      <rect x="1114" y="102" width="48" height="48" rx="2" fill={PORCELAIN} style={inkStyle(1.3)} />
      {[[1114, 102, 0], [1162, 102, 90], [1162, 150, 180], [1114, 150, 270]].map(([cx, cy, a]) => (
        <path d={`M${cx} ${cy} m0 7 a7 7 0 0 0 7 -7`} transform={`rotate(${a} ${cx} ${cy})`} fill="none" stroke={COBALT} stroke-width="1.8" />
      ))}
      <path d="M1124 138 L1152 138 Q1150 146 1138 146 Q1126 146 1124 138 Z" fill="#a9c6e4" stroke={COBALT} stroke-width="1.8" stroke-linejoin="round" />
      <path d="M1136 138 L1136 126 M1140 138 L1140 126" stroke={COBALT} stroke-width="1.8" />
      <path d="M1130 125 L1146 125 Q1144 129 1138 129 Q1132 129 1130 125 Z" fill="#a9c6e4" stroke={COBALT} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M1138 124 L1138 112 M1138 113 Q1129 110 1127 135 M1138 113 Q1147 110 1149 135" fill="none" stroke="#6f9fd0" stroke-width="1.6" stroke-linecap="round" />
      <circle cx="1138" cy="109" r="1.7" fill="#6f9fd0" />
      <path d="M1126 141 q2 -2 4 0 M1146 141 q2 -2 4 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" />
    </g>
  ),
  // on the window sill between the porcelain birds and the flower pot
  tischglocke: () => (
    <g>
      <ellipse cx="539" cy="266" rx="14" ry="2.4" fill="url(#hatch)" opacity="0.45" />
      <path d="M537 238 L537 230 L541 230 L541 238 Z" fill="var(--woodDark)" style={inkStyle(1.3)} />
      <circle cx="539" cy="227" r="4.4" fill="var(--wood)" style={inkStyle(1.4)} />
      <path d="M539 235 l-6 -3 l0 6 Z M539 235 l6 -3 l0 6 Z" fill="var(--g3)" style={inkStyle(1)} />
      <circle cx="539" cy="235" r="1.6" fill="var(--g3)" style={inkStyle(0.9)} />
      <path d="M527 262 Q530 258 531 249 Q533 237 539 237 Q545 237 547 249 Q548 258 551 262 Z" fill={GOLD} style={inkStyle(1.6)} />
      <ellipse cx="539" cy="262" rx="12.5" ry="3" fill="#c58f22" style={inkStyle(1.4)} />
      <circle cx="539" cy="265" r="2.4" fill="#c58f22" style={inkStyle(1)} />
      <path d="M534 243 Q532 250 532 257" fill="none" stroke="#fff3c8" stroke-width="2" stroke-linecap="round" opacity="0.9" />
      <path d="M554 236 l3 -3 M556 243 l4 0 M523 236 l-3 -3" fill="none" style={{ ...T, opacity: 0.55 }} />
    </g>
  ),
  // wall between the shelf and the window, under the hanging plant
  museumsplakat: () => (
    <g transform="rotate(2 354 233)">
      <rect x="328" y="196" width="52" height="74" rx="1.5" fill="#f7ecd6" style={inkStyle(1.8)} />
      <path d="M333 248 L333 214 Q333 202 354 202 Q375 202 375 214 L375 248 Z" fill="#cfe1ee" style={inkStyle(1.1)} />
      <path d="M347 216 L361 216 L359 221 Q368 228 365 238 Q362 245 354 245 Q346 245 343 238 Q340 228 349 221 Z" fill={COBALT} style={inkStyle(1.4)} />
      <path d="M346 231 Q354 235 362 231" fill="none" stroke={PORCELAIN} stroke-width="1.6" stroke-linecap="round" />
      <circle cx="354" cy="227" r="1.6" fill={PORCELAIN} />
      <path d="M339 248 L369 248" style={inkStyle(1.2)} />
      <text x="354" y="262" text-anchor="middle" font-size="12" font-family="var(--font-hand)" fill="var(--line)">Museum</text>
      <path d="M340 207 l1 2 l2 .3 l-1.5 1.4 l.4 2 l-1.9 -1 l-1.9 1 l.4 -2 l-1.5 -1.4 l2 -.3 Z" fill="var(--sun)" />
      <rect x="324" y="192" width="14" height="6" fill="#efe2b8" opacity="0.85" transform="rotate(-20 331 195)" />
      <rect x="370" y="192" width="14" height="6" fill="#efe2b8" opacity="0.85" transform="rotate(20 377 195)" />
    </g>
  ),
  // back floor between the broom and the drying rack
  kaolinbrocken: () => (
    <g>
      <ellipse cx="346" cy="484" rx="26" ry="4.5" fill="url(#hatch)" opacity="0.5" />
      <path d="M332 465 L330 484 M360 465 L362 484" stroke="var(--woodDark)" stroke-width="4" stroke-linecap="round" />
      <path d="M332 465 L330 484 M360 465 L362 484" fill="none" style={inkStyle(1.2)} />
      <path d="M326 459 L366 459 L364 466 L328 466 Z" fill="var(--wood)" style={inkStyle(1.8)} />
      <path d="M332 459 Q328 448 336 442 Q338 432 349 434 Q359 430 362 440 Q368 447 361 459 Z" fill="#f6f3ee" style={inkStyle(1.8)} />
      <path d="M352 456 Q360 452 358 444 M339 455 q-3 -4 0 -8" fill="none" stroke="#d6d0c7" stroke-width="2.2" stroke-linecap="round" />
      <path d="M341 440 q4 -3 8 -1" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" />
      <path d="M369 436 l0 6 M366 439 l6 0" stroke={GOLD} stroke-width="1.6" stroke-linecap="round" />
    </g>
  ),
  // wall between the glaze sample board and the wall plate
  ratssiegel: () => (
    <g>
      <circle cx="213" cy="80" r="2.8" fill="var(--line)" />
      <path d="M211 81 L201 112 L207 113 L213 87 L219 113 L225 112 L215 81 Z" fill="var(--g1)" style={inkStyle(1.3)} />
      <path d="M206 122 L200 150 L204 146 L208 151 L214 126 Z M220 122 L226 150 L222 146 L218 151 L212 126 Z" fill="var(--g1)" style={inkStyle(1.3)} />
      <path d="M213 101 q6 -1 9 4 q6 3 4 10 q4 6 -1 11 q-1 7 -8 7 q-5 4 -10 0 q-7 0 -8 -7 q-5 -5 -1 -11 q-2 -7 4 -10 q3 -5 11 -4 Z" fill="#c4473c" style={inkStyle(1.6)} />
      <circle cx="213" cy="118" r="10" fill="none" stroke="#9c3129" stroke-width="1.6" />
      <path d="M207 122 L207 116 L213 111 L219 116 L219 122 Z M211 122 L211 118 L215 118 L215 122" fill="none" stroke="#9c3129" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M205 109 q3 -3 6 -3" fill="none" stroke="#f0a59a" stroke-width="1.6" stroke-linecap="round" />
    </g>
  ),
};

export function DecorLayer({ placed }: { placed: string[] }) {
  return <g>{placed.filter((id) => DRAW[id]).map((id) => <g data-decor={id}>{DRAW[id]()}</g>)}</g>;
}
