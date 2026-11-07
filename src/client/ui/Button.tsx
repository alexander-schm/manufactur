import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';
import { wobblyRadius } from '../art/ink';

type Props = { variant?: 'primary' | 'quiet' | 'good'; small?: boolean; seed?: number; children: ComponentChildren } & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, small, seed = 7, children, class: cls = '', ...rest }: Props) {
  return (
    <button type="button" {...rest} class={`btn ${variant ?? ''} ${small ? 'small' : ''} ${cls}`} style={{ borderRadius: wobblyRadius(seed) }}>
      {children}
    </button>
  );
}
