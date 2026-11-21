import { useState } from 'preact/hooks';
import { collectionPercent } from '../../shared/collection';
import { BODIES, bodyAvailable, getTier } from '../../shared/content';
import type { BodyId, GameState } from '../../shared/types';
import { Pot } from '../art/Pot';
import { inkStyle } from '../art/ink';
import { Tabs } from '../ui/Tabs';
import { collectionGrid, colPrize, formLabel, groupPrizes, rowPrize, type GroupPrize } from './collectionLogic';

/** A little bookmark ribbon in the colour the row/column won. */
function Ribbon({ color }: { color: string }) {
  return (
    <svg class="coll-ribbon" viewBox="0 0 16 26" width="14" height="22" aria-hidden="true">
      <path d="M2 1 L14 1 L14 24 L8 18.5 L2 24 Z" fill={color} style={inkStyle(1.4)} />
      <path d="M5 4 L5 15" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5" />
    </svg>
  );
}

/** A round gold stamp with a scalloped edge, pressed onto rows/columns won after every colour was owned. */
function GoldStamp() {
  const scallop = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return `${(13 + Math.cos(a) * 11).toFixed(1)},${(13 + Math.sin(a) * 11).toFixed(1)}`;
  });
  return (
    <svg class="coll-stamp" viewBox="0 0 26 26" width="24" height="24" aria-hidden="true">
      {scallop.map((p) => { const [x, y] = p.split(','); return <circle cx={x} cy={y} r="2.6" fill="#e2b33c" />; })}
      <circle cx="13" cy="13" r="10.5" fill="#e2b33c" style={inkStyle(1.3)} />
      <circle cx="13" cy="13" r="7.5" fill="none" stroke="#9c6f12" stroke-width="1" stroke-dasharray="2 1.6" />
      <path d="M13 7.6 L14.6 11.2 L18.4 11.4 L15.4 13.8 L16.4 17.6 L13 15.5 L9.6 17.6 L10.6 13.8 L7.6 11.4 L11.4 11.2 Z" fill="#fff3c4" stroke="#9c6f12" stroke-width=".8" stroke-linejoin="round" />
    </svg>
  );
}

function Prize({ prize }: { prize: GroupPrize | undefined }) {
  if (!prize) return null;
  return prize.kind === 'stamp' ? <GoldStamp /> : <Ribbon color={prize.color} />;
}

export function CollectionBook({ s }: { s: GameState }) {
  const bodies = Object.values(BODIES);
  const [body, setBody] = useState<BodyId>(bodies[0].id);
  const [picked, setPicked] = useState<string | null>(null);
  const grid = collectionGrid(s, body);
  const prizes = groupPrizes(s);
  const note = grid.cells.flat().find((c) => c.key === picked);
  const pick = (b: BodyId) => { setBody(b); setPicked(null); };
  return (
    <div class="collection">
      <Tabs tabs={bodies.map((b) => ({ id: b.id, label: bodyAvailable(s, b.id) ? b.name : `${b.name} · ab ${getTier(b.tier).name}` }))} value={body} onChange={pick} />
      <div class="book coll-book">
        <div class="book-page">
          <h3>{BODIES[body].name}</h3>
          <div class="coll-percent">
            <span>Diese Seite: <strong>{collectionPercent(s, body)} %</strong></span>
            <div class="progressbar" aria-hidden="true"><div style={{ width: `${collectionPercent(s, body)}%` }} /></div>
          </div>
          <p class="muted coll-total">Ganze Sammlung: {collectionPercent(s)} %</p>
          <div class="coll-scroll">
            <div class="coll-grid" style={{ gridTemplateColumns: `auto repeat(${grid.effects.length}, 58px)` }}>
              <span />
              {grid.effects.map((e, i) => {
                const prize = colPrize(prizes, body, e);
                return (
                  <span class={`coll-col ${prize ? 'done' : ''}`}>
                    <span class={grid.effectLabels[i] === '?' ? 'coll-unknown' : ''}>{grid.effectLabels[i]}</span>
                    <Prize prize={prize} />
                  </span>
                );
              })}
              {grid.forms.map((form, r) => {
                const prize = rowPrize(prizes, body, form);
                return <>
                  <span class={`coll-row ${prize ? 'done' : ''}`}>
                    <Prize prize={prize} />
                    <span>{formLabel(s, form)}</span>
                  </span>
                  {grid.cells[r].map((c, i) => (
                    <button
                      class={`coll-cell ${c.found ? 'found' : 'unfound'} ${prize || colPrize(prizes, body, grid.effects[i]) ? 'won' : ''}`}
                      title={c.title} aria-label={c.title} aria-pressed={picked === c.key} onClick={() => setPicked(picked === c.key ? null : c.key)}
                    >
                      <Pot design={c.look.design} glazeColor={c.look.glazeColor} effect={c.look.effect} size={46} fit wobble={false} silhouette={!c.found} title={c.title} />
                      {!c.found && <span class="coll-q" aria-hidden="true">?</span>}
                    </button>
                  ))}
                </>;
              })}
            </div>
          </div>
          <p class="hand-note coll-note">{note ? note.title : 'Tipp auf ein Feld, um mehr zu sehen.'}</p>
          <p class="coll-prize">Jede volle Reihe und Spalte schenkt dir eine neue Farbe.</p>
        </div>
      </div>
    </div>
  );
}
