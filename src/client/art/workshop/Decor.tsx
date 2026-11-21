import { inkStyle } from '../ink';

const S = inkStyle(2.2);
const T = { ...inkStyle(1.2), opacity: 0.7 };

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
};

export function DecorLayer({ placed }: { placed: string[] }) {
  return <g>{placed.filter((id) => DRAW[id]).map((id) => <g data-decor={id}>{DRAW[id]()}</g>)}</g>;
}
