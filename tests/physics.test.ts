import { describe, expect, it } from 'vitest';
import { resolveCollisions } from '../src/physics/collisions';
import { DWELL_REQUIRED, evaluateGoals, updateDwell } from '../src/physics/goals';
import { hullPoly } from '../src/physics/hull';
import { createBoat, createControls, integrateBoat } from '../src/physics/integrate';
import { DEG } from '../src/physics/math';
import type { Environment, GoalRegion, Obstacle } from '../src/physics/types';

const CALM: Environment = { wind: 0, windDir: 270, current: 0, currentDir: 90 };

function run(boat: ReturnType<typeof createBoat>, controls: ReturnType<typeof createControls>, seconds: number, dt = 0.02) {
  for (let t = 0; t < seconds; t += dt) integrateBoat(boat, controls, CALM, dt);
}

describe('twin independent engines', () => {
  it('ramps port and starboard engine state independently', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.portThrottle = 1;
    // starboard left untouched
    run(boat, controls, 2);
    expect(boat.port).toBeGreaterThan(0.9);
    expect(boat.stbd).toBe(0);
  });

  it('symmetric ahead thrust on both engines produces straight-line motion, no yaw', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.stbdShift = 1;
    controls.portThrottle = 1;
    controls.stbdThrottle = 1;
    run(boat, controls, 2);
    expect(boat.h).toBe(0);
    expect(boat.r).toBe(0);
    expect(boat.vy).toBeLessThan(0); // moving ahead (north, -y)
  });
});

describe('opposed thrust (twin-screw pivot/walk)', () => {
  it('port-ahead + starboard-astern yaws the bow to starboard', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.portThrottle = 1;
    controls.stbdShift = -1;
    controls.stbdThrottle = 1;
    run(boat, controls, 5);
    expect(boat.h).toBeGreaterThan(0);
  });

  it('also produces net lateral drift via prop walk, not just rotation', () => {
    // A short window, before heading rotates far, isolates the sway force's
    // direction from the world-frame rotation it's also causing.
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.portThrottle = 1;
    controls.stbdShift = -1;
    controls.stbdThrottle = 1;
    run(boat, controls, 0.2);
    expect(boat.vx).toBeLessThan(0);
    expect(Math.abs(boat.h)).toBeLessThan(5 * DEG); // still an early, mostly-unrotated snapshot
  });

  it('a pure force couple (engines only, no prop walk contribution) cannot exist here: opposing engines always net force via prop walk', () => {
    // Sanity check that opposed thrust is not silently a zero-sway no-op.
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = -1;
    controls.portThrottle = 1;
    controls.stbdShift = 1;
    controls.stbdThrottle = 1;
    run(boat, controls, 0.2);
    expect(boat.vx).not.toBe(0);
  });
});

describe('off-center rudder', () => {
  it('deflected rudder yaws the boat even with symmetric engine thrust', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.stbdShift = 1;
    controls.portThrottle = 1;
    controls.stbdThrottle = 1;
    controls.rudder = 20 * DEG;
    run(boat, controls, 3);
    expect(Math.abs(boat.h)).toBeGreaterThan(1 * DEG);
  });

  it('centered rudder leaves symmetric engine thrust arrow-straight', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.portShift = 1;
    controls.stbdShift = 1;
    controls.portThrottle = 1;
    controls.stbdThrottle = 1;
    run(boat, controls, 3);
    expect(boat.h).toBe(0);
  });
});

describe('thrusters', () => {
  it('ramps toward commanded value and back to neutral on release', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    controls.bow = 1;
    run(boat, controls, 1);
    expect(boat.bow).toBeGreaterThan(0.5);
    controls.bow = 0;
    run(boat, controls, 1);
    expect(boat.bow).toBeLessThan(0.05);
  });
});

describe('collisions', () => {
  it('pushes the hull out of an overlapping obstacle and reports closing speed', () => {
    const boat = createBoat(0, 0, 0);
    boat.vy = -1; // heading north into the obstacle ahead
    const poly = hullPoly(boat);
    const bowY = Math.min(...poly.map((p) => p.y));
    const obstacle: Obstacle = {
      id: 'dock0',
      poly: [
        { x: -10, y: bowY - 0.2 },
        { x: 10, y: bowY - 0.2 },
        { x: 10, y: bowY + 0.5 },
        { x: -10, y: bowY + 0.5 },
      ],
    };
    const before = { x: boat.x, y: boat.y };
    const result = resolveCollisions(boat, [obstacle]);
    expect(result.hitSpeed).toBeGreaterThan(0);
    expect(result.contacted).toContain('dock0');
    expect(boat.x !== before.x || boat.y !== before.y).toBe(true);
  });
});

describe('goals and dwell', () => {
  // Wide enough to contain the 14.33m x 4.60m hull centered at the origin with heading 0.
  const goal: GoalRegion = { x: 0, y: 0, w: 20, h: 20, heading: 0 };

  it('evaluates all goals true when settled inside the berth, neutral', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    const goals = evaluateGoals(boat, controls, goal);
    expect(goals).toEqual({ inside: true, heading: true, speed: true, neutral: true });
  });

  it('accumulates dwell time while goals hold, caps at DWELL_REQUIRED, resets on failure', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    const goals = evaluateGoals(boat, controls, goal);
    let dwell = 0;
    dwell = updateDwell(dwell, goals, 1, 10);
    dwell = updateDwell(dwell, goals, 1, 10);
    expect(dwell).toBe(2);
    dwell = updateDwell(dwell, goals, DWELL_REQUIRED, 10);
    expect(dwell).toBe(DWELL_REQUIRED);
    const failing = { ...goals, heading: false };
    dwell = updateDwell(dwell, failing, 1, 10);
    expect(dwell).toBe(0);
  });

  it('does not accumulate dwell right after a dock contact', () => {
    const boat = createBoat(0, 0, 0);
    const controls = createControls();
    const goals = evaluateGoals(boat, controls, goal);
    const dwell = updateDwell(0, goals, 1, 0.2); // hit 0.2s ago
    expect(dwell).toBe(0);
  });
});
