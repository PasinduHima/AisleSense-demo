/** Procedural canvas textures for the store. Everything is generated locally; no image files or downloads. */
import * as THREE from 'three';

export type Painter=(ctx:CanvasRenderingContext2D,w:number,h:number)=>void;
export const FONT='"Segoe UI",system-ui,-apple-system,sans-serif';

/** Small deterministic generator so the store looks identical on every start. */
export function rng(seed:number){
 return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}

export function canvasTexture(w:number,h:number,paint:Painter,opts:{repeat?:boolean;aniso?:number}={}){
 const c=document.createElement('canvas');c.width=w;c.height=h;
 const ctx=c.getContext('2d')!;paint(ctx,w,h);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=opts.aniso??4;
 if(opts.repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;
 return t;
}

export function text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,size:number,color:string,o:{weight?:number;align?:CanvasTextAlign;spacing?:number}={}){
 ctx.font=`${o.weight??600} ${size}px ${FONT}`;ctx.fillStyle=color;ctx.textAlign=o.align??'center';ctx.textBaseline='middle';
 (ctx as unknown as {letterSpacing:string}).letterSpacing=`${o.spacing??0}px`;
 ctx.fillText(value,x,y);
 (ctx as unknown as {letterSpacing:string}).letterSpacing='0px';
}

export function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
}

/** 4 x 4 block of large-format floor tiles with a light terrazzo speckle. */
export const paintTiles:Painter=(ctx,w,h)=>{
 const r=rng(7),n=4,s=w/n;
 ctx.fillStyle='#a9b5ab';ctx.fillRect(0,0,w,h);
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){
  ctx.fillStyle=`hsl(${128+r()*18} ${8+r()*5}% ${75+r()*4.5}%)`;
  ctx.fillRect(i*s+1.5,j*s+1.5,s-3,s-3);
 }
 for(let k=0;k<2200;k++){
  ctx.fillStyle=r()<.55?`rgba(72,96,84,${.04+r()*.09})`:`rgba(255,255,255,${.08+r()*.16})`;
  const d=.6+r()*1.8;ctx.fillRect(r()*w,r()*h,d,d);
 }
 ctx.strokeStyle='rgba(112,132,120,.6)';ctx.lineWidth=2;
 for(let i=0;i<=n;i++){ctx.beginPath();ctx.moveTo(i*s,0);ctx.lineTo(i*s,h);ctx.moveTo(0,i*s);ctx.lineTo(w,i*s);ctx.stroke();}
};

export const paintWood=(base:string,grain:string):Painter=>(ctx,w,h)=>{
 const r=rng(11);ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
 for(let i=0;i<110;i++){
  const y=r()*h;ctx.strokeStyle=grain;ctx.globalAlpha=.04+r()*.13;ctx.lineWidth=.6+r()*2.4;
  ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(w*.3,y+(r()-.5)*9,w*.7,y+(r()-.5)*9,w,y+(r()-.5)*6);ctx.stroke();
 }
 ctx.globalAlpha=1;
};

/** Round falloff used for lamp halos and soft floor shadows. */
export const paintGlow=(rgb='255,255,255'):Painter=>(ctx,w,h)=>{
 const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
 g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.22,`rgba(${rgb},.6)`);g.addColorStop(.55,`rgba(${rgb},.16)`);g.addColorStop(1,`rgba(${rgb},0)`);
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
};

/** Soft-edged rectangle. The shape is drawn off-canvas and only its blurred shadow is kept. */
export const paintSoftRect=(color:string,inset:number,blur:number):Painter=>(ctx,w,h)=>{
 ctx.clearRect(0,0,w,h);ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.shadowOffsetX=w*2;ctx.fillStyle=color;
 roundRect(ctx,inset-w*2,inset,w-inset*2,h-inset*2,inset*.6);ctx.fill();
 // A second pass makes the centre solid without hardening the edge.
 ctx.shadowBlur=blur*.5;roundRect(ctx,inset*1.5-w*2,inset*1.5,w-inset*3,h-inset*3,inset*.5);ctx.fill();
};

/** Vertical fade: opaque at the top of the canvas, clear at the bottom. */
export const paintFade=(top:number,bottom:number):Painter=>(ctx,w,h)=>{
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(255,255,255,${top})`);g.addColorStop(1,`rgba(255,255,255,${bottom})`);
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
};

/** Neutral packaging artwork. Instance colours tint it, so one texture serves every boxed product. */
export const paintPack:Painter=(ctx,w,h)=>{
 ctx.fillStyle='#d9d9d9';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h*.3);
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,h*.3,w,h*.035);
 ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(w*.5,h*.62,w*.27,h*.17,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(w*.3,h*.6,w*.4,h*.035);
 ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(0,h*.9,w,h*.1);
};

/** Bottle artwork laid out along the lathe profile: cap and neck at the top, label band on the body. */
export const paintBottle:Painter=(ctx,w,h)=>{
 ctx.fillStyle='#4a4a4a';ctx.fillRect(0,0,w,h*.4);
 ctx.fillStyle='#d6d6d6';ctx.fillRect(0,h*.4,w,h*.2);
 ctx.fillStyle='#c2c2c2';ctx.fillRect(0,h*.6,w,h*.4);
 ctx.fillStyle='#ffffff';ctx.fillRect(0,h*.63,w,h*.12);
 ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(0,h*.685,w,h*.015);
};

/** Dark conveyor belt with faint chevrons so its motion is visible. */
export const paintBelt:Painter=(ctx,w,h)=>{
 ctx.fillStyle='#1d2523';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=3;
 for(let x=-h;x<w+h;x+=16){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h*.5,h*.5);ctx.lineTo(x,h);ctx.stroke();}
};

/** Radial backdrop behind the model. */
export const paintBackdrop:Painter=(ctx,w,h)=>{
 const g=ctx.createRadialGradient(w*.5,h*.42,0,w*.5,h*.5,w*.75);
 g.addColorStop(0,'#2b4a4c');g.addColorStop(.55,'#1a3236');g.addColorStop(1,'#0e1e23');
 ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
};

/** Rounded pill label used for floating tags. */
export function pillTexture(value:string,fg:string,bg:string,border?:string){
 return canvasTexture(512,112,(ctx,w,h)=>{
  ctx.clearRect(0,0,w,h);ctx.fillStyle=bg;roundRect(ctx,6,6,w-12,h-12,(h-12)/2);ctx.fill();
  if(border){ctx.strokeStyle=border;ctx.lineWidth=4;ctx.stroke();}
  text(ctx,value,w/2,h/2+2,40,fg,{weight:700,spacing:3});
 });
}
