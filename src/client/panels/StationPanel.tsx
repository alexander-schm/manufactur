import { useState } from 'preact/hooks';
import { BUILD_COST, HAND_TOUCH_COOLDOWN_MS } from '../../shared/actions';
import { getStationDef, nextTier, stationTierGate, STATIONS } from '../../shared/content';
import { baysOf, kilnCapacity } from '../../shared/production';
import type { GameState, Station, StationKind } from '../../shared/types';
import { makeCharacter } from '../../shared/character';
import { Character } from '../art/character/Character';
import { dispatch, now, serverTime } from '../store';
import { Button } from '../ui/Button';
import { DesignPot } from './common';
import { formatDuration } from './logic';
import { MarketPanel } from './MarketPanel';
import { ownDesigns } from '../../shared/village/apply';
import { DecorSection } from './village/DecorPanel';
import { TierSection } from './TierSection';
import type { PanelId } from './PanelHost';
import { T } from '../strings';
import { masterworkInProgress } from '../../shared/masterwork';
import { fmtTaler } from '../../shared/format';

function upgradeEffect(st: Station): string {
  const def = getStationDef(st.kind);
  if (st.kind === 'shelf') return `Platz für ${def.capacity![st.level]} statt ${def.capacity![st.level - 1]} Stück`;
  if (st.kind === 'marketStall') return `verkauft ${def.capacity![st.level]} statt ${def.capacity![st.level - 1]} Stück/min`;
  const ppm = def.piecesPerMinute;
  const gain = `+${Math.round((ppm[st.level] / ppm[st.level - 1] - 1) * 100)} % schneller`;
  if (st.kind === 'kiln') return `${gain}, ${def.capacity![st.level]} statt ${def.capacity![st.level - 1]} Stück pro Brand`;
  const bay = (def.bays?.[st.level] ?? 1) > (def.bays?.[st.level - 1] ?? 1) ? ', +1 Arbeitsplatz' : '';
  return gain + bay;
}

function Production({ s }: { s: GameState }) {
  const [size, setSize] = useState(s.standing?.batchSize ?? 6);
  const cap = kilnCapacity(s);
  const current = s.standing?.designId;
  return (
    <section class="panel-section">
      <h3>Was soll gedreht werden?</h3>
      <p class="muted" style={{ fontSize: '.9em' }}>Wähle einen Entwurf – deine Leute stellen ihn dann immer wieder her, auch wenn du weg bist.</p>
      <div class="design-pick">
        {ownDesigns(s).map((d) => (
          <button aria-pressed={current === d.id} onClick={() => dispatch({ type: 'setStanding', designId: current === d.id ? null : d.id, batchSize: Math.min(size, cap), autoBuy: s.standing?.autoBuy ?? true })}>
            <DesignPot s={s} d={d} size={64} /><div>{d.name}</div>
          </button>
        ))}
      </div>
      <label style={{ display: 'block', marginTop: '10px' }}>Stück pro Charge: <strong>{Math.min(size, cap)}</strong>
        <input type="range" min={1} max={cap} value={Math.min(size, cap)} onInput={(e) => setSize(Number(e.currentTarget.value))}
          onChange={(e) => current && dispatch({ type: 'setStanding', designId: current, batchSize: Number(e.currentTarget.value), autoBuy: s.standing?.autoBuy ?? true })} />
      </label>
      {s.standing && (
        <label class="check"><input type="checkbox" checked={s.standing.autoBuy} onChange={(e) => dispatch({ type: 'setStanding', designId: s.standing!.designId, batchSize: s.standing!.batchSize, autoBuy: e.currentTarget.checked })} />Fehlendes Material automatisch nachkaufen</label>
      )}
      <h4 style={{ marginBottom: '4px' }}>Extra-Charge</h4>
      <div class="design-pick">
        {ownDesigns(s).map((d) => (
          <button onClick={() => dispatch({ type: 'queueBatch', designId: d.id, count: Math.min(size, cap) })}>
            <DesignPot s={s} d={d} size={48} /><div>{d.name}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function StationPanel({ s, stationId, onOpen }: { s: GameState; stationId: string; onOpen: (id: PanelId, arg?: string) => void }) {
  const st = s.stations.find((x) => x.id === stationId);
  if (!st) return <p class="muted">Diese Station gibt es nicht.</p>;
  const def = getStationDef(st.kind);
  if (st.kind === 'shelf' || st.kind === 'marketStall') return <><p class="muted">{def.description}</p><UpgradeBox s={s} st={st} /><MarketPanel s={s} /></>;
  const t = now.value + (serverTime() - Date.now());
  const running = s.batches.filter((b) => b.stationId === st.id && b.startedAt !== null);
  const waiting = s.batches.filter((b) => b.startedAt === null && b.stage === def.stage || (b.startedAt === null && def.stage2 && b.stage === def.stage2));
  const bays = baysOf(st);
  const here = s.workers.filter((w) => w.stationId === st.id);
  const cooldown = Math.max(0, (s.cooldowns[st.id] ?? 0) - t);
  return (
    <div>
      <p class="muted">{def.description}</p>
      <section class="panel-section">
        <h3>Gerade</h3>
        {bays > 1 && <p class="muted">Arbeitsplätze: {bays}</p>}
        {running.length === 0 && <p>Hier ist gerade nichts zu tun{waiting.length ? '' : ' – es wartet auch nichts'}.</p>}
        {running.map((b, i) => {
          const d = s.designs.find((x) => x.id === b.designId);
          const p = b.blocked ? 1 : Math.min(1, (t - b.startedAt!) / Math.max(1, b.durationMs));
          return (
            <div class="card-row" style={{ marginBottom: '8px' }}>
              {d && <DesignPot s={s} d={d} size={52} />}
              <div class="grow">
                <div>{bays > 1 ? `Platz ${i + 1}/${bays} · ` : ''}{T.stage[b.stage]}: {b.count}× {d?.name}</div>
                <div class="progressbar"><div style={{ width: `${(p * 100).toFixed(1)}%` }} /></div>
                <div class="muted" style={{ fontSize: '.85em' }}>{b.blocked ? 'Fertig – aber das Regal ist voll! Verkaufe etwas oder baue das Regal aus.' : `noch ${formatDuration(b.startedAt! + b.durationMs - t)}`}</div>
              </div>
            </div>
          );
        })}
        {waiting.length > 0 && <p class="muted">{waiting.reduce((a, b) => a + b.count, 0)} Stück warten.</p>}
        {running.length > 0 && (
          <Button variant="primary" small disabled={cooldown > 0} onClick={() => dispatch({ type: 'handTouch', stationId: st.id })}>
            {cooldown > 0 ? `Pause (${formatDuration(cooldown)})` : 'Selbst mit anpacken (+15 %)'}
          </Button>
        )}
        {cooldown > 0 && <span class="cooldown"> alle {HAND_TOUCH_COOLDOWN_MS / 60000} min möglich</span>}
      </section>
      {def.usesWorkers && (
        <section class="panel-section">
          <h3>Hier arbeiten ({here.length}/{def.maxWorkers})</h3>
          {here.length === 0 && <p class="muted">Niemand – du machst es selbst (langsamer).</p>}
          {here.map((w) => (
            <div class="card-row">
              <Character look={makeCharacter(w.seed)} pose="work" seed={w.seed} size={40} wobble={false} />
              <div class="grow">{w.name}</div>
              <Button small variant="quiet" onClick={() => dispatch({ type: 'assign', workerId: w.id, stationId: null })}>Pause</Button>
            </div>
          ))}
          <Button small variant="quiet" onClick={() => onOpen('people')}>Leute verteilen …</Button>
        </section>
      )}
      {st.kind === 'wheel' && <Production s={s} />}
      {st.kind === 'kiln' && <p class="muted">Der Ofen brennt bis zu {kilnCapacity(s)} Stück gleichzeitig – zweimal pro Stück.</p>}
      <UpgradeBox s={s} st={st} />
    </div>
  );
}

function UpgradeBox({ s, st }: { s: GameState; st: Station }) {
  const def = STATIONS[st.kind];
  if (!s.unlocks.includes('upgrades')) return <section class="panel-section"><h3>Stufe {st.level}</h3><p class="muted">Ausbauen geht ab 10 Ruf.</p></section>;
  const top = def.upgradeCost.length + 1;
  if (st.level >= top) return <section class="panel-section"><h3>Stufe {top} – ganz ausgebaut!</h3></section>;
  const gate = stationTierGate(s, st.level);
  if (gate) {
    const nt = nextTier(s);
    return <section class="panel-section"><h3>Stufe {st.level}</h3><p class="muted">{gate}.</p>{nt && <p class="muted" style={{ fontSize: '.85em' }}>Die {nt.name} findest du oben in der Werkstatt.</p>}</section>;
  }
  const cost = def.upgradeCost[st.level - 1], ruf = def.rufRequired[st.level - 1];
  return (
    <section class="panel-section">
      <h3>Ausbau auf Stufe {st.level + 1}</h3>
      <p>{upgradeEffect(st)}</p>
      <Button variant="primary" disabled={s.taler < cost || s.ruf < ruf} onClick={() => dispatch({ type: 'upgradeStation', stationId: st.id })}>
        Ausbauen · {fmtTaler(cost)} Taler{ruf > 0 ? ` · ab ${ruf} Ruf` : ''}
      </Button>
    </section>
  );
}

export function WorkshopPanel({ s, onOpen }: { s: GameState; onOpen: (id: PanelId, arg?: string) => void }) {
  return (
    <div>
      <TierSection s={s} />
      <div class="cards">
        {[...s.stations].sort((a, b) => a.slot - b.slot).map((st) => (
          <button class="card card-row" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => onOpen('station', st.id)}>
            <div class="grow"><strong>{getStationDef(st.kind).name}</strong>{st.slot >= 7 && <span class="muted"> · 2. Raum</span>}<div class="muted" style={{ fontSize: '.85em' }}>Stufe {st.level} · {s.workers.filter((w) => w.stationId === st.id).length} Leute</div></div>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      {s.unlocks.includes('meisterstuecke') && (
        <button class="card card-row mw-card" data-open="masterwork" style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit', marginTop: '12px' }} onClick={() => onOpen('masterwork')}>
          <div class="grow"><strong>{T.tabs.masterwork}</strong><div class="muted" style={{ fontSize: '.85em' }}>{masterworkInProgress(s) ? T.mw.cardBusy : T.mw.card}</div></div>
          <span aria-hidden="true">›</span>
        </button>
      )}
      <DecorSection s={s} />
      <section class="panel-section" style={{ marginTop: '16px' }}>
        <h3>Zweiter Raum</h3>
        {!s.unlocks.includes('room2') ? <p class="muted">Ab 60 Ruf wächst deine Werkstatt um einen Raum.</p> : (
          <div class="cards">
            {(Object.keys(BUILD_COST) as StationKind[]).map((k) => (
              <div class="card-row">
                <div class="grow">{STATIONS[k].name}</div>
                <Button small disabled={s.taler < BUILD_COST[k]!} onClick={() => dispatch({ type: 'buildStation', kind: k })}>Bauen · {fmtTaler(BUILD_COST[k]!)} T</Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
