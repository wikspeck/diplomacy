import type {GameState,GameEvent} from '../shared/types';
export const project=(p:number[]):[number,number]=>[(p[0]+12)*17,(71-p[1])*24];
export function tint(hex:string,amount:number){return '#'+hex.slice(1).match(/../g)!.map(c=>Math.max(0,Math.min(255,parseInt(c,16)+amount)).toString(16).padStart(2,'0')).join('');}
export function allianceNetworks(s:GameState){
 const parent=Object.fromEntries(Object.keys(s.countries).map(id=>[id,id]));
 const root=(id:string):string=>parent[id]===id?id:(parent[id]=root(parent[id]));
 for(const t of s.treaties.filter(t=>t.type==='alliance')){const a=root(t.a),b=root(t.b);parent[a<b?b:a]=a<b?a:b;}
 const grouped=new Map<string,string[]>();for(const id of Object.keys(parent)){const key=root(id);grouped.set(key,[...(grouped.get(key)||[]),id]);}
 const palette=['#c4aa77','#80a9af','#a792b3','#a6b67c','#ca9482','#859fbd','#b5ad91'];
 return [...grouped.values()].filter(ids=>ids.length>1).sort((a,b)=>a[0].localeCompare(b[0])).map((members,i)=>({id:[...members].sort().join('-'),members,color:palette[i%palette.length]}));
}
export function dispatches(events:GameEvent[]){const priority:Record<string,number>={capitulation:0,war:1,peace:2,alliance:3,territory:4,battle:5,diplomacy:6};return events.filter(e=>e.type in priority).sort((a,b)=>priority[a.type]-priority[b.type]).slice(0,3);}
export function headline(e:GameEvent){return e.text.replace(/^(.*?) → (.*?): ultimatum$/,'$1 threatens $2').replace(/^(.*?) → (.*?): propose alliance$/,'$1 seeks an alliance with $2').replace(/^(.*?) → (.*?): offer peace$/,'$1 offers peace to $2').replace(/^(.*?) → (.*?): demand territory$/,'$1 demands territory from $2');}
