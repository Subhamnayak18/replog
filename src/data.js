export const PARTS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full body'];
export const COLORS = ['sage', 'butter', 'rose', 'lavender', 'sky'];
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export function validDate(s) { return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s; }
export function validateRecord(r, type) {
  if (!r || typeof r!=='object' || typeof r.id!=='string' || !r.id.length || r.id.length>100 || typeof r.updatedAt!=='string' || isNaN(Date.parse(r.updatedAt))) throw new Error('Invalid record identity or timestamp.');
  if(type==='workouts') {
    if (!PARTS.includes(r.part) || typeof r.exercise!=='string' || !r.exercise.trim() || r.exercise.length>120 || !Number.isFinite(r.weight) || r.weight<0 || r.weight>10000 || !Number.isInteger(r.reps) || r.reps<1 || r.reps>10000 || !validDate(r.date)) throw new Error('Invalid workout. Check exercise, body part, weight, reps and date.');
    return {id:r.id,updatedAt:r.updatedAt,part:r.part,exercise:r.exercise.trim(),weight:r.weight,reps:r.reps,date:r.date};
  }
  if (typeof r.title!=='string' || !r.title.trim() || r.title.length>120 || typeof r.body!=='string' || r.body.length>20000 || !COLORS.includes(r.color)) throw new Error('Invalid note title, body or color.');
  return {id:r.id,updatedAt:r.updatedAt,title:r.title.trim(),body:r.body,color:r.color};
}
export function parseBackup(text) {
  const b=JSON.parse(text);
  if (!b || b.app!=='RepLog' || b.version!==1 || !Array.isArray(b.workouts) || !Array.isArray(b.notes) || b.workouts.length+b.notes.length>100000) throw new Error('Unsupported backup. Choose a RepLog version 1 JSON export.');
  const result={workouts:b.workouts.map(r=>validateRecord(r,'workouts')),notes:b.notes.map(r=>validateRecord(r,'notes'))};
  for(const records of Object.values(result)) if(new Set(records.map(r=>r.id)).size!==records.length) throw new Error('Duplicate IDs in backup. Nothing was imported.');
  return result;
}
let connection;
export function openDB() {
  if(!connection) connection = new Promise((resolve,reject)=>{
    const request=indexedDB.open('replog-v1',1);
    request.onupgradeneeded=()=>{for(const store of ['workouts','notes'])request.result.createObjectStore(store,{keyPath:'id'});};
    request.onsuccess=()=>{const db=request.result; db.onversionchange=()=>{db.close();connection=undefined;};resolve(db);};
    request.onerror=()=>{connection=undefined;reject(request.error);};
    request.onblocked=()=>{connection=undefined;reject(new Error('Close other RepLog tabs and try again.'));};
  });
  return connection;
}
export async function readAll() {
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['workouts','notes'],'readonly');
    const workouts=tx.objectStore('workouts').getAll(),notes=tx.objectStore('notes').getAll();
    tx.oncomplete=()=>resolve({workouts:workouts.result,notes:notes.result}); tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export async function saveRecord(type, record) {
  const value=validateRecord(record,type), db=await openDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(type,'readwrite');tx.objectStore(type).put(value);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function deleteRecord(type,id) {
  const db=await openDB();
  return new Promise((resolve,reject)=>{const tx=db.transaction(type,'readwrite');tx.objectStore(type).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}
export async function importBackup(text) {
  const incoming=parseBackup(text), db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(['workouts','notes'],'readwrite');
    for(const type of ['workouts','notes'])for(const r of incoming[type]){
      const s=tx.objectStore(type),q=s.get(r.id);
      q.onsuccess=()=>{if(!q.result || Date.parse(r.updatedAt)>Date.parse(q.result.updatedAt))s.put(r);};
    }
    tx.oncomplete=()=>resolve(incoming);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
export const makeBackup=data=>JSON.stringify({app:'RepLog',version:1,exportedAt:new Date().toISOString(),...data},null,2);
export function exerciseHistory(workouts,part,name) {return workouts.filter(w=>w.part===part&&w.exercise.trim().toLowerCase()===name.trim().toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));}
