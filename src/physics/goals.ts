import { hullPoly } from './hull';
import { speedKnots } from './integrate';
import { angleDiff, DEG } from './math';
import type { Boat, Controls, GoalRegion, Goals } from './types';

const SPEED_LIMIT_KT = 0.35;
const YAW_RATE_LIMIT = 1.5 * DEG;
const HEADING_TOLERANCE = 12 * DEG;
const NEUTRAL_ENGINE_EPS = 0.035;
const NEUTRAL_THRUSTER_EPS = 0.1;

/**
 * "Neutral" deliberately ignores the rudder: per PRD Section 4, the rudder is
 * modeled but never required to complete a level, so an off-center rudder
 * should cost you through drag/yaw during the approach, not block the win.
 */
export function evaluateGoals(boat: Boat, controls: Controls, goal: GoalRegion): Goals {
  const poly = hullPoly(boat);
  const inside = poly.every(
    (p) => p.x > goal.x - goal.w / 2 && p.x < goal.x + goal.w / 2 && p.y > goal.y - goal.h / 2 && p.y < goal.y + goal.h / 2,
  );
  const heading = Math.abs(angleDiff(boat.h, goal.heading)) <= HEADING_TOLERANCE;
  const speed = speedKnots(boat) < SPEED_LIMIT_KT && Math.abs(boat.r) < YAW_RATE_LIMIT;
  const neutral =
    controls.portShift === 0 &&
    controls.stbdShift === 0 &&
    Math.abs(boat.port) < NEUTRAL_ENGINE_EPS &&
    Math.abs(boat.stbd) < NEUTRAL_ENGINE_EPS &&
    Math.abs(boat.bow) < NEUTRAL_THRUSTER_EPS &&
    Math.abs(boat.stern) < NEUTRAL_THRUSTER_EPS &&
    controls.bow === 0 &&
    controls.stern === 0;
  return { inside, heading, speed, neutral };
}

export const DWELL_REQUIRED = 3;

/** Accumulates dwell time while all goals hold and no recent contact; resets otherwise. */
export function updateDwell(dwell: number, goals: Goals, dt: number, timeSinceLastHit: number): number {
  const allMet = goals.inside && goals.heading && goals.speed && goals.neutral;
  if (allMet && timeSinceLastHit > 1) {
    return Math.min(DWELL_REQUIRED, dwell + dt);
  }
  return 0;
}
