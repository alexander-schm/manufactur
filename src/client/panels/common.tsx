import { FORMS } from '../../shared/content';
import type { Design, GameState, GoodsStack } from '../../shared/types';
import { Pot } from '../art/Pot';
import { QUALITY_LABEL } from './logic';

export function designGlaze(s: GameState, d: Design) {
  return s.glazes.find((g) => g.id === d.glazeId);
}

/** The colour a design is drawn in — gifted designs bring their own. */
export function designColor(s: GameState, d: Design): string {
  return d.origin?.glazeColor ?? designGlaze(s, d)?.color ?? '#e9c9a6';
}

export function DesignPot({ s, d, size = 64, effect, quality }: { s: GameState; d: Design; size?: number; effect?: string | null; quality?: 1 | 2 | 3 }) {
  return <Pot design={d} glazeColor={designColor(s, d)} effect={effect} quality={quality} size={size} fit wobble={false} mark={size >= 90 ? d.origin?.makerMark ?? s.makerMark : null} />;
}

export function Stars({ n }: { n: 1 | 2 | 3 }) {
  return <span class="stars" title={QUALITY_LABEL[n]} aria-label={`Qualität: ${QUALITY_LABEL[n]}`}>{'★'.repeat(n)}{'☆'.repeat(3 - n)}</span>;
}

export function GoodsItem({ s, g, children }: { s: GameState; g: GoodsStack; children?: preact.ComponentChildren }) {
  const d = s.designs.find((x) => x.id === g.designId);
  if (!d) return null;
  return (
    <div class="goods-item">
      <DesignPot s={s} d={d} size={70} effect={g.effect} quality={g.quality} />
      <div><strong>{g.count}×</strong> {d.name}</div>
      <div><Stars n={g.quality} />{g.effect && <span class="badge">✦ {g.effect}</span>}</div>
      {children}
    </div>
  );
}

export const formPlural = (id: string) => FORMS[id]?.plural ?? id;
