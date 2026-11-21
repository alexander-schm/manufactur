import { useEffect, useState } from 'preact/hooks';
import { advance } from '../../shared/advance';
import { glazeColor } from '../../shared/discovery';
import { newGame, rollWorker } from '../../shared/state';
import type { Batch, GameState, StationKind } from '../../shared/types';
import { WorkshopScene } from '../art/workshop/WorkshopScene';
import { CURIOSITIES } from '../../shared/content/curiosities';
import { DECOR } from '../../shared/village/decor';
import { devFlags } from '../surprises/env';
import { anchorOf } from '../surprises/spots';
import { mockEndgame } from './mockEndgame';

export function mockWorkshop(now: number): GameState {
  const t0 = now - 7 * 60_000;
  let s = newGame('dev', 12345, t0);
  const blue = { id: 'g90', name: 'Kobaltblau', base: 'opak' as const, colorant: 'kobalt', colorantPct: 3, firing: { temp: 'mittel' as const, atmosphere: 'oxidierend' as const, cooling: 'langsam' as const }, color: '', effect: null, body: 'irdenware' as const };
  blue.color = glazeColor(blue);
  const green = { ...blue, id: 'g91', name: 'Kupfergrün', colorant: 'kupferoxid', colorantPct: 4, color: '' };
  green.color = glazeColor(green);
  const crack = { ...blue, id: 'g92', name: 'Craquelé', base: 'transparent' as const, colorant: null, colorantPct: 0, firing: { ...blue.firing, cooling: 'schnell' as const }, color: '#e9c9a6', effect: 'craquele' };
  s.glazes.push(blue, green, crack);
  s.designs.push(
    { id: 'd90', name: 'Blaue Vase', form: 'vase', profile: { height: 0.8, belly: 0.6, neck: 0.25, foot: 0.4, rim: 0.5 }, handle: 'none', rim: 'flared', glazeId: 'g90', pattern: 'waves', patternColor: '#fff8ec', body: 'irdenware' },
    { id: 'd91', name: 'Grüne Schale', form: 'schale', profile: { height: 0.4, belly: 0.6, neck: 0.8, foot: 0.3, rim: 0.6 }, handle: 'none', rim: 'plain', glazeId: 'g91', pattern: 'dots', patternColor: '#fff8ec', body: 'irdenware' },
    { id: 'd92', name: 'Craquelé-Krug', form: 'krug', profile: { height: 0.6, belly: 0.6, neck: 0.45, foot: 0.5, rim: 0.55 }, handle: 'round', rim: 'plain', glazeId: 'g92', pattern: 'none', patternColor: '#2b2420', body: 'irdenware' },
  );
  for (let i = 0; i < 3; i++) s.workers.push(rollWorker(s));
  s.workers[1].stationId = s.stations.find((x) => x.kind === 'prepBench')!.id;
  s.workers[2].stationId = s.stations.find((x) => x.kind === 'glazeTable')!.id;
  s.stallDesignIds = ['d91'];
  s.standing = { designId: 'd90', batchSize: 6, autoBuy: true };
  s.materials.ton = 120;
  s.taler = 2000;
  s = advance(s, now);
  s.goods.push({ designId: 'd91', quality: 2, effect: null, count: 5 }, { designId: 'd92', quality: 3, effect: 'craquele', count: 3 }, { designId: s.designs[0].id, quality: 2, effect: null, count: 4 });
  return s;
}

/** Dev flag `&found=all|<n>`: the first n (or all) album entries, found one day apart going back from now. */
export function applyFoundFlag(s: GameState, hash: string, now: number): GameState {
  const m = /found=(all|\d+)/.exec(hash);
  if (!m) return s;
  const ids = Object.keys(CURIOSITIES);
  const n = m[1] === 'all' ? ids.length : Number(m[1]);
  s.curiosities = Object.fromEntries(ids.slice(0, n).map((id, i) => [id, now - i * 86_400_000]));
  return s;
}

const MW_STAGE: Partial<Record<StationKind, Batch['stage']>> = { prepBench: 'prepare', wheel: 'form', glazeTable: 'glaze' };

/** `&mw=wheel` moves the masterwork to that station; `&bays=1` clears the other batches there (a waiting batch may still move into a freed bay). */
function placeMasterwork(s: GameState, hash: string): GameState {
  const kind = /mw=(\w+)/.exec(hash)?.[1] as StationKind | undefined;
  const mw = s.batches.find((b) => b.masterwork);
  const st = kind && s.stations.find((x) => x.kind === kind);
  if (!mw || !st || !MW_STAGE[st.kind]) return s;
  mw.stage = MW_STAGE[st.kind]!;
  mw.stationId = st.id;
  const bays = Number(/bays=(\d)/.exec(hash)?.[1] ?? 0);
  if (bays) {
    const others = s.batches.filter((b) => b !== mw && b.stationId === st.id);
    s.batches = s.batches.filter((b) => !others.slice(Math.max(0, bays - 1)).includes(b));
  }
  return s;
}

/** Dev `&surprise=<id>`: scroll the scene so that surprise's anchor is centred (phones show only part of the room). */
export function useCentreOnSurprise() {
  useEffect(() => {
    const id = devFlags().force;
    if (!id) return;
    let tries = 0;
    const t = setInterval(() => {
      const box = document.querySelector<HTMLElement>('.scene-scroll');
      const svg = box?.querySelector<SVGSVGElement>('svg.scene');
      if (box && svg && svg.getBoundingClientRect().width > 0) {
        const scale = svg.getBoundingClientRect().width / Number(svg.dataset.width ?? 1200);
        box.scrollLeft = anchorOf(id).x * scale - box.clientWidth / 2;
        clearInterval(t);
      } else if (++tries > 40) clearInterval(t);
    }, 50);
    return () => clearInterval(t);
  }, []);
}

export function ScenePage() {
  const [now, setNow] = useState(Date.now());
  const [state] = useState(() => applyFoundFlag(location.hash.includes('endgame') ? placeMasterwork(mockEndgame(Date.now(), location.hash.includes('hof') ? 'hofmanufaktur' : 'manufaktur'), location.hash) : mockWorkshop(Date.now()), location.hash, Date.now()));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useCentreOnSurprise();
  const view = advance(state, now);
  // dev-only: &decor=all draws every decor item that has art, ignoring the placement cap
  if (devFlags().decorAll) view.decorPlaced = Object.keys(DECOR);
  return (
    <div style={{ padding: '12px' }}>
      <WorkshopScene state={view} now={now} onStation={(id) => console.log('station', id)} onWorker={(id) => console.log('worker', id)} onMasterwork={() => console.log('masterwork')} onCabinet={() => console.log('cabinet')} />
    </div>
  );
}
