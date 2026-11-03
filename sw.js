// Life Partner — オフラインでも開けるように（中身を直したら CACHE の番号を上げる）
const CACHE = 'life-partner-noa-v3';
const CORE = ['./', 'index.html', 'base.css', 'core.js', 'noa.js', 'data.js', 'input.js', 'talk.js', 'home.js', 'desk.js', 'clinic.js', 'bank.js', 'vault.js', 'room.js', 'lock.js', 'app.js', 'manifest.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('life-partner') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // GASや天気はそのまま
  // 絵は、あればキャッシュ。なければ（404）そのまま返す
  e.respondWith(caches.match(e.request, { ignoreSearch:true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && /\.(jpe?g|png|webp)$/i.test(u.pathname)) { const c = res.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }
    return res;
  })));
});
