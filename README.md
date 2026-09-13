# Ore Atlas by Vignesh

A Minecraft seed explorer for the web, built around the original repository's stone palette, depth guidance and map workspace. Features actual Minecraft ore textures, Java/Bedrock biome maps, structure starts, candidate ore searches, coordinate copying, saved pins, hidden candidates, CSV export and an installable offline PWA.

**This is an unofficial community tool. Candidate locations are not guaranteed ore blocks.**

## Android Blue Crew 6.0

[Download the Android APK](releases/Ore-Atlas-Blue-Crew.apk?raw=true). Android source is in `android/`; the standalone web app remains at the repository root. The Android edition restores the blue/dark map-first UI and adds camera QR scanning, setup links, and live Crew room invitations.

The Crew backend in `backend/` supports player presence and manually shared pins. **It is not deployed by this repository update.** Deploy it behind HTTPS using `backend/README.md`, then enter the server address under Crew → Live room. Shared rooms send the room seed, player names and shared pins to that server. This does not join Minecraft servers or read player positions from the game.

Android build: SDK platform 34 + build-tools 34.0.0, Java 17, then `ANDROID_SDK_ROOT=... python android/build.py`. Use `ECJ_JAR` if javac is unavailable. UI changes: install dependencies and build in `android/web`, replace `android/app/src/main/assets` with its `dist` output, then package the APK. The original private signing key is intentionally excluded: a locally generated key cannot update over the downloadable APK without uninstalling it first.

Backend two-client integration tests and room QR validation passed. APK signature and packaged assets were checked. Physical phone camera/networking and visual runtime testing remain pending.

## Support

| Edition | Maps | Candidate ore searches |
| --- | --- | --- |
| Java 26.2, 26.1, 1.21.11, 1.21.1 | Overworld, Nether, End | Diamond, iron, gold, redstone, lapis, copper, coal, emerald, ancient debris, Nether quartz and Nether gold |
| Bedrock 26.45 | Experimental, using the upstream 26.40.27 map model | Experimental placement centres for all eight Overworld ores |
| Bedrock 26.20 | All dimensions | Experimental diamond placement centres |
| Bedrock 26.30, 1.21.60 | All dimensions | Maps only |

Bedrock Nether ore prediction remains unavailable; all three resources have mining guidance and an explicit unsupported state. Deepslate textures are included but are not a separate ore-generation rule or a confirmation of the host block. Large iron/copper noise veins, exact caves, air rejection, mined blocks and upgraded chunks are not simulated. The End has no supported ore resources. Amethyst geodes are structures, not a conventional ore layer, and are not included.

Java's compiled ore library includes approximate height and per-placement biome checks, but its own source still skips some replacement and air-exposure logic. No in-game accuracy validation has been completed. Bedrock is an original rule-placement model, not a Java fallback. See native/atlas/README.md for exact limitations and provenance.

## Use

Choose the actual edition and version, select a resource and enter your seed. Java accepts numeric or text seeds; Bedrock uses the numeric seed from world settings. Numeric seeds outside the signed 64-bit range are rejected rather than silently wrapped. Set centre coordinates, radius and Y range, then search. Drag/pinch the map, change layers, select a candidate and copy coordinates or save a pin. Pins are device-local and scoped to seed/edition/version/dimension.

The first visit requires network access. The PWA caches the app, textures, WebAssembly and rule data for later offline use. Browser storage clearing removes local pins and cached files. The standalone web app does not send seeds or coordinates to a server. Android live rooms send their explicitly shared data to the configured backend. GitHub Pages deploys this app from main using the included workflow; Sites can host the same relative-path build.

## Develop and verify

Node 22: `npm ci`, `npm run dev`, `npm test`, `npm run build`.

Tests exercise real compiled WASM for Java/Bedrock maps in all dimensions, all eleven Java groups and eight Bedrock groups, seed boundaries, standard MT19937 vectors, candidate filtering and deduplication, map transforms and gestures. They do not establish in-game accuracy. Browser visual QA and physical Android installation were not performed for this release.

The original commit history is retained; this version replaces the active app. Source credits and repository access are separate. Required Mojang and open-source notices remain in the app and public/credits.txt. No APK signing key, private credential, SDK or node_modules is included in this public repository.

## Credits

Project owner: M S Vignesh. UI and integration are project code; native maps/Java candidate calculations use xpple/Cubiomes and FragrantResult186/Cubiomes Bedrock under MIT. Actual game textures are © Mojang AB from Mojang/bedrock-samples and remain subject to the Minecraft EULA. See public/textures/sources.json and native/atlas/provenance.json. Not affiliated with or approved by Mojang, Microsoft or Chunkbase.
