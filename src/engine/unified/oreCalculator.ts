/**
 * oreCalculator.ts (unified entry point)
 *
 * Single function the UI calls, regardless of which engine is actually
 * doing the work underneath. Always prefers the real cubiomes-wasm
 * engine; only falls back to the hand-written TS math if the WASM
 * module fails to load, and ALWAYS reports which path was used so the
 * UI can label unconfirmed results honestly (per the app's own
 * never-fabricate requirement — see src/engine/oregen/README.md).
 */

import { CubiomesEngine, OreType as WasmOreType } from '../wasm/cubiomesEngine';
import { calculateDiamondOres as calculateDiamondOresFallback, chunkRangeForRadius } from '../oregen/oreCalculator';

export type EngineSource = 'cubiomes-wasm' | 'fallback-unconfirmed';

export interface OreResult {
  x: number;
  y: number;
  z: number;
  oreId: string;
  /** Chunk coordinates, for the UI's chunk-inspection features. */
  chunkX: number;
  chunkZ: number;
}

export interface OreSearchResult {
  ores: OreResult[];
  source: EngineSource;
  /** Present only when source === 'fallback-unconfirmed'. Show this to the user. */
  warning?: string;
}

export interface OreSearchParams {
  worldSeed: bigint;
  mcVersion: number; // one of CubiomesEngine.versions.* — resolved by caller, never guessed
  dimension: number;
  oreType: WasmOreType;
  centerX: number;
  centerZ: number;
  radius: number;
}

let cachedEngine: CubiomesEngine | null = null;
let engineLoadFailed = false;

async function getEngine(): Promise<CubiomesEngine | null> {
  if (cachedEngine) return cachedEngine;
  if (engineLoadFailed) return null;

  try {
    cachedEngine = await CubiomesEngine.create();
    return cachedEngine;
  } catch (err) {
    // Expected until native/cubiomes-shim/BUILD.md has actually been run
    // and its output committed to src/engine/wasm/. Not a bug in this
    // file — a real missing-artifact state, so fail over cleanly rather
    // than throwing and breaking the whole search flow.
    console.warn('cubiomes-wasm engine unavailable, using unconfirmed fallback:', err);
    engineLoadFailed = true;
    return null;
  }
}

export async function findOres(params: OreSearchParams): Promise<OreSearchResult> {
  const engine = await getEngine();

  if (engine) {
    return runWasmSearch(engine, params);
  }

  return runFallbackSearch(params);
}

function chunkOf(block: number): number {
  return Math.floor(block / 16);
}

function runWasmSearch(engine: CubiomesEngine, params: OreSearchParams): OreSearchResult {
  const { worldSeed, mcVersion, dimension, oreType, centerX, centerZ, radius } = params;

  engine.openWorld(mcVersion, dimension, worldSeed);

  const range = chunkRangeForRadius(centerX, centerZ, radius);
  const ores: OreResult[] = [];

  for (let cx = range.minChunkX; cx <= range.maxChunkX; cx++) {
    for (let cz = range.minChunkZ; cz <= range.maxChunkZ; cz++) {
      const positions = engine.findOresInChunk(oreType, cx, cz);
      for (const pos of positions) {
        // Filter to the actual requested radius — chunk range is a
        // superset (whole chunks), so trim to a real circular/square
        // search radius here.
        const dx = pos.x - centerX;
        const dz = pos.z - centerZ;
        if (Math.sqrt(dx * dx + dz * dz) <= radius) {
          ores.push({
            x: pos.x,
            y: pos.y,
            z: pos.z,
            oreId: WasmOreType[oreType],
            chunkX: chunkOf(pos.x),
            chunkZ: chunkOf(pos.z),
          });
        }
      }
    }
  }

  engine.closeWorld();

  return { ores, source: 'cubiomes-wasm' };
}

function runFallbackSearch(params: OreSearchParams): OreSearchResult {
  // Fallback only currently implements diamond (phase-1 scope) — other
  // ore types simply return empty with a clear warning rather than
  // silently claiming a result the fallback was never built to produce.
  if (params.oreType !== WasmOreType.DiamondOre && params.oreType !== WasmOreType.BuriedDiamondOre) {
    return {
      ores: [],
      source: 'fallback-unconfirmed',
      warning:
        'The accurate ore engine is unavailable right now, and the offline backup only covers diamond. Try again once the app has a network connection, or pick diamond.',
    };
  }

  const range = chunkRangeForRadius(params.centerX, params.centerZ, params.radius);
  const blocks = calculateDiamondOresFallback(params.worldSeed, range);

  const ores: OreResult[] = blocks
    .filter((b) => {
      const dx = b.x - params.centerX;
      const dz = b.z - params.centerZ;
      return Math.sqrt(dx * dx + dz * dz) <= params.radius;
    })
    .map((b) => ({
      x: b.x,
      y: b.y,
      z: b.z,
      oreId: b.oreId,
      chunkX: chunkOf(b.x),
      chunkZ: chunkOf(b.z),
    }));

  return {
    ores,
    source: 'fallback-unconfirmed',
    warning:
      'Showing unconfirmed results: candidate vein positions only, not yet checked against real terrain. Treat these as approximate.',
  };
}
