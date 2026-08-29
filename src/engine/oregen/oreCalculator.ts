/**
 * oreCalculator.ts
 *
 * Phase-1 entry point. Given a world seed and a chunk range, runs the
 * diamond features across every chunk and returns candidate vein blocks.
 *
 * NOTE: see the warning at the top of veinPlacer.ts — output here is
 * candidate geometry, not terrain-confirmed ore. Good enough to validate
 * the RNG/seed pipeline against a reference tool; not yet good enough to
 * show a user as "here's your diamond."
 */

import { randomForFeature } from '../rng/chunkSeed';
import { DIAMOND_FEATURES } from './oreDatabase';
import { placeVeinsForChunk, OreBlock } from './veinPlacer';

// Confirmed directly from data/minecraft/worldgen/biome/plains.json in the
// 26.2 data generator output: the underground-ores generation step is
// index 6 (0-based) in a biome's `features` array, and within that step's
// feature list, the diamond entries sit at these exact positions:
//   [..., ore_redstone_lower(17), ore_diamond(18), ore_diamond_medium(19),
//    ore_diamond_large(20), ore_diamond_buried(21), ore_lapis(22), ...]
// This matters because the decoration seed depends on a feature's exact
// index in this list — getting it wrong desyncs the RNG for every
// downstream vein even though the vein-placement math itself is correct.
// (Checked against plains; every overworld biome shares the same
// underground-ores feature list via the shared biome tag, but that
// assumption should be spot-checked against a non-plains biome before
// this is fully trusted.)
const UNDERGROUND_ORES_STEP = 6;
const FEATURE_INDEX: Record<string, number> = {
  ore_diamond: 18,
  ore_diamond_medium: 19,
  ore_diamond_large: 20,
  ore_diamond_buried: 21,
};

export interface ChunkRange {
  minChunkX: number;
  maxChunkX: number;
  minChunkZ: number;
  maxChunkZ: number;
}

export function calculateDiamondOres(worldSeed: bigint, range: ChunkRange): OreBlock[] {
  const results: OreBlock[] = [];

  for (let cx = range.minChunkX; cx <= range.maxChunkX; cx++) {
    for (let cz = range.minChunkZ; cz <= range.maxChunkZ; cz++) {
      DIAMOND_FEATURES.forEach((config) => {
        const featureIndex = FEATURE_INDEX[config.id];
        const random = randomForFeature(worldSeed, cx, cz, featureIndex, UNDERGROUND_ORES_STEP);
        results.push(...placeVeinsForChunk(random, config, cx, cz));
      });
    }
  }

  return results;
}

/** Convenience: coordinates -> chunk range covering a radius search. */
export function chunkRangeForRadius(centerX: number, centerZ: number, radius: number): ChunkRange {
  const toChunk = (block: number) => Math.floor(block / 16);
  return {
    minChunkX: toChunk(centerX - radius),
    maxChunkX: toChunk(centerX + radius),
    minChunkZ: toChunk(centerZ - radius),
    maxChunkZ: toChunk(centerZ + radius),
  };
}
