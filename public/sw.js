// Bripick service worker
// 지금은 "오프라인 안내 화면"만 담당한다. 페이지 이동(navigate) 요청이 네트워크 오류로
// 실패했을 때만 /offline.html을 보여주고, 그 밖의 요청(API, JS, 이미지 등)은 건드리지 않는다.
// 안내 화면을 고치면 CACHE 버전을 올려야 사용자 기기의 옛 사본이 교체된다.
const CACHE = "bripick-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("bripick-") && key !== CACHE).map((key) => caches.delete(key)),
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
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(request);
      } catch {
        const cached = await caches.match(OFFLINE_URL);
        return cached || Response.error();
      }
    })(),
  );
});
