import { AFT_ARM, HALF_SPACING } from '../physics/hull';
import { resolveCollisions } from '../physics/collisions';
import { DWELL_REQUIRED, evaluateGoals, updateDwell } from '../physics/goals';
import { createBoat, createControls, integrateBoat } from '../physics/integrate';
import type { Boat, Controls, Environment, Goals, Obstacle } from '../physics/types';
import { getLevels, type LevelDef } from '../levels/levels';

export type Mode = 'ready' | 'playing' | 'paused' | 'won' | 'crashed';
export type StepStatus = 'contact' | 'crashed' | 'won' | null;

const CRASH_SPEED = 1.05; // m/s closing speed (~2 knots), matches the reference project's threshold
const CONTACT_SPEED = 0.075;
const CONTACT_COOLDOWN = 1.5; // seconds, avoid double-counting one sustained touch
const WAKE_INTERVAL = 0.08;
const WAKE_LIFETIME = 3;
const WAKE_MAX_POINTS = 45;

export interface WakePoint {
  x: number;
  y: number;
  age: number;
}

export interface GameState {
  levelIndex: number;
  level: LevelDef;
  mode: Mode;
  boat: Boat;
  controls: Controls;
  env: Environment;
  obstacles: Obstacle[];
  time: number;
  contacts: number;
  dwell: number;
  lastHitTime: number;
  contactTimes: Record<string, number>;
  goals: Goals;
  wakePort: WakePoint[];
  wakeStbd: WakePoint[];
  wakeTimer: number;
}

/**
 * `controls` is optional so a fresh Controls object can be created on first
 * call; callers that reset/switch levels should pass their existing Controls
 * object back in so it gets reset IN PLACE. The active InputSource holds a
 * reference to that one object, so replacing it wholesale on restart would
 * silently disconnect the keyboard (or future gamepad) from the new state.
 */
export function createState(levelIndex: number, controls: Controls = createControls()): GameState {
  const level = getLevels()[levelIndex]!;
  const boat = createBoat(level.start.x, level.start.y, level.start.h);
  boat.rudder = level.startRudder ?? 0;
  controls.portShift = 0;
  controls.stbdShift = 0;
  controls.portThrottle = 0;
  controls.stbdThrottle = 0;
  controls.rudder = level.startRudder ?? 0;
  controls.bow = 0;
  controls.stern = 0;
  const env: Environment = { wind: level.wind, windDir: level.windDir, current: level.current, currentDir: level.currentDir };
  const state: GameState = {
    levelIndex,
    level,
    mode: 'ready',
    boat,
    controls,
    env,
    obstacles: level.obstacles,
    time: 0,
    contacts: 0,
    dwell: 0,
    lastHitTime: -10,
    contactTimes: {},
    goals: { inside: false, heading: false, speed: true, neutral: true },
    wakePort: [],
    wakeStbd: [],
    wakeTimer: 0,
  };
  state.goals = evaluateGoals(state.boat, state.controls, state.level.goal);
  return state;
}

function updateWake(state: GameState, dt: number): void {
  for (const point of state.wakePort) point.age += dt;
  for (const point of state.wakeStbd) point.age += dt;
  state.wakePort = state.wakePort.filter((p) => p.age < WAKE_LIFETIME);
  state.wakeStbd = state.wakeStbd.filter((p) => p.age < WAKE_LIFETIME);

  state.wakeTimer += dt;
  if (state.wakeTimer < WAKE_INTERVAL) return;
  state.wakeTimer = 0;

  const b = state.boat;
  const f = { x: Math.sin(b.h), y: -Math.cos(b.h) };
  const n = { x: Math.cos(b.h), y: Math.sin(b.h) };
  const sternX = b.x - f.x * AFT_ARM;
  const sternY = b.y - f.y * AFT_ARM;

  if (Math.abs(b.port) > 0.05) {
    state.wakePort.push({ x: sternX - n.x * HALF_SPACING, y: sternY - n.y * HALF_SPACING, age: 0 });
    if (state.wakePort.length > WAKE_MAX_POINTS) state.wakePort.shift();
  }
  if (Math.abs(b.stbd) > 0.05) {
    state.wakeStbd.push({ x: sternX + n.x * HALF_SPACING, y: sternY + n.y * HALF_SPACING, age: 0 });
    if (state.wakeStbd.length > WAKE_MAX_POINTS) state.wakeStbd.shift();
  }
}

export function physicsStep(state: GameState, dt: number): StepStatus {
  if (state.mode !== 'playing') return null;
  state.time += dt;
  integrateBoat(state.boat, state.controls, state.env, dt);
  updateWake(state, dt);
  const { hitSpeed, contacted } = resolveCollisions(state.boat, state.obstacles);

  if (hitSpeed > CRASH_SPEED) {
    state.mode = 'crashed';
    const c = state.controls;
    c.portShift = 0;
    c.stbdShift = 0;
    c.portThrottle = 0;
    c.stbdThrottle = 0;
    c.rudder = 0;
    c.bow = 0;
    c.stern = 0;
    return 'crashed';
  }

  let newContact = false;
  for (const id of contacted) {
    const last = state.contactTimes[id] ?? -10;
    if (state.time - last > CONTACT_COOLDOWN) {
      state.contacts++;
      state.contactTimes[id] = state.time;
      state.lastHitTime = state.time;
      newContact = true;
    }
  }

  state.goals = evaluateGoals(state.boat, state.controls, state.level.goal);
  state.dwell = updateDwell(state.dwell, state.goals, dt, state.time - state.lastHitTime);
  if (state.dwell >= DWELL_REQUIRED) {
    state.mode = 'won';
    return 'won';
  }

  if (newContact) return 'contact';
  return hitSpeed > CONTACT_SPEED ? 'contact' : null;
}

export function resetLevel(levelIndex: number, controls: Controls): GameState {
  return createState(levelIndex, controls);
}
