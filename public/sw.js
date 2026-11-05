// Bripick service worker
//
// 하는 일
// 1. 에디터(/editor) 화면: 늘 서버에서 새로 받고(network-first), 받을 때마다 사본을 저장한다.
//    인터넷이 끊기면 마지막 사본을 보여준다. 그래서 온라인 사용자는 항상 최신 화면을 본다.
// 2. /_next/static/* (빌드할 때마다 이름이 바뀌는 JS·CSS·폰트): 한 번 받으면 저장해 두고 재사용한다.
//    오래된 빌드 파일은 개수 한도(STATIC_LIMIT)를 넘으면 먼저 들어온 것부터 지운다.
// 3. 이미지·외부 웹폰트: 저장본을 먼저 보여주고 뒤에서 새로 받아 바꿔 둔다.
// 4. 그 밖의 페이지 이동이 실패하면 /offline.html 안내 화면.
// API(/api), 로그인(/auth), GET이 아닌 요청은 절대 건드리지 않는다.
//
// 캐시 구조를 바꾸면 VERSION을 올린다. 옛 캐시는 activate 때 지워진다.
const VERSION = "v2";
const OFFLINE_CACHE = `bripick-offline-${VERSION}`;
const PAGE_CACHE = `bripick-pages-${VERSION}`;
const STATIC_CACHE = `bripick-static-${VERSION}`;
const ASSET_CACHE = `bripick-assets-${VERSION}`;
const CACHES = [OFFLINE_CACHE, PAGE_CACHE, STATIC_CACHE, ASSET_CACHE];

const OFFLINE_URL = "/offline.html";
const EDITOR_URL = "/editor";
const STATIC_LIMIT = 300;
const ASSET_LIMIT = 120;
// 에디터 화면에 바로 보이는 이미지. 설치 때 미리 받아 둔다.
const PRECACHE_ASSETS = [
  "/bripick_header_logo_dark.svg",
  "/bripick_header_logo_light.svg",
  "/bripick_logo.svg",
  "/profile_default.png",
  "/icon.svg",
];
const FONT_HOSTS = new Set(["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const offline = await caches.open(OFFLINE_CACHE);
      await offline.add(new Request(OFFLINE_URL, { cache: "reload" }));
      // 에디터를 아직 열어본 적 없어도 오프라인에서 열리도록 미리 받아 둔다. 실패해도 설치는 계속.
      try {
        const assets = await caches.open(ASSET_CACHE);
        await Promise.allSettled(PRECACHE_ASSETS.map((path) => assets.add(path)));
        await precacheEditor();
      } catch {
        // 다음에 온라인으로 에디터를 열 때 저장된다.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("bripick-") && !CACHES.includes(key)).map((key) => caches.delete(key)),
      );
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/"))) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event, url));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, STATIC_LIMIT));
    return;
  }

  // Next 내부 데이터 요청(RSC)은 캐시하지 않는다. 실패하면 Next가 일반 페이지 이동으로 바꿔 준다.
  if (sameOrigin && (url.searchParams.has("_rsc") || request.headers.get("RSC"))) return;

  if ((sameOrigin && (request.destination === "image" || request.destination === "font")) || FONT_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(event, request, ASSET_CACHE, ASSET_LIMIT));
  }
});

async function handleNavigation(event, url) {
  const isEditor = url.origin === self.location.origin && url.pathname === EDITOR_URL;
  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(event.request));
    if (isEditor && response.ok && response.type === "basic") {
      const copy = response.clone();
      event.waitUntil(storeEditorPage(copy));
    }
    return response;
  } catch {
    if (isEditor) {
      const cachedEditor = await caches.match(EDITOR_URL, { cacheName: PAGE_CACHE });
      if (cachedEditor) return cachedEditor;
    }
    const offline = await caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE });
    return offline || Response.error();
  }
}

// 에디터 HTML이 쓰는 JS·CSS를 먼저 받아 두고, 전부 받았을 때만 HTML 사본을 바꾼다.
// (일부만 받은 채 HTML을 바꾸면 오프라인에서 깨진 화면이 열릴 수 있다.)
async function storeEditorPage(response) {
  const html = await response.clone().text();
  const complete = await cacheStaticFrom(html);
  if (!complete) return;
  const pages = await caches.open(PAGE_CACHE);
  await pages.put(EDITOR_URL, response);
}

async function precacheEditor() {
  const response = await fetch(EDITOR_URL, { cache: "reload", credentials: "same-origin" });
  if (!response.ok || response.redirected) return;
  await storeEditorPage(response);
}

async function cacheStaticFrom(html) {
  const urls = new Set();
  const pattern = /\/_next\/static\/[^"'\s)\\]+/g;
  let match;
  while ((match = pattern.exec(html))) urls.add(match[0]);

  const cache = await caches.open(STATIC_CACHE);
  const results = await Promise.all(
    [...urls].map(async (path) => {
      if (await cache.match(path)) return true;
      try {
        const res = await fetch(path);
        if (!res.ok) return false;
        await cache.put(path, res);
        return true;
      } catch {
        return false;
      }
    }),
  );
  await trimCache(STATIC_CACHE, STATIC_LIMIT);
  return results.every(Boolean);
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    void trimCache(cacheName, limit);
  }
  return response;
}

async function staleWhileRevalidate(event, request, cacheName, limit) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === "opaque") {
        await cache.put(request, response.clone());
        void trimCache(cacheName, limit);
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const response = await network;
  return response || Response.error();
}

// 먼저 들어온 항목부터 지워 개수를 한도 안으로 맞춘다.
async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - limit;
  for (let index = 0; index < extra; index += 1) {
    await cache.delete(keys[index]);
  }
}
