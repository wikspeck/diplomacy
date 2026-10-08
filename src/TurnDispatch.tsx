import {useEffect,useState} from 'react';
import type {GameState} from '../shared/types';
import {dispatches,headline} from './presentation';
import {Swords,Handshake,Radio,X} from 'lucide-react';
export default function TurnDispatch({state,active,duration,onFinish}:{state:GameState;active:boolean;duration:number;onFinish:()=>void}){
 const [index,setIndex]=useState(0);const messages=dispatches(state.playback?.events??[]);
 useEffect(()=>{setIndex(0);if(!active||messages.length<2)return;const timer=setInterval(()=>setIndex(i=>Math.min(messages.length-1,i+1)),duration/messages.length);return()=>clearInterval(timer);},[active,state.turn,duration,messages.length]);
 if(!active)return null;const message=messages[index];
 return <div className="turn-dispatch" key={`${state.turn}-${index}`} role="status"><div className="dispatch-seal">{message?.type==='war'||message?.type==='battle'?<Swords size={22}/>:message?.type==='peace'||message?.type==='alliance'?<Handshake size={22}/>:<Radio size={22}/>}</div><div><span className="eyebrow">WEEK {String(state.turn).padStart(3,'0')} · {message?.type.toUpperCase()??'MILITARY DISPATCH'}</span><strong>{message?headline(message):`${state.playback?.movements.length??0} formations redeployed`}</strong><small>{message?`${index+1} / ${messages.length} dispatches`:'The governments have completed their orders.'}</small></div><button aria-label="Skip round animation" title="Skip round animation" onClick={onFinish}><X size={14}/></button></div>;
}
