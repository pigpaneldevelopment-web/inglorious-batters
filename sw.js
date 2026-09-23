// The build replaces this token with a hash of the public application files.
const CACHE = "inglorious-batters-__BUILD_VERSION__";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./seed-lineup.json",
  "./src/app.js",
  "./src/model.js",
  "./src/pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
];
const urls = ASSETS.map((path) => new URL(path, self.registration.scope).href);
self.addEventListener("install", (event) => {
  // Let an existing game session finish before a new version activates.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(urls)));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("inglorious-batters-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  url.search = "";
  // Only the public app shell is cached. MLB responses and private paths are never intercepted.
  if (!urls.includes(url.href)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(url.href)) || fetch(event.request);
    })(),
  );
});
