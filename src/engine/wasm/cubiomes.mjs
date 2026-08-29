/**
 * cubiomes.mjs (PLACEHOLDER)
 *
 * This file exists only so the production build succeeds before
 * native/cubiomes-shim/BUILD.md has actually been run. Real emcc output
 * (with the same filename) OVERWRITES this file — do not hand-edit it
 * beyond this stub.
 *
 * Rejecting here (rather than the build failing to resolve a missing
 * file) is what lets oreCalculator.ts's existing try/catch in
 * getEngine() do its job: cleanly fall back to the labeled-unconfirmed
 * path instead of the whole app being unbuildable/unusable until
 * someone completes the native build step.
 */
export default function CubiomesModule() {
  return Promise.reject(
    new Error(
      'cubiomes-wasm not built yet — run native/cubiomes-shim/BUILD.md to replace this placeholder with the real compiled module.'
    )
  );
}
