/**
 * veinPlacer.ts
 *
 * Reimplements Minecraft's OreFeature placement: for each of the
 * `count` attempts in a chunk, pick a random origin, then carve an
 * ellipsoid-ish blob of ore blocks along a random line segment through
 * that origin. This is the "shape" of a vein.
 *
 * IMPORTANT — READ BEFORE USING OUTPUT AS "ACCURATE":
 * This module answers "where would Minecraft attempt to place ore
 * blocks for this vein". In the real game, each candidate block is
 * ALSO checked against the actual generated terrain — it's only placed
 * if that position currently holds stone/deepslate (not air, not
 * another block), and buried-air-exposure discard depends on whether
 * the vein as a whole touches a cave. That terrain/noise check is
 * phase 2 (engine/worldgen/noiseGenerator.ts + caveCarver.ts) and does
 * NOT exist yet. Until it's wired in, treat this module's output as
 * "candidate vein geometry", not final ore coordinates — surfacing it
 * to end users as ground truth before phase 2 lands would violate the
 * app's own "never fabricate coordinates" requirement.
 */

import { JavaRandom } from '../rng/javaRandom';
import { OreVeinConfig, resolveAnchor } from './oreDatabase';

export interface OreBlock {
  x: number;
  y: number;
  z: number;
  oreId: string;
}

/**
 * Sample a height per the feature's configured distribution.
 * - 'trapezoid' with no plateau (the case for every diamond feature that
 *   uses it) = triangular distribution, done by summing two uniforms —
 *   this is Minecraft's actual TrapezoidHeight#sample approach.
 * - 'uniform' = flat: every Y in range is equally likely. Confirmed this
 *   matters — ore_diamond_medium in 26.2 uses uniform, not trapezoid.
 */
function sampleHeight(random: JavaRandom, config: OreVeinConfig): number {
  const min = resolveAnchor(config.heightRange.min);
  const max = resolveAnchor(config.heightRange.max);
  const deltaY = max - min;

  if (config.heightRange.kind === 'uniform') {
    return min + random.nextIntBound(deltaY + 1);
  }

  // trapezoid, plateau = 0 (pure triangle)
  const plateau = 0;
  const distance = Math.floor((deltaY - plateau) / 2);
  return (
    min +
    random.nextIntBound(distance + 1) +
    random.nextIntBound(deltaY - distance + 1)
  );
}

/**
 * Places one vein attempt. `random` must already be seeded for this
 * specific feature (see chunkSeed.ts randomForFeature). `chunkX`/`chunkZ`
 * are chunk coordinates (not block coordinates).
 */
function placeOneVein(
  random: JavaRandom,
  config: OreVeinConfig,
  chunkX: number,
  chunkZ: number
): OreBlock[] {
  // Origin: random block within the chunk's 16x16 column, random Y per
  // the feature's height distribution.
  const originX = chunkX * 16 + random.nextIntBound(16);
  const originZ = chunkZ * 16 + random.nextIntBound(16);
  const originY = sampleHeight(random, config);

  const size = config.size;
  const angle = random.nextFloat() * Math.PI;

  const spreadX = (Math.sin(angle) * size) / 8;
  const spreadZ = (Math.cos(angle) * size) / 8;

  const x1 = originX + spreadX;
  const x2 = originX - spreadX;
  const z1 = originZ + spreadZ;
  const z2 = originZ - spreadZ;

  const y1 = originY + random.nextIntBound(3) - 2;
  const y2 = originY + random.nextIntBound(3) - 2;

  const blocks: OreBlock[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < size; i++) {
    const t = i / size;

    const centerX = x1 + (x2 - x1) * t;
    const centerY = y1 + (y2 - y1) * t;
    const centerZ = z1 + (z2 - z1) * t;

    // Radius shrinks toward both ends of the segment (sin-based falloff),
    // scaled by a per-step random factor — this is what gives veins their
    // organic, lumpy shape rather than a perfect ellipsoid.
    const falloff = Math.sin((Math.PI * i) / size);
    const stepRadius = (random.nextDouble() * size) / 16.0;
    const radiusXZ = ((falloff + 1) * stepRadius + 1) / 2;
    const radiusY = radiusXZ / 2;

    const minX = Math.floor(centerX - radiusXZ);
    const maxX = Math.floor(centerX + radiusXZ);
    const minY = Math.floor(centerY - radiusY);
    const maxY = Math.floor(centerY + radiusY);
    const minZ = Math.floor(centerZ - radiusXZ);
    const maxZ = Math.floor(centerZ + radiusXZ);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const dx = (bx + 0.5 - centerX) / radiusXZ;
          const dy = (by + 0.5 - centerY) / radiusY;
          const dz = (bz + 0.5 - centerZ) / radiusXZ;
          if (dx * dx + dy * dy + dz * dz < 1.0) {
            const key = `${bx},${by},${bz}`;
            if (!seen.has(key)) {
              seen.add(key);
              blocks.push({ x: bx, y: by, z: bz, oreId: config.id });
            }
          }
        }
      }
    }
  }

  return blocks;
}

/**
 * Runs all `count` attempts for one ore feature in one chunk.
 * `featureIndex`/`step` feed into the decoration seed — caller is
 * responsible for keeping these consistent with the feature's real
 * position in the biome's generation order (phase 2 concern once
 * multiple ores/features share a chunk).
 */
export function placeVeinsForChunk(
  random: JavaRandom,
  config: OreVeinConfig,
  chunkX: number,
  chunkZ: number
): OreBlock[] {
  const results: OreBlock[] = [];

  for (let i = 0; i < config.count; i++) {
    if (config.rarityChance < 1 && random.nextFloat() >= config.rarityChance) {
      continue; // this attempt skipped by the rarity filter
    }
    results.push(...placeOneVein(random, config, chunkX, chunkZ));
  }

  return results;
}
