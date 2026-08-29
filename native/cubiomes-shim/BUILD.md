# Building the ore engine to WebAssembly

This has to be run outside this chat's sandbox — the sandbox's network
allowlist doesn't include Emscripten's toolchain CDN, so `emcc` can't be
installed here. Everything below is a standard build on a normal dev
machine or in CI (e.g. a GitHub Actions job with
`mymindstorm/setup-emsdk`).

## 1. Get the sources

```bash
git clone https://github.com/xpple/cubiomes.git native/cubiomes
# shim.c in this folder is already written against cubiomes' real headers
# (features/ore.h, generator.h, biomenoise.h) — see shim.c's header comment.
```

## 2. Install Emscripten (one-time, on your machine/CI — not here)

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

## 3. Compile

cubiomes is a plain C library (no build system dependency beyond a
Makefile) — compile its .c files together with shim.c directly:

```bash
emcc \
  native/cubiomes/*.c \
  native/cubiomes/features/ore.c \
  native/cubiomes-shim/shim.c \
  -I native/cubiomes \
  -O3 \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s EXPORT_NAME=CubiomesModule \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_oreEngineCreate","_oreEngineDestroy","_oreEngineFindOresInChunk","_oreEngineOreTypeCount","_oreEngineVersion_26_1","_oreEngineVersion_26_2","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAP32","getValue"]' \
  -o src/engine/wasm/cubiomes.mjs
```

This produces two files:
- `src/engine/wasm/cubiomes.mjs` — the JS glue/loader
- `src/engine/wasm/cubiomes.wasm` — the compiled module

Both need to ship in the app bundle (and be cached by the service worker
per the offline requirements — see the PWA phase of the architecture).

## 4. Do NOT skip this — validate before trusting output

`oreEngineFindOresInChunk`'s `y`-parameter handling for
`getBiomeForOreGen` is flagged as unverified in shim.c's header comment.
Before wiring this into the app for real:

1. Build a tiny CLI test (`native/cubiomes/example.c` in the repo has
   patterns to copy) that calls the same functions natively (not via
   WASM) for a known seed/chunk.
2. Compare that native output against this WASM build's output for the
   identical seed/chunk — they should match exactly since it's the same
   source compiled two ways. This isolates "did the WASM build/bindings
   introduce a bug" from "is the underlying algorithm right."
3. Separately, spot-check a few resulting coordinates against a seed you
   can actually load in real Minecraft 26.2, at least for one ore type,
   to close the loop on real-game accuracy.

## 5. Wire it in

`src/engine/wasm/cubiomesEngine.ts` already expects exactly the files
this produces — see that file for the loading/calling code. Nothing
else in the app needs to change; `oreCalculator.ts` should be updated to
call `CubiomesEngine` instead of the hand-written `veinPlacer.ts` once
step 4 above passes.
