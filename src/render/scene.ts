import { hullLocal, hullPoly, transformPoly } from '../physics/hull';
import type { Point } from '../physics/types';
import { WORLD } from '../levels/levels';
import type { GameState } from '../state/state';

interface ViewTransform {
  scale: number;
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
  return { scale: canvas.width / WORLD.w };
}

function poly(ctx: CanvasRenderingContext2D, points: Point[]): void {
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

function drawObstacles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const obstacle of state.obstacles) {
    if (obstacle.id.startsWith('edge')) continue;
    ctx.fillStyle = obstacle.id.startsWith('boat') ? '#c9d6d1' : '#5a4632';
    ctx.strokeStyle = obstacle.id.startsWith('boat') ? '#8fa39c' : '#3a2d1e';
    ctx.lineWidth = 0.08;
    poly(ctx, obstacle.poly);
    ctx.fill();
    ctx.stroke();
  }
}

function drawGoal(ctx: CanvasRenderingContext2D, state: GameState): void {
  const g = state.level.goal;
  const allMet = state.goals.inside && state.goals.heading && state.goals.speed && state.goals.neutral;
  ctx.fillStyle = allMet ? 'rgba(134,226,193,0.28)' : 'rgba(134,226,193,0.14)';
  ctx.strokeStyle = '#86e2c1';
  ctx.lineWidth = 0.15;
  ctx.beginPath();
  ctx.rect(g.x - g.w / 2, g.y - g.h / 2, g.w, g.h);
  ctx.fill();
  ctx.stroke();

  // Heading marker: a short line from the goal center pointing the required heading.
  ctx.strokeStyle = '#86e2c1';
  ctx.lineWidth = 0.25;
  const hx = Math.sin(g.heading);
  const hy = -Math.cos(g.heading);
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + hx * 4, g.y + hy * 4);
  ctx.stroke();
}

function drawWake(ctx: CanvasRenderingContext2D, points: GameState['wakePort'], color: string, lifetime: number): void {
  for (const p of points) {
    const alpha = Math.max(0, 1 - p.age / lifetime);
    if (alpha <= 0) continue;
    ctx.fillStyle = color.replace('ALPHA', alpha.toFixed(3));
    ctx.beginPath();
    ctx.arc(p.x, p.y, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHull(ctx: CanvasRenderingContext2D, state: GameState): void {
  const b = state.boat;
  const outline = hullPoly(b);
  ctx.fillStyle = state.mode === 'crashed' ? '#fa9b87' : '#eef3ee';
  ctx.strokeStyle = '#1b2e33';
  ctx.lineWidth = 0.12;
  poly(ctx, outline);
  ctx.fill();
  ctx.stroke();

  // Port (red) / starboard (green) nav-light dots near the bow, for at-a-glance
  // orientation given the two-half dashboard's port-left/starboard-right mapping.
  // Local hull points are always [..., portBowFlare, stem, stbdBowFlare, ...] in
  // the boat's own frame, so no heading-dependent swap is needed here.
  const local = hullLocal();
  const [port, stbd] = transformPoly([local[4]!, local[6]!], b.x, b.y, b.h);
  ctx.fillStyle = '#ff5a5a';
  if (port) {
    ctx.beginPath();
    ctx.arc(port.x, port.y, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5aff8f';
  if (stbd) {
    ctx.beginPath();
    ctx.arc(stbd.x, stbd.y, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawScene(canvas: HTMLCanvasElement, state: GameState): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const view = computeView(canvas);

  ctx.save();
  ctx.fillStyle = '#123a44';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.scale(view.scale, view.scale);
  drawGoal(ctx, state);
  drawObstacles(ctx, state);
  drawWake(ctx, state.wakePort, 'rgba(255,143,143,ALPHA)', 3);
  drawWake(ctx, state.wakeStbd, 'rgba(143,255,176,ALPHA)', 3);
  drawHull(ctx, state);
  ctx.restore();
}
