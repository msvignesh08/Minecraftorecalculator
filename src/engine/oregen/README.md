# Status: fallback / reference only

This folder (`rng/`, `oregen/`) is the hand-written TypeScript
reimplementation from phase 1. It is **not** the production ore engine.

`src/engine/wasm/cubiomesEngine.ts` (backed by `native/cubiomes-shim/`,
which wraps the community-verified `xpple/cubiomes` library) is the real
engine — it does actual terrain/cave confirmation, which this folder
never did, and its ore-config constants come from the same verified
source rather than a hand-reconstruction.

Why keep this folder at all:
- It's a good cross-check: for one ore in one version, two independently
  built implementations agreeing is stronger evidence than either alone
  (see BUILD.md step 4 in the wasm folder).
- It's a legitimate offline-degraded fallback IF the WASM module ever
  fails to load on a given device, PROVIDED the UI clearly labels its
  output as unconfirmed-against-terrain — never silently swap to it and
  present the result as equally trustworthy.
- It documents, in working code, exactly how the Java RNG / seed
  derivation works, which is useful independent of which engine ships.

Do not extend this folder's ore database to new ores going forward —
add new ores to the wasm/cubiomes path (it's a metadata change in
oreType enum + UI, no new placement math to write or get subtly wrong).
