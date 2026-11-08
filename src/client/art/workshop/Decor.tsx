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
};

export function DecorLayer({ placed }: { placed: string[] }) {
  return <g>{placed.filter((id) => DRAW[id]).map((id) => <g data-decor={id}>{DRAW[id]()}</g>)}</g>;
}
