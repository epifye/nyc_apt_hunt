// Cleanup-only service worker. This used to prefetch + cache CARTO *raster*
// basemap tiles (cache 'map-tiles-v1'). CARTO now requires an API key, so those
// tiles are "API KEY REQUIRED" placeholders, and the map renders keyed MapLibre
// GL *vector* tiles instead. We keep a minimal SW purely to evict the stale cache
// from browsers that installed the old one, and we intercept no requests — tiles
// go straight to the network (MapLibre caches them in memory per session).
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await caches.delete('map-tiles-v1'); // reclaim the stale raster-tile cache
      await self.clients.claim();
    })(),
  );
});
