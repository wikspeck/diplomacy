import type {GameState,Decision} from './types';
import {atWar,allied,strength} from './engine';
export function fallback(s:GameState,c:string):Decision{
 const country=s.countries[c];const own=s.armies.filter(a=>a.country===c);const enemies=Object.keys(s.countries).filter(t=>atWar(s,c,t));
 const d:Decision={explanation:enemies.length?'Secure supply, reinforce the front and press favorable attacks.':'Build readiness and seek partners while monitoring neighboring threats.',diplomaticActions:[],militaryActions:[],economicActions:[]};
 const inbox=s.messages.filter(m=>m.to===c&&m.status==='pending'&&m.turn<=s.turn).slice(0,2);
 for(const m of inbox){let accept=false;const rel=country.relations[m.from];if(m.type==='propose_alliance')accept=rel>25&&!atWar(s,c,m.from);if(m.type==='request_access')accept=rel>35;if(m.type==='offer_peace'||m.type==='ceasefire')accept=country.surrender>20||strength(s,c)<strength(s,m.from)*0.8||s.turn>16;if(m.type==='demand_territory')accept=country.surrender>60&&!!m.region&&m.region!==country.capital;d.diplomaticActions.push({type:accept?'accept':'reject',target:m.from,proposalId:m.id,message:accept?'We accept these terms in pursuit of national security.':'These terms do not serve our national interests.'});}
 if(!d.diplomaticActions.length){
  const neighbors=[...new Set(Object.values(s.regions).filter(r=>r.controller===c).flatMap(r=>r.neighbors.map(id=>s.regions[id].controller)))].filter(t=>t!==c&&!s.countries[t].capitulated);
  const hostile=neighbors.filter(t=>country.relations[t]<-30&&!allied(s,c,t)).sort((a,b)=>country.relations[a]-country.relations[b]);
  const candidate=hostile[0];
  if(enemies.length&&s.turn>10&&(country.surrender>15||s.turn%12===0))d.diplomaticActions.push({type:'offer_peace',target:enemies[0],message:'Let us end this costly conflict and restore pre-war control.'});
  else if(candidate&&!enemies.length&&s.turn>3&&((s.turn+Object.keys(s.countries).indexOf(c))%7===0)&&country.aggression>0.4&&strength(s,c)>strength(s,candidate)*0.75){d.diplomaticActions.push({type:'declare_war',target:candidate});d.explanation=`A deteriorating frontier relationship with ${s.countries[candidate].short} calls for decisive intervention.`;}
  else if(s.turn%3===0){const friend=Object.keys(s.countries).filter(t=>t!==c&&!s.countries[t].capitulated&&!atWar(s,c,t)&&!allied(s,c,t)&&country.relations[t]>30&&!s.messages.some(m=>m.from===c&&m.to===t&&m.status==='pending')).sort((a,b)=>country.relations[b]-country.relations[a])[0];if(friend)d.diplomaticActions.push({type:'propose_alliance',target:friend,message:'We propose a defensive partnership to protect our mutual interests.'});}
  else if(candidate&&s.turn%4===1)d.diplomaticActions.push({type:'ultimatum',target:candidate,message:'Halt your frontier mobilization or face the consequences.'});
 }
 const acting=own.slice().sort((a,b)=>{const frontier=(r:string)=>s.regions[r].neighbors.some(id=>enemies.includes(s.regions[id].controller))?1:0;return frontier(b.region)-frontier(a.region)||a.strength-b.strength;}).slice(0,3);
 for(const a of acting){const r=s.regions[a.region];const enemy=r.neighbors.filter(id=>enemies.includes(s.regions[id].controller)).sort((a,b)=>s.regions[b].vp-s.regions[a].vp)[0];if(a.strength<35&&country.treasury>25){d.militaryActions.push({type:'reinforce',armyId:a.id});continue;}if(enemy&&a.organization>45&&a.supply>=50){d.militaryActions.push({type:'attack',armyId:a.id,targetRegion:enemy});continue;}
  const frontier=Object.values(s.regions).filter(x=>x.controller===c&&x.neighbors.some(id=>enemies.includes(s.regions[id].controller)));
  const goals=frontier.length?frontier:Object.values(s.regions).filter(x=>x.controller===c&&x.neighbors.some(id=>country.relations[s.regions[id].controller]<-30));
  const queue=[a.region],prev:Record<string,string>={[a.region]:''};let goal:string|undefined;
  for(let i=0;i<queue.length&&!goal;i++){const id=queue[i];if(id!==a.region&&goals.some(g=>g.id===id)){goal=id;break;}for(const n of [...s.regions[id].neighbors,...s.regions[id].seaNeighbors])if(s.regions[n].controller===c&&!(n in prev)){prev[n]=id;queue.push(n);}}
  if(goal){while(prev[goal]!==a.region)goal=prev[goal];d.militaryActions.push({type:'move',armyId:a.id,targetRegion:goal});}else d.militaryActions.push({type:'entrench',armyId:a.id});
 }
 if(country.treasury>100&&country.manpower>30&&own.length<12&&s.turn%3===0){const region=Object.values(s.regions).find(r=>r.owner===c&&r.controller===c&&r.id===country.capital)||Object.values(s.regions).find(r=>r.owner===c&&r.controller===c);if(region)d.economicActions.push({type:'recruit',region:region.id,amount:1});}
 return d;
}
export function agentView(s:GameState,c:string){
 const country=s.countries[c];
 const neighbors=[...new Set(Object.values(s.regions).filter(r=>r.controller===c).flatMap(r=>r.neighbors.map(id=>s.regions[id].controller)))].filter(id=>id!==c);
 const threats=neighbors.map(id=>({country:id,score:Math.round(Math.max(0,-country.relations[id])+strength(s,id)/Math.max(1,strength(s,c))*20+(atWar(s,c,id)?50:0))})).sort((a,b)=>b.score-a.score);
 return {turn:s.turn,country:{id:c,personality:country.personality,objectives:country.objectives,plan:country.plan,memory:country.memory,militaryPriority:country.aggression>.5?'Concentrate supplied forces at threatened frontiers; pursue favorable attacks.':'Defend capitals, preserve readiness and avoid costly offensives.',economicPriority:country.treasury<60?'Conserve treasury; reinforce existing formations before recruiting.':'Balance sustainable recruitment with reserves and army upkeep.',threats,treasury:Math.round(country.treasury),manpower:Math.round(country.manpower)},inbox:s.messages.filter(m=>m.to===c&&m.status==='pending'&&m.turn<=s.turn),relations:country.relations,publicCountries:Object.values(s.countries).map(t=>({id:t.id,name:t.short,capitulated:t.capitulated,strength:Math.round(strength(s,t.id))})),wars:s.wars,treaties:s.treaties,regions:Object.values(s.regions).map(r=>({id:r.id,owner:r.owner,controller:r.controller,terrain:r.terrain,vp:r.vp,neighbors:r.neighbors,seaNeighbors:r.seaNeighbors})),armies:s.armies.filter(a=>a.country===c).map(a=>({id:a.id,region:a.region,strength:Math.round(a.strength),organization:Math.round(a.organization),supply:a.supply}))};
}
