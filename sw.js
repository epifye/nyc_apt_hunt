const CACHE = 'map-tiles-v1';
const TILE_HOST = 'basemaps.cartocdn.com';

// Cache tile responses as they're fetched
self.addEventListener('fetch', event => {
  if (!event.request.url.includes(TILE_HOST)) return;
  event.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        });
      })
    )
  );
});

// Prefetch NYC tiles at zoom 10-13 on install
function latLngToTile(lat, lng, z) {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, z));
  const sinLat = Math.sin(lat * Math.PI / 180);
  const y = Math.floor((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * Math.pow(2, z));
  return { x, y };
}

// NYC bounding box
const NYC = { n: 40.92, s: 40.47, e: -73.70, w: -74.26 };
const SUBDOMAINS = ['a', 'b', 'c', 'd'];

function buildTileUrls(minZoom, maxZoom) {
  const urls = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    const nw = latLngToTile(NYC.n, NYC.w, z);
    const se = latLngToTile(NYC.s, NYC.e, z);
    for (let x = nw.x; x <= se.x; x++) {
      for (let y = nw.y; y <= se.y; y++) {
        const sub = SUBDOMAINS[(x + y) % SUBDOMAINS.length];
        urls.push(`https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`);
      }
    }
  }
  return urls;
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      const urls = buildTileUrls(10, 13);
      // Fetch in small batches to avoid hammering the CDN
      const batchSize = 20;
      const batches = [];
      for (let i = 0; i < urls.length; i += batchSize) {
        batches.push(urls.slice(i, i + batchSize));
      }
      return batches.reduce((chain, batch) =>
        chain.then(() =>
          Promise.allSettled(batch.map(url =>
            fetch(url).then(res => { if (res.ok) cache.put(url, res); })
          ))
        ),
        Promise.resolve()
      );
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
