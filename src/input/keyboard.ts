import { approach, clamp, DEG } from '../physics/math';
import type { Controls, Shift } from '../physics/types';
import type { InputSource } from './inputSource';

const THROTTLE_RATE = 0.6; // fraction/sec
const RUDDER_KEY_RATE = 30 * DEG; // rad/sec
const RUDDER_MAX = 35 * DEG;
const THRUSTER_RATE = 3.5; // fraction/sec

/**
 * Full key map (see PRD.md Section 7):
 *   A/Z  port shift up/down     S/X  starboard shift up/down
 *   J/N  port throttle up/down  K/M  starboard throttle up/down
 *   Left/Right  rudder          Down  center rudder
 *   Q/E  bow thruster port/stbd D/G  stern thruster port/stbd
 */
export class KeyboardInputSource implements InputSource {
  private held = new Set<string>();
  private controls: Controls;
  private onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
  private onKeyUp = (event: KeyboardEvent) => this.handleKeyUp(event);

  constructor(controls: Controls) {
    this.controls = controls;
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  reset(): void {
    this.held.clear();
    this.controls.bow = 0;
    this.controls.stern = 0;
  }

  sample(controls: Controls, dt: number): void {
    const held = this.held;
    if (held.has('j')) controls.portThrottle = clamp(controls.portThrottle + dt * THROTTLE_RATE, 0, 1);
    if (held.has('n')) controls.portThrottle = clamp(controls.portThrottle - dt * THROTTLE_RATE, 0, 1);
    if (held.has('k')) controls.stbdThrottle = clamp(controls.stbdThrottle + dt * THROTTLE_RATE, 0, 1);
    if (held.has('m')) controls.stbdThrottle = clamp(controls.stbdThrottle - dt * THROTTLE_RATE, 0, 1);

    if (held.has('arrowleft')) controls.rudder = clamp(controls.rudder - dt * RUDDER_KEY_RATE, -RUDDER_MAX, RUDDER_MAX);
    if (held.has('arrowright')) controls.rudder = clamp(controls.rudder + dt * RUDDER_KEY_RATE, -RUDDER_MAX, RUDDER_MAX);

    const bowDir = Number(held.has('e')) - Number(held.has('q'));
    controls.bow = approach(controls.bow, bowDir, dt * THRUSTER_RATE);
    const sternDir = Number(held.has('g')) - Number(held.has('d'));
    controls.stern = approach(controls.stern, sternDir, dt * THRUSTER_RATE);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (['a', 'z', 's', 'x', 'j', 'n', 'k', 'm', 'q', 'e', 'd', 'g', 'arrowleft', 'arrowright', 'arrowdown', 'arrowup'].includes(key)) {
      event.preventDefault();
    }
    this.held.add(key);
    if (event.repeat) return;

    const c = this.controls;
    if (key === 'a') c.portShift = stepShift(c.portShift, 1);
    else if (key === 'z') c.portShift = stepShift(c.portShift, -1);
    else if (key === 's') c.stbdShift = stepShift(c.stbdShift, 1);
    else if (key === 'x') c.stbdShift = stepShift(c.stbdShift, -1);
    else if (key === 'arrowdown') c.rudder = 0;
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.held.delete(event.key.toLowerCase());
  }
}

function stepShift(current: Shift, delta: 1 | -1): Shift {
  return clamp(current + delta, -1, 1) as Shift;
}
