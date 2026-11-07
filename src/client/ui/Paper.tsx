import type { ComponentChildren, CSSProperties, HTMLAttributes } from 'preact';
import { wobblyRadius } from '../art/ink';

type Props = { children: ComponentChildren; tilt?: 'l' | 'r'; tape?: boolean; seed?: number; class?: string; style?: CSSProperties } & Omit<HTMLAttributes<HTMLDivElement>, 'style'>;

export function Paper({ children, tilt, tape, seed = 1, class: cls = '', style, ...rest }: Props) {
  return (
    <div {...rest} class={`paper ${tilt ? `tilt-${tilt}` : ''} ${cls}`} style={{ borderRadius: wobblyRadius(seed), ...style }}>
      {tape && <span class="tape" aria-hidden="true" />}
      {children}
    </div>
  );
}
