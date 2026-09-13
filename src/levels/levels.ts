import { DEG } from '../physics/math';
import { FT, HULL, hullLocal, rectPoly, transformPoly } from '../physics/hull';
import type { GoalRegion, Obstacle } from '../physics/types';

export const WORLD = { w: 152, h: 95 };

/** Position + hull proportions for a static neighbor boat, for detailed rendering
 * (collision still uses the generic `obstacles` polygons — this is render-only). */
export interface RenderBoat {
  x: number;
  y: number;
  h: number;
  length: number;
  beam: number;
}

export interface LevelDef {
  name: string;
  berth: string;
  intro: string;
  hint: string;
  technique: string;
  start: { x: number; y: number; h: number };
  /** Rudder angle (radians) the boat starts deflected to, for the off-center-rudder lesson. */
  startRudder?: number;
  goal: GoalRegion;
  wind: number;
  windDir: number;
  current: number;
  currentDir: number;
  obstacles: Obstacle[];
  neighborBoats: RenderBoat[];
}

const GOAL_DEPTH = 20; // fixed goal-region depth; must clear the 14.33m hull with margin
const PIER_Y0 = 7;
const PIER_HEIGHT = 4;
const FINGER_Y0 = PIER_Y0 + PIER_HEIGHT;
const FINGER_LENGTH = 30;

function worldBoundaries(): Obstacle[] {
  const boundaries: Array<{ x: number; y: number; w: number; h: number }> = [
    { x: -20, y: -20, w: WORLD.w + 40, h: 20 },
    { x: -20, y: WORLD.h, w: WORLD.w + 40, h: 20 },
    { x: -20, y: 0, w: 20, h: WORLD.h },
    { x: WORLD.w, y: 0, w: 20, h: WORLD.h },
  ];
  return boundaries.map((r, i) => ({ id: `edge${i}`, poly: rectPoly(r) }));
}

interface SharedSlipOptions {
  centerX: number;
  /** Which side of the MIDDLE (target) slip is already occupied, leaving the other side for the player. */
  neighborSide: 'port' | 'stbd';
}

/**
 * Every level's marina: three real 41 ft (12.50 m)-wide shared slips in a row,
 * each sized for two boats side by side with no dividing finger between them
 * (a raft-up/shared-slip arrangement — there is no such thing as a single-boat
 * finger dock in this marina). The left and right slips are always fully
 * occupied, two boats each, for context/obstacle texture. The middle slip is
 * always the player's: a 15.5 ft-beam boat already holds one side
 * (`neighborSide`), and the player has to bring the hull alongside on the
 * open side, no divider between them. Margins/gaps are estimated (snug for
 * already-docked boats, a bit more room on the player's open side) since real
 * raft-up spacing isn't a published spec — there is deliberately little slack
 * here; a real 41 ft slip shared by two ~15 ft-beam boats is genuinely tight.
 */
function buildSharedSlipMarina(
  opts: SharedSlipOptions,
): { obstacles: Obstacle[]; goal: GoalRegion; targetX: number; boats: RenderBoat[] } {
  const slipWidth = 41 * FT; // ~12.50 m, shared by two boats
  const neighborBeam = 15.5 * FT; // ~4.72 m
  const neighborLength = 14.3; // similar size-class to the player's own 4788
  const pilingWidth = 2; // separates adjacent slip groups (not used within a shared slip)
  const dockedMargin = 0.3; // snug — already-docked boats aren't maneuvering
  const playerMargin = 0.3; // player's clearance to the outer piling on the open side
  const goalBuffer = 0.4; // keeps the goal rectangle from grazing the neighbor's hull or the piling
  const { centerX, neighborSide } = opts;

  const half = slipWidth / 2;
  const targetLeft = centerX - half;
  const targetRight = centerX + half;
  const y = FINGER_Y0 + FINGER_LENGTH / 2 + 2;

  // Compute in the "neighbor to port" orientation, then reflect about centerX if the neighbor is actually to starboard.
  const neighborCenterXPort = targetLeft + dockedMargin + neighborBeam / 2;
  const neighborRightEdgePort = neighborCenterXPort + neighborBeam / 2;
  const playerCenterXPort = targetRight - playerMargin - HULL.beam / 2;
  const goalLeftPort = neighborRightEdgePort + goalBuffer;
  const goalRightPort = targetRight - goalBuffer;

  const reflect = (x: number) => 2 * centerX - x;
  const mirrored = neighborSide === 'stbd';

  const neighborCenterX = mirrored ? reflect(neighborCenterXPort) : neighborCenterXPort;
  const playerCenterX = mirrored ? reflect(playerCenterXPort) : playerCenterXPort;
  const goalLeft = mirrored ? reflect(goalRightPort) : goalLeftPort;
  const goalRight = mirrored ? reflect(goalLeftPort) : goalRightPort;

  const leftSlipCenterX = targetLeft - pilingWidth - half;
  const rightSlipCenterX = targetRight + pilingWidth + half;

  function pairedBoats(slipCenter: number, idPrefix: string): { obstacles: Obstacle[]; boats: RenderBoat[] } {
    const left = slipCenter - half + dockedMargin + neighborBeam / 2;
    const right = slipCenter + half - dockedMargin - neighborBeam / 2;
    return {
      obstacles: [
        { id: `${idPrefix}A`, poly: transformPoly(hullLocal(neighborLength, neighborBeam), left, y, 0) },
        { id: `${idPrefix}B`, poly: transformPoly(hullLocal(neighborLength, neighborBeam), right, y, 0) },
      ],
      boats: [
        { x: left, y, h: 0, length: neighborLength, beam: neighborBeam },
        { x: right, y, h: 0, length: neighborLength, beam: neighborBeam },
      ],
    };
  }

  const rowLeft = leftSlipCenterX - half;
  const rowRight = rightSlipCenterX + half;
  const slipA = pairedBoats(leftSlipCenterX, 'slipA');
  const slipC = pairedBoats(rightSlipCenterX, 'slipC');

  const obstacles: Obstacle[] = [
    { id: 'pier', poly: rectPoly({ x: rowLeft - 3, y: PIER_Y0, w: rowRight - rowLeft + 6, h: PIER_HEIGHT }) },
    { id: 'pilingA', poly: rectPoly({ x: leftSlipCenterX - half - pilingWidth, y: FINGER_Y0, w: pilingWidth, h: FINGER_LENGTH }) },
    { id: 'pilingB', poly: rectPoly({ x: targetLeft - pilingWidth, y: FINGER_Y0, w: pilingWidth, h: FINGER_LENGTH }) },
    { id: 'pilingC', poly: rectPoly({ x: targetRight, y: FINGER_Y0, w: pilingWidth, h: FINGER_LENGTH }) },
    { id: 'pilingD', poly: rectPoly({ x: rightSlipCenterX + half, y: FINGER_Y0, w: pilingWidth, h: FINGER_LENGTH }) },
    { id: 'neighborBoat', poly: transformPoly(hullLocal(neighborLength, neighborBeam), neighborCenterX, y, 0) },
    ...slipA.obstacles,
    ...slipC.obstacles,
    ...worldBoundaries(),
  ];

  const boats: RenderBoat[] = [
    { x: neighborCenterX, y, h: 0, length: neighborLength, beam: neighborBeam },
    ...slipA.boats,
    ...slipC.boats,
  ];

  const goal: GoalRegion = {
    x: (goalLeft + goalRight) / 2,
    y,
    w: goalRight - goalLeft,
    h: GOAL_DEPTH,
    heading: 0,
  };

  return { obstacles, goal, targetX: playerCenterX, boats };
}

const NEIGHBOR_PORT = buildSharedSlipMarina({ centerX: 76, neighborSide: 'port' });
const NEIGHBOR_STBD = buildSharedSlipMarina({ centerX: 76, neighborSide: 'stbd' });

const LEVELS: LevelDef[] = [
  {
    name: 'Straight-in approach',
    berth: '01',
    technique: 'Engines only, symmetric thrust',
    intro:
      'Calm water, straight approach. This is a shared 41-foot slip — a 15½-foot boat already holds the port side, and you are bringing this hull alongside on the open starboard side. Ease both engines ahead together and let her coast the last stretch.',
    hint: 'Match port and starboard throttle. The boat to port is not moving — hold your line down the starboard side of the slip and stop level with her.',
    start: { x: NEIGHBOR_PORT.targetX, y: 62, h: 0 },
    goal: NEIGHBOR_PORT.goal,
    wind: 0,
    windDir: 270,
    current: 0,
    currentDir: 90,
    obstacles: NEIGHBOR_PORT.obstacles,
    neighborBoats: NEIGHBOR_PORT.boats,
  },
  {
    name: 'Walking sideways',
    berth: '02',
    technique: 'Opposed thrust, no thrusters',
    intro:
      'You are lined up on the right heading but offset to starboard of the shared slip. Oppose the engines to walk the hull sideways alongside the boat already holding the port side, then finish straight in.',
    hint: 'One engine ahead, one astern shifts you sideways but also spins the bow — short bursts, check your heading, correct as you go.',
    start: { x: NEIGHBOR_PORT.targetX - 8, y: 48, h: 0 },
    goal: NEIGHBOR_PORT.goal,
    wind: 0,
    windDir: 270,
    current: 0,
    currentDir: 90,
    obstacles: NEIGHBOR_PORT.obstacles,
    neighborBoats: NEIGHBOR_PORT.boats,
  },
  {
    name: 'Pivot turn',
    berth: '03',
    technique: 'Opposed thrust, full rotation',
    intro:
      'You are facing the wrong way in the fairway. Pivot the boat in place with opposed engines, then go ahead into the shared slip alongside the boat to port.',
    hint: 'Full opposite thrust on both levers spins you close to on the spot. Ease off as you approach your new heading, or you will overshoot.',
    start: { x: NEIGHBOR_PORT.targetX, y: 58, h: 180 * DEG },
    goal: NEIGHBOR_PORT.goal,
    wind: 0,
    windDir: 270,
    current: 0,
    currentDir: 90,
    obstacles: NEIGHBOR_PORT.obstacles,
    neighborBoats: NEIGHBOR_PORT.boats,
  },
  {
    name: 'Off-center rudder',
    berth: '04',
    technique: 'Notice and correct',
    intro:
      'The wheel was left off-center from the last approach. Run your engines symmetrically and you will still drift toward the boat already alongside to port — find it, and center it.',
    hint: 'Nothing about your engines is wrong. Check the rudder readout before you blame the throttle.',
    start: { x: NEIGHBOR_PORT.targetX, y: 62, h: 0 },
    startRudder: 15 * DEG,
    goal: NEIGHBOR_PORT.goal,
    wind: 0,
    windDir: 270,
    current: 0,
    currentDir: 90,
    obstacles: NEIGHBOR_PORT.obstacles,
    neighborBoats: NEIGHBOR_PORT.boats,
  },
  {
    name: 'Wind and current',
    berth: '05',
    technique: 'Full combination, thrusters for fine control',
    intro:
      'A crosswind over a running current, and a boat already holding the port side of your slip. Bring her in on the engines, then use the thrusters to hold your line on the final approach.',
    hint: 'Correct early and often in small doses. The thrusters are for the last few meters, not the whole approach.',
    start: { x: NEIGHBOR_PORT.targetX, y: 62, h: 0 },
    goal: NEIGHBOR_PORT.goal,
    wind: 10,
    windDir: 250,
    current: 0.5,
    currentDir: 120,
    obstacles: NEIGHBOR_PORT.obstacles,
    neighborBoats: NEIGHBOR_PORT.boats,
  },
  {
    name: 'The other side',
    berth: '06',
    technique: 'Opposed thrust, mirrored',
    intro:
      'Same walk you just learned, the other direction — this time the boat already alongside holds the starboard side, and you are walking to port. Prop walk is not symmetric — expect it to feel different.',
    hint: 'Do not assume the mirror image of Level 2 behaves the same. Watch the heading readout as closely as the position.',
    start: { x: NEIGHBOR_STBD.targetX + 8, y: 48, h: 0 },
    goal: NEIGHBOR_STBD.goal,
    wind: 0,
    windDir: 270,
    current: 0,
    currentDir: 90,
    obstacles: NEIGHBOR_STBD.obstacles,
    neighborBoats: NEIGHBOR_STBD.boats,
  },
];

export function getLevels(): LevelDef[] {
  return LEVELS;
}
