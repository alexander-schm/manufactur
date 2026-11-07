import { useEffect, useState } from 'preact/hooks';
import { advance } from '../../shared/advance';
import { glazeColor } from '../../shared/discovery';
import { newGame, rollWorker } from '../../shared/state';
import type { GameState } from '../../shared/types';
import { WorkshopScene } from '../art/workshop/WorkshopScene';

export function mockWorkshop(now: number): GameState {
  const t0 = now - 7 * 60_000;
  let s = newGame('dev', 12345, t0);
  const blue = { id: 'g90', name: 'Kobaltblau', base: 'opak' as const, colorant: 'kobalt', colorantPct: 3, firing: { temp: 'mittel' as const, atmosphere: 'oxidierend' as const, cooling: 'langsam' as const }, color: '', effect: null };
  blue.color = glazeColor(blue);
  const green = { ...blue, id: 'g91', name: 'Kupfergrün', colorant: 'kupferoxid', colorantPct: 4, color: '' };
  green.color = glazeColor(green);
  const crack = { ...blue, id: 'g92', name: 'Craquelé', base: 'transparent' as const, colorant: null, colorantPct: 0, firing: { ...blue.firing, cooling: 'schnell' as const }, color: '#e9c9a6', effect: 'craquele' };
  s.glazes.push(blue, green, crack);
  s.designs.push(
    { id: 'd90', name: 'Blaue Vase', form: 'vase', profile: { height: 0.8, belly: 0.6, neck: 0.25, foot: 0.4, rim: 0.5 }, handle: 'none', rim: 'flared', glazeId: 'g90', pattern: 'waves', patternColor: '#fff8ec' },
    { id: 'd91', name: 'Grüne Schale', form: 'schale', profile: { height: 0.4, belly: 0.6, neck: 0.8, foot: 0.3, rim: 0.6 }, handle: 'none', rim: 'plain', glazeId: 'g91', pattern: 'dots', patternColor: '#fff8ec' },
    { id: 'd92', name: 'Craquelé-Krug', form: 'krug', profile: { height: 0.6, belly: 0.6, neck: 0.45, foot: 0.5, rim: 0.55 }, handle: 'round', rim: 'plain', glazeId: 'g92', pattern: 'none', patternColor: '#2b2420' },
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

export function ScenePage() {
  const [now, setNow] = useState(Date.now());
  const [state] = useState(() => mockWorkshop(Date.now()));
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  const view = advance(state, now);
  return (
    <div style={{ padding: '12px' }}>
      <WorkshopScene state={view} now={now} onStation={(id) => console.log('station', id)} onWorker={(id) => console.log('worker', id)} />
    </div>
  );
}
