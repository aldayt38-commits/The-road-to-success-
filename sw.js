const CACHE = "tareeq-najah-v8";
const CORE = [
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/ai.js",
  "./js/solver.js",
  "./js/config.js",
  "./js/cloud.js",
  "./data/subjects.js",
  "./data/lessons.js",
  "./data/quizzes.js",
  "./data/dialect.js",
  "./data/pages.js",
  "./data/videos.js",
  "./data/teachers.js",
  "./assets/logo.png",
  "./manifest.webmanifest"
];

function sameOrigin(url) {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

function isNavigate(req) {
  if (req.mode === "navigate") return true;
  const acc = req.headers.get("accept") || "";
  return acc.includes("text/html");
}

async function putCopy(cache, req, res) {
  if (!res || !res.ok) return;
  try {
    await cache.put(req, res.clone());
  } catch (_) {}
}

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(
    CORE.map(async (path) => {
      try {
        const res = await fetch(path, { cache: "reload" });
        if (!res || !res.ok) return;
        await cache.put(path, res.clone());
        if (path === "./index.html") {
          await cache.put("./", res.clone());
          await cache.put(new URL("./", location.href).href, res.clone());
        }
      } catch (_) {}
    })
  );
}

async function matchCache(req) {
  const cache = await caches.open(CACHE);
  const url = new URL(req.url);
  const tries = [
    req,
    { request: req, options: { ignoreSearch: true, ignoreVary: true } },
    url.href,
    url.pathname,
    url.pathname.replace(/\/$/, "/index.html"),
    url.pathname.endsWith("/index.html") ? url.pathname.slice(0, -10) : "",
    "./index.html",
    "./"
  ];
  for (const t of tries) {
    if (!t) continue;
    try {
      const hit =
        t.request
          ? await cache.match(t.request, t.options)
          : await cache.match(t, { ignoreSearch: true, ignoreVary: true });
      if (hit) return hit;
    } catch (_) {}
  }
  const keys = await cache.keys();
  const path = url.pathname.replace(/\/+$/, "") || "/";
  for (const k of keys) {
    let kp = "/";
    try {
      kp = new URL(k.url).pathname.replace(/\/+$/, "") || "/";
    } catch (_) {}
    if (kp === path || kp === path + "/index.html" || kp + "/index.html" === url.pathname) {
      const hit = await cache.match(k);
      if (hit) return hit;
    }
  }
  return null;
}

self.addEventListener("install", (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (!sameOrigin(req.url)) return;

  e.respondWith(
    (async () => {
      const cached = await matchCache(req);
      if (cached) {
        fetch(req)
          .then((res) => {
            if (res && res.ok) caches.open(CACHE).then((c) => putCopy(c, req, res));
          })
          .catch(() => {});
        return cached;
      }

      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const c = await caches.open(CACHE);
          await putCopy(c, req, res);
        }
        return res;
      } catch (_) {
        if (isNavigate(req)) {
          return (
            (await matchCache(new Request("./index.html"))) ||
            (await caches.match("./index.html")) ||
            (await caches.match("./")) ||
            new Response("<h1>بدون نت</h1><p>افتح طريق النجاح وأنت متصل مرة واحدة.</p>", {
              status: 503,
              headers: { "Content-Type": "text/html; charset=utf-8" }
            })
          );
        }
        return new Response("", { status: 503, statusText: "offline" });
      }
    })()
  );
});
