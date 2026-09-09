import { HULL, INERTIA, hullPoly } from './hull';
import type { Boat, Obstacle, Point } from './types';

function polyCenter(poly: Point[]): Point {
  return poly.reduce((a, p) => ({ x: a.x + p.x / poly.length, y: a.y + p.y / poly.length }), { x: 0, y: 0 });
}

/** Separating-axis test between two convex polygons. Returns the minimum
 * penetration depth and its normal (pointing from b toward a), or null if
 * they don't overlap. */
function separation(a: Point[], b: Point[]): { depth: number; n: Point } | null {
  let depth = Infinity;
  let normal: Point | null = null;
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!;
      const q = poly[(i + 1) % poly.length]!;
      const len = Math.hypot(q.x - p.x, q.y - p.y);
      if (len < 1e-8) continue;
      const nrm = { x: -(q.y - p.y) / len, y: (q.x - p.x) / len };
      let amin = Infinity;
      let amax = -Infinity;
      let bmin = Infinity;
      let bmax = -Infinity;
      for (const v of a) {
        const d = v.x * nrm.x + v.y * nrm.y;
        amin = Math.min(amin, d);
        amax = Math.max(amax, d);
      }
      for (const v of b) {
        const d = v.x * nrm.x + v.y * nrm.y;
        bmin = Math.min(bmin, d);
        bmax = Math.max(bmax, d);
      }
      if (amax <= bmin || bmax <= amin) return null;
      const d = Math.min(amax - bmin, bmax - amin);
      if (d < depth) {
        depth = d;
        normal = nrm;
      }
    }
  }
  const ca = polyCenter(a);
  const cb = polyCenter(b);
  if (!normal) return null;
  if ((ca.x - cb.x) * normal.x + (ca.y - cb.y) * normal.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  return { depth, n: normal };
}

export interface CollisionResult {
  /** Highest closing speed (m/s) seen this step, across all contacts. */
  hitSpeed: number;
  /** Obstacle ids newly contacted this step (for caller-side contact counting). */
  contacted: string[];
}

/** Resolves hull/obstacle overlaps by direct position correction plus an
 * impulse response, iterated a few passes to settle simultaneous contacts. */
export function resolveCollisions(boat: Boat, obstacles: Obstacle[]): CollisionResult {
  let hitSpeed = 0;
  const contacted: string[] = [];
  for (let pass = 0; pass < 3; pass++) {
    let any = false;
    for (const obstacle of obstacles) {
      const poly = hullPoly(boat);
      const hit = separation(poly, obstacle.poly);
      if (!hit) continue;
      any = true;
      const n = hit.n;
      let min = Infinity;
      for (const p of poly) min = Math.min(min, p.x * n.x + p.y * n.y);
      const points = poly.filter((p) => p.x * n.x + p.y * n.y < min + 0.3);
      const cp = polyCenter(points);
      const rx = cp.x - boat.x;
      const ry = cp.y - boat.y;
      const vn = (boat.vx - boat.r * ry) * n.x + (boat.vy + boat.r * rx) * n.y;
      const closing = Math.max(0, -vn);
      hitSpeed = Math.max(hitSpeed, closing);
      boat.x += n.x * (hit.depth + 0.003);
      boat.y += n.y * (hit.depth + 0.003);
      if (vn < 0) {
        const arm = rx * n.y - ry * n.x;
        const impulse = (-1.06 * vn) / (1 / HULL.mass + (arm * arm) / INERTIA);
        boat.vx += (impulse * n.x) / HULL.mass;
        boat.vy += (impulse * n.y) / HULL.mass;
        boat.r += (impulse * arm) / INERTIA;
        boat.vx *= 0.98;
        boat.vy *= 0.98;
      }
      if (closing > 0.075) contacted.push(obstacle.id);
    }
    if (!any) break;
  }
  return { hitSpeed, contacted };
}
