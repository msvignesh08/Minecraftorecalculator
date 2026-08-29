/**
 * panZoomController.ts
 *
 * Gesture logic decoupled from the DOM: it's driven by generic
 * pointer-id + screen-coordinate events, so it works identically for
 * mouse (one pointer) and touch (one or two pointers) and can be unit
 * tested without simulating real PointerEvents. The MapCanvas React
 * component (not yet written) will be a thin adapter forwarding real
 * DOM events into this.
 *
 * Handles: one-finger/mouse drag pan, wheel zoom (desktop), two-finger
 * pinch zoom+pan, double-tap/double-click zoom.
 */

import { MapState, zoomAtScreenPoint, panByScreenDelta, clampZoom } from '../mapState';

interface ActivePointer {
  sx: number;
  sy: number;
}

const DOUBLE_TAP_MAX_INTERVAL_MS = 300;
const DOUBLE_TAP_MAX_DISTANCE_PX = 25;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const DOUBLE_TAP_ZOOM_FACTOR = 2;

export class PanZoomController {
  private pointers = new Map<number, ActivePointer>();
  private lastTap: { sx: number; sy: number; timeMs: number } | null = null;
  // Fixed snapshot taken the instant a pinch gesture begins (second
  // finger touches down) — every subsequent move for this gesture
  // computes its result directly against this same fixed baseline,
  // never against the previous frame's (already-transformed) state.
  // This is deliberately NOT incremental: an earlier incremental
  // version (delta vs. the previous frame) drifted the anchor point
  // over multiple frames, caught by panZoomController.smokeTest.ts.
  // Computing everything as an absolute function of (gesture-start
  // state, gesture-start finger distance/midpoint, CURRENT finger
  // distance/midpoint) has no frame-to-frame state to drift from.
  private pinchRef: { distance: number; midpoint: ActivePointer; baseState: MapState } | null = null;

  constructor(
    private getState: () => MapState,
    private setState: (next: MapState) => void
  ) {}

  onPointerDown(pointerId: number, sx: number, sy: number): void {
    this.pointers.set(pointerId, { sx, sy });

    if (this.pointers.size === 2) {
      const positions = Array.from(this.pointers.values());
      const [a, b] = positions;
      this.pinchRef = {
        distance: distance(a, b),
        midpoint: { sx: (a.sx + b.sx) / 2, sy: (a.sy + b.sy) / 2 },
        baseState: this.getState(),
      };
    }
  }

  onPointerUp(pointerId: number, sx: number, sy: number): void {
    // Detect double-tap only on a clean single-finger tap release.
    if (this.pointers.size === 1) {
      const now = performance.now();
      if (
        this.lastTap &&
        now - this.lastTap.timeMs <= DOUBLE_TAP_MAX_INTERVAL_MS &&
        distance(this.lastTap, { sx, sy }) <= DOUBLE_TAP_MAX_DISTANCE_PX
      ) {
        this.handleDoubleTap(sx, sy);
        this.lastTap = null; // consumed — don't chain into a triple-tap
      } else {
        this.lastTap = { sx, sy, timeMs: now };
      }
    }

    this.pointers.delete(pointerId);
    if (this.pointers.size < 2) this.pinchRef = null;
  }

  onPointerCancel(pointerId: number): void {
    this.pointers.delete(pointerId);
    if (this.pointers.size < 2) this.pinchRef = null;
  }

  /**
   * Call on every pointermove for a tracked pointer. Returns nothing —
   * mutates map state via setState as a side effect, matching how a
   * real-time drag gesture is naturally driven frame-by-frame.
   */
  onPointerMove(pointerId: number, sx: number, sy: number): void {
    const prev = this.pointers.get(pointerId);
    if (!prev) return; // move event for an untracked pointer — ignore

    this.pointers.set(pointerId, { sx, sy });

    if (this.pointers.size === 1) {
      this.handleSingleFingerDrag(prev, { sx, sy });
    } else if (this.pointers.size === 2) {
      this.handleTwoFingerPinch();
    }
    // 3+ pointers: ignored (no defined gesture) — avoids undefined
    // behavior from e.g. an accidental palm touch during pinch.
  }

  onWheel(sx: number, sy: number, deltaY: number): void {
    const state = this.getState();
    // Negative deltaY (scroll up) = zoom in, matching common map-UI convention.
    const factor = Math.exp(-deltaY * WHEEL_ZOOM_SENSITIVITY);
    const next = zoomAtScreenPoint(state, { sx, sy }, state.zoom * factor);
    this.setState(next);
  }

  private handleSingleFingerDrag(prev: ActivePointer, curr: ActivePointer): void {
    const state = this.getState();
    const next = panByScreenDelta(state, curr.sx - prev.sx, curr.sy - prev.sy);
    this.setState(next);
  }

  private handleTwoFingerPinch(): void {
    if (!this.pinchRef) return; // shouldn't happen — onPointerDown sets it when size hits 2
    if (this.pinchRef.distance === 0) return; // avoid divide-by-zero on a degenerate pinch start

    const positions = Array.from(this.pointers.values());
    if (positions.length !== 2) return;
    const [a, b] = positions;

    const currDist = distance(a, b);
    const currMidpoint = { sx: (a.sx + b.sx) / 2, sy: (a.sy + b.sy) / 2 };

    const scaleFactor = currDist / this.pinchRef.distance;

    // Zoom the ORIGINAL (gesture-start) state, anchored at the ORIGINAL
    // midpoint — this alone reproduces "pinch anchored at gesture
    // center" with zero drift no matter how many frames this runs over.
    const zoomed = zoomAtScreenPoint(
      this.pinchRef.baseState,
      this.pinchRef.midpoint,
      this.pinchRef.baseState.zoom * scaleFactor
    );

    // Then apply however far the midpoint itself has moved on screen
    // since gesture start (covers a two-finger drag-while-pinching).
    const panned = panByScreenDelta(
      zoomed,
      currMidpoint.sx - this.pinchRef.midpoint.sx,
      currMidpoint.sy - this.pinchRef.midpoint.sy
    );

    this.setState(panned);
  }

  private handleDoubleTap(sx: number, sy: number): void {
    const state = this.getState();
    const next = zoomAtScreenPoint(state, { sx, sy }, clampZoom(state.zoom * DOUBLE_TAP_ZOOM_FACTOR));
    this.setState(next);
  }
}

function distance(a: ActivePointer, b: ActivePointer): number {
  return Math.hypot(a.sx - b.sx, a.sy - b.sy);
}
