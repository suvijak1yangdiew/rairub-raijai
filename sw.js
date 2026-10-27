// เก็บไฟล์ของแอปไว้ในเครื่อง เพื่อให้เปิดได้ตอนไม่มีเน็ต
// ถ้ามีเน็ตจะโหลดไฟล์ล่าสุดเสมอ (แอปจะอัปเดตเองเมื่อแก้ไฟล์บน GitHub)
const CACHE = "rairub-raijai-v1";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];
// รอเน็ตไม่เกินเท่านี้ ถ้าช้ากว่านี้ใช้ไฟล์ที่เก็บไว้ไปก่อน
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(event, request));
});

async function networkFirst(event, request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  // โหลดจากเน็ตต่อเบื้องหลังแม้จะตอบด้วยไฟล์ในเครื่องไปแล้ว
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const response = await Promise.race([network, timeout]);
    if (response) return response;
  } catch (error) {
    // ไม่มีเน็ต ใช้ไฟล์ในเครื่องแทน
  }

  const cached = await cache.match(request, { ignoreSearch: true })
    ?? (request.mode === "navigate" ? await cache.match("./index.html") : undefined);
  return cached ?? network;
}
