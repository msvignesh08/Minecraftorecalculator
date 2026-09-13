import { MapState, screenToWorld } from '../mapState';
import { PanZoomController } from './panZoomController';

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean): void {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${label}`);
  if (ok) pass++;
  else fail++;
}
function approxEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) < eps;
}

function makeHarness(initial: MapState) {
  let state = initial;
  const controller = new PanZoomController(
    () => state,
    (next) => {
      state = next;
    }
  );
  return { controller, getState: () => state };
}

const initial: MapState = { centerX: 0, centerZ: 0, zoom: 4, viewportWidth: 800, viewportHeight: 600 };

console.log('single-finger drag pans the map');
{
  const { controller, getState } = makeHarness(initial);
  controller.onPointerDown(1, 400, 300);
  controller.onPointerMove(1, 350, 300); // dragged left 50px
  const after = getState();
  check('centerX moved right (content follows finger)', after.centerX > initial.centerX);
  check('centerZ unchanged (pure horizontal drag)', approxEqual(after.centerZ, initial.centerZ));
}

console.log('two-finger pinch-out zooms in and keeps the midpoint anchored');
{
  const { controller, getState } = makeHarness(initial);
  const midpoint = { sx: 400, sy: 300 };
  const worldAtMidpointBefore = screenToWorld(initial, midpoint);

  // Two fingers start 100px apart, centered on the midpoint.
  controller.onPointerDown(1, 350, 300);
  controller.onPointerDown(2, 450, 300);
  // Pinch outward to 200px apart (2x) — move pointer 1 first, then 2.
  controller.onPointerMove(1, 300, 300);
  controller.onPointerMove(2, 500, 300);

  const after = getState();
  check('zoom roughly doubled', after.zoom > initial.zoom * 1.8 && after.zoom < initial.zoom * 2.2);

  const worldAtMidpointAfter = screenToWorld(after, midpoint);
  check('midpoint world X stayed anchored', approxEqual(worldAtMidpointBefore.x, worldAtMidpointAfter.x, 0.5));
  check('midpoint world Z stayed anchored', approxEqual(worldAtMidpointBefore.z, worldAtMidpointAfter.z, 0.5));
}

console.log('double-tap zooms in 2x anchored at the tap point');
{
  const { controller, getState } = makeHarness(initial);
  const tapPoint = { sx: 600, sy: 200 };
  const worldAtTapBefore = screenToWorld(initial, tapPoint);

  // Simulate two quick taps at (roughly) the same spot.
  controller.onPointerDown(1, tapPoint.sx, tapPoint.sy);
  controller.onPointerUp(1, tapPoint.sx, tapPoint.sy); // first tap — just records lastTap
  controller.onPointerDown(1, tapPoint.sx + 2, tapPoint.sy + 1); // tiny jitter, within threshold
  controller.onPointerUp(1, tapPoint.sx + 2, tapPoint.sy + 1); // second tap — should trigger zoom

  const after = getState();
  check('zoom doubled', approxEqual(after.zoom, initial.zoom * 2));

  const worldAtTapAfter = screenToWorld(after, tapPoint);
  check('tap point stayed anchored', approxEqual(worldAtTapBefore.x, worldAtTapAfter.x, 0.5));
}

console.log('MANY-FRAME pinch (20 small steps, not 2 big ones) stays drift-free — this is the realistic case');
{
  const { controller, getState } = makeHarness(initial);
  const midpoint = { sx: 400, sy: 300 };
  const worldAtMidpointBefore = screenToWorld(initial, midpoint);

  controller.onPointerDown(1, 350, 300);
  controller.onPointerDown(2, 450, 300); // 100px apart, centered on midpoint

  // Walk both fingers outward to 300px apart (3x) over 20 tiny steps,
  // simulating ~20 real pointermove events for one physical pinch.
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const halfGap = 50 + t * 100; // grows from 50 to 150 (i.e. 100px -> 300px apart)
    controller.onPointerMove(1, 400 - halfGap, 300);
    controller.onPointerMove(2, 400 + halfGap, 300);
  }

  const after = getState();
  check('zoom scaled ~3x over many small frames', after.zoom > initial.zoom * 2.9 && after.zoom < initial.zoom * 3.1);

  const worldAtMidpointAfter = screenToWorld(after, midpoint);
  check(
    'midpoint anchor held after 20 frames (no accumulated drift)',
    approxEqual(worldAtMidpointBefore.x, worldAtMidpointAfter.x, 0.5) &&
      approxEqual(worldAtMidpointBefore.z, worldAtMidpointAfter.z, 0.5)
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
