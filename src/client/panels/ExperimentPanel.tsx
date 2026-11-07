import { useState } from 'preact/hooks';
import type { GameEvent } from '../../shared/actions';
import { MATERIALS } from "../../shared/content";
import { glazeColor, matchEffect } from '../../shared/discovery';
import type { GameState } from '../../shared/types';
import { inkStyle } from '../art/ink';
import { dispatch } from '../store';
import { Button } from '../ui/Button';
import { experimentActionFor, type ExperimentForm } from './studioLogic';

function Tile({ color, effect }: { color: string; effect: string | null }) {
  return (
    <svg viewBox="0 0 120 90" width="150" aria-hidden="true">
      <path d="M10 18 L110 10 L112 78 L8 82 Z" fill={color} style={inkStyle(2.4)} />
      {effect === 'craquele' && <path d="M20 30 l20 8 l10 -12 l18 14 M30 60 l14 -10 l20 6 l16 -8 M70 30 l8 20 l18 4" stroke="#3a2a20" stroke-width="0.8" fill="none" opacity=".5" />}
      {effect === 'kristall' && [[30, 40], [70, 30], [85, 60], [45, 64]].map(([x, y]) => <g stroke="#fffbe8" stroke-width="1.2">{[0, 60, 120].map((a) => <path d={`M${x - 7 * Math.cos(a * Math.PI / 180)} ${y - 7 * Math.sin(a * Math.PI / 180)} L${x + 7 * Math.cos(a * Math.PI / 180)} ${y + 7 * Math.sin(a * Math.PI / 180)}`} />)}</g>)}
      {effect === 'tenmoku' && <path d="M10 18 L110 10 L111 28 Q60 36 9 30 Z" fill="#a4512a" opacity=".8" />}
      <path d="M18 26 l18 -2" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7" />
    </svg>
  );
}

const opt = <T extends string>(v: T, label: string) => ({ v, label });

export function ExperimentPanel({ s }: { s: GameState }) {
  const [f, setF] = useState<ExperimentForm>({ base: 'transparent', colorant: null, colorantPct: 2, temp: 'mittel', atmosphere: 'oxidierend', cooling: 'langsam' });
  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState<{ color: string; effect: string | null; events: GameEvent[] } | null>(null);
  const set = (p: Partial<ExperimentForm>) => { setF({ ...f, ...p }); setResult(null); };
  const colorants = Object.values(MATERIALS).filter((m) => m.kind === 'colorant' && !m.locked && (!m.unlock || s.unlocks.includes(m.unlock)));
  const kiln = s.stations.find((x) => x.kind === 'kiln')!;
  const action = experimentActionFor(f);
  const canAfford = (s.materials.glasurbasis ?? 0) >= 2 && (!f.colorant || (s.materials[f.colorant] ?? 0) >= 1);

  async function fire() {
    setFiring(true);
    setResult(null);
    const [events] = await Promise.all([dispatch(action), new Promise((r) => setTimeout(r, 1500))]);
    setFiring(false);
    const r = action.recipe;
    setResult({ color: glazeColor(r), effect: matchEffect(r), events: events as GameEvent[] });
  }

  const Radio = <T extends string>({ name, items, value, onPick, disabled }: { name: string; items: { v: T; label: string; lock?: boolean }[]; value: T; onPick: (v: T) => void; disabled?: boolean }) => (
    <div class="chips" role="radiogroup" aria-label={name}>
      {items.map((it) => <button class="chip" aria-pressed={it.v === value} disabled={disabled || it.lock} onClick={() => onPick(it.v)}>{it.lock ? '🔒 ' : ''}{it.label}</button>)}
    </div>
  );

  return (
    <div class="experiment">
      <p class="muted">Brenne eine kleine Probekachel – kostet 2 Glasurbasis{f.colorant ? ` und 1 ${MATERIALS[f.colorant].name}` : ''}. Wer weiß, was dabei herauskommt?</p>
      <h4>Basis</h4>
      <Radio name="Basis" items={[opt('transparent', 'transparent'), opt('matt', 'matt'), opt('opak', 'deckend')]} value={f.base} onPick={(v) => set({ base: v })} />
      <h4>Farbkörper</h4>
      <Radio name="Farbkörper" items={[{ v: '', label: 'keiner' }, ...colorants.map((m) => ({ v: m.id, label: m.name }))]} value={f.colorant ?? ''} onPick={(v) => set({ colorant: v || null })} />
      {colorants.length === 0 && <p class="muted" style={{ fontSize: '.9em' }}>Farbkörper bringt der Händler nach fünf erledigten Aufträgen.</p>}
      {f.colorant && <label class="slider"><span>Anteil: {f.colorantPct} %</span><input type="range" min={0} max={10} step={1} value={f.colorantPct} onInput={(e) => set({ colorantPct: Number(e.currentTarget.value) })} /></label>}
      <h4>Brand</h4>
      <Radio name="Temperatur" items={[opt('niedrig', 'niedrig'), opt('mittel', 'mittel'), { v: 'hoch' as const, label: 'hoch', lock: kiln.level < 2 }]} value={f.temp} onPick={(v) => set({ temp: v })} />
      <Radio name="Luft" items={[opt('oxidierend', 'viel Luft'), { v: 'reduzierend' as const, label: 'wenig Luft (Reduktion)', lock: !s.unlocks.includes('reduktion') }]} value={f.atmosphere} onPick={(v) => set({ atmosphere: v })} />
      <Radio name="Abkühlen" items={[opt('schnell', 'schnell abkühlen'), opt('langsam', 'langsam abkühlen')]} value={f.cooling} onPick={(v) => set({ cooling: v })} />
      <div class="bench">
        <div class={`mini-kiln ${firing ? 'firing' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 120 110" width="120"><path d="M10 105 L10 50 Q10 8 60 8 Q110 8 110 50 L110 105 Z" fill="var(--kiln)" style={inkStyle(2.4)} /><path d="M34 105 L34 64 Q34 40 60 40 Q86 40 86 64 L86 105 Z" fill="var(--kilnInside)" style={inkStyle(2)} />{firing && <path class="flame" d="M44 104 Q38 84 52 72 Q52 86 60 84 Q58 62 72 54 Q74 78 80 90 Q82 98 76 104 Z" fill="var(--fire)" style={inkStyle(1.6)} />}</svg>
        </div>
        <div class="tile-result">
          {result ? (
            <div class="reveal">
              <Tile color={result.color} effect={result.effect} />
              {result.events.map((e) => <p class={e.kind === 'discovery' ? 'discovery-text' : e.kind === 'hint' ? 'hint-text' : ''}>{e.text}</p>)}
              {result.events.length === 0 && <p class="muted">Diese Glasur kennst du schon.</p>}
            </div>
          ) : <p class="muted">{firing ? 'Der Ofen glüht …' : 'Bereit für einen Versuch.'}</p>}
        </div>
      </div>
      <Button variant="primary" disabled={firing || !canAfford} onClick={fire}>{canAfford ? 'Brennen!' : 'Material fehlt – ab in den Laden'}</Button>
    </div>
  );
}
