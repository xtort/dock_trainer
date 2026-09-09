import type { Controls } from '../physics/types';

/**
 * Normalizes a physical input device into Controls updates. Keyboard (v1) and a
 * future gamepad source (v2) both implement this so physics/rendering never need
 * to know which device is active.
 */
export interface InputSource {
  attach(): void;
  detach(): void;
  /** Called on pause/level reset: stop any in-progress ramps and spring thrusters back to neutral. */
  reset(): void;
  /** Called once per physics tick to fold held/analog input into `controls`. */
  sample(controls: Controls, dt: number): void;
}
