const CACHE='kyogishi-v0.8.0';
const ASSETS=['./','./index.html','./history-reference.js?v=0.8.0','./history-view.js?v=0.8.0','./career-stats.js?v=0.8.0','./title-series-reference.js?v=0.8.0','./career-title-series.js?v=0.8.0','./head-to-head.js?v=0.8.0','./a20-reconstruction.js?v=0.8.0','./a21-reconstruction.js?v=0.8.0','./shikitei-reference.js?v=0.8.0','./shikitei-view.js?v=0.8.0','./confirmed-person-names.js?v=0.8.0','./title-history.js?v=0.8.0','./title-series-view.js?v=0.8.0','./history-style.css?v=0.8.0','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('kyogishi-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;
 if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
