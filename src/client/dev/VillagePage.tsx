import { VillageMap } from '../art/village/VillageMap';
import { mockVillage } from './mockVillage';

export function VillagePage() {
  const n = Number(new URLSearchParams(location.hash.split('&')[1] ?? '').get('n') ?? 5);
  const now = Date.now();
  const v = mockVillage(n, ['tongrube', 'markthalle'], now);
  return <div style={{ padding: '12px' }}><VillageMap village={v} meId="p1" now={now} onHouse={(id) => console.log(id)} onBuilding={(id) => console.log(id)} /></div>;
}
