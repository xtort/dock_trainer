import { AFT_ARM, BOW_ARM, HALF_SPACING, HULL, INERTIA } from './hull';
import { angleDiff, approach, bearing, clamp, KNOT } from './math';
import type { Boat, Controls, Environment } from './types';

/**
 * All coefficients below are gameplay-tuned (not CFD/sea-trial calibrated),
 * scaled up from the reference single-screw project's coefficients by this
 * hull's larger wetted area / real engine class, per PRD Section 9's stated
 * "real dimensions, gameplay-tuned forces" philosophy. Expect to retune after
 * playtesting, especially WALK_FRACTION and the drag terms.
 */
const IDLE_FRACTION = 0.08;
const ENGINE_SPOOL_RATE = 0.9; // fraction/sec, per engine
const RUDDER_RATE = 18 * (Math.PI / 180); // rad/sec
const THRUSTER_RATE = 4; // fraction/sec

/** ~340hp diesel, static thrust approximated at ~8.5 lbf/hp (typical inboard prop, not bollard-pull). */
const THRUST_AHEAD = 12500; // N, per engine
const THRUST_ASTERN = 8000; // N, per engine, astern props are less efficient

/**
 * Fraction of an engine's astern thrust converted to a lateral "prop walk" force
 * at the stern. This is the ONLY source of net lateral translation from opposed
 * engine thrust in this model: two equal-and-opposite thrusts are a pure force
 * couple (zero net force, torque only), so without prop walk, "walking sideways"
 * would be physically impossible. Standard outward-turning twin-screw convention
 * (starboard = right-hand prop, port = left-hand/mirror) means a right-hand prop
 * walks the stern to port when backing, so: port-engine-astern walks the stern to
 * starboard, starboard-engine-astern walks the stern to port. Because this force
 * is applied aft of the pivot, it reinforces (not cancels) the couple's yaw torque
 * — real twin-screw "walking" is genuinely an active, managed maneuver, not a
 * passive drift, and this model intentionally reflects that.
 */
const WALK_FRACTION = 0.35;

const RUDDER_MAX_LIFT = 1.4;
const RUDDER_COEF = 1.6; // lumped area*Cl for both linked rudders together
const RUDDER_ASTERN_FACTOR = 0.045; // rudders are weak steering astern
const RHO_WATER = 1025;

const BOW_THRUST_MAX = 4500; // N
const STERN_THRUST_MAX = 4000; // N

const SURGE_DRAG_LINEAR = 1000;
const SWAY_DRAG_LINEAR = 5800;
const SWAY_DRAG_QUADRATIC = 17000;
const SURGE_ADDED_MASS = HULL.mass * 1.15;
const SWAY_ADDED_MASS = HULL.mass * 2.1;

const WIND_LATERAL_AREA = 60; // m^2, effective lateral windage (hull + pilothouse/flybridge)
const WIND_FRONTAL_AREA = 18; // m^2
const RHO_AIR = 1.225;

const YAW_DAMPING_LINEAR = 260000;
const YAW_DAMPING_QUADRATIC = 2300000;

export function createControls(): Controls {
  return { portShift: 0, stbdShift: 0, portThrottle: 0, stbdThrottle: 0, rudder: 0, bow: 0, stern: 0 };
}

export function createBoat(x: number, y: number, h: number): Boat {
  return { x, y, h, vx: 0, vy: 0, r: 0, port: 0, stbd: 0, rudder: 0, bow: 0, stern: 0 };
}

function engineCommand(shift: -1 | 0 | 1, throttle: number): number {
  if (shift === 0) return 0;
  return shift * (IDLE_FRACTION + (1 - IDLE_FRACTION) * throttle);
}

function engineThrust(fraction: number): number {
  return fraction >= 0 ? fraction * THRUST_AHEAD : fraction * THRUST_ASTERN;
}

export function integrateBoat(b: Boat, c: Controls, e: Environment, dt: number): void {
  b.port = approach(b.port, engineCommand(c.portShift, c.portThrottle), dt * ENGINE_SPOOL_RATE);
  b.stbd = approach(b.stbd, engineCommand(c.stbdShift, c.stbdThrottle), dt * ENGINE_SPOOL_RATE);
  b.rudder = approach(b.rudder, c.rudder, dt * RUDDER_RATE);
  b.bow = approach(b.bow, c.bow, dt * THRUSTER_RATE);
  b.stern = approach(b.stern, c.stern, dt * THRUSTER_RATE);

  const thrustPort = engineThrust(b.port);
  const thrustStbd = engineThrust(b.stbd);

  const f = { x: Math.sin(b.h), y: -Math.cos(b.h) }; // forward (bow) unit vector
  const n = { x: Math.cos(b.h), y: Math.sin(b.h) }; // starboard unit vector

  const current = bearing(e.currentDir, e.current * KNOT);
  const windVel = bearing(e.windDir + 180, e.wind * KNOT);

  const wx = b.vx - current.x;
  const wy = b.vy - current.y;
  const u = wx * f.x + wy * f.y; // surge speed through water
  const v = wx * n.x + wy * n.y; // sway speed through water

  const ax = windVel.x - b.vx;
  const ay = windVel.y - b.vy;
  const au = ax * f.x + ay * f.y; // apparent wind, fore component
  const av = ax * n.x + ay * n.y; // apparent wind, lateral component

  // Engines: thrust is purely fore-aft, so the only yaw effect from differential
  // thrust is a couple from the lateral (shaft) offset of each thrust line.
  const surgeEngines = thrustPort + thrustStbd;
  const coupleTorque = HALF_SPACING * (thrustPort - thrustStbd);

  // Prop walk: see WALK_FRACTION comment above for the sign convention.
  const walkPort = WALK_FRACTION * Math.max(-thrustPort, 0); // port astern -> +n (starboard)
  const walkStbd = WALK_FRACTION * Math.max(-thrustStbd, 0); // stbd astern -> -n (port)
  const swayWalk = walkPort - walkStbd;
  const torqueWalk = -AFT_ARM * swayWalk;

  // Rudder: simplified free-stream lift/drag (no prop-wash-jet augmentation —
  // the rudder is a secondary, not-required control in this trainer).
  const lift = RUDDER_MAX_LIFT * Math.sin(2 * b.rudder);
  const rudderMag = 0.5 * RHO_WATER * RUDDER_COEF * u * Math.abs(u) * (u >= 0 ? 1 : RUDDER_ASTERN_FACTOR);
  const rudderForce = -rudderMag * lift;
  const rudderDrag = Math.abs(rudderForce) * Math.sin(Math.abs(b.rudder));
  const torqueRudder = -AFT_ARM * rudderForce;

  // Thrusters: proportional lateral force at bow/stern, each with its own arm.
  const bowForce = BOW_THRUST_MAX * b.bow;
  const sternForce = STERN_THRUST_MAX * b.stern;
  const swayThrusters = bowForce + sternForce;
  const torqueThrusters = BOW_ARM * bowForce - AFT_ARM * sternForce;

  const windSide = 0.5 * RHO_AIR * WIND_LATERAL_AREA * av * Math.abs(av);
  const windFore = 0.5 * RHO_AIR * WIND_FRONTAL_AREA * au * Math.abs(au);

  const surge =
    surgeEngines - rudderDrag - SURGE_DRAG_LINEAR * u - SURGE_DRAG_LINEAR * u * Math.abs(u) + windFore;
  const sway =
    swayWalk +
    swayThrusters +
    rudderForce -
    SWAY_DRAG_LINEAR * v -
    SWAY_DRAG_QUADRATIC * v * Math.abs(v) +
    windSide;
  const torque =
    coupleTorque +
    torqueWalk +
    torqueThrusters +
    torqueRudder +
    0.65 * windSide - // hull windage isn't perfectly centered on the pivot
    YAW_DAMPING_LINEAR * b.r -
    YAW_DAMPING_QUADRATIC * b.r * Math.abs(b.r);

  b.vx += ((f.x * surge) / SURGE_ADDED_MASS + (n.x * sway) / SWAY_ADDED_MASS) * dt;
  b.vy += ((f.y * surge) / SURGE_ADDED_MASS + (n.y * sway) / SWAY_ADDED_MASS) * dt;
  b.r += (torque / INERTIA) * dt;
  b.h = angleDiff(b.h + b.r * dt, 0);
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

export function speedKnots(b: Boat): number {
  return Math.hypot(b.vx, b.vy) / KNOT;
}

export function clampRudder(deg: number): number {
  return clamp(deg, -35, 35);
}
