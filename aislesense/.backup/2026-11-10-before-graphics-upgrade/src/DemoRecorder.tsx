import {useEffect,useRef,useState} from 'react';
import {Download,Square} from 'lucide-react';
import type {State,Event} from './types';

/** Records only our authored store canvas + labelled controller state, never the desktop. */
export function DemoRecorder({state,events,onStart,disabled}:{state:State|null;events:Event[];onStart:()=>void;disabled:boolean}){
 const latest=useRef({state,events});latest.current={state,events};
 const recorder=useRef<MediaRecorder|null>(null),frame=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [recording,setRecording]=useState(false),[error,setError]=useState('');
 const stop=()=>{if(recorder.current?.state==='recording')recorder.current.stop();};
 useEffect(()=>()=>{stop();cancelAnimationFrame(frame.current);if(timer.current)clearTimeout(timer.current);},[]);
 const start=()=>{
  const source=document.querySelector<HTMLCanvasElement>('.interactive-canvas canvas');
  if(!source||!window.MediaRecorder){setError('Recording is unavailable in this browser. The interactive demo still works.');return;}
  try{
   setError('');onStart();
   const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const ctx=canvas.getContext('2d')!;
   const stream=canvas.captureStream(15),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));
   const capture=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2200000});recorder.current=capture;const chunks:Blob[]=[];
   const text=(value:string,x:number,y:number,size=18,color='#2e503c')=>{ctx.font=`${size>=24?'600':'400'} ${size}px Segoe UI`;ctx.fillStyle=color;ctx.fillText(value,x,y);};
   const paint=()=>{const s=latest.current.state;ctx.fillStyle='#f1f5eb';ctx.fillRect(0,0,1280,720);text('AisleSense / Everguard',30,43,29);text('RECORDED SCRIPTED SIMULATION',850,40,17,'#8d713f');
    const sw=Math.min(source.width,source.height*920/550),sh=Math.min(source.height,source.width*550/920);ctx.drawImage(source,(source.width-sw)/2,(source.height-sh)/2,sw,sh,20,80,920,550);
    ctx.fillStyle='#e1ebd5';ctx.fillRect(960,80,290,550);text('STAFF REVIEW',980,115,18);const queue=latest.current.events.filter(e=>e.session_id===s?.session_id),level=Math.max(1,...queue.map(e=>e.level));text(`Level ${level} / ${['','Watch','Assist','Verify','Escalate'][level]}`,980,158,25);text(queue.length?'Review requested':'No event yet',980,194,17);text('LIGHTING',980,252,18);
    s?.zones.forEach((z,i)=>{text(`${z.id}   ${Math.round(z.level)}%`,980,293+i*54,24);text(z.state,980,315+i*54,14);});text('Estimated lighting saving',980,493,15);text(`${((s?.energy.saved_wh??0)/1000).toFixed(6)} kWh`,980,527,23);text('Assumption-based, not measured',980,559,13);text(`${Math.floor(s?.elapsed??0)} seconds`,980,599,17);
    text(s?.stage??'Starting scenario',30,657,22);text('Authored scenario. Real recorded-video inference is demonstrated separately.',30,692,16,'#7b8e6b');frame.current=requestAnimationFrame(paint);};
   capture.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};capture.onstop=()=>{cancelAnimationFrame(frame.current);if(timer.current)clearTimeout(timer.current);stream.getTracks().forEach(t=>t.stop());setRecording(false);const url=URL.createObjectURL(new Blob(chunks,{type:capture.mimeType}));const a=document.createElement('a');a.href=url;a.download='AisleSense-scripted-demo-backup.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
   capture.onerror=()=>{setError('Recording failed. Use the live walkthrough.');stop();};paint();capture.start(1000);setRecording(true);timer.current=setTimeout(stop,32000);
  }catch(e){setError(e instanceof Error?e.message:'Recording failed');setRecording(false);}
 };
 return <div className="record-control"><button className="button secondary" disabled={disabled&&!recording} onClick={recording?stop:start}>{recording?<Square size={15}/>:<Download size={15}/>} {recording?'Stop & save recording':'Record 32s backup'}</button>{recording&&<span>Recording scripted story… keep this tab open.</span>}{error&&<small role="alert">{error}</small>}</div>;
}
