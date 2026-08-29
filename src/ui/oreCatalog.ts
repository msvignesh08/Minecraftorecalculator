/**
 * oreCatalog.ts
 *
 * Single source of truth for how ores are presented in the UI (icon,
 * color, display name, typical Y-height band). Used by the Strata
 * Gauge, the ore picker, and the results list so they can never drift
 * out of sync with each other.
 *
 * CONFIDENCE NOTE: `heightRange` for diamond is pulled from the same
 * verified 26.2 data used in the actual engine (oreDatabase.ts) — see
 * that file's header for the source. The other ores' ranges are
 * well-established, widely-published community knowledge (stable since
 * the 1.18 Caves & Cliffs overhaul) but have NOT been independently
 * re-verified against 26.2's literal data files the way diamond was.
 * They're accurate enough for the gauge's "typical band" display; treat
 * them as reference, not the same evidence tier as the diamond engine
 * output itself.
 */

export interface OreMeta {
  id: string;
  displayName: string;
  color: string; // CSS var reference, e.g. 'var(--ore-diamond)'
  icon: string;
  /** [min, max] Y in the current 26.2 world (-64 to 320). */
  heightRange: [number, number];
  peakY?: number;
  /** Whether the real cubiomes-wasm engine (once built) or fallback path actually supports this yet. */
  engineSupport: 'full' | 'fallback-only' | 'not-yet-wired';
}

export const ORE_CATALOG: OreMeta[] = [
  {
    id: 'diamond',
    displayName: 'Diamond',
    color: 'var(--ore-diamond)',
    icon: '💎',
    heightRange: [-64, 16],
    peakY: -59,
    engineSupport: 'fallback-only', // real cubiomes-wasm path exists too, pending the build step
  },
  {
    id: 'iron',
    displayName: 'Iron',
    color: 'var(--ore-iron)',
    icon: '⚙️',
    heightRange: [-64, 320],
    peakY: 16,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'gold',
    displayName: 'Gold',
    color: 'var(--ore-gold)',
    icon: '🟡',
    heightRange: [-64, 32],
    peakY: -16,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'redstone',
    displayName: 'Redstone',
    color: 'var(--ore-redstone)',
    icon: '🔴',
    heightRange: [-64, 15],
    peakY: -58,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'lapis',
    displayName: 'Lapis Lazuli',
    color: 'var(--ore-lapis)',
    icon: '🔵',
    heightRange: [-64, 64],
    peakY: 0,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'copper',
    displayName: 'Copper',
    color: 'var(--ore-copper)',
    icon: '🟠',
    heightRange: [-16, 112],
    peakY: 48,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'coal',
    displayName: 'Coal',
    color: 'var(--ore-coal)',
    icon: '⚫',
    heightRange: [0, 320],
    peakY: 136,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'emerald',
    displayName: 'Emerald',
    color: 'var(--ore-emerald)',
    icon: '🟢',
    heightRange: [-16, 320],
    peakY: 236,
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'ancient_debris',
    displayName: 'Ancient Debris',
    color: 'var(--ore-debris)',
    icon: '🟤',
    heightRange: [8, 119],
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'nether_quartz',
    displayName: 'Nether Quartz',
    color: 'var(--ore-quartz)',
    icon: '🟣',
    heightRange: [10, 117],
    engineSupport: 'not-yet-wired',
  },
  {
    id: 'nether_gold',
    displayName: 'Nether Gold',
    color: 'var(--ore-nether-gold)',
    icon: '🟨',
    heightRange: [10, 117],
    engineSupport: 'not-yet-wired',
  },
];

export function oreMetaById(id: string): OreMeta | undefined {
  return ORE_CATALOG.find((o) => o.id === id);
}
