/* طريق النجاح — كاش محلي للموقع */
const CACHE = "tareeq-najah-v2";
const CORE = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/ai.js",
  "./js/solver.js",
  "./data/subjects.js",
  "./data/lessons.js",
  "./data/quizzes.js",
  "./data/dialect.js",
  "./data/pages.js",
  "./data/videos.js",
  "./data/teachers.js",
  "./assets/logo.png",
  "./assets/hero.png",
  "./assets/chat-tutor.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.ok && url.pathname.indexOf("/assets/") !== -1) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
