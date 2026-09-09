export type Shift = -1 | 0 | 1;

export interface Point {
  x: number;
  y: number;
}

/** Commanded control-surface state, written by whatever InputSource is active. */
export interface Controls {
  portShift: Shift;
  stbdShift: Shift;
  /** 0..1 */
  portThrottle: number;
  /** 0..1 */
  stbdThrottle: number;
  /** radians, -35deg..35deg, positive = starboard */
  rudder: number;
  /** -1..1, positive = starboard */
  bow: number;
  /** -1..1, positive = starboard */
  stern: number;
}

/** Simulated dynamic state of the hull. Actuator fields lag their commanded Controls value. */
export interface Boat {
  x: number;
  y: number;
  /** heading, radians, 0 = north/-y, increases clockwise */
  h: number;
  vx: number;
  vy: number;
  /** yaw rate, rad/s */
  r: number;
  /** ramped port engine output fraction, -1..1 (sign = astern/ahead) */
  port: number;
  /** ramped starboard engine output fraction, -1..1 */
  stbd: number;
  /** ramped rudder angle, radians */
  rudder: number;
  /** ramped bow thruster output, -1..1 */
  bow: number;
  /** ramped stern thruster output, -1..1 */
  stern: number;
}

export interface Environment {
  /** knots */
  wind: number;
  /** degrees, direction wind is blowing FROM */
  windDir: number;
  /** knots */
  current: number;
  /** degrees, direction current is flowing TOWARD */
  currentDir: number;
}

export interface Obstacle {
  id: string;
  poly: Point[];
}

export interface GoalRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  /** required heading, radians */
  heading: number;
}

export interface Goals {
  inside: boolean;
  heading: boolean;
  speed: boolean;
  neutral: boolean;
}
