import { BODIES, bodyAvailable, getTier } from '../../shared/content';
import { bodyGateError } from '../../shared/design';
import type { BodyId, GameState } from '../../shared/types';
import { inkStyle } from '../art/ink';

const SPECKLES: [number, number][] = [[24, 30], [40, 22], [52, 34], [34, 40], [18, 38], [46, 42]];

/** A small clay lump in the colour of the body; stoneware shows its dark iron speckles, porcelain a soft glow. */
function Lump({ color, speckled, glow }: { color: string; speckled: boolean; glow: boolean }) {
  return (
    <svg viewBox="0 0 70 54" width="64" aria-hidden="true">
      {glow && <ellipse data-glow cx="35" cy="32" rx="35" ry="25" fill="url(#porcelain-glow)" />}
      <path d="M6 40 Q4 22 20 14 Q34 6 50 14 Q66 22 64 40 Q60 50 36 50 Q10 50 6 40 Z" fill={color} style={inkStyle(1.8)} />
      <path d="M16 26 Q22 18 32 16" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55" />
      {speckled && SPECKLES.map(([x, y]) => <circle cx={x + 6} cy={y} r="1.3" fill="#4a3d33" />)}
    </svg>
  );
}

export function BodyPicker({ s, value, onPick }: { s: GameState; value: BodyId; onPick: (b: BodyId) => void }) {
  const bodies = Object.values(BODIES);
  const locked = bodies.filter((b) => !bodyAvailable(s, b.id));
  return (
    <div class="body-picker">
      <div class="chips" role="radiogroup" aria-label="Tonsorte">
        {bodies.map((b) => {
          const open = bodyAvailable(s, b.id);
          return (
            <button class="body-lump" role="radio" aria-checked={b.id === value} aria-pressed={b.id === value} disabled={!open} title={open ? b.description : bodyGateError(s, b.id) ?? undefined} onClick={() => onPick(b.id)}>
              <Lump color={b.clearColor} speckled={b.id === 'steinzeug'} glow={b.id === 'porzellan'} />
              <strong>{b.name}</strong>
              <span class="muted">{open ? b.description : `ab ${getTier(b.tier).name}`}</span>
            </button>
          );
        })}
      </div>
      {locked.map((b) => <p class="muted" style={{ fontSize: '.9em' }}>{bodyGateError(s, b.id)}</p>)}
    </div>
  );
}
