import { useEffect, useState } from 'preact/hooks';
import { characterName, makeCharacter } from '../../shared/character';
import { FORMS } from '../../shared/content';
import { hashSeed } from '../../shared/rng';
import type { Design, GameState, MakerMark, PatternKind, ProfileParams } from '../../shared/types';
import { Character } from '../art/character/Character';
import { Pot } from '../art/Pot';
import { dispatch, view } from '../store';
import { Button } from '../ui/Button';
import { Tabs } from '../ui/Tabs';
import { ExperimentPanel } from './ExperimentPanel';
import { describeTaste } from './logic';
import { difficultyLabel, PATTERN_COLORS, PRESETS, saveActionFor, topFans } from './studioLogic';

export function DesignPreview({ s, draft, size = 220 }: { s: GameState; draft: Design; size?: number }) {
  const glaze = s.glazes.find((g) => g.id === draft.glazeId);
  return (
    <div class="studio-preview">
      <Pot design={draft} glazeColor={glaze?.color ?? '#e9c9a6'} effect={glaze?.effect} size={size} fit mark={s.makerMark} title={draft.name} />
    </div>
  );
}

const SLIDERS: [keyof ProfileParams, string][] = [['height', 'Höhe'], ['belly', 'Bauch'], ['neck', 'Hals'], ['foot', 'Fuß'], ['rim', 'Rand']];
const PATTERNS: [PatternKind, string, string?][] = [['none', 'ohne'], ['stripes', 'Streifen'], ['dots', 'Punkte'], ['waves', 'Wellen', 'patterns2'], ['leaves', 'Blätter', 'patterns2']];
const HANDLES: [Design['handle'], string, string?][] = [['none', 'ohne'], ['round', 'rund'], ['ear', 'Ohr', 'formdetails'], ['loop', 'Schlaufe', 'formdetails']];
const RIMS: [Design['rim'], string, string?][] = [['plain', 'schlicht'], ['rolled', 'gerollt', 'formdetails'], ['flared', 'ausgestellt', 'formdetails']];

function newDraft(s: GameState): Design {
  return { ...s.designs[0], id: 'neu', name: 'Neuer Entwurf', pattern: 'none' };
}

function Chooser<T extends string>({ s, items, value, onPick }: { s: GameState; items: [T, string, string?][]; value: T; onPick: (v: T) => void }) {
  return (
    <div class="chips">
      {items.map(([v, label, unlock]) => {
        const locked = !!unlock && !s.unlocks.includes(unlock);
        return <button class="chip" aria-pressed={v === value} disabled={locked} title={locked ? 'Noch nicht freigeschaltet' : undefined} onClick={() => onPick(v)}>{locked ? '🔒 ' : ''}{label}</button>;
      })}
    </div>
  );
}

function Designer({ s }: { s: GameState }) {
  const [draft, setDraft] = useState<Design>(() => newDraft(s));
  const set = (patch: Partial<Design>) => setDraft((d) => ({ ...d, ...patch }));
  const form = FORMS[draft.form];
  const fans = topFans(s, draft);
  const editing = s.designs.some((d) => d.id === draft.id);
  const forms = Object.values(FORMS).filter((f) => s.unlocks.includes(f.unlock));
  return (
    <div class="studio">
      <div class="studio-left">
        <DesignPreview s={s} draft={draft} />
        <label class="field"><span>Name</span><input value={draft.name} maxLength={30} onInput={(e) => set({ name: e.currentTarget.value })} /></label>
        <p class="muted" style={{ fontSize: '.9em' }}>Schwierigkeit: <strong>{difficultyLabel(draft)}</strong> – schwierige Stücke dauern länger, bringen aber mehr.</p>
        {fans.length > 0 && (
          <div class="fans">
            <strong>Beliebt bei …</strong>
            {fans.map(({ order, appeal }) => (
              <div class="card-row" title={describeTaste(order.taste, order.form, order.count)}>
                <Character look={makeCharacter(order.customerSeed)} pose={appeal > 0.75 ? 'wave' : 'idle'} seed={order.customerSeed} size={30} wobble={false} />
                <span class="grow">{order.customerName}</span>
                <span>{appeal > 0.75 ? '♥♥♥' : appeal > 0.4 ? '♥♥' : '♥'}</span>
              </div>
            ))}
          </div>
        )}
        <div class="row">
          <Button variant="primary" onClick={async () => { await dispatch(saveActionFor(draft)); if (!editing) setDraft(newDraft(view.value ?? s)); }}>{editing ? 'Änderungen speichern' : 'Entwurf speichern'}</Button>
        </div>
      </div>
      <div class="studio-right">
        <h4>Deine Entwürfe</h4>
        <div class="chips">
          <button class="chip" aria-pressed={!editing} onClick={() => setDraft(newDraft(s))}>+ Neu</button>
          {s.designs.map((d) => <button class="chip" aria-pressed={d.id === draft.id} onClick={() => setDraft({ ...d })}>{d.name}</button>)}
        </div>
        <h4>Form</h4>
        <div class="chips">
          {forms.map((f) => <button class="chip" aria-pressed={f.id === draft.form} onClick={() => set({ form: f.id, profile: { ...f.profileDefaults }, handle: f.handleAllowed ? (draft.handle === 'none' ? 'round' : draft.handle) : 'none' })}>{f.name}</button>)}
        </div>
        <div class="chips" style={{ marginTop: '6px' }}>
          {PRESETS.map((p) => <button class="chip small" onClick={() => set({ profile: p.profile(form.profileDefaults) })}>{p.name}</button>)}
        </div>
        {SLIDERS.map(([k, label]) => (
          <label class="slider"><span>{label}</span>
            <input type="range" min={0} max={1} step={0.01} value={draft.profile[k]} onInput={(e) => set({ profile: { ...draft.profile, [k]: Number(e.currentTarget.value) } })} />
          </label>
        ))}
        {form.handleAllowed && <><h4>Henkel</h4><Chooser s={s} items={HANDLES} value={draft.handle} onPick={(v) => set({ handle: v })} /></>}
        <h4>Rand</h4><Chooser s={s} items={RIMS} value={draft.rim} onPick={(v) => set({ rim: v })} />
        <h4>Glasur</h4>
        <div class="swatches">
          {s.glazes.map((g) => <button class="swatch" aria-pressed={g.id === draft.glazeId} title={g.name} style={{ background: g.color }} onClick={() => set({ glazeId: g.id })}>{g.effect ? '✦' : ''}</button>)}
        </div>
        <h4>Muster</h4>
        <Chooser s={s} items={PATTERNS} value={draft.pattern} onPick={(v) => set({ pattern: v })} />
        {draft.pattern !== 'none' && (
          <div class="swatches" style={{ marginTop: '6px' }}>
            {PATTERN_COLORS.map((c) => <button class="swatch small" aria-pressed={c === draft.patternColor} style={{ background: c }} onClick={() => set({ patternColor: c })} aria-label={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function MarkAndAvatar({ s }: { s: GameState }) {
  const [mark, setMark] = useState<MakerMark>(s.makerMark);
  const [seed, setSeed] = useState(s.avatarSeed);
  useEffect(() => setMark(s.makerMark), [s.makerMark]);
  const shapes: [MakerMark['shape'], string, string?][] = [['circle', 'Kreis'], ['heart', 'Herz', 'zeichen'], ['star', 'Stern', 'zeichen'], ['leaf', 'Blatt', 'zeichen']];
  return (
    <div class="studio">
      <div class="studio-left">
        <h4>Dein Meisterzeichen</h4>
        <p class="muted" style={{ fontSize: '.9em' }}>Es steht auf jedem Stück, das du machst.</p>
        <Pot design={s.designs[0]} glazeColor={s.glazes.find((g) => g.id === s.designs[0].glazeId)?.color ?? '#e9c9a6'} size={150} fit mark={mark} />
        <Chooser s={s} items={shapes} value={mark.shape} onPick={(v) => setMark({ ...mark, shape: v })} />
        <label class="field" style={{ marginTop: '8px' }}><span>Buchstabe</span><input value={mark.letter} maxLength={1} onInput={(e) => setMark({ ...mark, letter: e.currentTarget.value.toUpperCase().replace(/[^A-ZÄÖÜ]/g, '') || mark.letter })} /></label>
        <div class="swatches">{PATTERN_COLORS.slice(1).map((c) => <button class="swatch small" aria-pressed={c === mark.color} style={{ background: c }} onClick={() => setMark({ ...mark, color: c })} aria-label={c} />)}</div>
        <Button variant="primary" onClick={() => dispatch({ type: 'setMakerMark', mark })}>Zeichen übernehmen</Button>
      </div>
      <div class="studio-right">
        <h4>So siehst du aus</h4>
        <Character look={makeCharacter(seed)} pose="wave" seed={seed} size={120} />
        <p class="muted">Im Dorf erkennt man dich daran. (Vorschlag: „{characterName(seed)}“-Stil)</p>
        <div class="row">
          <Button onClick={() => setSeed(hashSeed(seed, Date.now() & 0xffff))}>Anders würfeln</Button>
          <Button variant="primary" disabled={seed === s.avatarSeed} onClick={() => dispatch({ type: 'setAvatar', seed })}>Das bin ich!</Button>
        </div>
      </div>
    </div>
  );
}

export function DesignStudio({ s, tab: initial }: { s: GameState; tab?: string }) {
  const [tab, setTab] = useState<'design' | 'glaze' | 'me'>(initial === 'glaze' ? 'glaze' : initial === 'me' ? 'me' : 'design');
  return (
    <div>
      <Tabs tabs={[{ id: 'design', label: 'Entwerfen' }, { id: 'glaze', label: 'Glasurversuch' }, { id: 'me', label: 'Zeichen & Ich' }]} value={tab} onChange={setTab} />
      <div class="tab-body">
        {tab === 'design' && <Designer s={s} />}
        {tab === 'glaze' && <ExperimentPanel s={s} />}
        {tab === 'me' && <MarkAndAvatar s={s} />}
      </div>
    </div>
  );
}
