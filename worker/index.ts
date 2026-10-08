import {createGame} from '../shared/seed';
import {beginTurn,resolveTurn} from '../shared/engine';
import {agentView,fallback} from '../shared/ai';
import {decisionSchema,settingsSchema} from '../shared/validation';
import type {GameState,Decision} from '../shared/types';
interface Row {state:string;version:number;lease_until:number;}
function response(data:unknown,status=200,cookie?:string){const headers=new Headers({'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});if(cookie)headers.set('Set-Cookie',cookie);return new Response(JSON.stringify(data),{status,headers});}
export async function choose(s:GameState,c:string,env:Env,local:boolean):Promise<{decision:Decision;source:'llm'|'fallback';error?:string}>{
 const use=s.settings.llmCountries.includes(c)&&s.progress!.calls<s.settings.callBudget;
 if(!use)return {decision:fallback(s,c),source:'fallback'};
 if(local&&String(env.LOCAL_AI_ENABLED)!=='true'){s.usage.status='Local mode · deterministic fallback (remote AI disabled)';return {decision:fallback(s,c),source:'fallback',error:'Local inference disabled; no remote AI calls are made.'};}
 if(s.usage.cooldownUntil>Date.now())return {decision:fallback(s,c),source:'fallback',error:'AI temporarily unavailable; fallback active during cooldown.'};
 s.progress!.calls++;s.usage.calls++;
 const content=JSON.stringify(agentView(s,c));s.usage.estimatedTokens+=Math.ceil(content.length/4);
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  const messages=[{role:'system' as const,content:'You control one country in a seeded 1914 strategy simulation. Other countries\' private plans are unavailable. Return only JSON: {"explanation":"short public strategic summary, never private reasoning","diplomaticActions":[{"type":"message|propose_alliance|accept|reject|ultimatum|guarantee|request_access|declare_war|offer_peace|demand_territory|ceasefire|break_treaty","target":"country ID","proposalId":"only for accept/reject","region":"only for demand","message":"optional"}],"militaryActions":[{"type":"move|attack|defend|retreat|reinforce|entrench|merge|split","armyId":"own ID","targetRegion":"adjacent ID for movement","otherArmyId":"for merge"}],"economicActions":[{"type":"recruit","region":"controlled home ID","amount":1}]}. Omit optional keys when unused. Budget: 2 diplomatic, 3 military (one per army), 1 economic action. Respect alliances, war, supply and borders. Agreements require a delivered proposal and independent acceptance. No naval invasions. Choose alternative-history strategies, not predetermined outcomes.'},{role:'user' as const,content}];
  // GLM uses chat-completion output; traditional models use {response}. Normalize both.
  const result:unknown=await Promise.race([env.AI.run(s.settings.model as Parameters<Ai['run']>[0],{messages,max_tokens:s.settings.maxTokens,temperature:0.45}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Inference exceeded the 25-second step budget')),25000);})]);
  const output=result as {response?:unknown;choices?:{message:{content:string}}[];usage?:{prompt_tokens?:number;completion_tokens?:number}};
  const raw=output.response??output.choices?.[0]?.message.content;
  const parsed=typeof raw==='string'?JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')):raw;
  const decision=decisionSchema.parse(parsed);
  s.usage.inputTokens+=output.usage?.prompt_tokens??0;s.usage.outputTokens+=output.usage?.completion_tokens??0;s.usage.status='Workers AI connected';
  return {decision,source:'llm'};
 }catch(err){s.usage.failed++;const error=err instanceof Error?err.message:'Inference failed';s.usage.status='Fallback active · AI request failed';s.usage.cooldownUntil=Date.now()+5*60*1000;return {decision:fallback(s,c),source:'fallback',error:error.slice(0,200)};}finally{clearTimeout(timeout);}
}
export default {
 async fetch(request,env):Promise<Response>{
  const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)return response({error:'Cross-origin requests are not permitted.'},403);
  if(!['GET','POST'].includes(request.method))return response({error:'Method not allowed'},405);
  const existing=request.headers.get('Cookie')?.match(/(?:^|;\s*)diplomacy=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const id=existing??crypto.randomUUID();const cookie=existing?undefined:`diplomacy=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;
  try{
   await env.DB.prepare('INSERT OR IGNORE INTO games (id,state) VALUES (?,?)').bind(id,JSON.stringify(createGame(1914,env.AI_MODEL))).run();
   const row=await env.DB.prepare('SELECT state,version,lease_until FROM games WHERE id=?').bind(id).first<Row>();if(!row)throw new Error('Save not found');
   if(url.pathname==='/api/state'&&request.method==='GET')return response({state:JSON.parse(row.state),version:row.version},200,cookie);
   if(url.pathname==='/api/saves'&&request.method==='GET'){const saves=await env.DB.prepare('SELECT slot,created_at FROM snapshots WHERE game_id=? ORDER BY created_at DESC').bind(id).all();return response({saves:saves.results},200,cookie);}
   if(request.method!=='POST')return response({error:'Unknown endpoint'},404,cookie);
   if(Number(request.headers.get('Content-Length')||0)>4096)return response({error:'Request too large'},413,cookie);
   const text=await request.text();if(text.length>4096)return response({error:'Request too large'},413,cookie);
   const body=JSON.parse(text) as {version:number;settings?:unknown;slot?:string;seed?:number};
   if(!Number.isInteger(body.version))return response({error:'A state version is required'},400,cookie);
   if(body.version!==row.version)return response({state:JSON.parse(row.state),version:row.version,conflict:true},200,cookie);
   const token=crypto.randomUUID();const lock=await env.DB.prepare('UPDATE games SET lease=?,lease_until=? WHERE id=? AND version=? AND lease_until<?').bind(token,Date.now()+60000,id,row.version,Date.now()).run();
   if(!lock.meta.changes)return response({error:'This game is processing another step. Retry shortly.'},409,cookie);
   try{
    let s=JSON.parse(row.state) as GameState;
    switch(url.pathname){
     case '/api/step':{
      beginTurn(s);let processed=0;
      while(s.progress!.index<s.progress!.countries.length&&processed<5){const c=s.progress!.countries[s.progress!.index];const chosen=await choose(s,c,env,['localhost','127.0.0.1'].includes(url.hostname));s.progress!.decisions[c]=chosen.decision;s.countries[c].plan=chosen.decision.explanation;s.decisions.push({country:c,source:chosen.source,explanation:chosen.decision.explanation,error:chosen.error,turn:s.turn+1});s.progress!.index++;processed++;if(chosen.source==='llm'||chosen.error)break;}
      if(s.progress!.index===s.progress!.countries.length)resolveTurn(s);break;
     }
     case '/api/settings':{if(s.progress)return response({error:'Finish the current turn before changing settings.'},409,cookie);const settings=settingsSchema.parse(body.settings);if(settings.llmCountries.some(c=>!s.countries[c]))return response({error:'Unknown country ID'},400,cookie);s.settings={...settings,llmCountries:[...new Set(settings.llmCountries)]};s.usage.cooldownUntil=0;break;}
     case '/api/restart':{if(body.seed!==undefined&&(!Number.isInteger(body.seed)||body.seed<1||body.seed>4294967295))return response({error:'Seed must be an integer from 1 to 4294967295.'},400,cookie);s=createGame(body.seed??1914,s.settings.model);break;}
     case '/api/save':{if(s.progress)return response({error:'Finish the current turn before saving.'},409,cookie);await env.DB.prepare('INSERT OR REPLACE INTO snapshots(game_id,slot,state) VALUES (?,?,?)').bind(id,'manual',JSON.stringify(s)).run();break;}
     case '/api/load':{if(typeof body.slot!=='string'||body.slot.length>50)return response({error:'Select a saved snapshot'},400,cookie);const snapshot=await env.DB.prepare('SELECT state FROM snapshots WHERE game_id=? AND slot=?').bind(id,body.slot).first<{state:string}>();if(!snapshot)return response({error:'Snapshot not found'},404,cookie);s=JSON.parse(snapshot.state);break;}
     default:return response({error:'Unknown endpoint'},404,cookie);
    }
    const encoded=JSON.stringify(s);
    const statements=[env.DB.prepare('UPDATE games SET state=?,version=version+1,lease=NULL,lease_until=0,updated_at=CURRENT_TIMESTAMP WHERE id=? AND lease=? AND version=?').bind(encoded,id,token,row.version)];
    // Snapshot writes are conditional on the successful compare-and-swap, in the same atomic D1 batch.
    if(url.pathname==='/api/step'&&!s.progress){statements.push(env.DB.prepare('INSERT OR REPLACE INTO snapshots(game_id,slot,state) SELECT id,?,state FROM games WHERE id=? AND version=? AND lease IS NULL').bind(`turn-${s.turn}`,id,row.version+1));statements.push(env.DB.prepare("DELETE FROM snapshots WHERE game_id=? AND slot<>'manual' AND slot NOT IN (SELECT slot FROM snapshots WHERE game_id=? AND slot<>'manual' ORDER BY created_at DESC, CAST(SUBSTR(slot,6) AS INTEGER) DESC LIMIT 20)").bind(id,id));}
    const committed=await env.DB.batch(statements);if(!committed[0].meta.changes)return response({error:'Step lease expired; refresh the game before retrying.'},409,cookie);
    return response({state:s,version:row.version+1},200,cookie);
   }finally{await env.DB.prepare('UPDATE games SET lease=NULL,lease_until=0 WHERE id=? AND lease=?').bind(id,token).run();}
  }catch(error){console.error(JSON.stringify({type:'api_error',path:url.pathname,error:error instanceof Error?error.message:'Unknown error'}));return response({error:error instanceof SyntaxError?'Invalid JSON request.':error instanceof Error&&error.name==='ZodError'?'Invalid settings or decision schema.':'The simulation could not access its save. Ensure D1 migrations are applied, then retry.'},400,cookie);}
 }
} satisfies ExportedHandler<Env>;
