# Ore Atlas Android 5.1 — multi-ore update

Offline Android app by Vignesh, using bundled WebAssembly engines and original compass/ore logo.

Java 26.2, 26.1, 1.21.11 and 1.21.1: diamond, iron, gold, redstone, lapis, copper, coal, emerald, ancient debris, Nether quartz and Nether gold candidate groups.
Bedrock 26.45: experimental placement centres for all eight Overworld ores. Its biome map uses the upstream 26.40.27 model. Bedrock 26.20: diamond only. Other listed Bedrock versions: maps only. Bedrock Nether ore search is unsupported.

Candidates are not confirmed world blocks. Terrain, air exposure, mined blocks and large iron/copper noise veins are not fully simulated. Use the correct edition and version.

The app serves bundled assets on an ephemeral loopback port; no hosting is required. Seeds and pins persist in Android private preferences. Coordinates copy through Android clipboard; CSV export uses the system file picker. Internet permission enables the local loopback server; cleartext access is restricted to 127.0.0.1. App navigation and content policy restrict content to bundled assets.

## Build
Install Java 17, Android SDK platform 34 and build-tools 34.0.0. Set ANDROID_SDK_ROOT. Use javac or set ECJ_JAR to Eclipse compiler. Run `python build.py` to package the bundled assets. To edit the UI, run `npm ci` and `npm run build` in web/, replace app/src/main/assets with web/dist, then run the Android build. The private development signing key preserves upgrade compatibility; do not publish it.

## Validation
Production TypeScript/Vite build passed. APK signature verified and signer matches earlier versions. Every bundled asset byte-matched the production build. Physical Android installation and WebView runtime behaviour have not been verified. A current Android System WebView is required for WebAssembly and module workers.

Third-party engine licenses and Minecraft texture attribution are included in bundled credits. This is an unofficial tool.

## Crew expeditions (5.0)
Tap Crew to show a QR or share its link. A friend with version 5.0 can open the oreatlas:// link, paste it into Join expedition, or import a QR screenshot. Imported settings are validated and shown for review. Load the expedition, then tap Scan. The seed, edition, game version, dimension, ore, coordinates, radius and Y range are shared. This is an offline setup snapshot, not live Minecraft multiplayer or synchronized pins. The QR exposes the seed to its recipient.

QR generation and image decoding round-trip tests passed for signed 64-bit seeds and both dimensions. Malformed links, unknown versions, invalid bounds and incompatible ores were rejected. TypeScript/Vite build and Android Java compilation passed; APK signature matches earlier versions. Physical Android deep-link handling, image picker, sharing and installation remain untested.

Version 5.1 requests CAMERA permission only when Scan QR is tapped. It opens a live in-app camera preview, prefers the rear camera, decodes QR frames locally, validates expedition contents and presents a review. No microphone permission is requested. Camera tracks stop on success, cancellation, leaving the scanner, or hiding the page. Screenshots and links remain available.

5.1 validation: TypeScript/Vite and Android Java builds passed; QR raster decoding and invalid-link tests passed. APK signature verified with matching update signer, assets checked against build output. Physical camera opening and scanning on Android are not device-tested.

## Version 6.0 — Blue Crew
Restores the blue/dark palette and compact world bar. Includes live room creation/joining, room QR/link scanning, foreground presence polling, private persistent session storage and explicitly shared map pins. Old offline expedition QR codes continue to work. A public HTTPS Crew backend must be deployed and entered in Crew > Live room before network features work; there is no preconfigured live server. See backend/README.md for Docker deployment and limits. This does not connect to Minecraft game servers or track game players.

Validation: production UI and Java builds passed; APK signature matches the prior app and all asset bytes match the built UI. QR invitation raster decoding and HTTPS URL validation passed. Backend integration test passed with two clients, access rejection, shared pin visibility, deletion ownership, server restart persistence and session invalidation on leave. Actual phone camera, phone-to-phone networking, visual runtime and public hosting were not tested.
