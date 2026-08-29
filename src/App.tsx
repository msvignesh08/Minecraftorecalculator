import React, { useRef, useState } from 'react';
import { MapCanvas, MapCanvasHandle } from './map/MapCanvas';
import { OreMarkerData, WaypointData } from './map/render/renderMarkers';
import { DIG_SAFETY_NOTE } from './ui/copy';

/**
 * App.tsx
 *
 * Minimal demo shell — NOT the final UI from the spec (no bottom sheets,
 * filters, search form, etc. yet). This exists to prove the rendering +
 * gesture pipeline actually runs end to end in a real browser, using
 * placeholder ore positions since the real cubiomes-wasm engine isn't
 * built yet (see native/cubiomes-shim/BUILD.md). Once that build exists,
 * swap MOCK_ORES below for a real call through
 * src/engine/unified/oreCalculator.ts.
 */

const MOCK_ORES: OreMarkerData[] = [
  { id: '1', oreId: 'ore_diamond', x: 482, y: -54, z: -321 },
  { id: '2', oreId: 'ore_diamond_buried', x: 551, y: -12, z: -287 },
  { id: '3', oreId: 'ore_diamond_large', x: 623, y: -18, z: -412 },
  { id: '4', oreId: 'ore_diamond_medium', x: 470, y: -40, z: -300 },
];

const MOCK_WAYPOINTS: WaypointData[] = [{ id: 'base', name: 'Base', x: 500, z: -300 }];

export function App() {
  const mapRef = useRef<MapCanvasHandle>(null);
  const [selectedOreId, setSelectedOreId] = useState<string | null>(null);
  const player = { x: 500, y: -20, z: -300 };

  const selected = MOCK_ORES.find((o) => o.id === selectedOreId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0d0b09', color: '#eee', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ padding: '8px 12px', borderBottom: '1px solid #2a251f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Minecraft Ore Finder</strong>
        <span style={{ fontSize: 12, opacity: 0.6 }}>demo data — real engine pending WASM build</span>
      </header>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapCanvas
          ref={mapRef}
          ores={MOCK_ORES}
          player={player}
          waypoints={MOCK_WAYPOINTS}
          selectedOreId={selectedOreId}
          showChunkBorders
          showChunkLabels
          initialCenter={{ x: player.x, z: player.z }}
          initialZoom={6}
          onSelectOre={setSelectedOreId}
        />

        {/* Map control buttons — section 4 of the spec */}
        <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <MapButton label="+" onClick={() => mapRef.current?.zoomIn()} />
          <MapButton label="−" onClick={() => mapRef.current?.zoomOut()} />
          <MapButton label="⌖" onClick={() => mapRef.current?.centerOn(player.x, player.z)} />
        </div>

        {selected && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              bottom: 12,
              background: 'rgba(20,18,15,0.9)',
              border: '1px solid #3a332a',
              borderRadius: 8,
              padding: 12,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div>
              <strong>{selected.oreId}</strong>
            </div>
            <div>
              X: {selected.x} Y: {selected.y} Z: {selected.z}
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #3a332a', maxWidth: 240, fontSize: 11, opacity: 0.75, lineHeight: 1.4 }}>
              ⚠️ {DIG_SAFETY_NOTE}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MapButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        border: '1px solid #3a332a',
        background: 'rgba(20,18,15,0.9)',
        color: '#eee',
        fontSize: 18,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
