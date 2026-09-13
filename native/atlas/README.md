# Compiled engine and original integration

The shipped `public/engine/atlas-*.js` and `.wasm` are actual compiled engines, not placeholders. The original worker, map renderer and Bedrock placement model are project code. Java calculations and maps use MIT Cubiomes forks; see provenance.json for exact commits and retained licences. The old placeholder engine and misleading terrain-confirmation documentation were removed.

To reproduce: install Emscripten 4.0.15, clone both repositories in provenance.json, check out their exact commits, and set EMCC to emcc.py, JAVA_SOURCE and BEDROCK_SOURCE to those checkouts. In Bedrock finders.c add a no-op statement after `case Ocean_Ruin:` and `case Trial_Chambers:` so C declarations are accepted by Clang. Run `python3 native/atlas/build.py`. Compiled assets are checked in so normal web builds need no C compiler.

`shim.c` owns version mapping, 64-bit seed assembly, memory ownership, biome tiles, structure searches and all eleven Java ore-group bindings. `generateOres` already checks biome at each placement. An additional fixed-Y chunk-centre prefilter would wrongly discard cave-specific deposits and is deliberately absent.

All results remain unconfirmed: upstream ore.c explicitly contains TODOs for terrain replacement and air exposure. Approximate surface height and biome checks do not close these gaps. Large noise iron/copper veins are outside this model. Nether quartz/gold groups include ordinary and basalt-deltas rules. Emerald and badlands gold depend on biome.

`public/engine/bedrock.js` is an original MT19937/FNV-rule-stream placement model. Parameters and biome tags were extracted from Mojang's official 1.26.45.1 server, applying non-experimental vanilla overrides. It samples documented rule distributions and returns vein-centre search targets. Its RNG stream assumptions, biome-name mapping and +8 horizontal centre offset are experimental and have not been verified in-game. No Java ore routine is substituted for Bedrock. The 26.45 biome model maps to the fork's 26.40.27 model explicitly; this is disclosed in-app.

Bedrock Nether ores are not implemented. They are present in the resource picker and mining guide with a clear unsupported search result. Other Bedrock map versions do not silently inherit 26.45 ore rules. The previously implemented 26.20 diamond rule model is retained as experimental only.

Workers keep expensive native calculations off the UI thread. Cancelling a scan terminates its dedicated worker. Map and search workers have separate heaps. Native buffers are released on success/error. Search caps (128-block radius and 6000 candidates) bound work; truncation is reported. Deduplication and horizontal circular filtering happen before output. Structure maps cap at 512 starts and suppress searches over 32768 blocks.
