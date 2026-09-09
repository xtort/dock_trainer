import { DEG } from '../physics/math';
import { speedKnots } from '../physics/integrate';
import { getLevels } from '../levels/levels';
import type { GameState, Mode } from '../state/state';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

const el = {
  speed: byId<HTMLOutputElement>('speed'),
  heading: byId<HTMLOutputElement>('heading'),
  distance: byId<HTMLOutputElement>('distance'),
  stateLabel: byId<HTMLDivElement>('stateLabel'),
  elapsed: byId<HTMLOutputElement>('elapsed'),
  contacts: byId<HTMLOutputElement>('contacts'),
  settleTime: byId<HTMLOutputElement>('settleTime'),
  settleFill: byId<HTMLDivElement>('settleFill'),
  settleMeter: byId<HTMLDivElement>('settleMeter'),
  goalInside: byId<HTMLLIElement>('goalInside'),
  goalHeading: byId<HTMLLIElement>('goalHeading'),
  goalSpeed: byId<HTMLLIElement>('goalSpeed'),
  goalNeutral: byId<HTMLLIElement>('goalNeutral'),
  missionTitle: byId<HTMLHeadingElement>('missionTitle'),
  techniqueLabel: byId<HTMLParagraphElement>('techniqueLabel'),
  levelHint: byId<HTMLSpanElement>('levelHint'),
  portShiftValue: byId<HTMLOutputElement>('portShiftValue'),
  stbdShiftValue: byId<HTMLOutputElement>('stbdShiftValue'),
  portThrottleValue: byId<HTMLOutputElement>('portThrottleValue'),
  stbdThrottleValue: byId<HTMLOutputElement>('stbdThrottleValue'),
  portThrottleFill: byId<HTMLDivElement>('portThrottleFill'),
  stbdThrottleFill: byId<HTMLDivElement>('stbdThrottleFill'),
  rudderValue: byId<HTMLOutputElement>('rudderValue'),
  rudderNeedle: byId<HTMLDivElement>('rudderNeedle'),
  bowValue: byId<HTMLOutputElement>('bowValue'),
  sternValue: byId<HTMLOutputElement>('sternValue'),
  bowFill: byId<HTMLDivElement>('bowFill'),
  sternFill: byId<HTMLDivElement>('sternFill'),
  pauseButton: byId<HTMLButtonElement>('pauseButton'),
  notice: byId<HTMLDivElement>('notice'),
  overlay: byId<HTMLDivElement>('overlay'),
  overlayEyebrow: byId<HTMLDivElement>('overlayEyebrow'),
  overlayTitle: byId<HTMLHeadingElement>('overlayTitle'),
  overlayText: byId<HTMLParagraphElement>('overlayText'),
  overlayAction: byId<HTMLButtonElement>('overlayAction'),
  announcement: byId<HTMLDivElement>('announcement'),
  challengeTabs: byId<HTMLDivElement>('challengeTabs'),
};

function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function renderChallengeTabs(onSelect: (index: number) => void): void {
  const levels = getLevels();
  el.challengeTabs.innerHTML = '';
  levels.forEach((level, i) => {
    const button = document.createElement('button');
    button.className = 'challenge';
    button.type = 'button';
    button.role = 'tab';
    button.id = `challenge${i}`;
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.dataset.level = String(i);
    button.innerHTML = `<span class="number">${level.berth}</span><strong>${level.name}</strong>`;
    button.addEventListener('click', () => onSelect(i));
    el.challengeTabs.appendChild(button);
  });
}

export function setActiveChallenge(index: number): void {
  const buttons = el.challengeTabs.querySelectorAll<HTMLButtonElement>('.challenge');
  buttons.forEach((button, i) => button.setAttribute('aria-selected', String(i === index)));
}

function shiftLabel(shift: -1 | 0 | 1): string {
  return shift === 0 ? 'NEUTRAL' : shift === 1 ? 'AHEAD' : 'ASTERN';
}

function updateGearIndicators(containerSelector: string, shift: -1 | 0 | 1): void {
  document.querySelectorAll(`${containerSelector} .gear-indicator`).forEach((node) => {
    const el2 = node as HTMLElement;
    const gear = Number(el2.dataset.gear);
    el2.classList.toggle('active', gear === shift);
  });
}

export function updateHud(state: GameState): void {
  const b = state.boat;
  const speed = speedKnots(b);
  el.speed.textContent = speed.toFixed(2);
  el.heading.textContent = `${String(Math.round(((b.h / DEG) % 360) + 360) % 360).padStart(3, '0')}°`;
  el.distance.textContent = String(Math.round(Math.hypot(b.x - state.level.goal.x, b.y - state.level.goal.y)));
  el.elapsed.textContent = formatTime(state.time);
  el.contacts.textContent = String(state.contacts);

  el.missionTitle.textContent = `Berth ${state.level.berth}`;
  el.techniqueLabel.textContent = state.level.technique;
  el.levelHint.textContent = state.level.hint;

  const g = state.goals;
  el.goalInside.classList.toggle('met', g.inside);
  el.goalHeading.classList.toggle('met', g.heading);
  el.goalSpeed.classList.toggle('met', g.speed);
  el.goalNeutral.classList.toggle('met', g.neutral);
  el.settleTime.textContent = `${state.dwell.toFixed(1)} / 3.0 s`;
  el.settleFill.style.width = `${(state.dwell / 3) * 100}%`;
  el.settleMeter.setAttribute('aria-valuenow', state.dwell.toFixed(1));

  const c = state.controls;
  el.portShiftValue.textContent = shiftLabel(c.portShift);
  el.stbdShiftValue.textContent = shiftLabel(c.stbdShift);
  updateGearIndicators('.helm-section:first-child', c.portShift);
  updateGearIndicators('.helm-section:last-child', c.stbdShift);

  const portPct = Math.round(c.portThrottle * 100);
  const stbdPct = Math.round(c.stbdThrottle * 100);
  el.portThrottleValue.textContent = portPct === 0 ? 'IDLE' : `${portPct}%`;
  el.stbdThrottleValue.textContent = stbdPct === 0 ? 'IDLE' : `${stbdPct}%`;
  el.portThrottleFill.style.width = `${portPct}%`;
  el.stbdThrottleFill.style.width = `${stbdPct}%`;

  const rudderDeg = Math.round(c.rudder / DEG);
  el.rudderValue.textContent = Math.abs(rudderDeg) < 1 ? 'AMIDSHIPS' : `${Math.abs(rudderDeg)}° ${rudderDeg > 0 ? 'STBD' : 'PORT'}`;
  el.rudderNeedle.style.left = `${50 + (rudderDeg / 35) * 50}%`;

  const bowPct = Math.round(c.bow * 100);
  const sternPct = Math.round(c.stern * 100);
  el.bowValue.textContent = bowPct === 0 ? '0%' : `${Math.abs(bowPct)}% ${bowPct < 0 ? 'P' : 'S'}`;
  el.sternValue.textContent = sternPct === 0 ? '0%' : `${Math.abs(sternPct)}% ${sternPct < 0 ? 'P' : 'S'}`;
  el.bowFill.style.width = `${Math.abs(bowPct) / 2}%`;
  el.bowFill.style.left = bowPct < 0 ? `${50 - Math.abs(bowPct) / 2}%` : '50%';
  el.sternFill.style.width = `${Math.abs(sternPct) / 2}%`;
  el.sternFill.style.left = sternPct < 0 ? `${50 - Math.abs(sternPct) / 2}%` : '50%';

  el.stateLabel.textContent =
    state.mode === 'ready'
      ? 'Ready at the helm'
      : state.mode === 'paused'
        ? 'Paused'
        : state.mode === 'won'
          ? 'Lines secured'
          : state.mode === 'crashed'
            ? 'Hard landing'
            : state.dwell > 0
              ? 'Securing lines'
              : speed > 3
                ? 'Watch your speed'
                : 'Under way';
  el.pauseButton.innerHTML = `${state.mode === 'paused' ? 'Resume' : 'Pause'} <span class="key">P</span>`;
  el.pauseButton.disabled = state.mode === 'won' || state.mode === 'crashed';
}

export function setNotice(text: string, impact = false): void {
  el.notice.textContent = text;
  el.notice.className = `notice visible${impact ? ' impact' : ''}`;
}

export function clearNotice(): void {
  el.notice.classList.remove('visible');
}

export function announce(text: string): void {
  el.announcement.textContent = text;
}

export type OverlayKind = 'start' | 'resume' | 'won' | 'crashed';

export function showOverlay(state: GameState, kind: OverlayKind): void {
  el.overlay.hidden = false;
  el.overlayEyebrow.textContent = `CHALLENGE ${String(state.levelIndex + 1).padStart(2, '0')} / 06`;
  const level = state.level;
  if (kind === 'start') {
    el.overlayTitle.textContent = `${level.name}.`;
    el.overlayText.textContent = level.intro;
    el.overlayAction.textContent = 'Take the helm →';
  } else if (kind === 'resume') {
    el.overlayTitle.textContent = 'Holding here.';
    el.overlayText.textContent = 'The simulation is paused. Your controls will be waiting when you return.';
    el.overlayAction.textContent = 'Back to the helm →';
  } else if (kind === 'won') {
    el.overlayTitle.textContent = state.contacts === 0 ? 'A quiet arrival.' : 'Lines secured.';
    const more = state.levelIndex < 5 ? 'Ready for the next technique?' : 'You have run the full curriculum.';
    el.overlayText.textContent = `Berthed in ${formatTime(state.time)} with ${state.contacts} dock contact${state.contacts === 1 ? '' : 's'}. ${more}`;
    el.overlayAction.textContent = state.levelIndex < 5 ? 'Next challenge →' : 'Run it again →';
  } else {
    el.overlayTitle.textContent = 'A hard landing.';
    el.overlayText.textContent = 'That approach carried too much momentum into an obstacle. Try shorter bursts and take the way off sooner.';
    el.overlayAction.textContent = 'Try again →';
  }
  announce(`${el.overlayTitle.textContent} ${el.overlayText.textContent}`);
}

export function hideOverlay(): void {
  el.overlay.hidden = true;
}

export function onPauseButton(cb: () => void): void {
  el.pauseButton.addEventListener('click', cb);
}

export function onRestartButton(cb: () => void): void {
  byId<HTMLButtonElement>('restartButton').addEventListener('click', cb);
}

export function onOverlayAction(cb: () => void): void {
  el.overlayAction.addEventListener('click', cb);
}

export function onHelpButtons(open: () => void, close: () => void): void {
  byId<HTMLButtonElement>('helpButton').addEventListener('click', open);
  byId<HTMLButtonElement>('modelButton').addEventListener('click', open);
  byId<HTMLButtonElement>('closeHelp').addEventListener('click', close);
}

export function helpDialog(): HTMLDialogElement {
  return byId<HTMLDialogElement>('helpDialog');
}

export type { Mode };
