/**
 * renderGrid.ts
 *
 * Pure canvas draw functions: (ctx, state, ...) -> void, no side effects
 * beyond drawing. Kept separate from React/event-handling so each piece
 * is independently reviewable and the coordinate math (mapState.ts) stays
 * the only thing that needs to be "correct" in a strict sense — these
 * just plot what mapState.ts already computed.
 */

import { MapState, worldToScreen, visibleWorldBounds } from '../mapState';

const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
const CHUNK_BORDER_COLOR = 'rgba(255, 255, 255, 0.18)';
const AXIS_COLOR = 'rgba(255, 255, 255, 0.35)';
const LABEL_COLOR = 'rgba(255, 255, 255, 0.55)';

/**
 * Below this zoom, per-block gridlines would render as visual noise
 * (sub-pixel spacing) — skip them and only draw chunk borders.
 */
const MIN_ZOOM_FOR_BLOCK_GRID = 4;

export function renderBackground(ctx: CanvasRenderingContext2D, state: MapState): void {
  ctx.fillStyle = '#15120f'; // dark Minecraft-stone-ish base, per the visual design spec
  ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);
}

export function renderBlockGrid(ctx: CanvasRenderingContext2D, state: MapState): void {
  if (state.zoom < MIN_ZOOM_FOR_BLOCK_GRID) return;

  const bounds = visibleWorldBounds(state);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const startX = Math.floor(bounds.minX);
  const endX = Math.ceil(bounds.maxX);
  for (let x = startX; x <= endX; x++) {
    const { sx } = worldToScreen(state, { x, z: 0 });
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, state.viewportHeight);
  }

  const startZ = Math.floor(bounds.minZ);
  const endZ = Math.ceil(bounds.maxZ);
  for (let z = startZ; z <= endZ; z++) {
    const { sy } = worldToScreen(state, { x: 0, z });
    ctx.moveTo(0, sy);
    ctx.lineTo(state.viewportWidth, sy);
  }

  ctx.stroke();
}

export function renderChunkBorders(
  ctx: CanvasRenderingContext2D,
  state: MapState,
  options: { showLabels: boolean }
): void {
  const bounds = visibleWorldBounds(state);
  ctx.strokeStyle = CHUNK_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const startChunkX = Math.floor(bounds.minX / 16);
  const endChunkX = Math.ceil(bounds.maxX / 16);
  for (let cx = startChunkX; cx <= endChunkX; cx++) {
    const { sx } = worldToScreen(state, { x: cx * 16, z: 0 });
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, state.viewportHeight);
  }

  const startChunkZ = Math.floor(bounds.minZ / 16);
  const endChunkZ = Math.ceil(bounds.maxZ / 16);
  for (let cz = startChunkZ; cz <= endChunkZ; cz++) {
    const { sy } = worldToScreen(state, { x: 0, z: cz * 16 });
    ctx.moveTo(0, sy);
    ctx.lineTo(state.viewportWidth, sy);
  }

  ctx.stroke();

  if (!options.showLabels || state.zoom < 1) return;

  ctx.fillStyle = LABEL_COLOR;
  ctx.font = '10px monospace';
  for (let cx = startChunkX; cx <= endChunkX; cx++) {
    for (let cz = startChunkZ; cz <= endChunkZ; cz++) {
      const { sx, sy } = worldToScreen(state, { x: cx * 16 + 1, z: cz * 16 + 9 });
      ctx.fillText(`${cx},${cz}`, sx, sy);
    }
  }
}

/** The world X=0 / Z=0 axis lines — a fixed reference point regardless of pan. */
export function renderOrigin(ctx: CanvasRenderingContext2D, state: MapState): void {
  const { sx } = worldToScreen(state, { x: 0, z: 0 });
  const { sy } = worldToScreen(state, { x: 0, z: 0 });

  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, state.viewportHeight);
  ctx.moveTo(0, sy);
  ctx.lineTo(state.viewportWidth, sy);
  ctx.stroke();
}
