import type {GameState,Decision,Army,DiplomaticAction} from './types';
export function random(s:GameState){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return s.rng/4294967296;}
export function event(s:GameState,type:string,text:string,region?:string,country?:string,details?:string){s.events.push({id:`e${s.nextId++}`,turn:s.turn+1,type,text,region,country,details});}
function movement(s:GameState,a:Army,to:string,kind:'move'|'attack'|'retreat'){s.playback?.movements.push({armyId:a.id,country:a.country,from:a.region,to,kind});a.region=to;}
export function atWar(s:GameState,a:string,b:string){return s.wars.some(w=>w.includes(a)&&w.includes(b));}
export function allied(s:GameState,a:string,b:string){return s.treaties.some(t=>t.type==='alliance'&&[t.a,t.b].includes(a)&&[t.a,t.b].includes(b));}
export function strength(s:GameState,c:string){return s.armies.filter(a=>a.country===c).reduce((n,a)=>n+a.strength,0);}
export function canAccess(s:GameState,a:string,b:string){return a===b||allied(s,a,b)||s.treaties.some(t=>t.type==='access'&&t.a===b&&t.b===a);}
function relation(s:GameState,a:string,b:string,d:number){s.countries[a].relations[b]=Math.max(-100,Math.min(100,s.countries[a].relations[b]+d));s.countries[b].relations[a]=Math.max(-100,Math.min(100,s.countries[b].relations[a]+d));}
function reject(s:GameState,c:string,why:string){event(s,'rejected',`${s.countries[c].short}: ${why}`,undefined,c);}
function peace(s:GameState,a:string,b:string){s.wars=s.wars.filter(w=>!(w.includes(a)&&w.includes(b)));for(const r of Object.values(s.regions))if((r.owner===a&&r.controller===b)||(r.owner===b&&r.controller===a))r.controller=r.owner;for(const army of s.armies)if(!canAccess(s,army.country,s.regions[army.region].controller))army.region=s.countries[army.country].capital;relation(s,a,b,20);event(s,'peace',`${s.countries[a].short} and ${s.countries[b].short} sign a peace agreement.`);}
function war(s:GameState,a:string,b:string){if(a===b||atWar(s,a,b))return;if(s.countries[b].capitulated)return;s.wars.push([a,b]);relation(s,a,b,-60);s.tension=Math.min(100,s.tension+12);event(s,'war',`${s.countries[a].short} declares war on ${s.countries[b].short}.`,s.countries[b].capital,a);}
export function diplomacy(s:GameState,c:string,a:DiplomaticAction){
 const target=s.countries[a.target];if(!target||a.target===c||target.capitulated){reject(s,c,'Invalid diplomatic target.');return;}
 if(a.type==='accept'||a.type==='reject'){
  const p=s.messages.find(m=>m.id===a.proposalId&&m.to===c&&m.from===a.target&&m.status==='pending'&&m.turn<s.turn+1);
  if(!p||!['propose_alliance','request_access','offer_peace','ceasefire','demand_territory'].includes(p.type)){reject(s,c,'No delivered proposal with that ID.');return;}
  p.status=a.type==='accept'?'accepted':'rejected';relation(s,c,a.target,a.type==='accept'?12:-8);
  if(a.type==='accept'){
   if(p.type==='propose_alliance'){if(atWar(s,c,a.target)){p.status='rejected';return;}if(!allied(s,c,a.target))s.treaties.push({a:c,b:a.target,type:'alliance'});event(s,'alliance',`${target.short} and ${s.countries[c].short} form an alliance.`);}
   if(p.type==='request_access')s.treaties.push({a:c,b:a.target,type:'access'});
   if(p.type==='offer_peace')peace(s,c,a.target);
   if(p.type==='ceasefire'){s.treaties.push({a:c,b:a.target,type:'ceasefire',expires:s.turn+5});event(s,'peace',`${target.short} and ${s.countries[c].short} agree to a four-week ceasefire.`);}
   if(p.type==='demand_territory'&&p.region){const r=s.regions[p.region];if(r&&r.owner===c){r.owner=a.target;r.controller=a.target;for(const unit of s.armies.filter(u=>u.country===c&&u.region===r.id)){const home=Object.values(s.regions).find(x=>x.owner===c&&x.controller===c);if(home)unit.region=home.id;else unit.strength=0;}event(s,'territory',`${r.name} transferred to ${target.short} by agreement.`,r.id);}}
  }
  s.messages.push({id:`m${s.nextId++}`,from:c,to:a.target,type:a.type,text:a.message||`Your ${p.type.replaceAll('_',' ')} proposal is ${p.status}.`,turn:s.turn+1,status:'delivered'});return;
 }
 if(a.type==='declare_war'){
  if(allied(s,c,a.target)||s.treaties.some(t=>t.type==='ceasefire'&&[t.a,t.b].includes(c)&&[t.a,t.b].includes(a.target))){reject(s,c,'Break the alliance or await the ceasefire expiry before declaring war.');return;}
  war(s,c,a.target);
  for(const t of [...s.treaties])if((t.type==='guarantee'&&t.b===a.target)||(t.type==='alliance'&&[t.a,t.b].includes(a.target))){const partner=t.a===a.target?t.b:t.a;if(partner!==c&&!s.countries[partner].capitulated)war(s,partner,c);}return;
 }
 if(a.type==='break_treaty'){s.treaties=s.treaties.filter(t=>!([t.a,t.b].includes(c)&&[t.a,t.b].includes(a.target)));relation(s,c,a.target,-35);event(s,'diplomacy',`${s.countries[c].short} breaks treaties with ${target.short}.`);return;}
 if(a.type==='guarantee'){if(!s.treaties.some(t=>t.type==='guarantee'&&t.a===c&&t.b===a.target))s.treaties.push({a:c,b:a.target,type:'guarantee'});event(s,'diplomacy',`${s.countries[c].short} guarantees ${target.short}'s independence.`);return;}
 if(a.type==='demand_territory'&&(!a.region||s.regions[a.region]?.owner!==a.target)){reject(s,c,'Territorial demand does not name a region owned by the recipient.');return;}
 if(['offer_peace','ceasefire'].includes(a.type)&&!atWar(s,c,a.target)){reject(s,c,'Peace negotiations require an active war.');return;}
 if(a.type==='propose_alliance'&&(allied(s,c,a.target)||atWar(s,c,a.target))){reject(s,c,'An alliance proposal requires peace and no existing alliance.');return;}
 if(s.messages.some(m=>m.from===c&&m.to===a.target&&m.type===a.type&&m.status==='pending'))return;
 s.messages.push({id:`m${s.nextId++}`,from:c,to:a.target,type:a.type,text:a.message||`${s.countries[c].short} requests ${a.type.replaceAll('_',' ')}.`,region:a.region,turn:s.turn+1,status:['message','ultimatum'].includes(a.type)?'delivered':'pending'});
 if(a.type==='ultimatum'){relation(s,c,a.target,-15);s.tension=Math.min(100,s.tension+3);}
 event(s,'diplomacy',`${s.countries[c].short} → ${target.short}: ${a.type.replaceAll('_',' ')}`,a.region,c);
}
export function military(s:GameState,c:string,a:Decision['militaryActions'][number]){
 const army=s.armies.find(u=>u.id===a.armyId&&u.country===c&&u.strength>0);if(!army){reject(s,c,'Unknown army or army belongs to another country.');return;}
 const current=s.regions[army.region];const target=a.targetRegion?s.regions[a.targetRegion]:undefined;
 if(['move','attack','retreat'].includes(a.type)){
  if(!target||target.id===current.id||(!current.neighbors.includes(target.id)&&!current.seaNeighbors.includes(target.id))){reject(s,c,'Movement must use an adjacent region or an explicit transport route.');return;}
  const sea=current.seaNeighbors.includes(target.id);
  if(a.type==='attack'){
   if(sea){reject(s,c,'Naval invasions are not supported.');return;}
   if(!atWar(s,c,target.controller)||s.treaties.some(t=>t.type==='ceasefire'&&[t.a,t.b].includes(c)&&[t.a,t.b].includes(target.controller))){reject(s,c,'Attack requires war and no active ceasefire.');return;}
   army.order=`Attacking ${target.name}`;army.entrenchment=0;combat(s,army,target.id);return;
  }
  if(!canAccess(s,c,target.controller)){reject(s,c,'Movement requires friendly territory or military access.');return;}
  movement(s,army,target.id,a.type==='retreat'?'retreat':'move');army.entrenchment=0;army.organization=Math.max(10,army.organization-(sea?20:7));army.order=`${a.type==='retreat'?'Retreated':'Moved'} to ${target.name}`;event(s,'movement',`${s.countries[c].short}: ${army.id} moves to ${target.name}.`,target.id,c);return;
 }
 if(a.type==='reinforce'){const n=Math.min(15,100-army.strength,s.countries[c].manpower,s.countries[c].treasury/2);if(n>0){army.strength+=n;s.countries[c].manpower-=n;s.countries[c].treasury-=n*2;}return;}
 if(a.type==='entrench'||a.type==='defend'){army.entrenchment=Math.min(50,army.entrenchment+10);army.organization=Math.min(100,army.organization+10);army.order='Entrenching';return;}
 if(a.type==='split'){if(army.strength<40||s.armies.filter(u=>u.country===c).length>=24){reject(s,c,'Split requires 40 strength and fewer than 24 armies.');return;}army.strength/=2;s.armies.push({...army,id:`${c}_unit_${s.nextId++}`,entrenchment:0});return;}
 if(a.type==='merge'){const other=s.armies.find(u=>u.id===a.otherArmyId&&u.id!==army.id&&u.country===c&&u.region===army.region);if(!other||army.strength+other.strength>100){reject(s,c,'Merge requires a co-located friendly army and combined strength ≤100.');return;}const total=army.strength+other.strength;army.organization=(army.organization*army.strength+other.organization*other.strength)/total;army.strength=total;s.armies=s.armies.filter(u=>u!==other);}
}
function power(a:Army){return a.strength*(0.4+a.organization/140)*(0.5+a.morale/200)*(0.3+a.supply/140)*(1+a.experience/250);}
export function combat(s:GameState,attacker:Army,targetId:string){
 const region=s.regions[targetId];const defenders=s.armies.filter(u=>u.region===targetId&&atWar(s,attacker.country,u.country)&&u.strength>0);
 const terrain={plains:1,forest:1.25,mountains:1.6,urban:1.4}[region.terrain];
 const offense=power(attacker)*(0.85+random(s)*0.3);const defense=defenders.reduce((n,u)=>n+power(u)*(1+u.entrenchment/100),0)*terrain*(0.85+random(s)*0.3);
 const win=offense>defense;const attackerLoss=defenders.length?Math.min(attacker.strength*0.65,4+defense*0.16):1;
 attacker.strength=Math.max(0,attacker.strength-attackerLoss);attacker.organization=Math.max(5,attacker.organization-22);attacker.morale=Math.max(10,attacker.morale+(win?5:-10));attacker.experience=Math.min(100,attacker.experience+5);
 let defenderLoss=0;
 for(const d of defenders){const loss=Math.min(d.strength*0.75,3+offense*0.2/defenders.length);d.strength-=loss;d.organization=Math.max(5,d.organization-25);d.entrenchment=Math.max(0,d.entrenchment-10);defenderLoss+=loss;if(win){const retreat=region.neighbors.find(id=>s.regions[id].controller===d.country&&id!==attacker.region);if(retreat){movement(s,d,retreat,'retreat');d.order='Retreating after defeat';}else{defenderLoss+=d.strength;d.strength=0;}}}
 if(win&&attacker.strength>0){region.controller=attacker.country;movement(s,attacker,targetId,'attack');event(s,'territory',`${s.countries[attacker.country].short} occupies ${region.name}.`,targetId,attacker.country);}
 event(s,'battle',`Battle of ${region.name}: ${win?'attacker advances':'defenders hold'}.`,targetId,attacker.country,`Attack power ${offense.toFixed(1)} · defense ${defense.toFixed(1)} · ${region.terrain} ×${terrain}. Strength losses: attacker ${attackerLoss.toFixed(1)}, defenders ${defenderLoss.toFixed(1)}. Organization, morale, experience, supply and entrenchment modify power. Seeded combat roll.`);
}
export function resolveTurn(s:GameState){
 if(!s.progress)throw new Error('No turn in progress');
 const eventStart=s.events.length;
 s.playback={turn:s.turn+1,movements:[],events:[]};
 const decisions=s.progress.decisions;
 // Stable initiative rotates each week; no country receives permanent first-mover advantage.
 const ids=s.progress.countries;const order=[...ids.slice(s.turn%ids.length),...ids.slice(0,s.turn%ids.length)];
 for(const c of order)for(const a of decisions[c]?.diplomaticActions.slice(0,2)||[])if(!s.countries[c].capitulated)diplomacy(s,c,a);
 for(const c of order){if(s.countries[c].capitulated)continue;const used=new Set<string>();for(const a of decisions[c]?.militaryActions.slice(0,3)||[]){if(used.has(a.armyId)){reject(s,c,'An army can act only once per turn.');continue;}used.add(a.armyId);military(s,c,a);}
  for(const a of decisions[c]?.economicActions.slice(0,1)||[]){const r=s.regions[a.region];const country=s.countries[c];const count=Math.min(2,Math.max(1,Math.floor(a.amount)));if(!r||r.owner!==c||r.controller!==c||country.treasury<count*30||country.manpower<count*25||s.armies.filter(u=>u.country===c).length+count>24){reject(s,c,'Recruitment requires controlled home territory, manpower, treasury and available army capacity.');continue;}country.treasury-=count*30;country.manpower-=count*25;for(let i=0;i<count;i++)s.armies.push({id:`${c}_unit_${s.nextId++}`,country:c,region:r.id,strength:25,organization:60,morale:65,experience:0,supply:80,entrenchment:0,order:'Newly recruited'});event(s,'mobilization',`${country.short} recruits ${count} army formation${count>1?'s':''}.`,r.id,c);}
 }
 economy(s);capitulations(s);
 for(const c of Object.values(s.countries)){c.memory=s.events.filter(e=>e.country===c.id||e.text.includes(c.short)).slice(-4).map(e=>e.text);}
 s.playback.events=s.events.slice(eventStart);
 s.turn++;s.date=new Date(Date.UTC(1914,0,1)+s.turn*7*86400000).toISOString().slice(0,10);s.progress=null;s.tension=Math.max(0,s.tension-(s.wars.length?0:1));
 s.events=s.events.slice(-500);s.messages=s.messages.slice(-250);s.decisions=s.decisions.slice(-150);s.armies=s.armies.filter(a=>a.strength>0.5);s.treaties=s.treaties.filter(t=>!t.expires||t.expires>s.turn);
 for(const m of s.messages)if(m.status==='pending'&&s.turn-m.turn>8)m.status='rejected';
}
function economy(s:GameState){
 for(const c of Object.values(s.countries)){
  const connected=new Set<string>();const home=s.regions[c.capital];if(home?.controller===c.id)connected.add(home.id);
  const queue=[...connected];for(let i=0;i<queue.length;i++){const r=s.regions[queue[i]];for(const id of [...r.neighbors,...r.seaNeighbors])if(canAccess(s,c.id,s.regions[id].controller)&&!connected.has(id)){connected.add(id);queue.push(id);}}
  for(const r of Object.values(s.regions).filter(r=>r.controller===c.id)){r.supply=connected.has(r.id)?Math.min(100,55+r.infrastructure*11):25;c.treasury=Math.min(1000,c.treasury+r.infrastructure*1.5);if(r.owner===c.id)c.manpower=Math.min(5000,c.manpower+r.population/1000000);}
  for(const a of s.armies.filter(a=>a.country===c.id)){a.supply=connected.has(a.region)?Math.min(100,55+s.regions[a.region].infrastructure*11):25;a.organization=Math.min(100,a.organization+(a.supply>=50?8:-4));if(a.supply<50)a.strength*=0.96;a.entrenchment=Math.min(50,a.entrenchment+3);c.treasury=Math.max(0,c.treasury-a.strength*0.025);}
 }
}
function capitulations(s:GameState){for(const c of Object.values(s.countries)){if(c.capitulated)continue;const own=Object.values(s.regions).filter(r=>r.owner===c.id);const total=own.reduce((n,r)=>n+r.vp,0);const lost=own.filter(r=>r.controller!==c.id).reduce((n,r)=>n+r.vp,0);c.surrender=total?Math.round(lost/total*100):100;if(c.surrender>=70){c.capitulated=true;const occupiers=own.filter(r=>r.controller!==c.id).sort((a,b)=>b.vp-a.vp);const victor=occupiers[0]?.controller;if(victor){for(const r of own){r.owner=victor;r.controller=victor;}s.armies=s.armies.filter(a=>a.country!==c.id);s.wars=s.wars.filter(w=>!w.includes(c.id));s.treaties=s.treaties.filter(t=>t.a!==c.id&&t.b!==c.id);event(s,'capitulation',`${c.short} capitulates. Its territory passes to ${s.countries[victor].short}.`,c.capital,victor);}}}}
export function beginTurn(s:GameState){if(!s.progress)s.progress={index:0,countries:Object.keys(s.countries).filter(c=>!s.countries[c].capitulated),decisions:{},calls:0};}
