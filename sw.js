const CACHE = 'patchspan-v2';
const FILES = ['./', 'index.html', 'src/app.js', 'src/fit.js', 'src/geometry.js', 'src/patterns.js', 'src/print.js', 'src/vision.js', 'src/style.css', 'assets/logo.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
