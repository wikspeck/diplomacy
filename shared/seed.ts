import type {Country,GameState,Region} from './types';
import map from './map-data.json';
const definitions = [
 ['ger','German Empire','Germany','#7f9290','berlin','Assertive, security-conscious; fears encirclement','Build influence and secure the eastern and western frontiers',0.8,67,8],
 ['fra','France','France','#6488a3','paris','Defensive, diplomatic; seeks reliable partners','Secure the frontier and recover influence in Alsace-Lorraine',0.6,40,7],
 ['gbr','United Kingdom','Britain','#ac827f','london','Pragmatic balancing power; values maritime access','Preserve the balance of power and protect friendly states',0.35,46,5],
 ['rus','Russian Empire','Russia','#8c9c74','petrograd','Protective of Slavic states; ambitious but cautious','Support Balkan partners and defend western territories',0.65,175,10],
 ['auh','Austria-Hungary','Austria-Hungary','#c1a46c','vienna','Conservative empire; anxious about Balkan nationalism','Maintain imperial cohesion and influence in the Balkans',0.75,52,6],
 ['ott','Ottoman Empire','Ottomans','#a68f66','constantinople','Recovering power; opportunistic and defensive','Preserve the straits and rebuild military readiness',0.6,25,5],
 ['ita','Italy','Italy','#83a08d','rome','Opportunistic negotiator; seeks recognition','Expand regional influence while avoiding costly commitments',0.55,35,5],
 ['spa','Spain','Spain','#b7a67d','madrid','Cautious and inward-looking','Develop infrastructure and preserve sovereignty',0.15,20,3],
 ['por','Portugal','Portugal','#829675','lisbon','Pragmatic, diplomatically minded','Maintain security and cultivate major-power support',0.15,6,2],
 ['bel','Belgium','Belgium','#b0a56a','brussels','Neutral and protective','Guarantee independence and defend the capital',0.1,7,2],
 ['net','Netherlands','Netherlands','#b39770','amsterdam','Commercial and cautious','Remain independent and keep trade routes open',0.1,6,2],
 ['lux','Luxembourg','Luxembourg','#ad9397','luxembourg','Neutral and survival-focused','Avoid occupation through diplomatic guarantees',0.05,0.26,1],
 ['swi','Switzerland','Switzerland','#a68080','bern','Armed neutrality','Defend alpine territory and avoid entanglement',0.05,4,2],
 ['den','Denmark','Denmark','#939caa','copenhagen','Cautious, concerned with stronger neighbors','Preserve sovereignty and northern stability',0.1,3,2],
 ['nor','Norway','Norway','#87a3ab','oslo','Maritime and independent','Protect coastal access and build readiness',0.1,2.4,2],
 ['swe','Sweden','Sweden','#b6ad75','stockholm','Independent, guarded','Preserve Scandinavian stability',0.2,5.6,3],
 ['ser','Serbia','Serbia','#9f7f78','belgrade','Ambitious Balkan nationalist','Strengthen Balkan influence and secure independence',0.8,4.5,3],
 ['mon','Montenegro','Montenegro','#9c889c','cetinje','Resolute and survival-focused','Support friendly Balkan powers',0.5,0.5,1],
 ['rom','Romania','Romania','#b9a179','bucharest','Calculated, opportunistic','Protect independence and expand regional influence',0.5,7.5,3],
 ['bul','Bulgaria','Bulgaria','#a1aa78','sofia','Revisionist, frustrated by recent losses','Recover influence in the southern Balkans',0.75,4.8,3],
 ['gre','Greece','Greece','#7597a9','athens','Maritime, ambitious','Consolidate recent gains and protect Aegean access',0.5,5,3],
 ['alb','Albania','Albania','#9a8d85','tirana','Fragile, survival-oriented','Secure recognition and independence',0.1,0.8,1],
] as const;
export function createGame(seed=1914, model='@cf/zai-org/glm-4.7-flash'):GameState {
 const countries:Record<string,Country>={};
 for(const [id,name,short,color,capital,personality,objectives,aggression,pop,forces] of definitions) countries[id]={id,name,short,color,capital,personality,objectives,aggression,treasury:Math.round(30+pop*2),manpower:Math.round(pop*25),relations:{},memory:[],plan:objectives,capitulated:false,surrender:0};
 for(const a of Object.values(countries)) for(const b of Object.values(countries)) if(a.id!==b.id) a.relations[b.id]=10;
 for(const [a,b,value] of [['ger','fra',-55],['auh','ser',-65],['rus','auh',-40],['bul','ser',-50],['bul','gre',-40],['ger','auh',55],['fra','rus',50],['gbr','fra',40],['rus','ser',65]] as const){countries[a].relations[b]=value;countries[b].relations[a]=value;}
 const regions=Object.fromEntries(map.regions.map(r=>[r.id,{...r,controller:r.owner,supply:100}])) as Record<string,Region>;
 const armies:GameState['armies']=[];
 for(const [id,,,,,,,,,forces] of definitions){const own=Object.values(regions).filter(r=>r.owner===id);for(let i=0;i<forces;i++) armies.push({id:`${id}_army_${i+1}`,country:id,region:own[i%own.length].id,strength:32+(forces>4?18:0),organization:85,morale:80,experience:15,supply:100,entrenchment:10,order:'Holding position'});}
 return {schema:1,seed,rng:seed>>>0,turn:0,date:'1914-01-01',tension:18,countries,regions,armies,wars:[],treaties:[],messages:[],events:[{id:'e0',turn:0,type:'world',text:'Europe stands at a crossroads. Twenty-two governments begin their deliberations.'}],decisions:[],settings:{model,llmCountries:['ger','fra','gbr'],callBudget:3,maxTokens:650},usage:{calls:0,failed:0,inputTokens:0,outputTokens:0,estimatedTokens:0,cooldownUntil:0,status:'Ready · 3 LLM agents configured'},progress:null,nextId:1};
}
