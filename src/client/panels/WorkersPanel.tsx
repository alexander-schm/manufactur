import { HIRE_COST_PER_WORKER } from '../../shared/actions';
import { makeCharacter, personality } from '../../shared/character';
import { getStationDef, getTrait } from '../../shared/content';
import { XP_PER_TRAIT } from '../../shared/progression';
import type { GameState, Worker } from '../../shared/types';
import { Character } from '../art/character/Character';
import { dispatch } from '../store';
import { Button } from '../ui/Button';
import { autoAssignPlan } from './logic';

export function TraitBadges({ w }: { w: Worker }) {
  return <div class="traits">{w.traits.map((t) => <span class="badge" title={getTrait(t).description}>{getTrait(t).name}</span>)}</div>;
}

function WorkerCard({ s, w, highlight }: { s: GameState; w: Worker; highlight?: boolean }) {
  const seats = s.stations.filter((st) => getStationDef(st.kind).usesWorkers);
  const xpInto = w.xp % XP_PER_TRAIT;
  return (
    <article class={`card ${highlight ? 'selected' : ''}`}>
      <div class="card-row">
        <Character look={makeCharacter(w.seed)} pose={w.stationId ? 'work' : 'sleep'} seed={w.seed} size={70} wobble={false} />
        <div class="grow">
          <strong>{w.name}</strong>
          <div class="muted" style={{ fontSize: '.9em' }}>{personality(w.seed, w.traits)}</div>
          <TraitBadges w={w} />
          {w.traits.length < 3 && <div class="progressbar" title="Erfahrung" style={{ marginTop: '6px', height: '10px' }}><div style={{ width: `${(xpInto / XP_PER_TRAIT) * 100}%` }} /></div>}
          <label class="row" style={{ marginTop: '6px', gap: '6px' }}>
            <span>Arbeitet an:</span>
            <select class="pick" value={w.stationId ?? ''} onChange={(e) => dispatch({ type: 'assign', workerId: w.id, stationId: e.currentTarget.value || null })}>
              <option value="">– macht Pause –</option>
              {seats.map((st) => <option value={st.id}>{getStationDef(st.kind).name}{st.slot >= 7 ? ' (2. Raum)' : ''}</option>)}
            </select>
          </label>
        </div>
      </div>
    </article>
  );
}

export function WorkersPanel({ s, focus }: { s: GameState; focus?: string }) {
  const cost = HIRE_COST_PER_WORKER * s.workers.length;
  const unassigned = s.workers.filter((w) => !w.stationId).length;
  return (
    <div>
      <section class="panel-section">
        <div class="row" style={{ justifyContent: 'space-between' }}>
          <h3>Deine Leute</h3>
          {unassigned > 0 && <Button small onClick={async () => { for (const a of autoAssignPlan(s)) await dispatch(a); }}>Automatisch verteilen</Button>}
        </div>
        <div class="cards">{s.workers.map((w) => <WorkerCard s={s} w={w} highlight={w.id === focus} />)}</div>
      </section>
      <section class="panel-section">
        <h3>Suchen Arbeit</h3>
        {!s.unlocks.includes('hiring') ? (
          <p class="muted">Sobald du 20 Stücke gefertigt hast, sprechen sich deine Erfolge herum und Leute fragen nach Arbeit.</p>
        ) : (
          <div class="cards">
            {s.hirePool.map((w) => (
              <article class="card">
                <div class="card-row">
                  <Character look={makeCharacter(w.seed)} pose="wave" seed={w.seed} size={64} wobble={false} />
                  <div class="grow">
                    <strong>{w.name}</strong>
                    <div class="muted" style={{ fontSize: '.9em' }}>{personality(w.seed, w.traits)}</div>
                    <TraitBadges w={w} />
                  </div>
                  <Button small variant="primary" disabled={s.taler < cost} onClick={() => dispatch({ type: 'hire', workerId: w.id })}>Einstellen · {cost} T</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
