import { defineConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// Every emitted asset is precached; a new content hash creates an isolated cache.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [{ name: 'replog-offline', closeBundle() {
    const base = process.env.VITE_BASE_PATH || '/';
    writeFileSync('dist/manifest.webmanifest', JSON.stringify({name:'RepLog — Workout & Notes',short_name:'RepLog',id:base,start_url:base,scope:base,display:'standalone',background_color:'#f7f8f3',theme_color:'#234e3d',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}]}));
    const assets = readdirSync('dist', { recursive: true }).filter(f => statSync(join('dist',f)).isFile() && !f.endsWith('.map') && f!=='sw.js').map(f=>f.replaceAll('\\','/'));
    const hash = createHash('sha256');
    for (const f of assets) hash.update(readFileSync(join('dist',f)));
    const prefix = 'replog-' + encodeURIComponent(base) + '-';
    const cache = prefix + hash.digest('hex').slice(0,12);
    writeFileSync('dist/sw.js', `const CACHE=${JSON.stringify(cache)},BASE=${JSON.stringify(base)}; const ASSETS=${JSON.stringify(assets.map(f=>base+f).concat(base))};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(${JSON.stringify(prefix)})&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.startsWith(BASE))return; e.respondWith(caches.open(CACHE).then(async c=>{if(e.request.mode==='navigate')return (await c.match(BASE+'index.html'))||fetch(e.request);return (await c.match(e.request))||fetch(e.request);}));});`);
  }}],
  test: { environment: 'jsdom', setupFiles: ['./src/test-setup.js'], include: ['src/**/*.test.{js,jsx}'] }
});
