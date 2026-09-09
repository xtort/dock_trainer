import { KeyboardInputSource } from './input/keyboard';
import { drawScene } from './render/scene';
import {
  announce,
  clearNotice,
  helpDialog,
  hideOverlay,
  onHelpButtons,
  onOverlayAction,
  onPauseButton,
  onRestartButton,
  renderChallengeTabs,
  setActiveChallenge,
  setNotice,
  showOverlay,
  updateHud,
} from './render/hudDom';
import { createState, resetLevel, physicsStep, type GameState } from './state/state';
import './style.css';

const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25; // clamp long tab-switch/debugger pauses

let state: GameState = createState(0);
const input = new KeyboardInputSource(state.controls);
input.attach();

const canvas = document.getElementById('sea') as HTMLCanvasElement;
let helpPreviousMode: GameState['mode'] | null = null;
let accumulator = 0;
let lastTime = 0;

function startPlaying(): void {
  if (state.mode === 'ready' || state.mode === 'paused') {
    state.mode = 'playing';
    hideOverlay();
    clearNotice();
    accumulator = 0;
  }
}

function pauseOrResume(): void {
  if (state.mode === 'playing') {
    state.mode = 'paused';
    input.reset();
    showOverlay(state, 'resume');
  } else if (state.mode === 'paused' || state.mode === 'ready') {
    startPlaying();
  }
  updateHud(state);
}

function loadLevel(index: number): void {
  state = resetLevel(index, state.controls);
  input.reset();
  setActiveChallenge(index);
  clearNotice();
  updateHud(state);
  showOverlay(state, 'start');
}

function restartLevel(): void {
  loadLevel(state.levelIndex);
}

function handleOverlayAction(): void {
  if (state.mode === 'won') {
    const next = state.levelIndex < 5 ? state.levelIndex + 1 : state.levelIndex;
    loadLevel(next);
    return;
  }
  if (state.mode === 'crashed') {
    restartLevel();
    return;
  }
  startPlaying();
}

function openHelp(): void {
  helpPreviousMode = state.mode;
  if (state.mode === 'playing') {
    state.mode = 'paused';
    input.reset();
    showOverlay(state, 'resume');
  }
  const dialog = helpDialog();
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  updateHud(state);
}

function closeHelp(): void {
  const dialog = helpDialog();
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  if (helpPreviousMode === 'playing') startPlaying();
  helpPreviousMode = null;
}

renderChallengeTabs((index) => loadLevel(index));
onPauseButton(pauseOrResume);
onRestartButton(restartLevel);
onOverlayAction(handleOverlayAction);
onHelpButtons(openHelp, closeHelp);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'p') pauseOrResume();
  else if (key === 't') restartLevel();
});

showOverlay(state, 'start');
updateHud(state);

function tick(now: number): void {
  if (!lastTime) lastTime = now;
  const frameDt = Math.min(MAX_FRAME, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += frameDt;

  while (accumulator >= FIXED_DT) {
    input.sample(state.controls, FIXED_DT);
    const status = physicsStep(state, FIXED_DT);
    if (status === 'contact') setNotice('Contact with the dock.', true);
    else if (status === 'crashed') {
      setNotice('Hard landing — restart to try again.', true);
      showOverlay(state, 'crashed');
      announce('Hard landing.');
    } else if (status === 'won') {
      showOverlay(state, 'won');
    }
    accumulator -= FIXED_DT;
  }

  drawScene(canvas, state);
  updateHud(state);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
