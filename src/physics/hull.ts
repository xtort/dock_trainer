import type { Boat, Point } from './types';

export const FT = 0.3048;
const LB = 0.45359237;

/**
 * Bayliner 4788 Pilothouse Motoryacht — real specs (LOD, beam, draft, displacement)
 * per public listing data; see PRD.md Section 15 for sources. Shaft spacing is not a
 * published spec for any retail listing, so it's estimated below from typical
 * modified-V twin-inboard layout proportions and documented as such.
 */
export const HULL = {
  length: 47 * FT, // LOD, ~14.33 m (LOA with bow pulpit is 50 ft)
  beam: (15 + 1 / 12) * FT, // ~4.60 m
  draft: (3 + 4 / 12) * FT, // ~1.02 m
  mass: 30000 * LB, // ~13,608 kg, dry displacement
} as const;

/** Estimated centerline-to-centerline shaft spacing: ~35% of beam, typical for a
 * modified-V twin-inboard layout with shafts angled in toward the keel. Not a
 * published spec — tune this first if opposed-thrust maneuvers feel off. */
export const SHAFT_SPACING = 0.35 * HULL.beam; // ~1.61 m
export const HALF_SPACING = SHAFT_SPACING / 2;

/** Yaw radius-of-gyration expressed as a fraction of LOA. 0.413 reproduces the
 * gyration ratio implied by the reference single-screw project's own mass/inertia
 * pair, applied here to real 4788 dimensions so both projects share one
 * "gameplay-tuned" methodology rather than two unrelated guesses. */
const GYRATION_RATIO = 0.413;
export const INERTIA = HULL.mass * (GYRATION_RATIO * HULL.length) ** 2;

/** Longitudinal moment arms from the pivot (center of mass), as fractions of LOA.
 * Props, rudders, and the stern thruster are clustered near the transom and share
 * one aft arm; the bow thruster gets its own forward arm. */
export const BOW_ARM = 0.39 * HULL.length;
export const AFT_ARM = 0.37 * HULL.length;

/**
 * Top-down hull outline in local coordinates (bow at -length/2, stern at
 * +length/2), fuller and beamier than a slim trawler bow: a long parallel
 * midbody and a near-full-beam transom, reflecting a production motoryacht's
 * interior-volume-driven hull form rather than a fine-entry displacement hull.
 */
export function hullLocal(length = HULL.length, beam = HULL.beam): Point[] {
  return [
    { x: -0.5 * beam, y: 0.48 * length }, // port transom corner
    { x: -0.5 * beam, y: 0.1 * length }, // port quarter
    { x: -0.5 * beam, y: -0.2 * length }, // port midship (max beam)
    { x: -0.42 * beam, y: -0.34 * length }, // port forward shoulder
    { x: -0.18 * beam, y: -0.45 * length }, // port bow flare
    { x: 0, y: -0.5 * length }, // stem
    { x: 0.18 * beam, y: -0.45 * length },
    { x: 0.42 * beam, y: -0.34 * length },
    { x: 0.5 * beam, y: -0.2 * length },
    { x: 0.5 * beam, y: 0.1 * length },
    { x: 0.5 * beam, y: 0.48 * length }, // starboard transom corner
  ];
}

export function transformPoly(poly: Point[], x: number, y: number, h: number): Point[] {
  const c = Math.cos(h);
  const s = Math.sin(h);
  return poly.map((p) => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c }));
}

export function hullPoly(b: Pick<Boat, 'x' | 'y' | 'h'>): Point[] {
  return transformPoly(hullLocal(), b.x, b.y, b.h);
}

export function rectPoly(r: { x: number; y: number; w: number; h: number }): Point[] {
  return [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ];
}
