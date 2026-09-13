import { AFT_ARM, BOW_ARM, HULL, hullLocal, transformPoly } from '../physics/hull';
import { DWELL_REQUIRED } from '../physics/goals';
import type { Point } from '../physics/types';
import { WORLD, type RenderBoat } from '../levels/levels';
import type { GameState, WakePoint } from '../state/state';

// ---------- primitives ----------

function pathPoly(ctx: CanvasRenderingContext2D, points: Point[]): void {
  ctx.beginPath();
  const first = points[0];
  if (!first) return;
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
}

/** Traces a rounded-rect path only — caller fills/strokes/clips as needed. */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 0.08): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 1.25,
  color = '#a7c4c5',
  align: CanvasTextAlign = 'center',
): void {
  ctx.font = `500 ${size}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, color: string, width = 0.16): void {
  const length = Math.hypot(dx, dy);
  if (length < 0.05) return;
  const ux = dx / length;
  const uy = dy / length;
  line(ctx, x, y, x + dx, y + dy, color, width);
  const h = Math.min(1.05, length * 0.3);
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - ux * h - uy * h * 0.45, y + dy - uy * h + ux * h * 0.45);
  ctx.lineTo(x + dx - ux * h + uy * h * 0.45, y + dy - uy * h - ux * h * 0.45);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function rectFromPoly(poly: Point[]): { x: number; y: number; w: number; h: number } {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

// ---------- scene elements ----------

function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  gradient.addColorStop(0, '#103a45');
  gradient.addColorStop(0.55, '#1b4b55');
  gradient.addColorStop(1, '#20505a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  for (let x = 0; x <= WORLD.w; x += 10) line(ctx, x, 0, x, WORLD.h, '#b5d8d709', 0.07);
  for (let y = 0; y <= WORLD.h; y += 10) line(ctx, 0, y, WORLD.w, y, '#b5d8d709', 0.07);

  const rippleCount = 26;
  for (let k = 0; k < rippleCount; k++) {
    const y = k * (WORLD.h / rippleCount);
    ctx.beginPath();
    for (let x = -2; x < WORLD.w + 3; x += 2) {
      const yy = y + Math.sin(x * 0.055 + k + t * 0.16) * 1.3;
      if (x === -2) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = '#99d1cc0c';
    ctx.lineWidth = 0.09;
    ctx.stroke();
  }

  const sparkleCount = 120;
  for (let i = 0; i < sparkleCount; i++) {
    const x = (i * 37.73) % (WORLD.w - 2) + 1;
    const y = (i * 17.29) % (WORLD.h - 5) + 3;
    const glint = 0.03 + 0.035 * Math.sin(i * 2.7 + t * 0.8);
    line(ctx, x, y, x + 0.5 + Math.sin(i) * 0.2, y, `rgba(187,229,216,${glint})`, 0.11);
  }
}

function drawDock(ctx: CanvasRenderingContext2D, r: { x: number; y: number; w: number; h: number }): void {
  ctx.fillStyle = '#061f2b66';
  ctx.fillRect(r.x + 0.5, r.y + 0.6, r.w + 0.35, r.h + 0.4); // drop shadow

  roundRectPath(ctx, r.x, r.y, r.w, r.h, 0.17);
  ctx.fillStyle = '#ae9670';
  ctx.fill();
  ctx.strokeStyle = '#dbc59b';
  ctx.lineWidth = 0.13;
  ctx.stroke();

  ctx.save();
  roundRectPath(ctx, r.x, r.y, r.w, r.h, 0.17);
  ctx.clip();
  if (r.w > r.h) {
    for (let x = r.x + 0.7; x < r.x + r.w; x += 0.8) line(ctx, x, r.y, x, r.y + r.h, '#645d4f66', 0.055);
  } else {
    for (let y = r.y + 0.55; y < r.y + r.h; y += 0.72) line(ctx, r.x, y, r.x + r.w, y, '#645d4f66', 0.055);
  }
  ctx.restore();

  if (r.w > r.h) {
    for (let x = r.x + 2; x < r.x + r.w; x += 9) {
      circle(ctx, x, r.y + r.h - 0.5, 0.19, '#273e40');
      circle(ctx, x, r.y + r.h - 0.5, 0.09, '#81908b');
    }
  } else {
    for (let y = r.y + 4; y < r.y + r.h; y += 7) {
      circle(ctx, r.x + r.w / 2, y, 0.17, '#273e40');
      ctx.fillStyle = '#34484a';
      ctx.fillRect(r.x - 0.14, y - 1, 0.25, 1.65);
      ctx.fillRect(r.x + r.w - 0.1, y - 1, 0.25, 1.65);
    }
    circle(ctx, r.x + r.w / 2, r.y + r.h - 0.6, 0.25, '#3f514c');
    circle(ctx, r.x + r.w / 2, r.y + r.h - 0.6, 0.12, '#d9c9a0');
  }
}

interface BoatDrawOptions {
  player?: boolean;
  crashed?: boolean;
  rudder?: number;
  bowThrust?: number;
  sternThrust?: number;
  visualTime?: number;
}

function drawBoat(ctx: CanvasRenderingContext2D, boat: { x: number; y: number; h: number; length: number; beam: number }, opts: BoatDrawOptions = {}): void {
  const L = boat.length;
  const B = boat.beam;
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.rotate(boat.h);
  const poly = hullLocal(L, B);

  ctx.save();
  ctx.translate(0.26, 0.42);
  pathPoly(ctx, poly);
  ctx.fillStyle = '#031c2866';
  ctx.fill();
  ctx.restore();

  pathPoly(ctx, poly);
  ctx.fillStyle = opts.crashed ? '#fa9b87' : opts.player ? '#f1eee0' : '#c9d6d1';
  ctx.fill();
  ctx.strokeStyle = opts.player ? '#152f3b' : '#4a6067';
  ctx.lineWidth = 0.22;
  ctx.stroke();

  ctx.save();
  ctx.scale(0.86, 0.89);
  pathPoly(ctx, poly);
  ctx.strokeStyle = '#b7ad91';
  ctx.lineWidth = 0.1;
  ctx.stroke();
  ctx.restore();

  // cabin
  roundRectPath(ctx, -B * 0.33, -L * 0.25, B * 0.66, L * 0.49, 0.25);
  ctx.fillStyle = opts.player ? '#d7d7c8' : '#b8c4bc';
  ctx.fill();
  ctx.strokeStyle = '#879c97';
  ctx.lineWidth = 0.09;
  ctx.stroke();

  // windshield band
  roundRectPath(ctx, -B * 0.31, -L * 0.245, B * 0.62, L * 0.115, 0.2);
  ctx.fillStyle = '#224957';
  ctx.fill();
  line(ctx, 0, -L * 0.24, 0, -L * 0.14, '#98b4b4', 0.085);

  // foredeck
  roundRectPath(ctx, -B * 0.245, -L * 0.11, B * 0.49, L * 0.26, 0.12);
  ctx.fillStyle = opts.player ? '#f8f3df' : '#dce1d7';
  ctx.fill();
  roundRectPath(ctx, -B * 0.19, -L * 0.1, B * 0.38, L * 0.065, 0.06);
  ctx.fillStyle = '#315864';
  ctx.fill();
  line(ctx, -B * 0.22, 0.2, B * 0.22, 0.2, '#a4b0a2', 0.08);
  circle(ctx, 0, L * 0.075, 0.2, '#b6b7a7');
  line(ctx, 0, -L * 0.015, 0, L * 0.15, '#607777', 0.1);
  line(ctx, -0.42, L * 0.07, 0.42, L * 0.07, '#83958f', 0.08);

  // aft deck / swim platform
  roundRectPath(ctx, -B * 0.26, L * 0.28, B * 0.52, L * 0.105, 0.07);
  ctx.fillStyle = '#a99575';
  ctx.fill();
  for (let x = -B * 0.22; x < B * 0.25; x += 0.28) line(ctx, x, L * 0.29, x, L * 0.375, '#726c5c', 0.04);

  // bow fitting
  roundRectPath(ctx, -0.46, -L * 0.37, 0.92, 0.6, 0.06);
  ctx.fillStyle = '#6f989e';
  ctx.fill();
  circle(ctx, 0, -L * 0.443, 0.12, '#ac9263');
  line(ctx, -B * 0.4, L * 0.42, B * 0.4, L * 0.42, '#90a3a2', 0.08);

  if (opts.player) {
    // port (red) / starboard (green) nav lights, matching the two-half dashboard mapping
    circle(ctx, -B * 0.475, -L * 0.16, 0.105, '#ff5a5a');
    circle(ctx, B * 0.475, -L * 0.16, 0.105, '#5aff8f');

    if (opts.rudder !== undefined) {
      ctx.save();
      ctx.translate(0, L * 0.47);
      ctx.rotate(-opts.rudder);
      line(ctx, 0, 0, 0, 0.5, '#e0c887', 0.15);
      ctx.restore();
    }

    const t = opts.visualTime ?? 0;
    const thrusters: Array<[number, number]> = [
      [opts.bowThrust ?? 0, -BOW_ARM],
      [opts.sternThrust ?? 0, AFT_ARM],
    ];
    for (const [force, y] of thrusters) {
      if (Math.abs(force) < 0.07) continue;
      const side = -Math.sign(force);
      for (let i = 0; i < 4; i++) {
        const d = ((t * 3 + i * 0.3) % 1.3) + 0.15;
        const alpha = (1 - d / 1.5) * Math.abs(force) * 0.5;
        ctx.beginPath();
        ctx.ellipse(side * (B * 0.5 + d), y, d * 0.38 + 0.1, 0.25 + d * 0.45, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(157,246,227,${Math.max(0, alpha)})`;
        ctx.lineWidth = 0.12;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

function drawGoal(ctx: CanvasRenderingContext2D, state: GameState, t: number): void {
  const g = state.level.goal;
  const allMet = state.goals.inside && state.goals.heading && state.goals.speed && state.goals.neutral;
  const green = allMet ? '#a8ffe0' : '#8be2c0';

  ctx.fillStyle = allMet ? '#85e4b820' : '#85e4b80d';
  ctx.fillRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);

  ctx.save();
  ctx.setLineDash([0.8, 0.55]);
  ctx.lineDashOffset = -t * 0.4;
  ctx.strokeStyle = green;
  ctx.lineWidth = 0.15;
  ctx.strokeRect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
  ctx.restore();

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = g.x + (sx * g.w) / 2;
      const y = g.y + (sy * g.h) / 2;
      line(ctx, x, y, x - sx * 1.15, y, green, 0.25);
      line(ctx, x, y, x, y - sy * 1.15, green, 0.25);
    }
  }

  if (Math.hypot(state.boat.x - g.x, state.boat.y - g.y) > 10) {
    const ghost = transformPoly(hullLocal(), g.x, g.y, g.heading);
    pathPoly(ctx, ghost);
    ctx.strokeStyle = '#b2e9d333';
    ctx.lineWidth = 0.12;
    ctx.stroke();
  }

  arrow(ctx, g.x, g.y - 4, 0, -2, '#adf4d788', 0.17);
  label(ctx, state.dwell > 0 ? `HOLD ${(DWELL_REQUIRED - state.dwell).toFixed(1)}s` : 'YOUR BERTH', g.x, g.y + g.h / 2 + 2.1, 1.03, green);
  if (state.dwell > 0) {
    ctx.beginPath();
    ctx.arc(g.x, g.y + g.h / 2 + 4.2, 0.75, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * state.dwell) / DWELL_REQUIRED);
    ctx.strokeStyle = green;
    ctx.lineWidth = 0.23;
    ctx.stroke();
  }
}

function drawWakeTrail(ctx: CanvasRenderingContext2D, points: WakePoint[], baseColor: string, lifetime: number): void {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const age = (a.age + b.age) / 2;
    const alpha = Math.max(0, 1 - age / lifetime) * 0.4;
    if (alpha <= 0) continue;
    line(ctx, a.x, a.y, b.x, b.y, `rgba(${baseColor},${alpha.toFixed(3)})`, 0.3);
  }
}

function drawPredictedPosition(ctx: CanvasRenderingContext2D, state: GameState): void {
  const b = state.boat;
  const speed = Math.hypot(b.vx, b.vy);
  if (speed <= 0.13 || state.mode !== 'playing') return;
  ctx.save();
  ctx.setLineDash([0.45, 0.5]);
  line(ctx, b.x, b.y, b.x + b.vx * 9, b.y + b.vy * 9, '#f1d49a88', 0.11);
  ctx.restore();
  circle(ctx, b.x + b.vx * 9, b.y + b.vy * 9, 0.15, '#f1d49a99');
}

function bearing(deg: number, dist: number): { x: number; y: number } {
  const rad = deg * (Math.PI / 180);
  return { x: Math.sin(rad) * dist, y: -Math.cos(rad) * dist };
}

function drawInstruments(ctx: CanvasRenderingContext2D, state: GameState): void {
  const x = WORLD.w - 14;
  const y = WORLD.h - 15;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.strokeStyle = '#adcac233';
  ctx.lineWidth = 0.1;
  ctx.stroke();
  for (let a = 0; a < 360; a += 45) {
    const d = bearing(a, 4.5);
    const e = bearing(a, a % 90 === 0 ? 3.5 : 4);
    line(ctx, x + e.x, y + e.y, x + d.x, y + d.y, '#adcac277', 0.1);
  }
  label(ctx, 'N', x, y - 6, 1.55, '#d7e7db');
  label(ctx, 'E', x + 6, y, 1.05, '#9cb9b7');
  label(ctx, 'S', x, y + 5.9, 1.05, '#9cb9b7');
  label(ctx, 'W', x - 6, y, 1.05, '#9cb9b7');
  arrow(ctx, x, y, 0, -3.15, '#d7e7db', 0.13);

  const cx = 8;
  const cy = WORLD.h - 12;
  const w = bearing(state.env.windDir + 180, 3);
  const c = bearing(state.env.currentDir, 3);
  if (state.env.wind) {
    arrow(ctx, cx, cy, w.x, w.y, '#f0c786', 0.2);
    label(ctx, 'WIND', cx + 5, cy - 0.6, 1.1, '#efcd99', 'left');
    label(ctx, `${state.env.wind.toFixed(0)} kt`, cx + 5, cy + 1.2, 1, '#b5caca', 'left');
  }
  if (state.env.current) {
    arrow(ctx, cx, cy + 7, c.x, c.y, '#89d7e2', 0.2);
    label(ctx, 'CURRENT', cx + 5, cy + 6.4, 1.1, '#9fe1e6', 'left');
    label(ctx, `${state.env.current.toFixed(1)} kt`, cx + 5, cy + 8.2, 1, '#b5caca', 'left');
  }

  const sx = WORLD.w / 2 - 5;
  line(ctx, sx, WORLD.h - 3, sx + 10, WORLD.h - 3, '#a9c8c280', 0.1);
  line(ctx, sx, WORLD.h - 3.5, sx, WORLD.h - 2.5, '#a9c8c280', 0.1);
  line(ctx, sx + 10, WORLD.h - 3.5, sx + 10, WORLD.h - 2.5, '#a9c8c280', 0.1);
  label(ctx, '10 m', sx + 5, WORLD.h - 1.3, 1, '#a9c8c2');
}

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function computeView(canvas: HTMLCanvasElement): ViewTransform {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 1;
  const cssHeight = canvas.clientHeight || 1;
  const targetW = Math.round(cssWidth * dpr);
  const targetH = Math.round(cssHeight * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const scale = Math.min(canvas.width / WORLD.w, canvas.height / WORLD.h);
  const offsetX = (canvas.width - WORLD.w * scale) / 2;
  const offsetY = (canvas.height - WORLD.h * scale) / 2;
  return { scale, offsetX, offsetY };
}

export function drawScene(canvas: HTMLCanvasElement, state: GameState, visualTime = 0): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const view = computeView(canvas);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0c262d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);

  drawWater(ctx, visualTime);
  line(ctx, 0, 0, 0, WORLD.h, '#78908b', 0.22);
  line(ctx, WORLD.w, 0, WORLD.w, WORLD.h, '#78908b', 0.22);
  line(ctx, 0, 0, WORLD.w, 0, '#78908b', 0.22);
  line(ctx, 0, WORLD.h, WORLD.w, WORLD.h, '#78908b', 0.22);

  for (const obstacle of state.obstacles) {
    if (obstacle.id.startsWith('edge')) continue;
    drawDock(ctx, rectFromPoly(obstacle.poly));
  }

  drawGoal(ctx, state, visualTime);

  for (const neighbor of state.level.neighborBoats as RenderBoat[]) {
    drawBoat(ctx, neighbor);
  }

  drawWakeTrail(ctx, state.wakePort, '255,143,143', 3);
  drawWakeTrail(ctx, state.wakeStbd, '143,255,176', 3);

  drawPredictedPosition(ctx, state);

  drawBoat(ctx, { ...state.boat, length: HULL.length, beam: HULL.beam }, {
    player: true,
    crashed: state.mode === 'crashed',
    rudder: state.boat.rudder,
    bowThrust: state.boat.bow,
    sternThrust: state.boat.stern,
    visualTime,
  });

  drawInstruments(ctx, state);

  if (state.flash > 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = `rgba(255,145,110,${state.flash * 0.8})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  }
}

