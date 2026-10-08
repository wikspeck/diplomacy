import {useMemo} from 'react';
import type {GameState,Army} from '../shared/types';
import {project} from './presentation';
export default function ArmyLayer({state,zoom,presenting,duration,onSelect}:{state:GameState;zoom:number;presenting:boolean;duration:number;onSelect:(c:string,r:string)=>void}){
 const stacks=useMemo(()=>{const grouped=new Map<string,Army[]>();for(const a of state.armies){const key=`${a.region}:${a.country}`;grouped.set(key,[...(grouped.get(key)||[]),a]);}return [...grouped.values()];},[state.armies]);
 const routes=state.playback?.movements??[];
 const individual=zoom>=1.9||presenting;
 const items=individual?state.armies.map(a=>[a]):stacks;
 return <g className="army-layer">{items.map(units=>{
  const a=units[0];const [x,y]=project(state.regions[a.region].location);const movements=presenting?routes.filter(m=>m.armyId===a.id):[];
  const peers=state.armies.filter(u=>u.region===a.region);const slot=individual?peers.findIndex(u=>u.id===a.id):0;
  const offsetX=(slot%4)*26-14,offsetY=16+Math.floor(slot/4)*21;
  const points=movements.length?[project(state.regions[movements[0].from].location),...movements.map(m=>project(state.regions[m.to].location))]:[];
  const attack=movements.some(m=>m.kind==='attack');const color=state.countries[a.country].color;
  return <g key={individual?a.id:`${a.region}:${a.country}`} className={`army-token ${movements.length?'marching':''}`} transform={`translate(${x},${y})`} data-army={a.id} data-country={a.country} data-location={a.region} onClick={e=>{e.stopPropagation();onSelect(a.country,a.region);}}>
   {points.length>0&&<animateTransform key={`${state.turn}-${a.id}`} attributeName="transform" type="translate" values={points.map(p=>p.join(' ')).join(';')} dur={`${duration/1000}s`} calcMode="linear" fill="freeze"/>}
   <g transform={`translate(${offsetX},${offsetY}) scale(${1/Math.max(1,zoom*.72)})`}>
    <rect className="unit-shadow" x="1" y="2" width="33" height="23" rx="3"/><rect width="33" height="23" rx="3" fill="url(#unit-metal)" stroke={attack?'#e2a18a':color} strokeWidth="1.4"/>
    <rect x="1" y="1" width="3" height="21" rx="1" fill={color}/><path d="M8 7h10v8H8zM8 7l10 8m0-8l-10 8" fill="none" stroke="#dbd8c8" strokeWidth=".8"/>
    <text x="25" y="15" textAnchor="middle" className="unit-number">{individual?'I':units.length}</text>
    <path d="M7 20h23" stroke="#31454c" strokeWidth="2"/><path d={`M7 20h${23*a.organization/100}`} stroke={a.supply<50?'#cf8b71':'#a8ba95'} strokeWidth="2"/>
    {zoom>=1.9&&<text x="16" y="34" textAnchor="middle" className="unit-strength">{Math.round(units.reduce((n,u)=>n+u.strength,0))}k · {Math.round(a.organization)} ORG</text>}
    <title>{state.countries[a.country].short} · {units.length} formation(s) · {Math.round(units.reduce((n,u)=>n+u.strength,0))}k strength · {a.order}</title>
   </g>
  </g>;
 })}</g>;
}
