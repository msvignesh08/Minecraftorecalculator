/**
 * mapState.ts
 *
 * The map renders the Minecraft X/Z plane. "World" coordinates are
 * Minecraft block coordinates (X, Z — Y is handled separately via the
 * Y-level filter, not the 2D map). "Screen" coordinates are canvas
 * pixels. Everything pan/zoom-related is just the transform between
 * these two spaces, kept here as pure functions so it's testable
 * without a real canvas or DOM.
 */

export interface MapState {
  /** World X/Z the camera is centered on. */
  centerX: number;
  centerZ: number;
  /** Blocks-per-pixel would be tiny numbers at useful zooms, so this is
   *  stored as pixels-per-block instead — more intuitive to reason about
   *  (zoom=1 means 1 block = 1 pixel; zoom=16 means each block is a
   *  16x16 pixel square, useful for seeing individual ore markers). */
  zoom: number;
  /** Canvas size in CSS pixels (not device pixels — see devicePixelRatio
   *  handling in the render layer, kept separate from this pure state). */
  viewportWidth: number;
  viewportHeight: number;
}

export const MIN_ZOOM = 0.05; // zoomed out ~20 blocks/px — see whole regions
export const MAX_ZOOM = 32; // zoomed in — individual ore markers clearly separated

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export interface ScreenPoint {
  sx: number;
  sy: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

/** World (block X/Z) -> screen (canvas pixel) coordinates. */
export function worldToScreen(state: MapState, world: WorldPoint): ScreenPoint {
  const sx = state.viewportWidth / 2 + (world.x - state.centerX) * state.zoom;
  // Screen Y grows downward; Minecraft Z also conventionally increases
  // "south" which we render as downward on the map, so no sign flip here
  // (unlike a typical math Y-up convention) — kept explicit rather than
  // implicit so it doesn't get silently flipped by a future edit.
  const sy = state.viewportHeight / 2 + (world.z - state.centerZ) * state.zoom;
  return { sx, sy };
}

/** Screen (canvas pixel) -> world (block X/Z) coordinates. */
export function screenToWorld(state: MapState, screen: ScreenPoint): WorldPoint {
  const x = state.centerX + (screen.sx - state.viewportWidth / 2) / state.zoom;
  const z = state.centerZ + (screen.sy - state.viewportHeight / 2) / state.zoom;
  return { x, z };
}

/** Pan by a screen-pixel delta (e.g. from a drag gesture), returning new state. */
export function panByScreenDelta(state: MapState, dxScreen: number, dyScreen: number): MapState {
  return {
    ...state,
    centerX: state.centerX - dxScreen / state.zoom,
    centerZ: state.centerZ - dyScreen / state.zoom,
  };
}

/**
 * Zoom while keeping a specific screen point visually anchored — this is
 * what makes mouse-wheel zoom feel like it zooms "toward the cursor"
 * instead of always toward the center. Also used for pinch-zoom (anchor
 * = midpoint between the two touches) and double-tap zoom (anchor = tap
 * point).
 */
export function zoomAtScreenPoint(state: MapState, screen: ScreenPoint, newZoom: number): MapState {
  const clamped = clampZoom(newZoom);
  const worldBefore = screenToWorld(state, screen);

  const zoomedState: MapState = { ...state, zoom: clamped };
  const worldAfterAtSameScreenPoint = screenToWorld(zoomedState, screen);

  // Shift center so worldBefore still lands under the same screen point.
  return {
    ...zoomedState,
    centerX: zoomedState.centerX + (worldBefore.x - worldAfterAtSameScreenPoint.x),
    centerZ: zoomedState.centerZ + (worldBefore.z - worldAfterAtSameScreenPoint.z),
  };
}

/** Which chunk (chunk X/Z, i.e. block coords / 16, floored) a world point falls in. */
export function worldToChunk(world: WorldPoint): { chunkX: number; chunkZ: number } {
  return { chunkX: Math.floor(world.x / 16), chunkZ: Math.floor(world.z / 16) };
}

/** The world-space bounding box currently visible — used to decide what to render/cull. */
export function visibleWorldBounds(state: MapState): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const topLeft = screenToWorld(state, { sx: 0, sy: 0 });
  const bottomRight = screenToWorld(state, { sx: state.viewportWidth, sy: state.viewportHeight });
  return { minX: topLeft.x, maxX: bottomRight.x, minZ: topLeft.z, maxZ: bottomRight.z };
}
