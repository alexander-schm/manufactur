import { MATERIALS } from '../../../shared/content';
import type { GameState } from '../../../shared/types';
import type { Give, GiveRef } from '../../../shared/village/types';
import { DesignPot } from '../common';

export const SWATCH: Record<string, string> = { ton: '#c8784c', glasurbasis: '#f4efe4', eisenoxid: '#a4512a', kupferoxid: '#4f8a5c', kobalt: '#2a4f9a', holz: '#a96e42', kaolin: '#ffffff' };
export const TRADEABLE = Object.values(MATERIALS).filter((m) => !m.locked).map((m) => m.id);

/** A small picture + text for a give. */
export function GiveChip({ g, s }: { g: Give | GiveRef; s?: GameState }) {
  if (g.kind === 'taler') return <span class="give-chip">🪙 {g.amount} Taler</span>;
  if (g.kind === 'material') return <span class="give-chip"><span class="mat-dot" style={{ background: SWATCH[g.material] }} />{g.count} {MATERIALS[g.material]?.name}</span>;
  if ('stack' in g) {
    return <span class="give-chip">{s && <DesignPot s={s} d={g.stack.design} size={34} />}{g.stack.count}× {g.stack.design.name} <span class="muted">von {g.stack.makerName}</span></span>;
  }
  const d = s?.designs.find((x) => x.id === g.designId);
  return <span class="give-chip">{s && d && <DesignPot s={s} d={d} size={34} />}{g.count}× {d?.name ?? 'Ware'}</span>;
}

export type PickerValue = { kind: 'material'; material: string } | { kind: 'goods'; idx: number } | { kind: 'taler' };

/** Choose what to give: a material, a shelf stack, or Taler. */
export function GivePicker({ s, value, onChange, allowGoods = true, allowTaler = true }: { s: GameState; value: PickerValue; onChange: (v: PickerValue) => void; allowGoods?: boolean; allowTaler?: boolean }) {
  return (
    <div class="chips give-picker">
      {TRADEABLE.map((m) => (
        <button class="chip" aria-pressed={value.kind === 'material' && value.material === m} onClick={() => onChange({ kind: 'material', material: m })}>
          <span class="mat-dot" style={{ background: SWATCH[m] }} />{MATERIALS[m].name} <span class="muted">({Math.floor(s.materials[m] ?? 0)})</span>
        </button>
      ))}
      {allowTaler && <button class="chip" aria-pressed={value.kind === 'taler'} onClick={() => onChange({ kind: 'taler' })}>🪙 Taler</button>}
      {allowGoods && s.goods.map((g, i) => {
        const d = s.designs.find((x) => x.id === g.designId);
        return d ? <button class="chip" aria-pressed={value.kind === 'goods' && value.idx === i} onClick={() => onChange({ kind: 'goods', idx: i })}><DesignPot s={s} d={d} size={28} />{d.name} ({g.count})</button> : null;
      })}
    </div>
  );
}

export function toRef(s: GameState, v: PickerValue, count: number): GiveRef | null {
  if (v.kind === 'taler') return { kind: 'taler', amount: count };
  if (v.kind === 'material') return { kind: 'material', material: v.material, count };
  const g = s.goods[v.idx];
  return g ? { kind: 'goods', designId: g.designId, quality: g.quality, effect: g.effect, count } : null;
}

export function haveEnough(s: GameState, g: GiveRef): boolean {
  if (g.kind === 'taler') return s.taler >= g.amount;
  if (g.kind === 'material') return (s.materials[g.material] ?? 0) >= g.count;
  return (s.goods.find((x) => x.designId === g.designId && x.quality === g.quality && x.effect === g.effect)?.count ?? 0) >= g.count;
}
