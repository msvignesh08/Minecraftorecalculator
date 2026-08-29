import React from 'react';
import { oreMetaById } from './oreCatalog';

export interface OreResultItem {
  id: string;
  oreId: string; // catalog id, e.g. 'diamond'
  x: number;
  y: number;
  z: number;
  chunkX: number;
  chunkZ: number;
  distance: number;
}

export interface OreResultsListProps {
  results: OreResultItem[];
  foundIds: Set<string>;
  selectedId: string | null;
  onToggleFound: (id: string) => void;
  onSelect: (id: string) => void;
  onExportCsv: () => void;
  warning?: string;
}

export function OreResultsList({ results, foundIds, selectedId, onToggleFound, onSelect, onExportCsv, warning }: OreResultsListProps) {
  const visible = results.filter((r) => !foundIds.has(r.id));
  const sorted = [...visible].sort((a, b) => a.distance - b.distance);

  return (
    <div
      style={{
        width: 300,
        flexShrink: 0,
        background: 'var(--stone)',
        borderLeft: '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: 0 }}>Nearby ores</h2>
        <span style={{ fontSize: 12, color: 'var(--torch-muted)' }}>{sorted.length}</span>
      </div>

      {warning && (
        <div style={{ margin: 'var(--space-3)', fontSize: 12, color: 'var(--ore-gold)', background: 'rgba(242,193,78,0.1)', padding: 8, borderRadius: 6 }}>
          ⚠️ {warning}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sorted.length === 0 && (
          <div style={{ padding: 'var(--space-4)', fontSize: 13, color: 'var(--torch-dim)' }}>
            No results yet — run a search, or everything found nearby is checked off.
          </div>
        )}

        {sorted.map((r) => {
          const meta = oreMetaById(r.oreId);
          const isSelected = r.id === selectedId;
          return (
            <div
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                padding: '10px var(--space-4)',
                borderBottom: '1px solid var(--hairline)',
                background: isSelected ? 'var(--stone-hover)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}
            >
              <input
                type="checkbox"
                checked={false}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggleFound(r.id)}
                title="Mark as found — removes it from this list"
                style={{ marginTop: 3 }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{meta?.icon}</span>
                  <strong style={{ fontSize: 13 }}>{meta?.displayName ?? r.oreId}</strong>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--torch-muted)' }}>
                    {Math.round(r.distance)}m
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--torch-muted)', marginTop: 2 }}>
                  X:{r.x} Y:{r.y} Z:{r.z}
                </div>
                <div style={{ fontSize: 10, color: 'var(--torch-dim)', marginTop: 1 }}>
                  Chunk {r.chunkX}, {r.chunkZ}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: 'var(--space-3)', borderTop: '1px solid var(--hairline)' }}>
        <button
          onClick={onExportCsv}
          disabled={sorted.length === 0}
          style={{
            width: '100%',
            background: 'var(--stone-raised)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--torch)',
            padding: '8px',
            fontSize: 12,
            cursor: sorted.length === 0 ? 'default' : 'pointer',
            opacity: sorted.length === 0 ? 0.4 : 1,
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}
