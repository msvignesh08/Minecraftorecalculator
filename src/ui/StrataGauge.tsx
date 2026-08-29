import React from 'react';
import { ORE_CATALOG } from './oreCatalog';

/**
 * StrataGauge.tsx
 *
 * The app's signature visual element (see the design-plan note in
 * tokens.css). Not decoration: it's a real vertical cross-section of
 * the world from Y 320 (top) to Y -64 (bottom), with each ore's actual
 * spawn band drawn as a colored strip at its true position — the exact
 * "what Y do I mine at" question every Minecraft player already knows
 * to ask. Doubles as the Y-level filter control (spec section 9):
 * dragging the indicator sets the active Y filter.
 */

const WORLD_TOP = 320;
const WORLD_BOTTOM = -64;
const WORLD_SPAN = WORLD_TOP - WORLD_BOTTOM;

export interface StrataGaugeProps {
  selectedOreId: string | null;
  activeYLevel: number | null;
  playerY?: number;
  onYLevelChange: (y: number) => void;
}

function yToPercent(y: number): number {
  return ((WORLD_TOP - y) / WORLD_SPAN) * 100;
}

export function StrataGauge({ selectedOreId, activeYLevel, playerY, onYLevelChange }: StrataGaugeProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handlePointer = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const y = Math.round(WORLD_TOP - fraction * WORLD_SPAN);
    onYLevelChange(y);
  };

  return (
    <div
      style={{
        width: 56,
        flexShrink: 0,
        background: 'var(--stone)',
        borderRight: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '12px 0',
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--torch-dim)', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Y</div>

      <div
        ref={trackRef}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture(e.pointerId);
          handlePointer(e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e.clientY);
        }}
        role="slider"
        aria-label="Y-level filter"
        aria-valuemin={WORLD_BOTTOM}
        aria-valuemax={WORLD_TOP}
        aria-valuenow={activeYLevel ?? undefined}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!activeYLevel && activeYLevel !== 0) return;
          if (e.key === 'ArrowUp') onYLevelChange(Math.min(WORLD_TOP, activeYLevel + 1));
          if (e.key === 'ArrowDown') onYLevelChange(Math.max(WORLD_BOTTOM, activeYLevel - 1));
        }}
        style={{
          position: 'relative',
          width: 14,
          flex: 1,
          borderRadius: 7,
          background: 'var(--stone-raised)',
          cursor: 'ns-resize',
          touchAction: 'none',
        }}
      >
        {ORE_CATALOG.map((ore) => {
          const top = yToPercent(ore.heightRange[1]);
          const bottom = yToPercent(ore.heightRange[0]);
          const isSelected = ore.id === selectedOreId;
          return (
            <div
              key={ore.id}
              title={`${ore.displayName}: Y ${ore.heightRange[0]} to ${ore.heightRange[1]}`}
              style={{
                position: 'absolute',
                left: isSelected ? -3 : 2,
                right: isSelected ? -3 : 2,
                top: `${top}%`,
                height: `${bottom - top}%`,
                background: ore.color,
                opacity: isSelected ? 0.85 : 0.25,
                borderRadius: 3,
                transition: 'opacity 120ms ease, left 120ms ease, right 120ms ease',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {playerY !== undefined && (
          <div
            title={`You: Y ${playerY}`}
            style={{
              position: 'absolute',
              left: -6,
              right: -6,
              top: `${yToPercent(playerY)}%`,
              height: 2,
              background: 'var(--torch)',
              pointerEvents: 'none',
            }}
          />
        )}

        {activeYLevel !== null && (
          <div
            style={{
              position: 'absolute',
              left: -8,
              right: -8,
              top: `${yToPercent(activeYLevel)}%`,
              height: 3,
              background: 'var(--accent)',
              borderRadius: 2,
              boxShadow: '0 0 6px var(--accent)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      <div style={{ fontSize: 9, color: 'var(--torch-dim)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
        {activeYLevel ?? '—'}
      </div>
    </div>
  );
}
