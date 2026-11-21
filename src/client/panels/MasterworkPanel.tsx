import { useState } from 'preact/hooks';
import { makeCharacter } from '../../shared/character';
import { COMMISSION_SWAP_COST, MASTERWORK_MATERIAL_PIECES, describeCriterion, masterworkInProgress, predictMasterwork, PRESTIGE_NAME } from '../../shared/masterwork';
import { batchMaterials, MASTERWORK_STAGE_MS, missingMaterialCost } from '../../shared/production';
import { STAGES, type Batch, type Commission, type Design, type GameState, type MasterworkRecord } from '../../shared/types';
import { ownDesigns } from '../../shared/village/apply';
import { Character } from '../art/character/Character';
import { Pot } from '../art/Pot';
import { Medal } from '../art/workshop/Plinth';
import { dispatch, now, serverTime } from '../store';
import { T } from '../strings';
import { Button } from '../ui/Button';
import { Paper } from '../ui/Paper';
import { DesignPot } from './common';
import { formatDuration } from './logic';

function Fit({ ok }: { ok: boolean }) {
  return <span class={`mw-fit ${ok ? 'yes' : 'no'}`} data-fit={ok ? 'yes' : 'no'} aria-label={ok ? 'passt' : 'passt nicht'}>{ok ? '✓' : '✗'}</span>;
}

/** The patron's letter: who they are, what they wish for (ticked against the picked design), price and reward. */
function CommissionCard({ s, c, met }: { s: GameState; c: Commission; met: boolean[] | null }) {
  const busy = !!masterworkInProgress(s);
  return (
    <Paper tape class="mw-letter" style={{ borderRadius: '6px 14px 8px 12px / 12px 6px 14px 8px' }}>
      <div class="mw-patron">
        <Character look={makeCharacter(c.patronSeed)} pose="wave" seed={c.patronSeed} size={64} wobble={false} title={c.patronName} />
        <div>
          <span class="muted mw-from">{T.mw.letterFrom}</span>
          <h3>{c.patronName}</h3>
          <span class="muted">{c.patronJob}</span>
        </div>
      </div>
      <p class="mw-wish">{T.mw.wish}</p>
      <ul class="mw-criteria">
        {c.criteria.map((x, i) => <li>{met && <Fit ok={met[i]} />}<span>{describeCriterion(x)}</span></li>)}
      </ul>
      <dl class="mw-terms">
        <dt>{T.mw.fee}</dt><dd>{T.mw.feeValue(c.costTaler)}</dd>
        <dt>{T.mw.reward}</dt><dd>{T.mw.rewardValue(c.rewardTaler, c.rewardRuf)}</dd>
      </dl>
      <button class="link mw-swap" disabled={busy || s.taler < COMMISSION_SWAP_COST} onClick={() => dispatch({ type: 'swapCommission' })}>
        {T.mw.swap(COMMISSION_SWAP_COST)}
      </button>
    </Paper>
  );
}

function DesignChoice({ s, d, picked, onPick }: { s: GameState; d: Design; picked: boolean; onPick: () => void }) {
  const p = predictMasterwork(s, d);
  return (
    <button class="card mw-design" aria-pressed={picked} data-design={d.id} data-prestige={p.prestige} onClick={onPick}>
      <DesignPot s={s} d={d} size={56} />
      <div class="grow">
        <strong>{d.name}</strong>
        <div class="mw-fits">{p.met.map((ok) => <Fit ok={ok} />)}</div>
      </div>
      <div class="mw-predict">
        <Medal prestige={p.prestige} size={26} />
        <span>{T.mw.predicted(PRESTIGE_NAME[p.prestige])}</span>
      </div>
    </button>
  );
}

/** How far the masterwork is through all its stages, by the fixed masterwork times. */
function masterworkProgress(b: Batch, t: number): { done: number; leftMs: number } {
  const at = STAGES.indexOf(b.stage);
  const total = STAGES.reduce((sum, st) => sum + MASTERWORK_STAGE_MS[st], 0);
  const stageMs = b.startedAt !== null ? b.durationMs : MASTERWORK_STAGE_MS[b.stage];
  const elapsed = b.startedAt !== null ? Math.min(stageMs, Math.max(0, t - b.startedAt)) : 0;
  const after = STAGES.slice(at + 1).reduce((sum, st) => sum + MASTERWORK_STAGE_MS[st], 0);
  const leftMs = stageMs - elapsed + after;
  return { done: Math.min(1, Math.max(0, 1 - leftMs / total)), leftMs };
}

function InProgress({ s, b }: { s: GameState; b: Batch }) {
  const d = s.designs.find((x) => x.id === b.designId);
  const { done, leftMs } = masterworkProgress(b, now.value + (serverTime() - Date.now()));
  return (
    <section class="panel-section mw-progress">
      <h3>{T.mw.inProgress}</h3>
      <div class="card card-row">
        {d && <DesignPot s={s} d={d} size={56} />}
        <div class="grow">
          <strong>{d?.name}</strong>
          <div>{T.stage[b.stage]}{b.startedAt === null ? ` · ${T.mw.waiting}` : ''}</div>
          <div class="progressbar" aria-hidden="true"><div style={{ width: `${Math.round(done * 100)}%` }} /></div>
          <div class="muted" style={{ fontSize: '.85em' }}>{T.mw.left(formatDuration(leftMs))}</div>
        </div>
      </div>
      <p class="hand-note">{T.mw.noRush}</p>
    </section>
  );
}

function RecordItem({ r }: { r: MasterworkRecord }) {
  return (
    <div class="mw-record" data-record={r.id}>
      <Pot design={r.design} glazeColor={r.glazeColor} effect={r.effect} quality={r.quality} size={64} fit wobble={false} />
      <Medal prestige={r.prestige} size={24} />
      <strong>{r.design.name}</strong>
      {r.patronName && <span class="muted">{T.mw.forPatron(r.patronName)}</span>}
    </div>
  );
}

/** A friend's or one's own finished masterworks, newest first: pot, medal and patron. */
export function MasterworkShelf({ records }: { records: MasterworkRecord[] }) {
  return <div class="mw-records">{[...records].reverse().map((r) => <RecordItem r={r} />)}</div>;
}

export function MasterworkPanel({ s }: { s: GameState }) {
  const c = s.commission;
  const designs = ownDesigns(s);
  const busy = masterworkInProgress(s);
  const best = [...designs].sort((a, b) => predictMasterwork(s, b).met.filter(Boolean).length - predictMasterwork(s, a).met.filter(Boolean).length)[0];
  const [pickedId, setPicked] = useState<string | undefined>(best?.id);
  const picked = designs.find((d) => d.id === pickedId) ?? best;
  const price = c && picked ? c.costTaler + missingMaterialCost(s, batchMaterials(s, picked, MASTERWORK_MATERIAL_PIECES)) : 0;
  return (
    <div class="masterwork">
      {busy && <InProgress s={s} b={busy} />}
      {c && <CommissionCard s={s} c={c} met={picked ? predictMasterwork(s, picked).met : null} />}
      {c && (
        <section class="panel-section">
          <h3>{T.mw.pickTitle}</h3>
          <p class="muted" style={{ fontSize: '.9em' }}>{T.mw.pickHint}</p>
          {designs.length === 0 ? <p class="muted">{T.mw.noDesigns}</p> : (
            <div class="mw-designs">
              {designs.map((d) => <DesignChoice s={s} d={d} picked={d.id === picked?.id} onPick={() => setPicked(d.id)} />)}
            </div>
          )}
          <Button variant="primary" class="mw-start" disabled={!!busy || !picked || s.taler < price}
            onClick={() => picked && dispatch({ type: 'startMasterwork', designId: picked.id })}>
            {T.mw.start(Math.ceil(price))}
          </Button>
          {busy && <p class="muted" style={{ fontSize: '.85em' }}>{T.mw.busyNote}</p>}
        </section>
      )}
      {s.masterworks.length > 0 && (
        <section class="panel-section">
          <h3>{T.mw.records}</h3>
          <MasterworkShelf records={s.masterworks} />
        </section>
      )}
    </div>
  );
}

/** Shown once when a masterwork leaves the kiln. */
export function MasterworkDone({ record, onClose }: { record: MasterworkRecord; onClose: () => void }) {
  const name = PRESTIGE_NAME[record.prestige];
  return (
    <div class="modal-backdrop">
      <Paper tape seed={52} class="modal-card celebrate mw-done">
        <p class="kicker">{T.mw.doneKicker}</p>
        <div class="mw-done-art">
          <Pot design={record.design} glazeColor={record.glazeColor} effect={record.effect} quality={record.quality} size={120} fit wobble={false} />
          <Medal prestige={record.prestige} size={48} />
        </div>
        <h2>{T.mw.doneTitle(name, record.design.name)}</h2>
        <p class="muted">{T.mw.met(record.met, record.total)}</p>
        {record.reward && <p>{T.mw.donePaid(record.patronName, record.reward.taler, record.reward.ruf)}</p>}
        <Button variant="primary" onClick={onClose}>{T.mw.doneClose}</Button>
      </Paper>
    </div>
  );
}
