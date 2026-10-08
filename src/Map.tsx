import {useEffect,useMemo,useRef,useState} from 'react';
import type {GameState} from '../shared/types';
import {Plus,Minus,LocateFixed} from 'lucide-react';
import ArmyLayer from './ArmyLayer';
import TurnDispatch from './TurnDispatch';
import {allianceNetworks,project,tint} from './presentation';

type Feature={properties:{id:string;owner:string;name:string};geometry:{coordinates:number[][][][]}};
type View={x:number;y:number;k:number};
export type MapMode='political'|'alliance'|'relations'|'military';
const initialView:View={x:0,y:0,k:1};
const cityNames:Record<string,string>={brussels:'Brussels',amsterdam:'Amsterdam',bern:'Bern',copenhagen:'Copenhagen',oslo:'Christiania',stockholm:'Stockholm',cetinje:'Cetinje',tirana:'Tirana',warsaw:'Warsaw',helsinki:'Helsinki',manchester:'Manchester',athens:'Athens',bucharest:'Bucharest',riga:'Riga',prague:'Prague',galicia:'Lemberg',sarajevo:'Sarajevo',zagreb:'Zagreb',transylvania:'Kolozsvár',ankara:'Ankara',milan:'Milan',venice:'Venice',naples:'Naples',sicily:'Palermo',sardinia:'Cagliari',barcelona:'Barcelona',seville:'Seville',porto:'Porto',nis:'Niš',plovdiv:'Plovdiv',salonika:'Salonika',hamburg:'Hamburg',rhineland:'Cologne',bavaria:'Munich',prussia:'Königsberg',silesia:'Breslau',alsace:'Strasbourg',nancy:'Nancy',brittany:'Rennes',dublin:'Dublin',edinburgh:'Edinburgh',caucasus:'Tiflis','eastern-anatolia':'Erzurum'};
const countryLabelPositions:Record<string,[number,number]>={ger:[11.6,51.5],fra:[1.8,46.8],gbr:[-3.5,54.5],rus:[35,57],auh:[19,48],ott:[33,39],ita:[11.8,43.3],spa:[-4.4,40.2],por:[-8.3,40.4],nor:[8,64],swe:[16,64],den:[9.2,56.2],bel:[4.4,50.4],net:[5.5,53],swi:[8.3,46.4],ser:[20.3,43.7],rom:[27,45.4],bul:[25,43],gre:[22,39],alb:[20,41.6],mon:[19,42.7],lux:[6.1,49.7]};
const pathFor=(coordinates:number[][][][])=>coordinates.map(poly=>poly.map(ring=>ring.map((p,i)=>`${i?'L':'M'}${project(p).join(',')}`).join('')+'Z').join('')).join('');
export default function Map({state,selected,region,mode,onSelect,presenting=false,duration=1800,onFinish}:{state:GameState;selected:string;region:string|null;mode:MapMode;onSelect:(c:string,r:string)=>void;presenting?:boolean;duration?:number;onFinish:()=>void}){
 const [features,setFeatures]=useState<Feature[]>([]);
 const [countryPaths,setCountryPaths]=useState<{owner:string;path:string}[]>([]);
 const [error,setError]=useState('');const [view,setView]=useState(initialView);
 const [hover,setHover]=useState<{id:string;x:number;y:number}|null>(null);
 const drag=useRef<{x:number;y:number;vx:number;vy:number;moved:boolean;region?:string;country?:string}|null>(null);
 const svg=useRef<SVGSVGElement>(null);const cameraFrame=useRef<number>(0);const panFrame=useRef<number>(0);const queuedPan=useRef<View|null>(null);
 const reducedMotion=useRef(typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const abort=new AbortController();fetch('/data/europe-regions.geojson',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error('Historical map data could not be loaded');return r.json() as Promise<{features:Feature[];countryFeatures:Feature[]}>;}).then(d=>{setFeatures(d.features);setCountryPaths(d.countryFeatures.map(f=>({owner:f.properties.owner,path:pathFor(f.geometry.coordinates)})));}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>{abort.abort();cancelAnimationFrame(cameraFrame.current);cancelAnimationFrame(panFrame.current);};},[]);
 const paths=useMemo(()=>features.map(f=>({id:f.properties.id,path:pathFor(f.geometry.coordinates)})),[features]);
 const networks=useMemo(()=>allianceNetworks(state),[state.treaties,state.countries]);
 const allianceColor=useMemo(()=>Object.fromEntries(networks.flatMap(n=>n.members.map(c=>[c,n.color]))),[networks]);
 const colors=useMemo(()=>Object.fromEntries(Object.values(state.regions).map(r=>{
  const c=r.controller;let color=state.countries[mode==='military'?c:r.owner].color;
  if(mode==='relations')color=c===selected?'#c9b480':state.countries[selected].relations[c]>25?'#88a993':state.countries[selected].relations[c]<-25?'#b58179':'#8a9497';
  if(mode==='alliance')color=allianceColor[c]??'#727d82';
  return [r.id,color];
 })),[state.regions,state.countries,mode,selected,allianceColor]);
 const terrain=useMemo(()=>Object.values(state.regions).filter(r=>r.terrain==='mountains'||r.terrain==='forest'),[state.regions]);
 function animateCamera(next:View){
  cancelAnimationFrame(cameraFrame.current);if(reducedMotion.current){setView(next);return;}
  const from=view;const start=performance.now();
  const frame=(now:number)=>{const p=Math.min(1,(now-start)/220),e=1-Math.pow(1-p,3);setView({x:from.x+(next.x-from.x)*e,y:from.y+(next.y-from.y)*e,k:from.k+(next.k-from.k)*e});if(p<1)cameraFrame.current=requestAnimationFrame(frame);};
  cameraFrame.current=requestAnimationFrame(frame);
 }
 function zoom(delta:number,cx=500,cy=480){const k=Math.min(5,Math.max(.65,view.k*delta));animateCamera({k,x:cx-(cx-view.x)*k/view.k,y:cy-(cy-view.y)*k/view.k});}
 const hovered=hover?state.regions[hover.id]:null;const details=view.k>=1.65;const medium=view.k>=1.15;
 const treatyLines=state.treaties.filter(t=>t.type==='alliance').map(t=>{const a=project(state.regions[state.countries[t.a].capital].location),b=project(state.regions[state.countries[t.b].capital].location);return {id:`${t.a}-${t.b}`,path:`M${a.join(',')}Q${(a[0]+b[0])/2},${Math.min(a[1],b[1])-45} ${b.join(',')}`,color:allianceColor[t.a],label:`${state.countries[t.a].short} ↔ ${state.countries[t.b].short}`};});
 return <div className={`map-stage zoom-${details?'detail':medium?'regional':'overview'} ${presenting?'round-presenting':''}`}>
  <div className="map-heading"><span className="eyebrow">EUROPEAN THEATRE</span><span>{mode==='relations'?`RELATIONS FROM ${state.countries[selected].short.toUpperCase()}`:mode==='alliance'?'NEUTRAL VIEW · SIGNED ALLIANCE NETWORKS':presenting?`WEEK ${state.turn} · ORDERS IN MOTION`:'JANUARY 1914 · THE OLD CONTINENT'}</span></div>
  {error&&<div className="map-error">{error}</div>}
  <svg ref={svg} className="world-map" viewBox="0 0 1000 864" aria-label="Interactive historical political map of Europe in 1914" onWheel={e=>{const matrix=svg.current!.getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());zoom(e.deltaY<0?1.12:1/1.12,p.x,p.y);}} onPointerDown={e=>{
   if(e.button!==0)return;cancelAnimationFrame(cameraFrame.current);const el=e.target as SVGElement;
   drag.current={x:e.clientX,y:e.clientY,vx:view.x,vy:view.y,moved:false,region:el.closest('[data-region]')?.getAttribute('data-region')??el.closest('[data-location]')?.getAttribute('data-location')??undefined,country:el.closest('[data-country]')?.getAttribute('data-country')??undefined};
   e.currentTarget.setPointerCapture(e.pointerId);setHover(null);
  }} onPointerMove={e=>{if(!drag.current)return;const matrix=svg.current!.getScreenCTM();if(!matrix)return;const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.current.moved=true;queuedPan.current={...view,x:drag.current.vx+dx/matrix.a,y:drag.current.vy+dy/matrix.d};if(!panFrame.current)panFrame.current=requestAnimationFrame(()=>{if(queuedPan.current)setView(queuedPan.current);panFrame.current=0;});}} onPointerUp={()=>{const d=drag.current;if(d&&!d.moved&&d.region&&state.regions[d.region])onSelect(d.country??state.regions[d.region].controller,d.region);drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
   <defs>
    <radialGradient id="sea-depth"><stop stopColor="#294452"/><stop offset="1" stopColor="#152b38"/></radialGradient>
    <linearGradient id="unit-metal" x2="0" y2="1"><stop stopColor="#3a4b51"/><stop offset=".45" stopColor="#23363e"/><stop offset="1" stopColor="#13232d"/></linearGradient>
    <pattern id="grid" width="85" height="96" patternUnits="userSpaceOnUse"><path d="M85 0H0V96" fill="none" stroke="#8fa6ad" strokeOpacity=".1" strokeWidth=".6"/></pattern>
    <pattern id="land-grain" width="17" height="17" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".6" fill="#2f3528" opacity=".18"/><circle cx="11" cy="13" r=".5" fill="#ece3c5" opacity=".2"/><path d="M5 6l3-1M12 2l2 1" stroke="#303d37" strokeWidth=".5" opacity=".12"/></pattern>
    <pattern id="occupation" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#17212b" strokeWidth="1.2" opacity=".45"/></pattern>
    {Object.entries(colors).map(([id,color])=><linearGradient key={id} id={`land-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="600" y2="850"><stop stopColor={tint(color,17)}/><stop offset=".6" stopColor={color}/><stop offset="1" stopColor={tint(color,-22)}/></linearGradient>)}
    <g id="mountain-glyph"><path d="M-9 3l8-12 9 12M-1-9l-1 6 4 3M-5 3l2-3" fill="none" stroke="#3e5147" strokeWidth=".75" opacity=".45"/></g>
    <g id="forest-glyph"><path d="M-6 1l3-7 3 7M-3-6V4M0 0l3-8 4 8M3-8V4" fill="none" stroke="#344d40" strokeWidth=".7" opacity=".35"/></g>
   </defs>
   <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#sea-depth)"/>
   <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
    <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#grid)" pointerEvents="none"/>
    <text x="220" y="355" className="sea-label">NORTH SEA</text><text x="310" y="810" className="sea-label">MEDITERRANEAN SEA</text><text x="770" y="640" className="sea-label">BLACK SEA</text>
    {countryPaths.map(p=><path key={`coast-${p.owner}`} d={p.path} fill="none" stroke="#0c222c" strokeOpacity=".65" strokeWidth="7" pointerEvents="none"/>)}
    {paths.map(p=>{const r=state.regions[p.id],isSelected=region===p.id,ownSelected=mode!=='alliance'&&r.controller===selected;return <g key={p.id} data-region={p.id} onPointerEnter={e=>{if(!drag.current)setHover({id:p.id,x:e.clientX,y:e.clientY});}} onPointerLeave={()=>setHover(null)}>
     <path d={p.path} fill={`url(#land-${p.id})`} fillRule="evenodd" stroke={isSelected?'#ead6a4':details?(ownSelected?'#d7c49188':'#48575199'):'none'} strokeWidth={isSelected?2.1:.65} className={isSelected?'selected-region':'region-path'}/>
     <path d={p.path} fill="url(#land-grain)" fillRule="evenodd" pointerEvents="none"/>
     {r.owner!==r.controller&&<path d={p.path} fill="url(#occupation)" fillRule="evenodd" pointerEvents="none"/>}
    </g>;})}
    {terrain.map(r=>{const [x,y]=project(r.location);return <g key={r.id} transform={`translate(${x-18},${y+9})`} pointerEvents="none"><use href={r.terrain==='mountains'?'#mountain-glyph':'#forest-glyph'}/><use href={r.terrain==='mountains'?'#mountain-glyph':'#forest-glyph'} x="-15" y="8"/><use href={r.terrain==='mountains'?'#mountain-glyph':'#forest-glyph'} x="10" y="15"/></g>;})}
    {countryPaths.map(p=><path key={p.owner} d={p.path} fill="none" stroke="#293a36" strokeWidth={1.5/view.k+.4} pointerEvents="none"/>)}
    {!details&&Object.values(state.countries).filter(c=>!c.capitulated).map(c=>{const [x,y]=project(countryLabelPositions[c.id]);const major=['ger','fra','gbr','rus','auh','ott','ita','spa','swe','nor'].includes(c.id);if(!major&&!medium)return null;return <text key={c.id} x={x} y={y} textAnchor="middle" className={`country-map-label ${major?'major':'minor'}`} pointerEvents="none">{c.short.toUpperCase()}</text>;})}
    {!details&&<text x={project([27,65])[0]} y={project([27,65])[1]} className="province-map-label" pointerEvents="none">FINLAND</text>}
    {mode==='alliance'&&treatyLines.map(t=><path key={t.id} d={t.path} fill="none" stroke={t.color} strokeWidth="2" strokeDasharray="5 4" className="treaty-line" pointerEvents="none"><title>{t.label}</title></path>)}
    {presenting&&state.playback?.movements.map((m,i)=>{const from=project(state.regions[m.from].location),to=project(state.regions[m.to].location);return <path key={`${state.turn}-${i}`} d={`M${from.join(',')}L${to.join(',')}`} fill="none" stroke={m.kind==='attack'?'#f4b59a':m.kind==='retreat'?'#b9c5d3':'#f0dfb7'} strokeWidth="1.5" strokeDasharray="4 4" className="movement-trail" pointerEvents="none"/>;})}
    {Object.values(state.regions).filter(r=>details||state.countries[r.owner].capital===r.id||(medium&&r.vp>=15)).map(r=>{const [x,y]=project(r.location),capital=state.countries[r.owner].capital===r.id;return <g key={r.id} data-region={r.id} transform={`translate(${x},${y})`} className="map-marker"><circle r={capital?3:1.8} fill="#efe3c1" stroke="#3e4d41"/>{(medium||details||r.id===region)&&<text x="6" y="-6" className="city-label">{capital?'★ ':''}{cityNames[r.id]??r.name}</text>}{details&&<text x="6" y="6" className="vp-label">{r.vp} VP · {r.supply}% SUPPLY</text>}</g>;})}
    {(medium||presenting)&&<ArmyLayer state={state} zoom={view.k} presenting={presenting} duration={duration} onSelect={onSelect}/>}
   </g>
  </svg>
  <div className="map-vignette"/>
  <div className="map-tools"><button aria-label="Zoom in" onClick={()=>zoom(1.3)}><Plus size={16}/></button><button aria-label="Zoom out" onClick={()=>zoom(1/1.3)}><Minus size={16}/></button><button aria-label="Reset map view" onClick={()=>animateCamera(initialView)}><LocateFixed size={16}/></button></div>
  {mode==='alliance'?<div className="alliance-key"><span className="eyebrow">SIGNED ALLIANCE NETWORKS</span>{networks.length?networks.map(n=><div key={n.id}><i style={{background:n.color}}/>{n.members.map(c=>state.countries[c].short).join(' · ')}</div>):<div>No alliances signed yet</div>}<small>Dashed lines show bilateral treaties · gray = unaligned</small></div>:mode==='relations'?<div className="relation-key"><strong>{state.countries[selected].short}'s diplomatic view</strong><span><i style={{background:'#88a993'}}/>Friendly <i style={{background:'#8a9497'}}/>Neutral <i style={{background:'#b58179'}}/>Hostile</span></div>:null}
  <div className="map-legend"><span>{details?'TACTICAL DETAIL':medium?'REGIONAL VIEW':'CONTINENTAL VIEW'}</span><span>★ Capital</span><span>{medium?'Army counters':'Zoom in for armies & cities'}</span></div>
  <a className="map-credit" href="/data/ATTRIBUTION.md" target="_blank" rel="noreferrer">1914 historical outlines · A. Ourednik / GPL-3.0</a>
  <TurnDispatch state={state} active={presenting} duration={duration} onFinish={onFinish}/>
  {hovered&&hover&&!presenting&&<div className="map-tooltip" style={{left:Math.min(hover.x+15,window.innerWidth-245),top:Math.min(hover.y+12,window.innerHeight-140)}}><strong>{hovered.name}</strong><span>{state.countries[hovered.controller].name}</span><span>{hovered.vp} VP · {hovered.terrain} · Supply {hovered.supply}%</span><span>{state.armies.filter(a=>a.region===hovered.id).length} army formations · Click to inspect</span></div>}
 </div>;
}
