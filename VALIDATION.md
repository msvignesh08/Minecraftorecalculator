# Release validation

- Production TypeScript/Vite build: passed.
- Offline PWA precache: 42 entries, including both WASM engines, textures and Bedrock rule/tag data.
- Native WebAssembly: real Java and Bedrock maps exercised in Overworld, Nether and End; repeatability and valid biome IDs checked.
- All eleven Java ore groups and eight Bedrock Overworld groups execute; bounds, duplicate removal, supported-version gates and full 64-bit seed limits checked.
- MT19937 reference vector checked. The Cubiomes seed-262 mushroom-fields reference matched at (0,63,0).
- Existing map-coordinate and gesture suites pass, including negative chunk coordinates and repeated pinch anchoring.
- Standalone worker JavaScript syntax checked.
- Browser visual/end-to-end testing and physical Android installation were not performed. In-game ore accuracy remains unverified; candidates are explicitly labelled.

Reproduce engine and transform checks with `npm test`. Standard build: `npm ci && npm run build`. See native/atlas/provenance.json for pinned engine revisions and compiler. No signing keys or credentials are present in the repository.

## Upload verification — 2026-09-13

Rechecked from a separate clone of upstream main at `253dce28b9a9e0f3822fbb6a0b4a820056a76d26`, using Node 24.19.0 and npm 10.9.4 with both committed lockfiles:

- Standalone app: `npm ci`, `npm test`, and `npm run build` passed; PWA generated 42 precache entries.
- Android web UI: `npm ci`, `npm test`, `npm run test:crew`, and `npm run build` passed. All 41 newly built files byte-match the supplied Android assets.
- Backend: `node --test backend/server.test.mjs` passed, including two-client authorization, pin sharing, restart persistence, and session invalidation.
- Backend and both worker entry points passed JavaScript syntax checks.
- Supplied APK: ZIP integrity passed; all 49 packaged assets byte-match the supplied Android assets; no private-key filenames found in the APK.
- APK SHA-256: `dfb65d769ddd11fbd17d482c28fbef0d63c2262e8e19ae132558fdc824ac9fed`.
- Private-key/credential filename and common secret-pattern scans found no matches in the supplied files. Dependency folders, signing material, and backend runtime data are excluded by `.gitignore`.

The native Android build and cryptographic APK signature verification were not rerun for this upload because the Android SDK is unavailable on this host. Earlier signature assertions above and in Android documentation are supplied release notes, not new verification. Physical phone, browser visual, public backend deployment, and in-game accuracy checks remain unperformed. The backend is uploaded as source only. Third-party license files are retained verbatim, including their original end-of-file whitespace.
