import {useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Actor,State} from './types';
import {PARTS,type PartId} from './explorerData';
import {buildStore,cameraLens,ZONE_NAMES,ZONE_X} from './scene/store';
import {BONES,JOINTS,createShopper,type JointName} from './scene/shopper';
import {canvasTexture,paintBackdrop,paintGlow,pillTexture,FONT} from './scene/textures';
import './scene/scene.css';

type Props={state:State|null;cones:boolean;view:number;interactive?:boolean;active?:PartId|null;focus?:'all'|'security'|'lighting';
 /** Renders the store through the aisle cameras with an explanatory pose overlay instead of the orbit view. */
 cctv?:boolean;fallback?:ReactNode;onSelect?:(id:PartId)=>void;onHover?:(id:PartId|null)=>void};
type Snap={e:number;a:Actor|null};
/** Snapshots arrive about four times a second; rendering slightly in the past lets motion be interpolated. */
const DELAY=.34;
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const clock=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const CCTV_AIM:[number,number,number][]=[[-3.7,.7,1.4],[.1,.7,2.3],[4,.7,2.4]];
const REGIONS:{label:string;color:string;points:[number,number,number][]}[]=[
 {label:'SHELF REGION',color:'#ffd474',points:[[-4.64,.95,-.4],[-4.64,.95,1],[-4.64,1.78,1],[-4.64,1.78,-.4]]},
 {label:'CHECKOUT LANE',color:'#cfe6da',points:[[-1,.02,2.15],[1.5,.02,2.15],[1.5,.02,2.95],[-1,.02,2.95]]},
 {label:'EXIT ZONE',color:'#f0a37c',points:[[4.25,.02,4],[6.05,.02,4],[6.05,.02,5.4],[4.25,.02,5.4]]},
];

export function StoreScene({state,cones,view,interactive=false,active=null,focus='all',cctv=false,fallback,onSelect,onHover}:Props){
 const host=useRef<HTMLDivElement>(null),overlay=useRef<HTMLCanvasElement>(null),camName=useRef<HTMLSpanElement>(null),camClock=useRef<HTMLSpanElement>(null);
 const latest=useRef(state),showCones=useRef(cones),viewRef=useRef(view);
 const interaction=useRef({active,onSelect,onHover});interaction.current={active,onSelect,onHover};
 const [error,setError]=useState('');latest.current=state;showCones.current=cones;viewRef.current=view;
 useEffect(()=>{
  if(!host.current)return;
  const target=host.current;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:interactive,powerPreference:'high-performance'});}
  catch{setError('3D is unavailable in this browser. Try Chrome or Edge with graphics acceleration enabled. The dashboard and video tools still work.');return;}
  let pixelRatio=Math.min(window.devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.domElement.className='gl-view';target.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label',cctv?'Scripted camera illustration rendered from the 3D store, with body joints and labelled regions. This is not model inference.':'Interactive 3D supermarket. Drag to orbit, scroll to zoom.');

  const scene=new THREE.Scene();
  const backdrop=canvasTexture(512,512,paintBackdrop);scene.background=backdrop;
  // Image-based lighting gives metal, glass and the polished floor something to reflect.
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.3;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xdcebee,0x4b594f,.95));
  const key=new THREE.DirectionalLight(0xfff3dc,1.05);key.position.set(-7,16,8);key.castShadow=true;
  key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;
  key.shadow.camera.near=4;key.shadow.camera.far=36;key.shadow.bias=-.0004;key.shadow.normalBias=.035;key.shadow.radius=2.5;scene.add(key);

  const camera=new THREE.PerspectiveCamera(cctv?62:41,1,.1,100);camera.position.set(11,14.6,17);camera.zoom=cctv?1:interactive?1.22:1.08;
  const controls=cctv?null:new OrbitControls(camera,renderer.domElement);
  if(controls){controls.target.set(0,.6,0);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=32;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.12;}

  const groups=new Map<PartId,THREE.Group[]>(),selectable:THREE.Object3D[]=[];
  const register=(id:PartId,group:THREE.Group)=>{group.traverse(o=>{o.userData.part=id;});selectable.push(group);groups.set(id,[...(groups.get(id)??[]),group]);};
  const store=buildStore(scene,{devices:interactive&&focus!=='security',labels:!cctv,aniso:renderer.capabilities.getMaxAnisotropy(),register});

  const shopper=createShopper();shopper.group.visible=false;scene.add(shopper.group);
  const blobTex=canvasTexture(64,64,paintGlow('0,0,0'));
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,opacity:.4,depthWrite:false}));
  blob.rotation.x=-Math.PI/2;blob.renderOrder=5;blob.visible=false;scene.add(blob);
  const tagTex=pillTexture('CUSTOMER','#173d30','#d8f49a');
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tagTex,depthTest:false,toneMapped:false,transparent:true}));tag.scale.set(1.25,.27,1);tag.renderOrder=11;tag.visible=false;scene.add(tag);
  const ringMat=new THREE.MeshBasicMaterial({color:'#63e4bd',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  const pulseMat=ringMat.clone();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.36,.4,48),ringMat),pulse=new THREE.Mesh(new THREE.RingGeometry(.36,.385,48),pulseMat);
  for(const r of [ring,pulse]){r.rotation.x=-Math.PI/2;r.renderOrder=6;r.visible=false;scene.add(r);}

  // ------------------------------------------------------------ pointer interaction
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down:[number,number]=[0,0],hovered:PartId|null=null;
  const pick=(event:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return (ray.intersectObjects(selectable,true)[0]?.object.userData.part??null) as PartId|null;};
  const move=(e:PointerEvent)=>{if(!interactive||e.buttons)return;const id=pick(e);if(id!==hovered){hovered=id;interaction.current.onHover?.(id);}renderer.domElement.style.cursor=id?'pointer':'grab';};
  const leave=()=>{hovered=null;interaction.current.onHover?.(null);};
  const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
  const pointerUp=(e:PointerEvent)=>{if(interactive&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const id=pick(e);if(id)interaction.current.onSelect?.(id);}};
  renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerleave',leave);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  const markers=Array.from(target.querySelectorAll<HTMLButtonElement>('[data-part]')).map(el=>({el,part:PARTS.find(p=>p.id===el.dataset.part)!}));
  const zoneMarkers=Array.from(target.querySelectorAll<HTMLElement>('[data-zone]'));
  const project=new THREE.Vector3(),unit=new THREE.Vector3();

  const resize=()=>{const w=target.clientWidth,h=target.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(target);resize();

  // ------------------------------------------------------------ simulated camera view
  let camIndex=-1,flash=0;
  const cameraRigs=groups.get('camera')??[];
  const aimCctv=(i:number)=>{camIndex=i;camera.position.copy(cameraLens(i));camera.lookAt(...CCTV_AIM[i]);cameraRigs.forEach((g,n)=>{g.visible=n!==i;});if(camName.current)camName.current.textContent=`CAM 0${i+1} · A${i+1} ${ZONE_NAMES[i]}`;};
  if(cctv)aimCctv(0);
  const jointPos={} as Record<JointName,[number,number]>;
  const drawOverlay=(actor:Actor|null,visible:boolean)=>{
   const cv=overlay.current;if(!cv)return;
   const w=target.clientWidth,h=target.clientHeight,dpr=Math.min(window.devicePixelRatio,1.5),k=Math.max(.6,w/960);
   if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
   const ctx=cv.getContext('2d');if(!ctx)return;
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const toScreen=(v:THREE.Vector3)=>{v.project(camera);return v.z<1?[(v.x*.5+.5)*w,(-v.y*.5+.5)*h] as [number,number]:null;};
   const region=REGIONS[camIndex],corners=region.points.map(p=>toScreen(project.set(...p)));
   if(corners.every(Boolean)){
    const pts=corners as [number,number][];
    ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.fillStyle=region.color+'1c';ctx.fill();ctx.setLineDash([9*k,7*k]);ctx.lineWidth=2*k;ctx.strokeStyle=region.color;ctx.stroke();ctx.setLineDash([]);
    const lx=Math.min(...pts.map(p=>p[0])),ly=Math.min(...pts.map(p=>p[1]));
    ctx.font=`600 ${Math.round(13*k)}px ${FONT}`;ctx.textBaseline='bottom';ctx.textAlign='left';ctx.fillStyle=region.color;ctx.fillText(region.label,lx+2,ly-5*k);
   }
   if(actor&&visible){
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,ok=true;
    for(const name of JOINTS){
     const p=toScreen(shopper.joints[name].getWorldPosition(project));if(!p){ok=false;break;}
     jointPos[name]=p;x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);
    }
    if(ok){
     const pad=(y1-y0)*.12+6;x0-=pad;x1+=pad;y0-=pad*1.3;y1+=pad*.7;
     ctx.lineWidth=2.4*k;ctx.strokeStyle='#73ffd0';ctx.lineCap='round';ctx.beginPath();
     for(const [a,b] of BONES){ctx.moveTo(...jointPos[a]);ctx.lineTo(...jointPos[b]);}
     const neck:[number,number]=[(jointPos.shL[0]+jointPos.shR[0])/2,(jointPos.shL[1]+jointPos.shR[1])/2];
     ctx.moveTo(...neck);ctx.lineTo(...jointPos.head);ctx.stroke();
     for(const name of JOINTS){const [x,y]=jointPos[name];ctx.beginPath();ctx.arc(x,y,(name==='wrR'||name==='wrL'?4.6:3.6)*k,0,Math.PI*2);ctx.fillStyle=name==='wrR'||name==='wrL'?'#ffdd75':'#8affd6';ctx.fill();}
     ctx.lineWidth=2*k;ctx.strokeStyle='#6ff3bb';ctx.strokeRect(x0,y0,x1-x0,y1-y0);
     const label='S01 · ILLUSTRATED POSE';ctx.font=`700 ${Math.round(12*k)}px ${FONT}`;
     const lw=ctx.measureText(label).width+14*k,lh=21*k;ctx.fillStyle='#6ff3bb';ctx.fillRect(x0-1,y0-lh,lw,lh);
     ctx.fillStyle='#102e2b';ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(label,x0+6*k,y0-lh/2+1);
     if(actor.action==='bagging'){
      const hip=jointPos.hpL,size=(y1-y0)*.26;
      ctx.strokeStyle='#ffd474';ctx.lineWidth=2*k;ctx.strokeRect(hip[0]-size/2,hip[1]-size*.75,size,size);
      ctx.fillStyle='#ffdf98';ctx.font=`600 ${Math.round(12*k)}px ${FONT}`;ctx.textBaseline='middle';ctx.fillText('BAG-AREA MOTION',hip[0]+size/2+7*k,hip[1]-size*.25);
     }
    }
   }
   if(flash>.01){ctx.fillStyle=`rgba(214,255,238,${flash*.45})`;ctx.fillRect(0,0,w,h);}
  };

  // ------------------------------------------------------------ frame loop
  const snaps:Snap[]=[];
  let lastState:State|null=null,session='',offset=0,lastElapsed=0,renderT=0,wasRunning=false;
  let px=0,pz=0,heading=0,speed=0,placed=false,alpha=0,lastActor:Actor|null=null,shownClock='';
  let raf=0,lastFrame=0,lastView=-1,frames=0,rendered=0,measureStart=performance.now(),minInterval=0,goal:THREE.Vector3|null=null;
  const render=(now=0)=>{
   raf=requestAnimationFrame(render);
   if(document.hidden||now-lastFrame<minInterval-2)return;
   if(now-lastFrame>600){rendered=0;measureStart=now;}                       // returning from a hidden tab
   const dt=Math.min(.1,Math.max(.001,(now-lastFrame)/1000)),time=now/1000;lastFrame=now;frames++;
   const s=latest.current;

   // Controller state → smooth shopper motion.
   if(s&&s!==lastState){
    lastState=s;const off=s.elapsed-time,fresh=s.session_id!==session||s.elapsed<lastElapsed-.05;
    if(fresh){snaps.length=0;session=s.session_id;placed=false;}
    if(fresh||s.running!==wasRunning||off>offset||off<offset-.6)offset=off;else offset+=(off-offset)*.05;
    wasRunning=s.running;lastElapsed=s.elapsed;
    const snap={e:s.elapsed,a:s.mode==='simulation'?s.actors[0]??null:null};
    if(snaps.length&&snaps[snaps.length-1].e===snap.e)snaps[snaps.length-1]=snap;else snaps.push(snap);
    if(snaps.length>20)snaps.shift();
    if(fresh)renderT=Math.max(0,s.elapsed-DELAY);
   }
   let actor:Actor|null=null;
   if(snaps.length){
    const want=s?.running?Math.min(time+offset-DELAY,lastElapsed):lastElapsed;
    if(want>renderT)renderT=Math.min(want,renderT+dt*2.5);
    let a=snaps[0],b:Snap|undefined;
    for(const snap of snaps){if(snap.e<=renderT)a=snap;else{b=snap;break;}}
    if(a.e>renderT)b=undefined;
    if(a.a&&b?.a){
     const f=Math.min(1,Math.max(0,(renderT-a.e)/(b.e-a.e))),from=a.a,to=b.a,pick=f<.5?from:to;
     const h=from.heading!==undefined&&to.heading!==undefined?from.heading+wrap(to.heading-from.heading)*f:pick.heading;
     actor={...pick,x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f,heading:h};
    }else if(a.a&&a.e<=renderT)actor=a.a;
   }
   if(actor){
    if(!placed){px=actor.x;pz=actor.z;heading=actor.heading??0;speed=0;placed=true;}
    else{
     const dx=actor.x-px,dz=actor.z-pz,v=Math.hypot(dx,dz)/dt;
     speed+=(v-speed)*Math.min(1,dt*12);px=actor.x;pz=actor.z;
     const aim=v>.25?Math.atan2(dx,dz):actor.heading??heading;
     heading+=wrap(aim-heading)*(1-Math.exp(-dt*9));
    }
    lastActor=actor;alpha=Math.min(1,alpha+dt/.3);
   }else{alpha=Math.max(0,alpha-dt/.3);speed*=Math.max(0,1-dt*10);if(alpha===0)placed=false;}
   const pose=actor??lastActor,visible=alpha>.01&&!!pose;
   shopper.setOpacity(alpha);
   if(visible&&pose){
    shopper.group.position.set(px,0,pz);shopper.group.rotation.y=heading;
    shopper.update(dt,{speed:actor?speed:0,action:pose.action,item:pose.item,bagged:pose.bagged,time});
    blob.position.set(px,.021,pz);(blob.material as THREE.MeshBasicMaterial).opacity=.4*alpha;
    tag.position.set(px,2.08,pz);ring.position.set(px,.03,pz);pulse.position.set(px,.031,pz);
    const beat=(time*.8)%1;pulse.scale.setScalar(1+beat*.8);pulseMat.opacity=.7*(1-beat)*alpha;ringMat.opacity=.9*alpha;tag.material.opacity=alpha;
   }
   blob.visible=visible;tag.visible=ring.visible=pulse.visible=visible&&!cctv;
   const tau=shopper.actionTime(),onBelt=visible&&!!actor&&actor.action==='checkout'&&actor.item&&tau>1.45;
   store.beltItem.visible=onBelt;if(onBelt)store.beltItem.position.set(-.1+Math.min(tau-1.45,1.6)*.26,1.077,3.36);
   store.update(time,dt,s,showCones.current&&!cctv);

   // Hover and selection emphasis.
   let scaling=false;
   groups.forEach((gs,id)=>{const size=interactive&&(id===hovered||id===interaction.current.active)?(id==='camera'?1.55:1.1):1;for(const g of gs){if(Math.abs(g.scale.x-size)>.002){g.scale.lerp(unit.setScalar(size),.18);scaling=true;}else if(g.scale.x!==size)g.scale.setScalar(size);}});

   if(cctv){
    let wanted=camIndex;
    if(actor){if(actor.x<-1.9)wanted=0;else if(actor.x>1.9)wanted=2;else if(actor.x>-1.55&&actor.x<1.55)wanted=1;}
    if(wanted!==camIndex){aimCctv(wanted);flash=1;}
    flash*=Math.max(0,1-dt*5);
    const label=clock(s?.elapsed??0);if(label!==shownClock&&camClock.current){shownClock=label;camClock.current.textContent=label;}
   }else if(controls){
    if(lastView!==viewRef.current){const first=lastView<0;lastView=viewRef.current;goal=lastView%2?new THREE.Vector3(.1,25,.1):new THREE.Vector3(11,14.6,17);controls.target.set(0,.6,0);if(first){camera.position.copy(goal);goal=null;}}
    if(goal){camera.position.lerp(goal,1-Math.exp(-dt*5));if(camera.position.distanceTo(goal)<.06)goal=null;}
    controls.update();
    const w=target.clientWidth,h=target.clientHeight;
    for(const {el,part} of markers){project.set(...part.position).project(camera);el.style.left=`${(project.x*.5+.5)*w}px`;el.style.top=`${(-project.y*.5+.5)*h}px`;el.style.visibility=project.z>1?'hidden':'visible';}
    zoneMarkers.forEach((el,i)=>{project.set(ZONE_X[i],.18,2.1).project(camera);el.style.left=`${(project.x*.5+.5)*w}px`;el.style.top=`${(-project.y*.5+.5)*h}px`;});
   }

   // The key light's shadow map is only redrawn while something that casts a shadow is changing.
   renderer.shadowMap.needsUpdate=frames<4||((visible||scaling)&&frames%2===0);
   renderer.render(scene,camera);rendered++;
   if(cctv)drawOverlay(actor,visible);
   if(now-measureStart>2500){
    const fps=rendered*1000/(now-measureStart);
    renderer.domElement.dataset.renderFps=fps.toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
    // Hold a steady 30 fps on slower graphics rather than an uneven higher rate; then trade resolution for speed.
    if(minInterval===0&&fps<46)minInterval=33;
    else if(minInterval>0&&fps<23&&pixelRatio>.7){pixelRatio=pixelRatio>1?1:.75;renderer.setPixelRatio(pixelRatio);resize();}
    rendered=0;measureStart=now;
   }
  };
  render();
  // Diagnostic: average cost of one fully finished frame in milliseconds, independent of the display refresh rate.
  (renderer.domElement as HTMLCanvasElement&{renderCost?:(n?:number,shadows?:boolean)=>number}).renderCost=(n=20,shadows=false)=>{
   const gl=renderer.getContext(),start=performance.now();
   for(let i=0;i<n;i++){renderer.shadowMap.needsUpdate=shadows;renderer.render(scene,camera);}
   gl.finish();return (performance.now()-start)/n;
  };
  (renderer.domElement as unknown as {debug:unknown}).debug={scene,renderer,camera,THREE,key,controls,step:(t:number)=>render(t)};
  return()=>{
   cancelAnimationFrame(raf);observer.disconnect();controls?.dispose();
   renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
   scene.traverse(obj=>{
    if(obj instanceof THREE.Mesh||obj instanceof THREE.LineSegments){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach((m:THREE.Material)=>m.dispose());}
    if(obj instanceof THREE.Sprite)obj.material.dispose();
   });
   store.dispose();backdrop.dispose();blobTex.dispose();tagTex.dispose();environment.dispose();key.shadow.map?.dispose();
   renderer.dispose();renderer.domElement.remove();
  };
 },[interactive,focus,cctv]);
 const visibleParts=PARTS.filter(p=>focus==='all'||(focus==='lighting'?['camera','edge','controller','driver','light','power']:['camera','shelf','checkout','exit']).includes(p.id));
 return <div className={`store-canvas ${interactive?'interactive-canvas':''} ${cctv?'cctv-canvas':''}`} ref={host}>
  {interactive&&<div className="hotspot-layer">{visibleParts.map(p=><button key={p.id} data-part={p.id} aria-label={`Explore ${p.name}`} className={`scene-hotspot ${active===p.id?'active':''}`} onPointerEnter={()=>onHover?.(p.id)} onPointerLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(p.id)} onBlur={()=>onHover?.(null)} onClick={()=>onSelect?.(p.id)}><b>{p.number}</b><span>{p.name}</span></button>)}</div>}
  {interactive&&<div className="zone-sign-layer">{[0,1,2].map(i=><div key={i} data-zone={i} className={`zone-sign ${(state?.zones[i]?.level??0)>60?'bright':''}`}><b>A{i+1}</b><span>{state?.zones[i]?`${Math.round(state.zones[i].level)}%`:'Not mapped'}</span></div>)}</div>}
  {cctv&&!error&&<><canvas className="cctv-overlay" ref={overlay} aria-hidden="true"/><div className="cctv-vignette"/><div className="cctv-hud"><span className="cctv-tag"><i/>SCRIPTED CAMERA ILLUSTRATION</span><span className="cctv-cam" ref={camName}>CAM 01 · A1 PRODUCE</span><span className="cctv-note">Body joints and boxes explain the proposed analysis · no AI inference on this animation</span><span className="cctv-clock" ref={camClock}>00:00</span></div></>}
  {error&&(fallback??<div className="canvas-error">{error}</div>)}
 </div>;
}
