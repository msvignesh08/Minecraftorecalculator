/**
 * oreDatabase.ts
 *
 * This is the ONLY file that should differ between Minecraft versions.
 * Everything else in /engine (rng, vein placement math) is generic; a
 * new version just needs a new entry here (and a new versions/registry.ts
 * row).
 *
 * SOURCE OF TRUTH: these values are copied directly from Mojang's own
 * data generator output for 26.2, pulled from
 *   github.com/misode/mcmeta @ tag 26.2-data
 *   data/minecraft/worldgen/configured_feature/ore_diamond_*.json
 *   data/minecraft/worldgen/placed_feature/ore_diamond*.json
 * — not reconstructed from secondhand guides. This replaces an earlier
 * draft that had the wrong feature count and wrongly assumed all four
 * diamond features used a triangular height distribution (one, the
 * "medium" feature, is actually flat/uniform).
 *
 * Diamond spawns as FOUR separate placed features per chunk; all four
 * must run and their results merged.
 */

export type HeightAnchor =
  | { type: 'absolute'; y: number }
  | { type: 'aboveBottom'; offset: number } // resolves to worldBottom + offset
  | { type: 'belowTop'; offset: number };

export interface HeightRange {
  /** trapezoid = triangular distribution (peaks at the midpoint); uniform = flat */
  kind: 'trapezoid' | 'uniform';
  min: HeightAnchor;
  max: HeightAnchor;
}

export interface OreVeinConfig {
  /** minecraft: id of the placed_feature, e.g. 'ore_diamond', 'ore_diamond_buried' */
  id: string;
  displayName: string;
  /** Number of placement attempts per chunk. Ignored if rarityChance < 1. */
  count: number;
  /** Vein blob size (roughly max blocks per vein, before falloff shaping) */
  size: number;
  /** Chance [0,1] the vein placement is discarded if it touches air (0 = never discarded) */
  discardChanceOnAirExposure: number;
  heightRange: HeightRange;
  /** 1 = always attempted (uses `count`); <1 = rarity_filter instead of count, e.g. 1/9 */
  rarityChance: number;
  replaces: 'stone' | 'deepslate';
}

// World vertical bounds for the post-1.18 overworld (unchanged through 26.2).
export const WORLD_MIN_Y = -64;
export const WORLD_MAX_Y = 320;

const TRAPEZOID_MINUS144_TO_16: HeightRange = {
  kind: 'trapezoid',
  min: { type: 'aboveBottom', offset: -80 }, // -64 + -80 = -144
  max: { type: 'aboveBottom', offset: 80 }, //  -64 +  80 =  16
};

export const DIAMOND_FEATURES: OreVeinConfig[] = [
  {
    id: 'ore_diamond', // "small" — confusingly this is the plain/default one
    displayName: 'Diamond Ore',
    count: 7,
    size: 4,
    discardChanceOnAirExposure: 0.5,
    rarityChance: 1,
    replaces: 'stone',
    heightRange: TRAPEZOID_MINUS144_TO_16,
  },
  {
    id: 'ore_diamond_buried',
    displayName: 'Diamond Ore (buried)',
    count: 4,
    size: 8,
    discardChanceOnAirExposure: 1.0, // discarded outright if it touches air at all
    rarityChance: 1,
    replaces: 'stone',
    heightRange: TRAPEZOID_MINUS144_TO_16,
  },
  {
    id: 'ore_diamond_large',
    displayName: 'Diamond Ore (large blob)',
    count: 1, // unused — rarityChance drives this one instead of count
    size: 12,
    discardChanceOnAirExposure: 0.7,
    rarityChance: 1 / 9,
    replaces: 'stone',
    heightRange: TRAPEZOID_MINUS144_TO_16,
  },
  {
    id: 'ore_diamond_medium',
    displayName: 'Diamond Ore (medium, flat distribution)',
    count: 2,
    size: 8,
    discardChanceOnAirExposure: 0.5,
    rarityChance: 1,
    replaces: 'stone',
    heightRange: {
      kind: 'uniform', // NOT triangular — equal chance at every Y in range
      min: { type: 'absolute', y: -64 },
      max: { type: 'absolute', y: -4 },
    },
  },
];

export function resolveAnchor(anchor: HeightAnchor): number {
  switch (anchor.type) {
    case 'absolute':
      return anchor.y;
    case 'aboveBottom':
      return WORLD_MIN_Y + anchor.offset;
    case 'belowTop':
      return WORLD_MAX_Y - anchor.offset;
  }
}
