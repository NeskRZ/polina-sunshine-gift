const CACHE='polina-universe-v36';
const CORE=['./','./index.html','./manifest.webmanifest','./assets/icon.svg','./assets/cinema.webp','./assets/newyear.webp'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  // Sasha's standalone gift page must always come from the latest GitHub Pages deployment.
  // Do not let the root PWA's cache-first handler serve an obsolete /sasha/ document.
  if(/\/sasha(?:\/|$)/.test(url.pathname))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}
    return response;
  }).catch(()=>caches.match('./index.html'))));
});