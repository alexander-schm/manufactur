import { FRAMES } from '../../shared/content';
import { inkStyle } from './ink';

const GOLD = '#d9a636';
const f1 = (n: number) => n.toFixed(1);

/** The ring around a maker mark, one look per FRAMES id; draws nothing for unknown ids. */
export function MarkFrame({ frame, x, y, r, color }: { frame: string | undefined; x: number; y: number; r: number; color: string }) {
  if (!frame || !Object.hasOwn(FRAMES, frame)) return null;
  const w = Math.max(0.6, r * 0.11);
  const at = (a: number, rr: number): [number, number] => [x + rr * Math.cos(a), y + rr * Math.sin(a)];
  let body;
  switch (frame) {
    case 'punkte': {
      const n = 12;
      body = Array.from({ length: n }, (_, i) => { const [cx, cy] = at((i / n) * Math.PI * 2, r); return <circle cx={f1(cx)} cy={f1(cy)} r={f1(w * 1.15)} fill={color} />; });
      break;
    }
    case 'doppel':
      body = <g fill="none" stroke={color}><circle cx={x} cy={y} r={f1(r)} stroke-width={f1(w)} /><circle cx={x} cy={y} r={f1(r * 0.86)} stroke-width={f1(w * 0.6)} /></g>;
      break;
    case 'kranz': {
      // two laurel branches meeting at the bottom, open at the top
      const leaves = [];
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 2 + side * (0.35 + i * 0.42);
          const [cx, cy] = at(a, r);
          const deg = (a * 180) / Math.PI + (side > 0 ? 90 : -90) + side * 25;
          leaves.push(<ellipse cx={f1(cx)} cy={f1(cy)} rx={f1(r * 0.1)} ry={f1(r * 0.22)} transform={`rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})`} fill={color} />);
        }
      }
      const [ax, ay] = at(Math.PI / 2 - 2.65, r), [bx, by] = at(Math.PI / 2 + 2.65, r);
      body = <g><path d={`M${f1(ax)} ${f1(ay)} A${f1(r)} ${f1(r)} 0 1 1 ${f1(bx)} ${f1(by)}`} fill="none" stroke={color} stroke-width={f1(w * 0.6)} />{leaves}</g>;
      break;
    }
    case 'sonne': {
      const n = 14;
      body = (
        <g stroke={color} stroke-linecap="round">
          {Array.from({ length: n }, (_, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const [x1, y1] = at(a, r * 0.92), [x2, y2] = at(a, r * (i % 2 ? 1.18 : 1.3));
            return <path d={`M${f1(x1)} ${f1(y1)} L${f1(x2)} ${f1(y2)}`} stroke-width={f1(w * 0.9)} />;
          })}
        </g>
      );
      break;
    }
    case 'gold':
      body = (
        <g>
          <circle cx={x} cy={y} r={f1(r)} fill="none" stroke={GOLD} stroke-width={f1(w * 2.2)} />
          <circle cx={x} cy={y} r={f1(r)} fill="none" style={{ ...inkStyle(w * 0.5), strokeDasharray: `${f1(r * 0.5)} ${f1(r * 0.12)}` }} />
          <path d={`M${f1(x - r * 0.55)} ${f1(y - r * 0.82)} q${f1(r * 0.3)} ${f1(-r * 0.15)} ${f1(r * 0.6)} ${f1(-r * 0.12)}`} fill="none" stroke="#fffbe0" stroke-width={f1(w * 0.7)} stroke-linecap="round" />
        </g>
      );
      break;
    default:
      return null;
  }
  return <g data-frame={frame}>{body}</g>;
}
