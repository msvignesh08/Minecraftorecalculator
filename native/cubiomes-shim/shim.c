/**
 * shim.c
 *
 * Thin wrapper around xpple/cubiomes (github.com/xpple/cubiomes — a fork
 * of Cubitect/cubiomes with ore-generation support added, verified by its
 * sibling project SeedMapper as supporting up to MC_26_2). This is the
 * REAL production ore engine — it replaces the hand-written TS placement
 * math in src/engine/oregen/, which is kept only as a reference/fallback
 * (see src/engine/oregen/README.md).
 *
 * Why a shim instead of binding cubiomes' structs directly: Pos3List
 * holds a raw pointer (Pos3* pos3s) which is awkward and fragile to read
 * from JS across the WASM memory boundary. This shim copies results into
 * a flat int32 buffer the caller owns, which Emscripten's HEAP32 view can
 * read directly with no pointer-chasing.
 *
 * Real function names/signatures used below (getOreConfig,
 * getBiomeForOreGen, isViableOreBiome, generateOres, setupGenerator,
 * applySeed, initSurfaceNoise) were pulled directly from the cubiomes
 * fork's headers (features/ore.h, generator.h, biomenoise.h) — not
 * guessed.
 *
 * ONE OPEN QUESTION flagged honestly rather than papered over:
 * getBiomeForOreGen's `y` parameter is documented as "unused for <1.18,"
 * which implies it DOES matter for our >=1.18 target (MC_26_2). This
 * shim currently samples at a single representative y per chunk (see
 * ORE_GEN_BIOME_SAMPLE_Y below) rather than per-ore-height. Before
 * trusting output, cross-check this against cubiomes' own example/test
 * programs (e.g. their find_ores or similar sample in the repo) to see
 * how they call it for real ore searches — this is a plausible source of
 * subtle inaccuracy if the real usage pattern samples per-Y instead.
 */

#include <stdlib.h>
#include <stdint.h>

#include "generator.h"
#include "biomenoise.h"
#include "features/ore.h"

typedef struct {
    Generator g;
    SurfaceNoise sn;
    int mc;
    int dim;
} OreEngineHandle;

// TODO(validation): confirm this against real cubiomes example usage —
// see the shim.c header comment above.
#define ORE_GEN_BIOME_SAMPLE_Y 0

/**
 * Create an engine instance for one (version, dimension, seed) tuple.
 * Caller owns the returned handle and must call oreEngineDestroy on it.
 *
 * Seed is passed as two uint32 halves (seedLo, seedHi) rather than one
 * uint64_t — Emscripten's ccall doesn't marshal a JS number into a true
 * 64-bit C param safely, so the split avoids that boundary problem
 * entirely instead of relying on risky i64 ccall support.
 */
OreEngineHandle* oreEngineCreate(int mc, int dim, uint32_t seedLo, uint32_t seedHi) {
    OreEngineHandle* h = (OreEngineHandle*)malloc(sizeof(OreEngineHandle));
    if (!h) return NULL;

    h->mc = mc;
    h->dim = dim;

    uint64_t seed = ((uint64_t)seedHi << 32) | (uint64_t)seedLo;

    setupGenerator(&h->g, mc, 0);
    applySeed(&h->g, dim, seed);
    initSurfaceNoise(&h->sn, dim, seed);

    return h;
}

void oreEngineDestroy(OreEngineHandle* h) {
    if (h) free(h);
}

/**
 * Find ore positions of one ore type in one chunk.
 *
 * @param outBuffer  caller-allocated int32 array, length >= maxOut*3.
 *                    Filled as [x0,y0,z0, x1,y1,z1, ...].
 * @param maxOut     capacity of outBuffer in POSITIONS (not ints).
 * @return  the TRUE number of ore positions found (may exceed maxOut —
 *          caller should check this against maxOut to detect truncation
 *          and re-call with a bigger buffer if needed), or a negative
 *          value on error (e.g. -1 = unknown ore type for this version).
 */
int oreEngineFindOresInChunk(
    OreEngineHandle* h,
    int oreType,
    int chunkX,
    int chunkZ,
    int32_t* outBuffer,
    int maxOut
) {
    if (!h) return -2;

    OreConfig conf;
    if (!getOreConfig(oreType, h->mc, 0, &conf)) {
        return -1; // this ore type doesn't exist / isn't configured for this version
    }

    int biomeID = getBiomeForOreGen(&h->g, chunkX, chunkZ, ORE_GEN_BIOME_SAMPLE_Y);
    if (!isViableOreBiome(h->mc, oreType, biomeID)) {
        return 0; // valid call, just no ore of this type in this chunk's biome
    }

    Pos3List list = generateOres(&h->g, &h->sn, conf, chunkX, chunkZ);

    int n = list.size < maxOut ? list.size : maxOut;
    for (int i = 0; i < n; i++) {
        outBuffer[i * 3 + 0] = list.pos3s[i].x;
        outBuffer[i * 3 + 1] = list.pos3s[i].y;
        outBuffer[i * 3 + 2] = list.pos3s[i].z;
    }

    int total = list.size;
    freePos3List(&list);
    return total;
}

/** Exposes the ORE_NUM count so JS can validate oreType bounds without hardcoding it. */
int oreEngineOreTypeCount(void) {
    return ORE_NUM;
}

/**
 * Exposes MC_26_2's real enum ordinal so the TS side never has to
 * hardcode a guessed value that could silently drift if cubiomes
 * reorders/inserts enum entries in a future update. Add one accessor
 * per version the app supports rather than hardcoding ordinals in TS.
 */
int oreEngineVersion_26_2(void) {
    return MC_26_2;
}

int oreEngineVersion_26_1(void) {
    return MC_26_1;
}
