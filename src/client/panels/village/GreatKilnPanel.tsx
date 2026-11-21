import { useState } from 'preact/hooks';
import { makeCharacter } from '../../../shared/character';
import { EFFECTS, FORMS, MATERIALS } from '../../../shared/content';
import { fmtTaler } from '../../../shared/format';
import { masterworkBusy, masterworkNeed, masterworkPrice, predictMasterwork, PRESTIGE_NAME } from '../../../shared/masterwork';
import { buyError } from '../../../shared/shop';
import type { GameState } from '../../../shared/types';
import { ownDesigns } from '../../../shared/village/apply';
import { GREAT_KILN_CAPACITY, heatFor, KILN_FIRING_MS, kilnCost, kilnPieces, KILN_WOOD_MAX, KILN_WOOD_MIN, shareLeft } from '../../../shared/village/kiln';
import type { GreatKiln, VillageView } from '../../../shared/village/types';
import { Pot } from '../../art/Pot';
import { Character } from '../../art/character/Character';
import { Medal } from '../../art/workshop/Plinth';
import { hhmm, T } from '../../strings';
import { Button } from '../../ui/Button';
import { Paper } from '../../ui/Paper';
import { villageDispatch } from '../../villageStore';
import { DesignPot } from '../common';

const WOODS = Array.from({ length: KILN_WOOD_MAX - KILN_WOOD_MIN + 1 }, (_, i) => KILN_WOOD_MIN + i);

/** When the fire is (or, if the village has not ticked yet, will be) out; null while it is not burning. */
function fireDoneAt(k: GreatKiln, now: number): number | null {
  if (k.doneAt !== null) return k.doneAt;
  return k.firesAt !== null && k.firesAt <= now && k.loads.length > 0 ? k.firesAt + KILN_FIRING_MS : null;
}

function stateLine(k: GreatKiln, now: number): string {
  const done = fireDoneAt(k, now);
  if (done !== null) return T.vl.kilnFiring(hhmm(done));
  if (k.loads.length === 0 || k.firesAt === null) return T.vl.kilnEmpty;
  return T.vl.kilnLoading(kilnPieces(k), GREAT_KILN_CAPACITY, hhmm(k.firesAt));
}

function WoodPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div class="chips" role="group" aria-label={T.vl.woodPer}>
      {WOODS.map((n) => <button class="chip small wood-chip" aria-pressed={n === value} onClick={() => onChange(n)}>{n} 🪵</button>)}
    </div>
  );
}

function costText(need: Record<string, number>): string {
  return Object.entries(need).filter(([, n]) => n > 0).map(([m, n]) => `${n} ${MATERIALS[m]?.name ?? m}`).join(', ');
}

/** The great kiln: who is in it, how hot it will burn, putting own pieces (or the masterwork) in, and the last firing. */
export function GreatKilnPanel({ v, s, meId, now }: { v: VillageView; s: GameState; meId: string; now: number }) {
  const k = v.greatKiln;
  const firing = fireDoneAt(k, now) !== null;
  const pieces = kilnPieces(k);
  const mine = Math.max(0, shareLeft(k, meId));
  const maxCount = Math.max(0, Math.min(mine, GREAT_KILN_CAPACITY - pieces));
  const designs = ownDesigns(s);
  const [designId, setDesignId] = useState(designs[0]?.id);
  const [countRaw, setCount] = useState(5);
  const [woodPer, setWoodPer] = useState(4);
  const design = designs.find((d) => d.id === designId) ?? designs[0];
  const count = Math.max(0, Math.min(countRaw, maxCount));
  const canLoad = !firing && !!design && count > 0;
  const cost = canLoad ? kilnCost(s, design, count, count * woodPer) : null;
  const affordable = !!cost && typeof cost !== 'string' && cost.taler <= s.taler;

  // expected heat: the fire as it stands, plus what this player is about to load
  const who = new Set(k.loads.map((l) => l.playerId));
  const wood = k.loads.reduce((n, l) => n + l.wood, 0);
  if (canLoad) who.add(meId);
  const heat = firing && k.heat !== null ? k.heat : heatFor(who.size, wood + (canLoad ? count * woodPer : 0), pieces + (canLoad ? count : 0));

  return (
    <div class="great-kiln-panel">
      <Paper tape seed={23} class="joint-card">
        <h3 style={{ margin: 0 }}>{T.vl.tabs.kiln}</h3>
        <p class="kiln-state" data-kiln-state={firing ? 'firing' : pieces ? 'loading' : 'empty'}>{stateLine(k, now)}</p>
        <div class="progressbar kiln-fill" aria-hidden="true"><div style={{ width: `${(pieces / GREAT_KILN_CAPACITY) * 100}%` }} /></div>
        <div class="kiln-heat">
          <strong>{T.vl.heat(Math.round(heat * 100))}</strong>
          <div class="progressbar heat-bar" aria-hidden="true"><div style={{ width: `${Math.round(heat * 100)}%` }} /></div>
          <span class="muted">{T.vl.heatHint}</span>
        </div>
        {k.loads.length > 0 && (
          <div class="kiln-loads">
            {k.loads.map((l) => {
              const m = v.members.find((x) => x.playerId === l.playerId);
              return (
                <div class="kiln-load" data-load={l.playerId}>
                  <Pot design={l.design} glazeColor={l.glazeColor} size={40} fit wobble={false} />
                  <span><strong>{l.count}×</strong> {l.design.name}{l.masterwork ? ' ✦' : ''}</span>
                  {m && <span class="muted kiln-maker"><Character look={makeCharacter(m.avatarSeed)} pose="idle" seed={m.avatarSeed} size={18} wobble={false} />{m.playerId === meId ? 'du' : m.name}</span>}
                </div>
              );
            })}
          </div>
        )}
      </Paper>

      <section class="panel-section">
        <h3>{T.vl.loadTitle}</h3>
        {firing ? <p class="muted">{T.vl.firingWait}</p>
          : designs.length === 0 ? <p class="muted">{T.vl.noOwnDesigns}</p>
          : maxCount === 0 ? <p class="muted">{mine === 0 ? T.vl.shareFull : T.vl.kilnFull}</p>
          : (
            <div class="kiln-form">
              <p class="muted" style={{ fontSize: '.9em' }}>{T.vl.loadHint}</p>
              <div class="chips kiln-designs">
                {designs.map((d) => <button class="chip design-chip" aria-pressed={d.id === design?.id} onClick={() => setDesignId(d.id)}><DesignPot s={s} d={d} size={28} />{d.name}</button>)}
              </div>
              <label class="slider"><span>{count} {T.vl.count}</span><input type="range" min={1} max={maxCount} value={count} onInput={(e) => setCount(Number(e.currentTarget.value))} /></label>
              <strong>{T.vl.woodPer}</strong>
              <WoodPicker value={woodPer} onChange={setWoodPer} />
              {cost && (
                <p class="kiln-cost">
                  {typeof cost === 'string' ? <span class="muted">{cost}</span>
                    : <>{T.vl.cost}: {costText(cost.need)}{cost.taler > 0 && <> · <strong>{fmtTaler(cost.taler)} Taler</strong></>}</>}
                </p>
              )}
              <Button variant="primary" disabled={!canLoad || !affordable} onClick={() => design && villageDispatch({ type: 'loadKiln', designId: design.id, count, wood: count * woodPer })}>{T.vl.load}</Button>
            </div>
          )}
      </section>

      {s.commission && <MasterworkLoad s={s} disabled={firing || maxCount === 0} />}

      {v.lastFiring && (
        <section class="panel-section last-firing">
          <h3>{T.vl.lastFiring}</h3>
          <p>{T.vl.lastFiringLine(v.lastFiring.pieces, v.lastFiring.contributors.length, Math.round(v.lastFiring.heat * 100))} <span class="muted">· {hhmm(v.lastFiring.at)}</span></p>
          {v.lastFiring.best && (
            <p class="hand-note">{T.vl.bestPiece(
              v.members.find((m) => m.playerId === v.lastFiring!.best!.playerId)?.name ?? '?',
              FORMS[v.lastFiring.best.form]?.name ?? v.lastFiring.best.designName,
              v.lastFiring.best.effect ? EFFECTS[v.lastFiring.best.effect]?.name ?? null : null,
            )}</p>
          )}
        </section>
      )}
    </div>
  );
}

/** Put the commission's masterwork into the great kiln: it takes the player's one masterwork slot. */
function MasterworkLoad({ s, disabled }: { s: GameState; disabled: boolean }) {
  const designs = ownDesigns(s);
  const best = [...designs].sort((a, b) => predictMasterwork(s, b).met.filter(Boolean).length - predictMasterwork(s, a).met.filter(Boolean).length)[0];
  const [pickedId, setPicked] = useState(best?.id);
  const [wood, setWood] = useState(4);
  const picked = designs.find((d) => d.id === pickedId) ?? best;
  if (s.kilnMasterwork) return <section class="panel-section"><h3>{T.vl.mwTitle}</h3><p class="muted">{T.vl.mwInKiln}</p></section>;
  if (masterworkBusy(s)) return <section class="panel-section"><h3>{T.vl.mwTitle}</h3><p class="muted">{T.vl.mwBusy}</p></section>;
  if (!picked) return null;
  const price = masterworkPrice(s, picked, { holz: wood });
  const prestige = predictMasterwork(s, picked).prestige;
  // a missing material that the shop does not sell yet blocks the masterwork, just like on the server
  const need = masterworkNeed(s, picked, { holz: wood });
  const unbuyable = Object.keys(need).filter((m) => need[m] > (s.materials[m] ?? 0)).map((m) => buyError(s, m)).find((e) => e !== null) ?? null;
  return (
    <section class="panel-section kiln-masterwork">
      <h3>{T.vl.mwTitle}</h3>
      <p class="hand-note">{T.vl.mwHint}</p>
      <div class="chips kiln-designs">
        {designs.map((d) => <button class="chip design-chip" aria-pressed={d.id === picked.id} onClick={() => setPicked(d.id)}><DesignPot s={s} d={d} size={28} />{d.name}</button>)}
      </div>
      <p class="kiln-mw-predict"><Medal prestige={prestige} size={18} /> {T.mw.predicted(PRESTIGE_NAME[prestige])}</p>
      <strong>{T.vl.woodPer}</strong>
      <WoodPicker value={wood} onChange={setWood} />
      {unbuyable && <p class="hand-note" data-mw-blocked>{unbuyable}</p>}
      <Button variant="primary" disabled={disabled || s.taler < price || unbuyable !== null} onClick={() => villageDispatch({ type: 'loadKilnMasterwork', designId: picked.id, wood })}>{T.vl.mwButton(price)}</Button>
    </section>
  );
}
