// Tests the actual generated worker in an isolated JavaScript environment.
// This is not a substitute for device-specific install/browser testing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const manifest=JSON.parse(readFileSync('dist/manifest.webmanifest','utf8'));
const base=process.env.VITE_BASE_PATH||'/';
const source=readFileSync('dist/sw.js','utf8');
test('manifest, index and icons consistently use the deployment base',()=>{
  assert.equal(manifest.scope,base);assert.equal(manifest.start_url,base);assert.equal(manifest.id,base);
  const html=readFileSync('dist/index.html','utf8');
  for(const path of [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1])) {assert.ok(path.startsWith(base),path);assert.ok(existsSync(join('dist',path.slice(base.length))),path);}
  for(const icon of manifest.icons){const png=readFileSync(join('dist',icon.src));assert.equal(png.subarray(1,4).toString(),'PNG');const size=Number(icon.sizes.split('x')[0]);assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
test('generated worker precaches assets, serves offline navigations and isolates cache cleanup',async()=>{
  const handlers={},stores=new Map();let networkAvailable=true,claimed=false,skipped=false;
  const toPath=input=>new URL(typeof input==='string'?input:input.url,'https://replog.test').pathname;
  const caches={
    async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {
      async addAll(urls){for(const url of urls){assert.ok(url.startsWith(base));const path=toPath(url);const file=path===base?'index.html':path.slice(base.length);map.set(path,readFileSync(join('dist',file),'utf8'));}},
      async match(request){return map.get(toPath(request));}
    };},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}
  };
  const ownPrefix='replog-'+encodeURIComponent(base)+'-';
  stores.set(ownPrefix+'obsolete',new Map());stores.set('replog-other-site-retain',new Map());
  runInNewContext(source,{self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{claimed=true;}},skipWaiting:()=>{skipped=true;}},location:{origin:'https://replog.test'},URL,caches,fetch:async()=>{if(!networkAvailable)throw Error('Offline');return 'network';}});
  let pending;handlers.install({waitUntil:p=>pending=p});await pending;
  handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.ok(claimed);assert.ok(!stores.has(ownPrefix+'obsolete'));assert.ok(stores.has('replog-other-site-retain'));
  networkAvailable=false;
  const request=async(path,mode='same-origin')=>{let result;handlers.fetch({request:{url:'https://replog.test'+path,method:'GET',mode},respondWith:p=>{result=p;}});assert.ok(result,'worker handles request');return await result;};
  assert.match(await request(base,'navigate'),/<div id="root">/);
  assert.match(await request(base+'?offline-check=1','navigate'),/<div id="root">/);
  assert.match(await request(base+'manifest.webmanifest'),/RepLog/);
  const emitted=readFileSync('dist/index.html','utf8').match(/src="([^"]+\.js)"/)[1];assert.ok((await request(emitted)).length>1000);
  let intercepted=false;handlers.fetch({request:{url:'https://other.test/file',method:'GET',mode:'cors'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
  handlers.message({data:'SKIP_WAITING'});assert.ok(skipped);
});
