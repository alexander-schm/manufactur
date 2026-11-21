import { FORMS } from '../../shared/content';
import type { Design, ProfileParams } from '../../shared/types';

export const BASE_Y = 96;
export const CX = 50;
type Pt = [number, number];

export interface PotShape {
  /** closed outline of the body */
  body: string;
  rim: { cx: number; cy: number; rx: number; ry: number };
  handle?: string;
  spout?: string;
  /** a lid resting on the rim (Teekanne): dome over the rim ellipse, knob radius */
  lid?: { cx: number; cy: number; rx: number; ry: number; knob: number };
  /** y where the glaze ends and raw clay shows */
  footY: number;
  bandY: number;
  bandHalfWidth: number;
  topY: number;
  maxHalfWidth: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Control points of the right-hand profile, bottom to top: [halfWidth, y]. */
function controlPoints(form: string, p: ProfileParams, rimStyle: Design['rim']): Pt[] {
  const flare = rimStyle === 'flared' ? 4 : 0;
  switch (form) {
    case 'teller': {
      const H = 5 + p.height * 8;
      const foot = 12 + p.foot * 10;
      const rim = clamp(36 + p.rim * 8 + flare, foot + 8, 46);
      return [[foot, BASE_Y], [foot + 4, BASE_Y - H * 0.4], [rim - 4, BASE_Y - H * 0.85], [rim, BASE_Y - H]];
    }
    case 'schale': {
      const H = 16 + p.height * 22;
      const foot = 8 + p.foot * 9;
      const rim = clamp(26 + p.rim * 12 + flare, foot + 10, 46);
      const belly = clamp(rim * (0.82 + p.belly * 0.16), foot + 4, rim);
      return [[foot, BASE_Y], [foot + 3, BASE_Y - H * 0.12], [belly, BASE_Y - H * 0.55], [rim, BASE_Y - H]];
    }
    case 'teekanne': {
      // round-bellied, short neck, a gallery wide enough for the lid
      const H = clamp(30 + p.height * 34, 24, 70);
      const foot = 8 + p.foot * 10;
      const belly = clamp(20 + p.belly * 18, foot + 6, 40);
      const neck = clamp(9 + p.neck * 10, 8, belly - 6);
      const rim = clamp(neck + (p.rim - 0.3) * 6 + flare * 0.5, 8, belly - 4);
      return [
        [foot, BASE_Y],
        [foot + (belly - foot) * 0.7, BASE_Y - H * 0.12],
        [belly, BASE_Y - H * 0.45],
        [neck + (belly - neck) * 0.62, BASE_Y - H * 0.8],
        [rim, BASE_Y - H],
      ];
    }
    default: {
      const tall = form === 'vase' ? 1.15 : form === 'krug' ? 1.05 : 0.85;
      const H = clamp((36 + p.height * 52) * tall, 24, 90);
      const foot = 7 + p.foot * 12;
      const belly = clamp(12 + p.belly * 28, foot, 44);
      const neck = form === 'becher' ? clamp(belly * (0.8 + p.neck * 0.25), 8, 44) : clamp(5 + p.neck * 20, 4, belly);
      const rim = clamp(neck + (p.rim - 0.4) * 10 + flare, 4, 46);
      const bellyAt = form === 'becher' ? 0.4 : 0.32 + (1 - p.belly) * 0.12;
      const neckAt = form === 'becher' ? 0.85 : 0.82;
      return [
        [foot, BASE_Y],
        [foot + (belly - foot) * 0.55, BASE_Y - H * 0.08],
        [belly, BASE_Y - H * bellyAt],
        [neck, BASE_Y - H * neckAt],
        [rim, BASE_Y - H],
      ];
    }
  }
}

/** Catmull-Rom through the control points, sampled densely. Returns right side points (x absolute). */
export function potOutline(form: string, p: ProfileParams, rimStyle: Design['rim'] = 'plain'): Pt[] {
  if (!FORMS[form]) throw new Error(`Unbekannte Form ${form}`);
  const cps = controlPoints(form, p, rimStyle);
  const pts: Pt[] = [];
  const steps = 10;
  for (let i = 0; i < cps.length - 1; i++) {
    const p0 = cps[Math.max(0, i - 1)], p1 = cps[i], p2 = cps[i + 1], p3 = cps[Math.min(cps.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push([CX + clamp(f(p0[0], p1[0], p2[0], p3[0]), 2, 48), Math.min(BASE_Y, f(p0[1], p1[1], p2[1], p3[1]))]);
    }
  }
  const last = cps[cps.length - 1];
  pts.push([CX + clamp(last[0], 2, 48), last[1]]);
  return pts;
}

function halfWidthAt(pts: Pt[], y: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    if ((y <= y1 && y >= y2) || (y >= y1 && y <= y2)) {
      const t = y1 === y2 ? 0 : (y - y1) / (y2 - y1);
      return x1 + (x2 - x1) * t - CX;
    }
  }
  return pts[0][0] - CX;
}

export function potShape(form: string, p: ProfileParams, rimStyle: Design['rim'] = 'plain', handle: Design['handle'] = 'none'): PotShape {
  const right = potOutline(form, p, rimStyle);
  const left = right.map(([x, y]): Pt => [100 - x, y]).reverse();
  const all = [...right, ...left];
  const body = 'M' + all.map(([x, y]) => `${r2(x)} ${r2(y)}`).join(' L') + ' Z';
  const top = right[right.length - 1];
  const topY = top[1];
  const H = BASE_Y - topY;
  const flat = FORMS[form].flat;
  const rx = top[0] - CX;
  const rim = { cx: CX, cy: r2(topY), rx: r2(rx), ry: r2(Math.max(1.2, rx * (flat ? 0.3 : 0.2))) };
  const bandY = r2(flat ? BASE_Y - H * 0.6 : BASE_Y - H * 0.55);
  const bandHalfWidth = r2(Math.max(1, halfWidthAt(right, bandY)));
  const maxHalfWidth = Math.max(...right.map(([x]) => x - CX));
  const footY = r2(BASE_Y - Math.min(5, H * 0.12));
  let handlePath: string | undefined;
  if (handle !== 'none' && FORMS[form].handleAllowed) {
    const yA = BASE_Y - H * (handle === 'ear' ? 0.82 : 0.78);
    const yB = BASE_Y - H * (handle === 'ear' ? 0.55 : handle === 'loop' ? 0.18 : 0.3);
    const xA = CX + halfWidthAt(right, yA) - 1.5;
    const xB = CX + halfWidthAt(right, yB) - 1.5;
    const reach = handle === 'loop' ? 17 : handle === 'ear' ? 9 : 13;
    const out = Math.min(106, Math.max(xA, xB) + reach);
    handlePath = `M${r2(xA)} ${r2(yA)} C${r2(out)} ${r2(yA - (handle === 'ear' ? 6 : 2))} ${r2(out)} ${r2(yB + 2)} ${r2(xB)} ${r2(yB)}`;
  }
  let spout: string | undefined;
  if (form === 'krug') {
    const x = CX - rx;
    spout = `M${r2(x + 1)} ${r2(topY + 4)} Q${r2(x - 5)} ${r2(topY + 1)} ${r2(x - 7)} ${r2(topY - 3)} L${r2(x + 3)} ${r2(topY - 0.5)} Z`;
  }
  let lid: PotShape['lid'];
  if (form === 'teekanne') {
    lid = { cx: CX, cy: rim.cy, rx: r2(rx + 1.2), ry: r2(rim.ry + 0.4), knob: r2(clamp(rx * 0.22, 2, 3.4)) };
    // S-curved spout from the lower belly on the left, rising to about rim height
    const yLo = BASE_Y - H * 0.2, yHi = BASE_Y - H * 0.48;
    const xLo = CX - halfWidthAt(right, yLo) + 2, xHi = CX - halfWidthAt(right, yHi) + 2;
    const left = CX - maxHalfWidth;
    const tx = Math.max(-6, left - 13 - H * 0.08), ty = Math.max(topY - 2, BASE_Y - H * 0.98);
    spout = `M${r2(xHi)} ${r2(yHi)} C${r2(left - 5)} ${r2(yHi + 0.5)} ${r2(tx + 3.5)} ${r2(ty + 8)} ${r2(tx + 1.6)} ${r2(ty)}`
      + ` L${r2(tx - 1.6)} ${r2(ty + 1)} C${r2(tx - 1)} ${r2(ty + 11)} ${r2(left - 10)} ${r2(yLo + 1)} ${r2(xLo)} ${r2(yLo)} Z`;
  }
  return { body, rim, handle: handlePath, spout, lid, footY, bandY, bandHalfWidth, topY: r2(topY), maxHalfWidth: r2(maxHalfWidth) };
}
