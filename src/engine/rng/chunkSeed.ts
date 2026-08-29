/**
 * chunkSeed.ts
 *
 * Derives the per-chunk "population seed" and per-feature "decoration
 * seed" that Minecraft uses to seed the JavaRandom before placing ores
 * (and other decorated features) in a given chunk.
 *
 * Formulas below are reconstructed from Mojang's own mappings
 * (net.minecraft.world.gen.ChunkRandom, historically WorldgenRandom) and
 * cross-checked against community seed-cracking tooling (Chunkbase,
 * Cubiomes-adjacent projects). This part of the pipeline has been stable
 * since ~1.13 and is NOT the ore-vein config itself — see oreDatabase.ts
 * for the part that's specific to the 1.18+ (and current 26.x) system.
 *
 * TODO(validation): before this is trusted for real output, run a known
 * seed through this + veinPlacer.ts and diff the result against a
 * Chunkbase export for the same seed/chunk to catch any off-by-one in
 * the seed math.
 */

import { JavaRandom } from './javaRandom';

/**
 * Population seed for a chunk. Takes the world seed and the chunk's
 * negative-most block coordinates (chunkX * 16, chunkZ * 16).
 *
 * Java source shape (net.minecraft.world.gen.ChunkRandom#getPopulationSeed):
 *   random.setSeed(worldSeed);
 *   long a = random.nextLong() | 1L;
 *   long b = random.nextLong() | 1L;
 *   return (blockX * a + blockZ * b) ^ worldSeed;
 */
export function populationSeed(worldSeed: bigint, chunkX: number, chunkZ: number): bigint {
  const random = new JavaRandom(worldSeed);
  const a = random.nextLong() | 1n;
  const b = random.nextLong() | 1n;

  const blockX = BigInt(chunkX * 16);
  const blockZ = BigInt(chunkZ * 16);

  return (blockX * a + blockZ * b) ^ worldSeed;
}

/**
 * Per-feature decoration seed. `index` is the feature's position within
 * its generation step's feature list (order in the biome's feature list
 * matters!), `step` is the generation step ordinal (ores are in the
 * UNDERGROUND_ORES step). The `10000 * step` salt keeps different steps
 * from colliding.
 *
 * Java source shape (ChunkRandom#setDecorationSeed / setFeatureSeed):
 *   random.setSeed(populationSeed + index + 10000 * step);
 */
export function decorationSeed(popSeed: bigint, index: number, step: number): bigint {
  return popSeed + BigInt(index) + BigInt(10000 * step);
}

export function randomForFeature(
  worldSeed: bigint,
  chunkX: number,
  chunkZ: number,
  index: number,
  step: number
): JavaRandom {
  const popSeed = populationSeed(worldSeed, chunkX, chunkZ);
  const seed = decorationSeed(popSeed, index, step);
  return new JavaRandom(seed);
}
