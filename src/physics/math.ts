export const DEG = Math.PI / 180;
export const KNOT = 0.514444;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Moves v toward target by at most `step`, without overshoot. */
export function approach(v: number, target: number, step: number): number {
  if (v < target) return Math.min(target, v + step);
  return Math.max(target, v - step);
}

/** Shortest signed angular difference a-b, wrapped to [-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

/** Velocity vector for a compass bearing (degrees, 0 = north/-y) and speed (m/s). */
export function bearing(deg: number, speed: number): { x: number; y: number } {
  const rad = deg * DEG;
  return { x: Math.sin(rad) * speed, y: -Math.cos(rad) * speed };
}
