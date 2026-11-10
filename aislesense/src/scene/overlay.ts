/** 2D drawing for the simulated camera view: COCO-style pose skeleton, person box and label, and sensor grain. */
import type {Actor} from '../types';
import {BONES,JOINTS,type JointName} from './shopper';
import {FONT} from './textures';

/** Skeleton colour. It never changes; only the box and label follow the risk level. */
export const NEON='#39FF14';
/** How strongly the skeleton is drawn (0–1). Kept very low so it sits quietly over the footage; raise it for a brighter overlay. */
export const SKELETON_OPACITY=.22;
export const RISK_NAMES=['NORMAL','LOW RISK','MEDIUM RISK','HIGH RISK'];
export const RISK_COLORS=['#e8fff0','#ffd60a','#ff9f0a','#ff453a'];
const STAFF='#7fd4ff';
export type Points=Record<JointName,[number,number]>;

/** Stable per-person detection score, so the label looks like model output without flickering. */
export function confidence(id:string,time:number){
 let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))%997;
 return .9+(h%7)/100+.015*Math.sin(Math.floor(time*1.5)*1.3+h);
}
export const boxStyle=(actor:Actor)=>actor.role==='staff'?{color:STAFF,text:actor.label??'STAFF'}:{color:RISK_COLORS[actor.risk??0],text:RISK_NAMES[actor.risk??0]};

export function drawPerson(ctx:CanvasRenderingContext2D,k:number,p:Points,actor:Actor,score:number){
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const name of JOINTS){const [x,y]=p[name];x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const pad=(y1-y0)*.1+5;x0-=pad;x1+=pad;y0-=pad*1.5;y1+=pad*.8;
 const {color,text}=boxStyle(actor),width=2.6*k;
 ctx.lineCap='round';ctx.lineJoin='round';
 const bones=()=>{ctx.beginPath();for(const [a,b] of BONES){ctx.moveTo(...p[a]);ctx.lineTo(...p[b]);}ctx.stroke();};
 // Dark under-stroke keeps the skeleton readable on the bright floor; the glow pass sits on top of it.
 ctx.globalAlpha=SKELETON_OPACITY;
 ctx.shadowBlur=0;ctx.strokeStyle='rgba(0,26,6,.6)';ctx.lineWidth=width+2.4*k;bones();
 ctx.shadowColor=NEON;ctx.shadowBlur=9*k*SKELETON_OPACITY;ctx.strokeStyle=NEON;ctx.lineWidth=width;bones();
 ctx.fillStyle=NEON;
 for(const name of JOINTS){const [x,y]=p[name],face=name==='nose'||name[0]==='e'&&name[1]!=='l';ctx.beginPath();ctx.arc(x,y,(face?2.3:3.7)*k,0,Math.PI*2);ctx.fill();}
 ctx.shadowBlur=0;ctx.fillStyle='#eaffea';
 for(const name of JOINTS){const [x,y]=p[name],face=name==='nose'||name[0]==='e'&&name[1]!=='l';if(face)continue;ctx.beginPath();ctx.arc(x,y,1.3*k,0,Math.PI*2);ctx.fill();}

 ctx.globalAlpha=1;
 // Person box with corner ticks, as drawn by a detector.
 const w=x1-x0,h=y1-y0,tick=Math.min(w,h)*.22;
 ctx.strokeStyle=color;ctx.lineWidth=1.4*k;ctx.globalAlpha=.75;ctx.strokeRect(x0,y0,w,h);ctx.globalAlpha=1;
 ctx.lineWidth=3.2*k;ctx.beginPath();
 for(const [cx,cy,sx,sy] of [[x0,y0,1,1],[x1,y0,-1,1],[x1,y1,-1,-1],[x0,y1,1,-1]]){ctx.moveTo(cx+sx*tick,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*tick);}
 ctx.stroke();
 const label=`ID ${actor.id} · ${score.toFixed(2)} · ${text}`;
 ctx.font=`700 ${Math.round(12*k)}px ${FONT}`;
 const lw=ctx.measureText(label).width+14*k,lh=20*k,ly=y0-lh<2?y0:y0-lh;
 ctx.fillStyle=color;ctx.fillRect(x0-1.6*k,ly,lw,lh);
 ctx.fillStyle='#0b1a12';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(label,x0+6*k,ly+lh/2+1);
 if(actor.action==='bagging'){
  const hip=p.hpL,size=h*.24;
  ctx.strokeStyle='#ffd60a';ctx.lineWidth=2*k;ctx.setLineDash([6*k,4*k]);ctx.strokeRect(hip[0]-size/2,hip[1]-size*.75,size,size);ctx.setLineDash([]);
  ctx.fillStyle='#ffe98a';ctx.font=`600 ${Math.round(12*k)}px ${FONT}`;ctx.fillText('BAG-AREA MOTION',hip[0]+size/2+7*k,hip[1]-size*.25);
 }
}

/** Fine moving noise, as from a small camera sensor. */
export function createGrain(){
 const tile=document.createElement('canvas');tile.width=tile.height=128;
 const c=tile.getContext('2d')!,img=c.createImageData(128,128);
 for(let i=0;i<img.data.length;i+=4){const v=Math.random()*255;img.data[i]=img.data[i+1]=img.data[i+2]=v;img.data[i+3]=17;}
 c.putImageData(img,0,0);
 let pattern:CanvasPattern|null=null;
 return (ctx:CanvasRenderingContext2D,w:number,h:number)=>{
  pattern??=ctx.createPattern(tile,'repeat');if(!pattern)return;
  const ox=Math.floor(Math.random()*128),oy=Math.floor(Math.random()*128);
  ctx.save();ctx.translate(-ox,-oy);ctx.fillStyle=pattern;ctx.fillRect(0,0,w+128,h+128);ctx.restore();
 };
}

/** On-screen date and time for the camera view; a fixed start keeps recordings identical. */
export function cameraStamp(elapsed:number){
 const d=new Date(2026,10,11,10,15,0);d.setSeconds(d.getSeconds()+Math.floor(elapsed));
 const two=(n:number)=>n.toString().padStart(2,'0');
 return `${d.getFullYear()}-${two(d.getMonth()+1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
}
