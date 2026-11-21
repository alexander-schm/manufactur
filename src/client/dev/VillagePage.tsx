import { VillageMap } from '../art/village/VillageMap';
import { mockVillage, type MockVillageOpts } from './mockVillage';

/** `#village&n=5&kiln=firing&project=rathaus:1:2&levels=dorfbrunnen:2,museum:1&level=12&offered=glockenturm,museum` */
export function VillagePage() {
  const q = new URLSearchParams(location.hash.split('&').slice(1).join('&'));
  const n = Number(q.get('n') ?? 5);
  const now = Date.now();
  const opts: MockVillageOpts = {};
  if (q.has('level')) opts.level = Number(q.get('level'));
  const kiln = q.get('kiln');
  if (kiln === 'empty' || kiln === 'loading' || kiln === 'firing') opts.kiln = kiln;
  const project = q.get('project')?.split(':');
  if (project) opts.project = { id: project[0], level: Math.min(3, Math.max(1, Number(project[1] ?? 1))) as 1 | 2 | 3, stage: Number(project[2] ?? 0) };
  if (q.has('levels')) opts.levels = Object.fromEntries(q.get('levels')!.split(',').map((kv) => { const [k, l] = kv.split(':'); return [k, Number(l ?? 1)]; }));
  if (q.has('offered')) opts.offered = q.get('offered')!.split(',');
  const buildings = ['tongrube', 'markthalle', ...(opts.kiln ? ['gemeinschaftsofen'] : [])];
  const v = mockVillage(n, buildings, now, opts);
  return <div style={{ padding: '12px' }}><VillageMap village={v} meId="p1" now={now} onHouse={(id) => console.log(id)} onBuilding={(id) => console.log(id)} /></div>;
}
