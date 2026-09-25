// Debug-only fixture for native upgrade cleanup; no network/precache dependencies.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
