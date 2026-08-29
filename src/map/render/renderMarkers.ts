/**
 * renderMarkers.ts
 *
 * Ore markers, the player marker, waypoints, and the distance line
 * between player and a selected marker. Each marker function also
 * returns its own screen-space hit-radius so the interaction layer can
 * do tap/click hit-testing without duplicating marker geometry.
 */

import { MapState, worldToScreen, WorldPoint } from '../mapState';

export interface OreMarkerData {
  id: string; // stable identifier for click/selection tracking
  oreId: string;
  x: number;
  y: number;
  z: number;
}

// Per the visual-design spec's marker icon set. Kept centralized so the
// "Nearby Ores" list and the map markers can never drift out of sync —
// both should import ORE_MARKER_ICONS rather than hardcoding emoji.
export const ORE_MARKER_ICONS: Record<string, string> = {
  diamond: '💎',
  emerald: '🟢',
  gold: '🟡',
  redstone: '🔴',
  lapis: '🔵',
  coal: '⚫',
  iron: '⚙️',
  copper: '🟠',
  ancient_debris: '🟤',
  nether_quartz: '🟣',
  nether_gold: '🟨',
};

/** Maps a cubiomes/oreDatabase raw id (e.g. 'ore_diamond_buried') to the display bucket above. */
export function oreIconFor(oreId: string): string {
  const normalized = oreId.toLowerCase();
  for (const key of Object.keys(ORE_MARKER_ICONS)) {
    if (normalized.includes(key)) return ORE_MARKER_ICONS[key];
  }
  return '❔';
}

const MARKER_RADIUS_PX = 10;

export interface RenderedMarker {
  id: string;
  sx: number;
  sy: number;
  hitRadius: number;
}

/**
 * Draws ore markers and returns their screen positions/hit-radii for the
 * interaction layer's tap-detection — callers should keep this returned
 * array around and reuse it for hit-testing rather than recomputing
 * worldToScreen separately (keeps the two in sync by construction).
 */
export function renderOreMarkers(
  ctx: CanvasRenderingContext2D,
  state: MapState,
  markers: OreMarkerData[],
  selectedId: string | null
): RenderedMarker[] {
  const rendered: RenderedMarker[] = [];

  for (const marker of markers) {
    const { sx, sy } = worldToScreen(state, { x: marker.x, z: marker.z });

    // Cull off-screen markers (with a small margin so partially-visible
    // markers at the edge still draw).
    if (sx < -20 || sx > state.viewportWidth + 20 || sy < -20 || sy > state.viewportHeight + 20) {
      rendered.push({ id: marker.id, sx, sy, hitRadius: MARKER_RADIUS_PX }); // still tracked, just not drawn
      continue;
    }

    const isSelected = marker.id === selectedId;
    const radius = isSelected ? MARKER_RADIUS_PX * 1.3 : MARKER_RADIUS_PX;

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 27, 22, 0.9)';
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.font = `${radius * 1.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(oreIconFor(marker.oreId), sx, sy);

    rendered.push({ id: marker.id, sx, sy, hitRadius: radius + 4 }); // +4px generous touch target
  }

  return rendered;
}

export function renderPlayerMarker(ctx: CanvasRenderingContext2D, state: MapState, player: WorldPoint): void {
  const { sx, sy } = worldToScreen(state, player);

  ctx.beginPath();
  ctx.arc(sx, sy, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#4fc3f7';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧍', sx, sy - 1);
}

export interface WaypointData {
  id: string;
  name: string;
  x: number;
  z: number;
}

export function renderWaypoints(ctx: CanvasRenderingContext2D, state: MapState, waypoints: WaypointData[]): RenderedMarker[] {
  const rendered: RenderedMarker[] = [];

  for (const wp of waypoints) {
    const { sx, sy } = worldToScreen(state, { x: wp.x, z: wp.z });

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('📍', sx, sy);

    if (state.zoom > 1) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.textBaseline = 'top';
      ctx.fillText(wp.name, sx, sy + 2);
    }

    rendered.push({ id: wp.id, sx, sy, hitRadius: 14 });
  }

  return rendered;
}

/** Line from the player to a selected ore, with horizontal + 3D distance labeled at the midpoint. */
export function renderDistanceLine(
  ctx: CanvasRenderingContext2D,
  state: MapState,
  player: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number }
): void {
  const from = worldToScreen(state, player);
  const to = worldToScreen(state, target);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(from.sx, from.sy);
  ctx.lineTo(to.sx, to.sy);
  ctx.stroke();
  ctx.setLineDash([]);

  const dx = target.x - player.x;
  const dz = target.z - player.z;
  const dy = target.y - player.y;
  const horizontal = Math.sqrt(dx * dx + dz * dz);
  const threeD = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const midSx = (from.sx + to.sx) / 2;
  const midSy = (from.sy + to.sy) / 2;

  ctx.font = '11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`${Math.round(horizontal)}m (${Math.round(threeD)}m 3D)`, midSx, midSy - 4);
}
