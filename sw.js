// Life Partner — オフラインでも開けるように
// プログラム（html・js・css）は、まずネットから最新を取りにいく（電波がないときだけ控えを使う）
// 絵は、一度読んだら控えから出す（速いので）
const CACHE = 'life-partner-v3-1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('life-partner') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // GASや天気はそのまま
  if (/\.(jpe?g|png|webp)$/i.test(u.pathname)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; })));
    return;
  }
  e.respondWith(fetch(e.request, { cache:'no-cache' }).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return res; })
    .catch(() => caches.match(e.request, { ignoreSearch:true })));
});
