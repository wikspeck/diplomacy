import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8787';
let cookie='';let current;
async function call(path,body){const res=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:res.status,data:await res.json()};}
let result=await call('state');assert.equal(result.status,200);current=result.data;assert.equal(Object.keys(current.state.countries).length,22);
let reply=await call('restart',{version:current.version,seed:91});assert.equal(reply.status,200);current=reply.data;
const initial=current.version;
reply=await call('step',{version:initial});assert.equal(reply.status,200);current=reply.data;assert.ok(current.state.progress);const progressed=current.state.progress.index;
reply=await call('step',{version:initial});assert.equal(reply.status,200);assert.equal(reply.data.version,current.version);assert.equal(reply.data.state.progress.index,progressed);assert.equal(reply.data.conflict,true);
const resumed=await call('state');assert.equal(resumed.data.state.progress.index,progressed);
const parallel=await Promise.all([call('step',{version:current.version}),call('step',{version:current.version})]);const success=parallel.find(r=>r.status===200&&!r.data.conflict);assert.ok(success);current=success.data;assert.ok(parallel.some(r=>r.status===409||r.data.conflict));
let requests=0;while(current.state.progress){assert.ok(requests++<25);reply=await call('step',{version:current.version});assert.equal(reply.status,200);current=reply.data;}
assert.equal(current.state.turn,1);assert.equal(current.state.decisions.length,22);assert.ok(current.state.decisions.every(d=>d.source==='fallback'));assert.equal(current.state.usage.calls,0);
reply=await call('save',{version:current.version});assert.equal(reply.status,200);current=reply.data;const saved=JSON.stringify(current.state);
const saves=await call('saves');assert.ok(saves.data.saves.some(s=>s.slot==='manual'));assert.ok(saves.data.saves.some(s=>s.slot==='turn-1'));
reply=await call('restart',{version:current.version});current=reply.data;assert.equal(current.state.turn,0);
reply=await call('load',{version:current.version,slot:'manual'});assert.equal(reply.status,200);current=reply.data;assert.equal(JSON.stringify(current.state),saved);
const invalid=await call('settings',{version:current.version,settings:{...current.state.settings,llmCountries:['fabricated']}});assert.equal(invalid.status,400);
const other=await fetch(base+'/api/state').then(r=>r.json());assert.equal(other.state.turn,0);
const crossOrigin=await fetch(base+'/api/step',{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({version:current.version})});assert.equal(crossOrigin.status,403);
console.log('PASS: API boot, 22 nations, resumable turn, stale retry, concurrent step exclusion, local fallback labeling, D1 manual and automatic snapshots, exact load, invalid settings, session isolation, origin checks.');
