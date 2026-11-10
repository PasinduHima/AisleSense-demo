import {Camera,Check,Gauge,Leaf,Pause,Play,RotateCcw,ShieldAlert,UserCheck,Bell,Sparkles} from 'lucide-react';
import type {State,Event} from './types';
import './demo.css';

const RISK=['Normal','Low risk','Medium risk','High risk'];
const VIEWS=['Overview','Top-down','Aisle','CCTV'];
export const demoRisk=(state:State|null)=>Math.max(state?.risk??0,...(state?.actors.map(a=>a.risk??0)??[0]));

/** Detection → alert → guard → human decision, driven by the controller's own trace. */
export function alertFlow(state:State|null,events:Event[]){
 const trace=state?.trace??[],has=(text:string)=>trace.some(t=>t.text.includes(text)),risk=demoRisk(state);
 const current=events.filter(e=>e.session_id===state?.session_id),people=state?.actors.filter(a=>a.role!=='staff').length??0;
 return [
  {icon:Camera,name:'Camera + pose',detail:people?`${people} tracked`:'Waiting',done:people>0||risk>0},
  {icon:Gauge,name:'Risk scored',detail:risk?RISK[risk]:'Normal',done:risk>0},
  {icon:Bell,name:'Alert to staff',detail:has('placed inside bag')?'Clip sent':'—',done:has('placed inside bag')},
  {icon:ShieldAlert,name:'Guard responds',detail:has('Guard speaks')?'At the exit':has('Guard acknowledges')?'On the way':has('Approaches exit')?'Reviewing':'—',done:has('Guard acknowledges')||has('Approaches exit')},
  {icon:UserCheck,name:'Human decision',detail:current.some(e=>e.status!=='open')?'Recorded':'Pending',done:current.some(e=>e.status!=='open')},
 ];
}

type Props={state:State|null;events:Event[];busy:boolean;onScenario:(s:string)=>void;onPause:()=>void;onReset:()=>void;onSpeed?:(n:number)=>void;
 /** Current viewpoint preset and its setter; omit to hide the camera presets. */
 view?:number;onView?:(n:number)=>void;
 /** `overlay` floats over the 3D store; `inline` sits in the page flow. */
 variant?:'overlay'|'inline'};
export function DemoHud({state,events,busy,onScenario,onPause,onReset,onSpeed,view,onView,variant='overlay'}:Props){
 const risk=demoRisk(state),flow=alertFlow(state,events),speed=state?.speed??1,simulation=state?.mode!=='video';
 const demoRunning=simulation&&state?.scenario==='demo'&&(state.running||state.elapsed>0);
 const saving=state?.energy.saving_percent??0;
 return <div className={`demo-hud demo-hud-${variant}`}>
  <div className="demo-hud-top">
   <div className={`demo-risk risk-level-${risk}`} role="status"><b>{risk?`LEVEL ${risk} · ${RISK[risk].toUpperCase()}`:'ALL CLEAR'}</b><span>{state?.stage??'Press Run demo scenario'}</span></div>
   <div className="demo-energy" title="Adaptive lighting compared with always-on lighting for this session. Assumption-based estimate, not a meter reading."><Leaf size={15}/><b>{saving.toFixed(0)}%</b><span>lighting energy saved<small>{(state?.energy.saved_wh??0).toFixed(2)} Wh this session · estimate</small></span></div>
  </div>
  <ol className="demo-flow" aria-label="Alert flow">{flow.map(({icon:Icon,name,detail,done},i)=><li key={name} className={done?'done':''}><span>{done?<Check size={13}/>:<Icon size={13}/>}</span><div><b>{i+1}. {name}</b><small>{detail}</small></div></li>)}</ol>
  <div className="demo-controls">
   <button className="demo-run" disabled={busy} onClick={()=>onScenario('demo')}><Sparkles size={15}/>{demoRunning?'Restart demo scenario':'Run demo scenario'}</button>
   <button aria-label={state?.running?'Pause':'Play'} title={state?.running?'Pause':'Play'} disabled={busy||!simulation} onClick={onPause}>{state?.running?<Pause size={15}/>:<Play size={15}/>}</button>
   <button aria-label="Reset scene" title="Reset scene" disabled={busy} onClick={onReset}><RotateCcw size={15}/></button>
   {onSpeed&&<div className="demo-group" role="group" aria-label="Playback speed">{[.5,1,2].map(n=><button key={n} className={speed===n?'on':''} disabled={busy} onClick={()=>onSpeed(n)}>{n}×</button>)}</div>}
   {onView&&<div className="demo-group" role="group" aria-label="Camera preset">{VIEWS.map((name,i)=><button key={name} className={((view??0)%4+4)%4===i?'on':''} onClick={()=>onView(i)}>{name}</button>)}</div>}
  </div>
 </div>;
}
