import type { CharacterLook } from '../../../shared/character';
import { Arms, BackHair, Brows, Cheeks, Eyes, Facial, FrontHair, Head, Legs, Mouth, Nose, Quirk, Torso } from './parts';
import './character.css';

export type Pose = 'idle' | 'work' | 'wave' | 'sleep';

type Props = { look: CharacterLook; pose?: Pose; seed?: number; size?: number | string; title?: string; class?: string; wobble?: boolean };

/** A complete person. Feet at the bottom centre of the box. */
export function Character({ look, pose = 'idle', seed = 0, size = 120, title, class: cls, wobble = true }: Props) {
  const closed = pose === 'sleep';
  const delay = `${-((seed % 4000) / 1000).toFixed(2)}s`;
  const h = look.heightMul;
  const scale = `translate(60 196) scale(${h.toFixed(3)}) translate(-60 -196)`;
  return (
    <svg viewBox="-8 -4 136 204" width={size} height={typeof size === 'number' ? size * 1.5 : undefined} class={`character ${cls ?? ''}`} role="img"
      aria-label={title ?? 'Person'} data-character data-pose={pose} style={{ overflow: 'visible' }}>
      {title && <title>{title}</title>}
      <ellipse cx="60" cy="197" rx="30" ry="5" fill="url(#hatch)" opacity="0.45" />
      <g transform={scale} filter={wobble ? 'url(#wobble-soft)' : undefined}>
        <g class={`ch-body ch-${pose}`} style={{ animationDelay: delay }}>
          <BackHair look={look} />
          <Legs look={look} />
          <Torso look={look} />
          {look.quirk === 'scarf' && <Quirk look={look} />}
          <Arms look={look} pose={pose} />
          <g class="ch-head" transform={pose === 'sleep' ? 'rotate(9 60 98)' : undefined}>
            <Head look={look} />
            <Cheeks />
            <Facial look={look} />
            <g class="ch-eyes" style={{ animationDelay: delay }}>
              <Eyes look={look} closed={closed} />
            </g>
            <Brows look={look} />
            <Nose look={look} />
            <Mouth look={look} closed={closed} />
            <FrontHair look={look} />
            {look.quirk !== 'scarf' && <Quirk look={look} />}
          </g>
        </g>
      </g>
      {pose === 'sleep' && (
        <g class="ch-z" font-family="var(--font-hand)" fill="var(--line)">
          <text x="96" y="40" font-size="18" opacity="0.7">z</text>
          <text x="106" y="24" font-size="13" opacity="0.55">z</text>
          <text x="113" y="12" font-size="9" opacity="0.4">z</text>
        </g>
      )}
    </svg>
  );
}
