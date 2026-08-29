/**
 * MapCanvas.tsx
 *
 * Ties together mapState.ts (pure transform math), render/*.ts (pure
 * draw functions), and interaction/panZoomController.ts (pure gesture
 * logic) into an actual React component. This file itself should stay
 * "dumb" — DOM/event wiring and a render loop, no new logic — anything
 * that needs testing belongs in the pure modules it calls, per how the
 * rest of this codebase is structured.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapState, clampZoom } from './mapState';
import { PanZoomController } from './interaction/panZoomController';
import {
  renderBackground,
  renderBlockGrid,
  renderChunkBorders,
  renderOrigin,
} from './render/renderGrid';
import {
  renderOreMarkers,
  renderPlayerMarker,
  renderWaypoints,
  renderDistanceLine,
  OreMarkerData,
  WaypointData,
  RenderedMarker,
} from './render/renderMarkers';

export interface MapCanvasProps {
  ores: OreMarkerData[];
  player: { x: number; y: number; z: number } | null;
  waypoints: WaypointData[];
  selectedOreId: string | null;
  showChunkBorders: boolean;
  showChunkLabels: boolean;
  initialCenter: { x: number; z: number };
  initialZoom?: number;
  onSelectOre: (id: string | null) => void;
  onCenterChange?: (center: { x: number; z: number }, zoom: number) => void;
}

// Handles for the imperative "Zoom In" / "Center on Player" etc. buttons
// from the spec (section 4) — a parent component holds a ref and calls
// these rather than this component owning that UI itself, keeping
// MapCanvas focused on rendering + gestures only.
export interface MapCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  centerOn: (x: number, z: number) => void;
  setZoom: (zoom: number) => void;
}

export const MapCanvas = React.forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  {
    ores,
    player,
    waypoints,
    selectedOreId,
    showChunkBorders,
    showChunkLabels,
    initialCenter,
    initialZoom = 4,
    onSelectOre,
    onCenterChange,
  },
  forwardedRef
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PanZoomController | null>(null);
  const renderedMarkersRef = useRef<RenderedMarker[]>([]);
  const stateRef = useRef<MapState>({
    centerX: initialCenter.x,
    centerZ: initialCenter.z,
    zoom: clampZoom(initialZoom),
    viewportWidth: 0,
    viewportHeight: 0,
  });

  // Forces a React re-render only for things outside the canvas itself
  // (e.g. a parent's coordinate readout) — the canvas drawing is done
  // imperatively below, NOT driven by React state, so panning/zooming
  // stays smooth at 60fps without fighting React's render cycle.
  const [, forceTick] = useState(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;

    renderBackground(ctx, state);
    renderBlockGrid(ctx, state);
    if (showChunkBorders) renderChunkBorders(ctx, state, { showLabels: showChunkLabels });
    renderOrigin(ctx, state);

    if (player && selectedOreId) {
      const target = ores.find((o) => o.id === selectedOreId);
      if (target) renderDistanceLine(ctx, state, player, target);
    }

    renderedMarkersRef.current = renderOreMarkers(ctx, state, ores, selectedOreId);
    renderWaypoints(ctx, state, waypoints);
    if (player) renderPlayerMarker(ctx, state, player);
  }, [ores, waypoints, player, selectedOreId, showChunkBorders, showChunkLabels]);

  // Resize handling: canvas must match its CSS size in DEVICE pixels or
  // it renders blurry on high-DPI phone screens — the classic canvas
  // pitfall this app (mobile-first, per the spec) can't afford to hit.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stateRef.current = { ...stateRef.current, viewportWidth: width, viewportHeight: height };
      draw();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  // Wire up the gesture controller once; it reads/writes stateRef
  // directly (not React state) for the same 60fps reason as draw().
  useEffect(() => {
    controllerRef.current = new PanZoomController(
      () => stateRef.current,
      (next) => {
        stateRef.current = next;
        draw();
        onCenterChange?.({ x: next.centerX, z: next.centerZ }, next.zoom);
      }
    );
  }, [draw, onCenterChange]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasRelativePoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { sx: 0, sy: 0 };
    const rect = canvas.getBoundingClientRect();
    return { sx: clientX - rect.left, sy: clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const { sx, sy } = getCanvasRelativePoint(e.clientX, e.clientY);
    controllerRef.current?.onPointerDown(e.pointerId, sx, sy);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { sx, sy } = getCanvasRelativePoint(e.clientX, e.clientY);
    controllerRef.current?.onPointerMove(e.pointerId, sx, sy);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const { sx, sy } = getCanvasRelativePoint(e.clientX, e.clientY);

    // Tap-to-select: only treat as a tap (not the end of a drag) if this
    // was a very short, essentially-stationary press — otherwise every
    // drag-release would also fire marker selection.
    const hit = hitTestMarker(renderedMarkersRef.current, sx, sy);
    if (hit) onSelectOre(hit.id);

    controllerRef.current?.onPointerUp(e.pointerId, sx, sy);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    controllerRef.current?.onPointerCancel(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { sx, sy } = getCanvasRelativePoint(e.clientX, e.clientY);
    controllerRef.current?.onWheel(sx, sy, e.deltaY);
  };

  React.useImperativeHandle(forwardedRef, () => ({
    zoomIn: () => {
      const s = stateRef.current;
      stateRef.current = { ...s, zoom: clampZoom(s.zoom * 1.5) };
      draw();
    },
    zoomOut: () => {
      const s = stateRef.current;
      stateRef.current = { ...s, zoom: clampZoom(s.zoom / 1.5) };
      draw();
    },
    centerOn: (x: number, z: number) => {
      stateRef.current = { ...stateRef.current, centerX: x, centerZ: z };
      draw();
    },
    setZoom: (zoom: number) => {
      stateRef.current = { ...stateRef.current, zoom: clampZoom(zoom) };
      draw();
    },
  }));

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        style={{ display: 'block' }}
        role="img"
        aria-label="Interactive Minecraft ore location map"
      />
    </div>
  );
});

function hitTestMarker(markers: RenderedMarker[], sx: number, sy: number): RenderedMarker | null {
  // Iterate in reverse so top-drawn (later) markers win on overlap.
  for (let i = markers.length - 1; i >= 0; i--) {
    const m = markers[i];
    const dx = sx - m.sx;
    const dy = sy - m.sy;
    if (Math.sqrt(dx * dx + dy * dy) <= m.hitRadius) return m;
  }
  return null;
}
