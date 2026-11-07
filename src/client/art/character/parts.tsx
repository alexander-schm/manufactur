/**
 * Character part library. Coordinates live in a 120×200 box, feet at y=196,
 * head centred at (60, 64) with radius 34 — big heads read as cute.
 */
import type { CharacterLook } from '../../../shared/character';
import { mix } from '../../../shared/discovery';
import { inkStyle } from '../ink';

export const HEAD = { cx: 60, cy: 64, r: 34 };
const ink = inkStyle(2.2);
const thin = inkStyle(1.6);

/** A limb drawn as an ink-outlined thick stroke. */
export function Limb({ d, color, width = 11 }: { d: string; color: string; width?: number }) {
  return (
    <g>
      <path d={d} fill="none" style={{ ...inkStyle(width + 4.4) }} />
      <path d={d} fill="none" stroke={color} stroke-width={width} stroke-linecap="round" stroke-linejoin="round" />
    </g>
  );
}

export function Torso({ look }: { look: CharacterLook }) {
  const d = {
    round: 'M38 100 Q60 92 82 100 Q94 132 86 164 L34 164 Q26 132 38 100 Z',
    tall: 'M42 100 Q60 93 78 100 Q84 134 80 166 L40 166 Q36 134 42 100 Z',
    small: 'M42 102 Q60 95 78 102 Q84 132 80 160 L40 160 Q36 132 42 102 Z',
    broad: 'M32 104 Q60 90 88 104 Q90 136 84 164 L36 164 Q30 136 32 104 Z',
  }[look.body];
  const apron = {
    round: 'M44 116 L76 116 Q82 140 80 166 L40 166 Q38 140 44 116 Z',
    tall: 'M46 116 L74 116 Q78 142 76 168 L44 168 Q42 142 46 116 Z',
    small: 'M46 116 L74 116 Q78 138 76 162 L44 162 Q42 138 46 116 Z',
    broad: 'M42 116 L78 116 Q82 140 80 166 L40 166 Q38 140 42 116 Z',
  }[look.body];
  return (
    <g>
      <path d={d} fill={look.outfit} style={ink} />
      <path d={apron} fill={look.apron} style={ink} />
      <path d="M48 116 L54 100 M72 116 L66 100" fill="none" style={thin} />
      <path d="M52 132 L68 132 L67 146 L53 146 Z" fill={mix(look.apron, '#2b2420', 0.1)} style={thin} />
      <ellipse cx="66" cy="152" rx="3.5" ry="2" fill="var(--clay)" opacity="0.75" />
      <ellipse cx="50" cy="124" rx="2.6" ry="1.6" fill="var(--clay)" opacity="0.65" />
    </g>
  );
}

export function Legs({ look }: { look: CharacterLook }) {
  const pants = mix(look.outfit, '#2b2420', 0.45);
  const bottom = look.body === 'small' ? 186 : 190;
  const top = look.body === 'small' ? 158 : 162;
  return (
    <g>
      <path d={`M46 ${top} L45 ${bottom} L57 ${bottom} L58 ${top} Z`} fill={pants} style={ink} />
      <path d={`M62 ${top} L63 ${bottom} L75 ${bottom} L74 ${top} Z`} fill={pants} style={ink} />
      <path d={`M40 ${bottom + 6} Q40 ${bottom - 2} 50 ${bottom - 2} L58 ${bottom} Q60 ${bottom + 7} 50 ${bottom + 7} Z`} fill="var(--shoe)" style={ink} />
      <path d={`M62 ${bottom} L70 ${bottom - 2} Q80 ${bottom - 2} 80 ${bottom + 6} Q72 ${bottom + 7} 62 ${bottom + 7} Z`} fill="var(--shoe)" style={ink} />
    </g>
  );
}

export function Arms({ look, pose }: { look: CharacterLook; pose: 'idle' | 'work' | 'wave' | 'sleep' }) {
  const sx = look.body === 'broad' ? 34 : look.body === 'round' ? 38 : 42;
  const L = { x: sx, y: 106 }, R = { x: 120 - sx, y: 106 };
  let left: string, right: string, lh: [number, number], rh: [number, number];
  switch (pose) {
    case 'work':
      left = `M${L.x} ${L.y} Q${L.x - 6} 130 ${50} 142`; lh = [52, 142];
      right = `M${R.x} ${R.y} Q${R.x + 6} 130 ${70} 142`; rh = [68, 142];
      break;
    case 'wave':
      left = `M${L.x} ${L.y} Q${L.x - 8} 128 ${L.x - 4} 150`; lh = [L.x - 4, 151];
      right = `M${R.x} ${R.y} Q${R.x + 22} 100 ${R.x + 30} 76`; rh = [R.x + 31, 73];
      break;
    case 'sleep':
      left = `M${L.x} ${L.y} Q${L.x - 2} 128 ${54} 138`; lh = [56, 138];
      right = `M${R.x} ${R.y} Q${R.x + 2} 128 ${66} 138`; rh = [64, 138];
      break;
    default:
      left = `M${L.x} ${L.y} Q${L.x - 8} 128 ${L.x - 4} 150`; lh = [L.x - 4, 151];
      right = `M${R.x} ${R.y} Q${R.x + 8} 128 ${R.x + 4} 150`; rh = [R.x + 4, 151];
  }
  return (
    <g>
      <Limb d={left} color={look.outfit} />
      <Limb d={right} color={look.outfit} />
      <circle cx={lh[0]} cy={lh[1]} r="6" fill={look.skin} style={ink} />
      <circle cx={rh[0]} cy={rh[1]} r="6" fill={look.skin} style={ink} />
      {pose === 'wave' && <path d={`M${rh[0] + 10} ${rh[1] - 8} q4 6 0 12 M${rh[0] + 15} ${rh[1] - 12} q6 9 0 18`} fill="none" style={thin} />}
    </g>
  );
}

export function BackHair({ look }: { look: CharacterLook }) {
  if (look.hairStyle === 'long') {
    return <path d="M24 62 Q20 100 30 118 Q46 124 60 118 Q74 124 90 118 Q100 100 96 62 Z" fill={look.hairColor} style={ink} />;
  }
  if (look.hairStyle === 'bun') return <circle cx="60" cy="26" r="13" fill={look.hairColor} style={ink} />;
  return null;
}

export function Head({ look }: { look: CharacterLook }) {
  return (
    <g>
      <path d="M53 92 L53 102 L67 102 L67 92 Z" fill={look.skin} style={ink} />
      <ellipse cx="26.5" cy="68" rx="6" ry="7.5" fill={look.skin} style={ink} />
      <ellipse cx="93.5" cy="68" rx="6" ry="7.5" fill={look.skin} style={ink} />
      <circle cx={HEAD.cx} cy={HEAD.cy} r={HEAD.r} fill={look.skin} style={ink} />
      <path d="M26 70 q-2 3 1 5 M94 70 q2 3 -1 5" fill="none" style={thin} />
    </g>
  );
}

export function Eyes({ look, closed }: { look: CharacterLook; closed: boolean }) {
  if (closed) {
    return <g><path d="M44 68 q5 4 10 0" fill="none" style={inkStyle(2.4)} /><path d="M66 68 q5 4 10 0" fill="none" style={inkStyle(2.4)} /></g>;
  }
  switch (look.eyes) {
    case 'happy':
      return <g><path d="M44 69 q5 -6 10 0" fill="none" style={inkStyle(2.6)} /><path d="M66 69 q5 -6 10 0" fill="none" style={inkStyle(2.6)} /></g>;
    case 'sleepy':
      return (
        <g>
          <ellipse cx="49" cy="68" rx="3.4" ry="2.6" fill="var(--line)" /><ellipse cx="71" cy="68" rx="3.4" ry="2.6" fill="var(--line)" />
          <path d="M44 66 L54 66 M66 66 L76 66" style={inkStyle(2.2)} />
        </g>
      );
    case 'wide':
      return (
        <g>
          <ellipse cx="49" cy="67" rx="6" ry="7" fill="#fff" style={inkStyle(1.8)} /><ellipse cx="71" cy="67" rx="6" ry="7" fill="#fff" style={inkStyle(1.8)} />
          <circle cx="50" cy="68" r="3.2" fill="var(--line)" /><circle cx="72" cy="68" r="3.2" fill="var(--line)" />
          <circle cx="51" cy="66.6" r="1" fill="#fff" /><circle cx="73" cy="66.6" r="1" fill="#fff" />
        </g>
      );
    case 'glasses':
      return (
        <g>
          <circle cx="49" cy="68" r="2.8" fill="var(--line)" /><circle cx="71" cy="68" r="2.8" fill="var(--line)" />
          <circle cx="49" cy="68" r="9" fill="rgba(255,255,255,0.25)" style={inkStyle(2)} /><circle cx="71" cy="68" r="9" fill="rgba(255,255,255,0.25)" style={inkStyle(2)} />
          <path d="M58 68 q2 -2 4 0 M40 66 L28 64 M80 66 L92 64" fill="none" style={inkStyle(1.8)} />
          <path d="M44 63 l3 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="49" cy="68" rx="3.4" ry="4.2" fill="var(--line)" /><ellipse cx="71" cy="68" rx="3.4" ry="4.2" fill="var(--line)" />
          <circle cx="50.2" cy="66.4" r="1.2" fill="#fff" /><circle cx="72.2" cy="66.4" r="1.2" fill="#fff" />
        </g>
      );
  }
}

export function Brows({ look }: { look: CharacterLook }) {
  const c = mix(look.hairColor, '#2b2420', 0.3);
  if (look.brows === 'none') return null;
  if (look.brows === 'bushy') {
    return <g><path d="M42 58 q7 -5 13 -1" stroke={c} stroke-width="4.5" fill="none" stroke-linecap="round" /><path d="M65 57 q6 -4 13 1" stroke={c} stroke-width="4.5" fill="none" stroke-linecap="round" /></g>;
  }
  return <g><path d="M44 59 q5 -3 10 -1" stroke={c} stroke-width="1.8" fill="none" stroke-linecap="round" /><path d="M66 58 q5 -2 10 1" stroke={c} stroke-width="1.8" fill="none" stroke-linecap="round" /></g>;
}

export function Nose({ look }: { look: CharacterLook }) {
  const c = mix(look.skin, '#8a4a3a', 0.25);
  switch (look.nose) {
    case 'long': return <path d="M60 68 Q58 78 63 80 Q60 81 57 79" fill="none" style={inkStyle(1.8)} />;
    case 'round': return <circle cx="60" cy="76" r="5" fill={c} style={inkStyle(1.6)} />;
    default: return <ellipse cx="60" cy="76" rx="3" ry="2.2" fill={c} />;
  }
}

export function Mouth({ look, closed }: { look: CharacterLook; closed: boolean }) {
  if (closed) return <path d="M56 85 q4 2 8 0" fill="none" style={inkStyle(1.8)} />;
  switch (look.mouth) {
    case 'grin':
      return <g><path d="M52 83 Q60 94 68 83 Z" fill="#7a2f2f" style={inkStyle(1.8)} /><path d="M53.5 84 L66.5 84 L65 86.5 L55 86.5 Z" fill="#fff" /></g>;
    case 'gap':
      return <g><path d="M53 83 Q60 92 67 83 Z" fill="#7a2f2f" style={inkStyle(1.8)} /><path d="M54.5 84 L59 84 L59 87 L55.5 87 Z M61.5 84 L65.5 84 L64.5 87 L61.5 87 Z" fill="#fff" /></g>;
    case 'o':
      return <ellipse cx="60" cy="86" rx="3.4" ry="4" fill="#7a2f2f" style={inkStyle(1.6)} />;
    default:
      return <path d="M54 84 q6 6 12 0" fill="none" style={inkStyle(2)} />;
  }
}

export function Cheeks() {
  return <g><ellipse cx="41" cy="79" rx="6" ry="3.6" fill="var(--cheek)" opacity="0.7" /><ellipse cx="79" cy="79" rx="6" ry="3.6" fill="var(--cheek)" opacity="0.7" /></g>;
}

export function Facial({ look }: { look: CharacterLook }) {
  switch (look.facial) {
    case 'moustache':
      return <path d="M60 80 Q52 76 46 81 Q50 86 56 83 Q59 82 60 81 Q61 82 64 83 Q70 86 74 81 Q68 76 60 80 Z" fill={look.hairColor} style={inkStyle(1.6)} />;
    case 'beard':
      return <path d="M30 76 Q32 104 60 106 Q88 104 90 76 Q84 90 72 90 Q66 84 60 86 Q54 84 48 90 Q36 90 30 76 Z" fill={look.hairColor} style={inkStyle(1.8)} />;
    case 'freckles':
      return <g fill={mix(look.skin, '#7a4a2a', 0.5)}>{[[38, 75], [42, 77], [40, 80], [78, 75], [82, 77], [80, 80]].map(([x, y]) => <circle cx={x} cy={y} r="1" />)}</g>;
    case 'mole':
      return <circle cx="74" cy="84" r="1.5" fill="#4a2a20" />;
    default:
      return null;
  }
}

export function FrontHair({ look }: { look: CharacterLook }) {
  const c = look.hairColor;
  const shine = <path d="M42 38 q8 -6 18 -5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.35" />;
  switch (look.hairStyle) {
    case 'short':
      return <g><path d="M26 64 Q24 28 60 28 Q96 28 94 64 Q88 48 74 50 Q66 42 56 48 Q40 44 26 64 Z" fill={c} style={ink} />{shine}</g>;
    case 'curly':
      return (
        <g>
          {[[30, 56], [34, 42], [44, 33], [57, 29], [70, 31], [81, 38], [88, 50], [91, 60], [28, 66]].map(([x, y]) => <circle cx={x} cy={y} r="10" fill={c} style={ink} />)}
          <path d="M34 50 Q60 34 86 50 Q74 46 60 46 Q46 46 34 50 Z" fill={c} />
        </g>
      );
    case 'bun':
      return <g><path d="M27 62 Q26 30 60 30 Q94 30 93 62 Q84 44 60 44 Q36 44 27 62 Z" fill={c} style={ink} /><path d="M48 24 q12 -4 24 0" fill="none" style={thin} />{shine}</g>;
    case 'bald':
      return <g><path d="M27 70 q-2 -12 6 -16 q-2 10 2 16 Z M93 70 q2 -12 -6 -16 q2 10 -2 16 Z" fill={c} style={thin} /><path d="M44 40 q10 -8 22 -6" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6" /></g>;
    case 'braids':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => <ellipse cx={24 - i * 0.5} cy={82 + i * 11} rx="6" ry="7" fill={c} style={thin} />)}
          {[0, 1, 2, 3].map((i) => <ellipse cx={96 + i * 0.5} cy={82 + i * 11} rx="6" ry="7" fill={c} style={thin} />)}
          <circle cx="23" cy="126" r="3.4" fill="var(--g3)" style={thin} /><circle cx="97.5" cy="126" r="3.4" fill="var(--g3)" style={thin} />
          <path d="M26 66 Q24 30 60 30 Q96 30 94 66 Q90 46 60 40 Q30 46 26 66 Z" fill={c} style={ink} />
          <path d="M60 30 L60 42" style={thin} />
        </g>
      );
    case 'mohawk':
      return <path d="M50 40 L46 18 L54 30 L56 10 L62 28 L68 12 L68 30 L76 18 L72 40 Q60 34 50 40 Z" fill={c} style={ink} />;
    case 'long':
      return <g><path d="M24 74 Q22 30 60 28 Q98 30 96 74 Q92 56 84 50 Q70 50 60 40 Q50 50 36 50 Q28 56 24 74 Z" fill={c} style={ink} />{shine}</g>;
    case 'cap':
      return (
        <g>
          <path d="M28 60 Q28 28 60 28 Q92 28 92 60 Z" fill={mix(look.outfit, '#2b2420', 0.25)} style={ink} />
          <path d="M60 50 Q90 46 104 56 Q90 62 60 58 Z" fill={mix(look.outfit, '#2b2420', 0.4)} style={ink} />
          <circle cx="60" cy="29" r="3" fill={mix(look.outfit, '#2b2420', 0.4)} style={thin} />
          <path d="M28 66 q-2 -4 0 -8 M92 66 q2 -4 0 -8" stroke={c} stroke-width="4" stroke-linecap="round" />
        </g>
      );
    default:
      return null;
  }
}

export function Quirk({ look }: { look: CharacterLook }) {
  switch (look.quirk) {
    case 'headscarf':
      return (
        <g>
          <path d="M24 64 Q22 26 60 24 Q98 26 96 64 Q88 42 60 40 Q32 42 24 64 Z" fill="var(--g3)" style={ink} />
          {[[40, 36], [52, 31], [64, 30], [76, 33], [86, 42], [32, 46]].map(([x, y]) => <circle cx={x} cy={y} r="1.6" fill="#fff" />)}
          <path d="M26 62 L12 70 L18 58 Z M26 62 L14 56 L20 68 Z" fill="var(--g3)" style={thin} />
        </g>
      );
    case 'bigHat':
      return (
        <g>
          <ellipse cx="60" cy="40" rx="50" ry="9" fill={mix(look.apron, '#c9a050', 0.55)} style={ink} />
          <path d="M36 40 Q34 12 60 12 Q86 12 84 40 Z" fill={mix(look.apron, '#c9a050', 0.4)} style={ink} />
          <path d="M37 34 Q60 38 83 34 L84 40 Q60 44 36 40 Z" fill="var(--g4)" style={thin} />
        </g>
      );
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((a) => <circle cx={90 + 6 * Math.cos((a * Math.PI) / 180)} cy={44 + 6 * Math.sin((a * Math.PI) / 180)} r="5" fill="var(--g3)" style={thin} />)}
          <circle cx="90" cy="44" r="3.6" fill="var(--sun)" style={thin} />
        </g>
      );
    case 'earring':
      return <circle cx="26" cy="79" r="3.2" fill="none" stroke="var(--g5)" stroke-width="2.2" />;
    case 'pencilEar':
      return (
        <g>
          <path d="M84 60 L104 38 L108 42 L88 64 Z" fill="var(--sun)" style={thin} />
          <path d="M104 38 L110 33 L108 42 Z" fill="var(--clayRaw)" style={thin} />
          <path d="M84 60 L82 66 L88 64 Z" fill="var(--g3)" style={thin} />
        </g>
      );
    case 'bandana':
      return (
        <g>
          <path d="M26 52 Q60 34 94 50 L95 58 Q60 42 25 60 Z" fill="var(--g1)" style={ink} />
          {[34, 46, 58, 70, 82].map((x, i) => <circle cx={x} cy={50 - (i === 2 ? 3 : i % 2 ? 2 : 0)} r="1.4" fill="#fff" />)}
          <path d="M26 56 L12 62 L18 50 Z M26 56 L14 48 L20 62 Z" fill="var(--g1)" style={thin} />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <path d="M42 96 Q60 106 78 96 L80 104 Q60 114 40 104 Z" fill="var(--g2)" style={ink} />
          <path d="M70 104 L76 126 L68 128 L64 106 Z" fill="var(--g2)" style={ink} />
          <path d="M70 124 l1 4 M73 123 l1 4" style={thin} />
        </g>
      );
    default:
      return null;
  }
}
