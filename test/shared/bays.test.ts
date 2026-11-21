import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/shared/actions';
import { standingPipeline, startWork } from '../../src/shared/advance';
import { baysOf, stageDurationMs } from '../../src/shared/production';
import { hofGame, manufakturGame, T0 } from './helpers';

function twoWaitingAtWheel(level: number) {
  const s = manufakturGame();
  const wheel = s.stations.find((x) => x.kind === 'wheel')!; wheel.level = level;
  for (const id of ['b1', 'b2']) s.batches.push({ id, designId: s.designs[0].id, count: 6, stage: 'form', stationId: null, startedAt: null, durationMs: 0, quality: 60 });
  return { s, wheel };
}

describe('work bays', () => {
  it('level 5 runs one batch at a time, level 6 runs two side by side at full speed', () => {
    const a = twoWaitingAtWheel(5); startWork(a.s, T0);
    expect(a.s.batches.filter((b) => b.stationId === a.wheel.id).length).toBe(1);
    const b = twoWaitingAtWheel(6); startWork(b.s, T0);
    const running = b.s.batches.filter((x) => x.stationId === b.wheel.id);
    expect(running.length).toBe(2);
    expect(running[0].durationMs).toBe(running[1].durationMs);
    expect(running[0].durationMs).toBe(stageDurationMs(b.s, running[0], b.wheel, T0));
  });
  it('the standing pipeline grows with wheel bays', () => {
    const s = manufakturGame();
    expect(standingPipeline(s)).toBe(4);
    s.stations.find((x) => x.kind === 'wheel')!.level = 6;
    expect(standingPipeline(s)).toBe(8);
  });
  it('level 8 needs the Hofmanufaktur and gives a third bay', () => {
    const m = manufakturGame(); m.ruf = 2000; m.taler = 1e9;
    const mw = m.stations.find((x) => x.kind === 'wheel')!; mw.level = 7;
    const rej = applyAction(m, { type: 'upgradeStation', stationId: mw.id }, T0);
    expect(rej.ok ? '' : rej.error).toMatch(/Hofmanufaktur/);
    const h = hofGame(); h.taler = 1e9;
    const wheel = h.stations.find((x) => x.kind === 'wheel')!;
    expect(baysOf(wheel)).toBe(2);
    const up = applyAction(h, { type: 'upgradeStation', stationId: wheel.id }, T0);
    if (!up.ok) throw new Error(up.error);
    const w8 = up.state.stations.find((x) => x.kind === 'wheel')!;
    expect(w8.level).toBe(8);
    expect(baysOf(w8)).toBe(3);
    expect(standingPipeline(up.state)).toBe(12);
    const three = twoWaitingAtWheel(8);
    three.s.batches.push({ id: 'b3', designId: three.s.designs[0].id, count: 6, stage: 'form', stationId: null, startedAt: null, durationMs: 0, quality: 60 });
    startWork(three.s, T0);
    expect(three.s.batches.filter((b) => b.stationId === three.wheel.id).length).toBe(3);
  });
  it('handTouch speeds up every running batch on the station', () => {
    const { s, wheel } = twoWaitingAtWheel(6); startWork(s, T0);
    const before = s.batches.map((b) => b.durationMs);
    const r = applyAction(s, { type: 'handTouch', stationId: wheel.id }, T0 + 1);
    expect(r.ok && r.state.batches.every((b, i) => b.durationMs < before[i])).toBe(true);
  });
});
