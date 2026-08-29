import React, { useRef, useState } from 'react';
import { MapCanvas, MapCanvasHandle } from './map/MapCanvas';
import { OreMarkerData, WaypointData } from './map/render/renderMarkers';
import { DIG_SAFETY_NOTE } from './ui/copy';
import { SearchPanel, SearchFormValues } from './ui/SearchPanel';
import { OreResultsList, OreResultItem } from './ui/OreResultsList';
import { StrataGauge } from './ui/StrataGauge';
import { oreMetaById } from './ui/oreCatalog';
import { parseWorldSeed } from './engine/rng/seedParser';
import { findOres, OreSearchResult } from './engine/unified/oreCalculator';
import { OreType as WasmOreType } from './engine/wasm/cubiomesEngine';
import { oresToCsv } from './storage/db';

/**
 * App.tsx
 *
 * Real search flow wired to the unified ore calculator (falls back to
 * the labeled-unconfirmed path until the WASM engine is actually built
 * — see native/cubiomes-shim/BUILD.md). This replaces the earlier
 * hardcoded-mock-markers version once and for all.
 */

// Catalog id -> the wasm engine's enum. Only entries that exist in
// WasmOreType are listed; ids without an entry here fall through to the
// fallback path's own hardcoded handling (currently diamond only).
const CATALOG_TO_WASM_ORE: Partial<Record<string, WasmOreType>> = {
  diamond: WasmOreType.DiamondOre,
};

const DIMENSION_TO_INT: Record<SearchFormValues['dimension'], number> = {
  overworld: 0,
  nether: -1,
  end: 1,
};

export function App() {
  const mapRef = useRef<MapCanvasHandle>(null);

  const [form, setForm] = useState<SearchFormValues>({
    edition: 'java',
    version: '26.2',
    seedInput: '',
    dimension: 'overworld',
    x: '0',
    z: '0',
    radius: 500,
    oreId: 'diamond',
  });

  const [results, setResults] = useState<OreResultItem[]>([]);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | undefined>(undefined);
  const [player, setPlayer] = useState<{ x: number; y: number; z: number } | null>(null);
  const [activeYLevel, setActiveYLevel] = useState<number | null>(-59);

  const handleSearch = async () => {
    setError(null);
    setWarning(undefined);

    const x = Number(form.x);
    const z = Number(form.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      setError('X and Z need to be numbers.');
      return;
    }

    let seed: bigint;
    try {
      seed = parseWorldSeed(form.seedInput).seed;
    } catch (e) {
      setError((e as Error).message);
      return;
    }

    const wasmOreType = CATALOG_TO_WASM_ORE[form.oreId];
    if (wasmOreType === undefined) {
      setError(`${oreMetaById(form.oreId)?.displayName ?? form.oreId} isn't wired to a calculation path yet.`);
      return;
    }

    setIsSearching(true);
    setPlayer({ x, y: activeYLevel ?? -59, z });

    try {
      const result: OreSearchResult = await findOres({
        worldSeed: seed,
        mcVersionLabel: form.version as '26.2' | '26.1',
        dimension: DIMENSION_TO_INT[form.dimension],
        oreType: wasmOreType,
        centerX: x,
        centerZ: z,
        radius: form.radius,
      });

      const mapped: OreResultItem[] = result.ores.map((o, i) => ({
        id: `${o.x}-${o.y}-${o.z}-${i}`,
        oreId: form.oreId,
        x: o.x,
        y: o.y,
        z: o.z,
        chunkX: o.chunkX,
        chunkZ: o.chunkZ,
        distance: Math.sqrt((o.x - x) ** 2 + (o.z - z) ** 2),
      }));

      setResults(mapped);
      setFoundIds(new Set());
      setWarning(result.warning);
      mapRef.current?.centerOn(x, z);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  const markers: OreMarkerData[] = results
    .filter((r) => !foundIds.has(r.id))
    .map((r) => ({ id: r.id, oreId: r.oreId, x: r.x, y: r.y, z: r.z }));

  const waypoints: WaypointData[] = [];
  const selected = results.find((r) => r.id === selectedId) ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--void)', color: 'var(--torch)' }}>
      <header
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--stone)',
        }}
      >
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: 0.3 }}>⛏ Minecraft Ore Finder</strong>
        <span style={{ fontSize: 11, color: 'var(--torch-dim)' }}>Java 26.2</span>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <StrataGauge
          selectedOreId={form.oreId}
          activeYLevel={activeYLevel}
          playerY={player?.y}
          onYLevelChange={setActiveYLevel}
        />

        <SearchPanel values={form} onChange={setForm} onSubmit={handleSearch} isSearching={isSearching} error={error} />

        <div style={{ flex: 1, position: 'relative' }}>
          <MapCanvas
            ref={mapRef}
            ores={markers}
            player={player}
            waypoints={waypoints}
            selectedOreId={selectedId}
            showChunkBorders
            showChunkLabels
            initialCenter={{ x: 0, z: 0 }}
            initialZoom={6}
            onSelectOre={setSelectedId}
          />

          <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <MapButton label="+" onClick={() => mapRef.current?.zoomIn()} />
            <MapButton label="−" onClick={() => mapRef.current?.zoomOut()} />
            <MapButton label="⌖" onClick={() => player && mapRef.current?.centerOn(player.x, player.z)} />
          </div>

          {selected && (
            <div
              style={{
                position: 'absolute',
                left: 12,
                bottom: 12,
                background: 'rgba(20,18,15,0.95)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: 13,
                lineHeight: 1.6,
                maxWidth: 260,
              }}
            >
              <div>
                <strong>{oreMetaById(selected.oreId)?.icon} {oreMetaById(selected.oreId)?.displayName}</strong>
              </div>
              <div className="mono">
                X: {selected.x} Y: {selected.y} Z: {selected.z}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hairline)', fontSize: 11, opacity: 0.75, lineHeight: 1.4 }}>
                ⚠️ {DIG_SAFETY_NOTE}
              </div>
            </div>
          )}
        </div>

        <OreResultsList
          results={results}
          foundIds={foundIds}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onToggleFound={(id) => setFoundIds((prev) => new Set(prev).add(id))}
          onExportCsv={() => {
            const csv = oresToCsv(results.filter((r) => !foundIds.has(r.id)));
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ore-locations.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          warning={warning}
        />
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
        border: '1px solid var(--hairline)',
        background: 'rgba(20,18,15,0.9)',
        color: 'var(--torch)',
        fontSize: 18,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
