import { inkStyle } from '../art/ink';

const S = inkStyle(2);
type IconName = 'orders' | 'workshop' | 'people' | 'studio' | 'recipes' | 'shop' | 'lock' | 'menu' | 'village';

/** Small hand-drawn toolbar icons (32×32). */
export function Icon({ name, size = 32 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible' }}>
      {name === 'orders' && <g><path d="M7 4 L25 4 L25 28 L7 28 Z" fill="#fff8ec" style={S} /><path d="M11 10 L21 10 M11 15 L21 15 M11 20 L17 20" style={inkStyle(1.6)} /><circle cx="16" cy="4" r="2.5" fill="var(--g3)" style={inkStyle(1.4)} /></g>}
      {name === 'workshop' && <g><path d="M4 28 L4 14 Q4 4 16 4 Q28 4 28 14 L28 28 Z" fill="var(--kiln)" style={S} /><path d="M11 28 L11 20 Q11 15 16 15 Q21 15 21 20 L21 28 Z" fill="var(--kilnInside)" style={inkStyle(1.6)} /><path d="M14 27 q-1 -5 2 -8 q3 3 2 8 Z" fill="var(--fire)" /></g>}
      {name === 'people' && <g><circle cx="16" cy="11" r="7" fill="var(--skin)" style={S} /><path d="M5 29 Q6 19 16 19 Q26 19 27 29 Z" fill="var(--g1)" style={S} /><circle cx="13.5" cy="11" r="1" fill="var(--line)" /><circle cx="18.5" cy="11" r="1" fill="var(--line)" /></g>}
      {name === 'studio' && <g><path d="M7 25 L22 6 L26 10 L11 29 L6 30 Z" fill="var(--sun)" style={S} /><path d="M22 6 L26 10" style={S} /><path d="M7 25 L11 29" style={inkStyle(1.4)} /></g>}
      {name === 'recipes' && <g><path d="M4 7 Q10 4 16 7 Q22 4 28 7 L28 27 Q22 24 16 27 Q10 24 4 27 Z" fill="#fff8ec" style={S} /><path d="M16 7 L16 27" style={inkStyle(1.6)} /><circle cx="10" cy="14" r="3" fill="var(--g1)" /><circle cx="22" cy="14" r="3" fill="var(--g3)" /></g>}
      {name === 'shop' && <g><path d="M6 11 L26 11 L24 29 L8 29 Z" fill="var(--g5)" style={S} /><path d="M11 13 Q11 3 16 3 Q21 3 21 13" fill="none" style={S} /></g>}
      {name === 'lock' && <g><rect x="7" y="14" width="18" height="14" rx="3" fill="var(--g5)" style={S} /><path d="M11 14 V10 Q11 5 16 5 Q21 5 21 10 V14" fill="none" style={S} /><circle cx="16" cy="21" r="2" fill="var(--line)" /></g>}
      {name === 'village' && <g><path d="M3 28 L3 16 L10 9 L17 16 L17 28 Z" fill="#fbf0dc" style={S} /><path d="M1 17 L10 7 L19 17" fill="none" stroke="var(--kiln)" stroke-width="3" stroke-linecap="round" /><path d="M17 28 L17 19 L23 13 L30 19 L30 28 Z" fill="#fbf0dc" style={S} /><path d="M15 20 L23 11 L31 20" fill="none" stroke="var(--g1)" stroke-width="3" stroke-linecap="round" /><path d="M8 28 L8 22 L12 22 L12 28" fill="var(--woodDark)" /></g>}
      {name === 'menu' && <g><path d="M6 9 L26 9 M6 16 L26 16 M6 23 L26 23" style={inkStyle(2.6)} /></g>}
    </svg>
  );
}
