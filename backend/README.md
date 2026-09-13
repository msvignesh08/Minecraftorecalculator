# Ore Atlas Crew backend

This is a runnable backend, not an already-hosted service. Ore Atlas 6.0 needs this server's public HTTPS address before live rooms work. Offline maps and setup QR sharing need no backend.

## Deploy on a server with Docker
Point a domain's DNS at your server and allow inbound ports 80/443. Set CREW_DOMAIN to that hostname and run:

    CREW_DOMAIN=crew.your-domain.example docker compose up -d --build

Caddy provides HTTPS. Keep the crew-data and caddy-data volumes. In the APK, open Crew > Live room, enter https://crew.your-domain.example and your player name, then Create live room. Friends can scan your room QR or paste your room invitation. Both need Ore Atlas 6.0. The invitation includes the server address, so guests don't retype it.

For development: Node 20+; npm test; npm start. The default port is 8080. The Android app requires HTTPS for remote servers. GET /health returns service/version.

## Behavior and limits
Up to 24 participants and 500 pins per room. Clients poll every three seconds while foregrounded. Presence becomes offline after 30 seconds without a poll. Stale participant sessions are removed during joins after 12 hours. Rooms expire after seven days of inactivity. Pins and room sessions persist in a JSON file with atomic replacement, on one server process; do not run multiple replicas against this file. Default capacity is 1,000 rooms. This is a small-group backend, not a production service with an uptime guarantee.

The server stores seeds, player display names, shared pins, and hashed invitation/session tokens. Anyone with an invitation may join. Session tokens stay in app-private preferences and are not placed in QR codes. Only a pin's creator can remove it. Creating a room is public and rate limited; for wider deployment add gateway quotas and operational monitoring. TLS is required outside local development. Do not log Authorization headers or invitation bodies. No access logs are enabled here.

The app shows room presence and manually shared pins. It does not connect to Minecraft servers, read player coordinates from the game, or synchronize local-only pins automatically. Shared pins appear only when the app is viewing the room's matching seed, edition, version, and dimension. Use “Load room's world” after joining, then select a map point and “Share with crew.”

Tests exercise two participants, invitation/session rejection, pin synchronization and removal ownership, persistence across restart, departure and input bounds. Public deployment and real phone-to-phone testing have not been performed.
