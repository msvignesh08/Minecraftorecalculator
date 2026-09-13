import {
  MapState,
  worldToScreen,
  screenToWorld,
  panByScreenDelta,
  zoomAtScreenPoint,
  worldToChunk,
  clampZoom,
} from './mapState';

function approxEqual(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean): void {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${label}`);
  if (ok) pass++;
  else fail++;
}

const baseState: MapState = {
  centerX: 500,
  centerZ: -300,
  zoom: 4,
  viewportWidth: 800,
  viewportHeight: 600,
};

console.log('world<->screen round trip');
{
  const world = { x: 482, z: -321 };
  const screen = worldToScreen(baseState, world);
  const back = screenToWorld(baseState, screen);
  check('x round-trips', approxEqual(back.x, world.x));
  check('z round-trips', approxEqual(back.z, world.z));
}

console.log('center is always the viewport midpoint');
{
  const screen = worldToScreen(baseState, { x: baseState.centerX, z: baseState.centerZ });
  check('centerX -> viewportWidth/2', approxEqual(screen.sx, baseState.viewportWidth / 2));
  check('centerZ -> viewportHeight/2', approxEqual(screen.sy, baseState.viewportHeight / 2));
}

console.log('panByScreenDelta moves world in the opposite screen direction (drag right = world moves left)');
{
  const panned = panByScreenDelta(baseState, 100, 0);
  check('dragging right decreases centerX', panned.centerX < baseState.centerX);
  check('pan magnitude matches zoom scale', approxEqual(panned.centerX, baseState.centerX - 100 / baseState.zoom));
}

console.log('zoomAtScreenPoint keeps the anchor point fixed in world space');
{
  const anchorScreen = { sx: 200, sy: 150 };
  const worldUnderAnchorBefore = screenToWorld(baseState, anchorScreen);
  const zoomed = zoomAtScreenPoint(baseState, anchorScreen, 8);
  const worldUnderAnchorAfter = screenToWorld(zoomed, anchorScreen);
  check('anchor world X unchanged after zoom', approxEqual(worldUnderAnchorBefore.x, worldUnderAnchorAfter.x, 1e-6));
  check('anchor world Z unchanged after zoom', approxEqual(worldUnderAnchorBefore.z, worldUnderAnchorAfter.z, 1e-6));
  check('zoom actually changed', zoomed.zoom === 8);
}

console.log('clampZoom respects MIN/MAX_ZOOM bounds');
{
  check('clamps huge zoom-in', clampZoom(9999) === 32);
  check('clamps huge zoom-out', clampZoom(0.00001) === 0.05);
  check('leaves in-range zoom alone', clampZoom(2) === 2);
}

console.log('worldToChunk matches Minecraft chunk math (floor(block/16))');
{
  check('positive coord', worldToChunk({ x: 82, z: 5 }).chunkX === 5);
  check('negative coord floors correctly (-1 not 0)', worldToChunk({ x: -1, z: 0 }).chunkX === -1);
  check('negative coord floors correctly (-16 -> -1)', worldToChunk({ x: -16, z: 0 }).chunkX === -1);
  check('negative coord floors correctly (-17 -> -2)', worldToChunk({ x: -17, z: 0 }).chunkX === -2);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
