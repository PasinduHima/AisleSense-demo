import {useEffect,useRef,useState,type ReactNode} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Actor,State} from './types';
import {PARTS,type PartId} from './explorerData';
import {buildStore,cameraLens,ZONE_NAMES,ZONE_X} from './scene/store';
import {JOINTS,LOOKS,createShopper,type Shopper} from './scene/shopper';
import {RISK_COLORS,RISK_NAMES,cameraStamp,confidence,createGrain,drawPerson,type Points} from './scene/overlay';
import {canvasTexture,paintBackdrop,paintGlow,pillTexture,FONT} from './scene/textures';
import './scene/scene.css';

type Props={state:State|null;cones:boolean;
 /** Viewpoint preset: 0 overview, 1 top-down, 2 aisle, 3 CCTV position. */
 view:number;interactive?:boolean;active?:PartId|null;focus?:'all'|'security'|'lighting';
 /** Renders the store through the aisle cameras with an explanatory pose overlay instead of the orbit view. */
 cctv?:boolean;
 /** Fixed camera for the CCTV view (0–2); leave undefined to follow the person of interest. */
 cam?:number;
 /** Solid colour behind the store; leave undefined for the default soft gradient backdrop. */
 background?:string;fallback?:ReactNode;onSelect?:(id:PartId)=>void;onHover?:(id:PartId|null)=>void};
type Snap={e:number;a:Actor[]};
type Rig={id:string;shopper:Shopper;blob:THREE.Mesh;tag:THREE.Sprite;tagKey:string;px:number;pz:number;heading:number;speed:number;alpha:number;placed:boolean;live:boolean;gone:number;pose:Actor};
/** Snapshots arrive about four times a second; rendering slightly in the past lets motion be interpolated. */
const DELAY=.34;
const wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
const zoneOf=(x:number)=>x<-1.75?0:x>1.75?2:1;
const CCTV_AIM:[number,number,number][]=[[-3.7,.7,1.4],[.1,.7,2.3],[4,.7,2.4]];
const REGIONS:{label:string;color:string;points:[number,number,number][]}[]=[
 {label:'SHELF REGION',color:'#ffd474',points:[[-4.64,.95,-.4],[-4.64,.95,1],[-4.64,1.78,1],[-4.64,1.78,-.4]]},
 {label:'CHECKOUT LANE',color:'#cfe6da',points:[[-1,.02,2.15],[1.5,.02,2.15],[1.5,.02,2.95],[-1,.02,2.95]]},
 {label:'EXIT ZONE',color:'#f0a37c',points:[[4.25,.02,4],[6.05,.02,4],[6.05,.02,5.4],[4.25,.02,5.4]]},
];

export function StoreScene({state,cones,view,interactive=false,active=null,focus='all',cctv=false,cam,background,fallback,onSelect,onHover}:Props){
 const host=useRef<HTMLDivElement>(null),overlay=useRef<HTMLCanvasElement>(null),camName=useRef<HTMLSpanElement>(null),camClock=useRef<HTMLSpanElement>(null);
 const latest=useRef(state),showCones=useRef(cones),viewRef=useRef(view),camRef=useRef(cam);
 const interaction=useRef({active,onSelect,onHover});interaction.current={active,onSelect,onHover};
 const [error,setError]=useState('');latest.current=state;showCones.current=cones;viewRef.current=view;camRef.current=cam;
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
  renderer.domElement.setAttribute('aria-label',cctv?'Scripted camera illustration rendered from the 3D store, with body keypoints, person boxes and labelled regions. This is not model inference.':'Interactive 3D supermarket. Drag to orbit, scroll to zoom.');

  const scene=new THREE.Scene();
  const backdrop=canvasTexture(512,512,paintBackdrop);scene.background=background?new THREE.Color(background):backdrop;
  // A little haze gives the room depth and softens the far wall.
  scene.fog=new THREE.FogExp2('#1a3236',cctv?.006:.011);
  // Image-based lighting gives metal, glass and the polished floor something to reflect.
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.04);
  scene.environment=environment.texture;scene.environmentIntensity=.3;room.dispose();pmrem.dispose();
  // General light is kept low so each aisle's own luminaire decides how bright that aisle looks.
  scene.add(new THREE.HemisphereLight(0xdcebee,0x4b594f,.5));
  const key=new THREE.DirectionalLight(0xfff3dc,.62);key.position.set(-7,16,8);key.castShadow=true;
  key.shadow.mapSize.set(1536,1536);key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;
  key.shadow.camera.near=4;key.shadow.camera.far=36;key.shadow.bias=-.0004;key.shadow.normalBias=.035;key.shadow.radius=3.5;scene.add(key);

  const camera=new THREE.PerspectiveCamera(cctv?62:41,1,.1,100);camera.position.set(11,14.6,17);camera.zoom=cctv?1:interactive?1.22:1.08;
  const controls=cctv?null:new OrbitControls(camera,renderer.domElement);
  if(controls){controls.target.set(0,.6,0);controls.enableDamping=true;controls.minDistance=3.5;controls.maxDistance=32;controls.maxPolarAngle=Math.PI*.47;controls.minPolarAngle=.12;}

  const groups=new Map<PartId,THREE.Group[]>(),selectable:THREE.Object3D[]=[];
  const register=(id:PartId,group:THREE.Group)=>{group.traverse(o=>{o.userData.part=id;});selectable.push(group);groups.set(id,[...(groups.get(id)??[]),group]);};
  const store=buildStore(scene,{devices:interactive&&focus!=='security',labels:!cctv,aniso:renderer.capabilities.getMaxAnisotropy(),register});

  // ------------------------------------------------------------ people
  const rigs=new Map<string,Rig>();
  const blobTex=canvasTexture(64,64,paintGlow('0,0,0')),blobGeo=new THREE.PlaneGeometry(1,1);
  const tagTextures=new Map<string,THREE.Texture>();
  const tagTexture=(text:string,fg:string,bg:string)=>{const k=`${text}|${bg}`;let t=tagTextures.get(k);if(!t){t=pillTexture(text,fg,bg);tagTextures.set(k,t);}return t;};
  const makeRig=(actor:Actor):Rig=>{
   let seed=0;for(const c of actor.id)seed=(seed*31+c.charCodeAt(0))%97;
   const shopper=createShopper(LOOKS[actor.look??0]??LOOKS[0],seed/97);shopper.group.visible=false;scene.add(shopper.group);
   const blob=new THREE.Mesh(blobGeo,new THREE.MeshBasicMaterial({map:blobTex,transparent:true,opacity:.4,depthWrite:false,fog:false}));
   blob.rotation.x=-Math.PI/2;blob.renderOrder=5;blob.visible=false;scene.add(blob);
   const tag=new THREE.Sprite(new THREE.SpriteMaterial({depthTest:false,toneMapped:false,transparent:true,fog:false}));tag.scale.set(1.25,.27,1);tag.renderOrder=11;tag.visible=false;scene.add(tag);
   return {id:actor.id,shopper,blob,tag,tagKey:'',px:actor.x,pz:actor.z,heading:actor.heading??0,speed:0,alpha:0,placed:false,live:false,gone:0,pose:actor};
  };
  const dropRig=(rig:Rig)=>{rig.shopper.dispose();rig.blob.removeFromParent();(rig.blob.material as THREE.Material).dispose();rig.tag.removeFromParent();rig.tag.material.dispose();rigs.delete(rig.id);};
  /** Floating label: staff role, risk level for a person of interest, or the single shopper of the short scenes. */
  const tagFor=(a:Actor,solo:boolean):[string,string,string]|null=>a.label?[a.label,'#eaf2ff','#22324e']:a.risk?[`${a.id} · ${RISK_NAMES[a.risk]}`,'#16130a',RISK_COLORS[a.risk]]:solo&&!a.role?['CUSTOMER','#173d30','#d8f49a']:null;
  const ringMat=new THREE.MeshBasicMaterial({color:'#63e4bd',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,fog:false});
  const pulseMat=ringMat.clone();
  const ring=new THREE.Mesh(new THREE.RingGeometry(.36,.4,48),ringMat),pulse=new THREE.Mesh(new THREE.RingGeometry(.36,.385,48),pulseMat);
  for(const r of [ring,pulse]){r.rotation.x=-Math.PI/2;r.renderOrder=6;r.visible=false;scene.add(r);}
  // The customer of the single-person scenes is built and its shaders compiled now, while the page opens,
  // so pressing a play button only has to move him.
  const ready=makeRig({id:'S01',x:0,z:20,action:'walking',item:false,bagged:false});rigs.set('S01',ready);
  ready.shopper.group.visible=ready.blob.visible=true;renderer.compile(scene,camera);ready.shopper.group.visible=ready.blob.visible=false;
  // Unlit overlays (halos, floor markings, labels) keep their authored colour instead of picking up haze.
  scene.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material|undefined;if(m&&!Array.isArray(m)&&(m instanceof THREE.MeshBasicMaterial||m instanceof THREE.SpriteMaterial||m instanceof THREE.LineBasicMaterial))m.fog=false;});

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
  const cameraRigs=groups.get('camera')??[],grain=createGrain();
  const aimCctv=(i:number)=>{camIndex=i;camera.position.copy(cameraLens(i));camera.lookAt(...CCTV_AIM[i]);cameraRigs.forEach((g,n)=>{g.visible=n!==i;});if(camName.current)camName.current.textContent=`CAM 0${i+1} · A${i+1} ${ZONE_NAMES[i]}`;};
  if(cctv)aimCctv(0);
  const points={} as Points;
  const drawOverlay=(simTime:number)=>{
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
   // Keypoints are read from the rendered figure in the same frame, so the skeleton cannot lag or jitter.
   rigs.forEach(rig=>{
    if(rig.alpha<.5)return;
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    for(const name of JOINTS){
     const p=toScreen(rig.shopper.joints[name].getWorldPosition(project));if(!p)return;
     points[name]=p;x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);
    }
    if(x1<0||x0>w||y1<0||y0>h)return;
    drawPerson(ctx,k,points,rig.pose,confidence(rig.id,simTime));
   });
   grain(ctx,w,h);
   if(flash>.01){ctx.fillStyle=`rgba(214,255,238,${flash*.45})`;ctx.fillRect(0,0,w,h);}
  };

  // ------------------------------------------------------------ frame loop
  const snaps:Snap[]=[];
  let lastState:State|null=null,session='',offset=0,lastElapsed=0,renderT=0,wasRunning=false,lastRate=1,shownClock='';
  let raf=0,lastFrame=0,lastView=-1,frames=0,rendered=0,measureStart=performance.now(),minInterval=0,steady=0,retries=3,lowered=false,goal:THREE.Vector3|null=null,goalTarget=new THREE.Vector3(0,.6,0);
  const render=(now=0)=>{
   raf=requestAnimationFrame(render);
   if(document.hidden||now-lastFrame<minInterval-2)return;
   if(now-lastFrame>600){rendered=0;measureStart=now;}                       // returning from a hidden tab
   const dt=Math.min(.1,Math.max(.001,(now-lastFrame)/1000)),time=now/1000;lastFrame=now;frames++;
   const s=latest.current,rate=s?.speed??1;

   // Controller state → smooth motion. The scene clock follows the controller, including its playback speed.
   if(s&&s!==lastState){
    lastState=s;const off=s.elapsed-time*rate,fresh=s.session_id!==session||s.elapsed<lastElapsed-.05;
    if(fresh){snaps.length=0;session=s.session_id;rigs.forEach(r=>{r.placed=false;});}
    if(fresh||rate!==lastRate||s.running!==wasRunning||off>offset||off<offset-.6*rate)offset=off;else offset+=(off-offset)*.05;
    wasRunning=s.running;lastElapsed=s.elapsed;lastRate=rate;
    const snap={e:s.elapsed,a:s.mode==='simulation'?s.actors:[]};
    if(snaps.length&&snaps[snaps.length-1].e===snap.e)snaps[snaps.length-1]=snap;else snaps.push(snap);
    if(snaps.length>20)snaps.shift();
    if(fresh)renderT=Math.max(0,s.elapsed-DELAY*rate);
   }
   const before=renderT;
   let actors:Actor[]=[];
   if(snaps.length){
    const want=s?.running?Math.min(time*rate+offset-DELAY*rate,lastElapsed):lastElapsed;
    if(want>renderT)renderT=Math.min(want,renderT+dt*2.5*rate);
    let a=snaps[0],b:Snap|undefined;
    for(const snap of snaps){if(snap.e<=renderT)a=snap;else{b=snap;break;}}
    if(a.e<=renderT){
     if(b){
      const next=b,f=Math.min(1,Math.max(0,(renderT-a.e)/(next.e-a.e)));
      actors=a.a.map(from=>{
       const to=next.a.find(x=>x.id===from.id);if(!to)return from;
       const pick=f<.5?from:to,h=from.heading!==undefined&&to.heading!==undefined?from.heading+wrap(to.heading-from.heading)*f:pick.heading;
       return {...pick,x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f,heading:h};
      });
     }else actors=a.a;
    }else if(a===snaps[0])actors=a.a;       // nothing earlier is known yet: show the first pose rather than an empty store
   }
   const simDt=Math.max(0,renderT-before);
   rigs.forEach(r=>{r.live=false;});
   for(const actor of actors){
    let rig=rigs.get(actor.id);if(!rig){rig=makeRig(actor);rigs.set(actor.id,rig);}
    if(!rig.placed){rig.px=actor.x;rig.pz=actor.z;rig.heading=actor.heading??0;rig.speed=0;rig.placed=true;}
    else{
     const dx=actor.x-rig.px,dz=actor.z-rig.pz,v=simDt>1e-4?Math.hypot(dx,dz)/simDt:rig.speed;
     if(simDt>1e-4)rig.speed+=(v-rig.speed)*Math.min(1,dt*12);
     rig.px=actor.x;rig.pz=actor.z;
     const aim=v>.25&&simDt>1e-4?Math.atan2(dx,dz):actor.heading??rig.heading;
     rig.heading+=wrap(aim-rig.heading)*(1-Math.exp(-dt*9));
    }
    rig.pose=actor;rig.live=true;rig.gone=0;rig.alpha=Math.min(1,rig.alpha+dt/.3);
   }
   // Person of interest: the highest risk level, or the only shopper in the short single-person scenes.
   const shoppers=actors.filter(a=>a.role!=='staff'),solo=shoppers.length===1;
   let subject:Rig|null=null,anyVisible=false,belt:Rig|null=null;
   rigs.forEach(rig=>{
    if(!rig.live){rig.alpha=Math.max(0,rig.alpha-dt/.3);if(rig.alpha===0){rig.placed=false;rig.gone+=dt;if(rig.gone>4&&rig!==ready){dropRig(rig);return;}}}
    const visible=rig.alpha>.01,pose=rig.pose;
    rig.shopper.setOpacity(rig.alpha);rig.blob.visible=visible;
    let label:[string,string,string]|null=null;
    if(visible){
     anyVisible=true;
     rig.shopper.group.position.set(rig.px,0,rig.pz);rig.shopper.group.rotation.y=rig.heading;
     if(simDt>0)rig.shopper.update(simDt,{speed:rig.live?rig.speed:0,action:pose.action,item:pose.item,bagged:pose.bagged,time:renderT});
     rig.blob.position.set(rig.px,.021,rig.pz);(rig.blob.material as THREE.MeshBasicMaterial).opacity=.4*rig.alpha;
     if(rig.live&&pose.role!=='staff'&&((pose.risk??0)>(subject?.pose.risk??0)||(!subject&&solo)))subject=rig;
     if(rig.live&&pose.action==='checkout'&&pose.item&&rig.shopper.actionTime()>1.45)belt??=rig;
     label=cctv?null:tagFor(pose,solo);
    }
    const tagKey=label?`${label[0]}|${label[2]}`:'';
    if(tagKey!==rig.tagKey){rig.tagKey=tagKey;if(label){rig.tag.material.map=tagTexture(...label);rig.tag.material.needsUpdate=true;}}
    rig.tag.visible=!!label;
    if(label){rig.tag.position.set(rig.px,2.12*rig.shopper.group.scale.y,rig.pz);rig.tag.material.opacity=rig.alpha;}
   });
   const focusRig=subject as Rig|null,beltRig=belt as Rig|null;
   ring.visible=pulse.visible=!!focusRig&&!cctv;
   if(focusRig){
    const colour=focusRig.pose.risk?RISK_COLORS[focusRig.pose.risk]:'#63e4bd',beat=(time*(focusRig.pose.risk===3?1.6:.8))%1;
    ringMat.color.set(colour);pulseMat.color.set(colour);
    ring.position.set(focusRig.px,.03,focusRig.pz);pulse.position.set(focusRig.px,.031,focusRig.pz);
    pulse.scale.setScalar(1+beat*.8);pulseMat.opacity=.7*(1-beat)*focusRig.alpha;ringMat.opacity=.9*focusRig.alpha;
   }
   store.beltItem.visible=!!beltRig;if(beltRig)store.beltItem.position.set(-.1+Math.min(beltRig.shopper.actionTime()-1.45,1.6)*.26,1.077,3.36);
   store.update(time,dt,s,showCones.current&&!cctv);

   // Hover and selection emphasis.
   let scaling=false;
   groups.forEach((gs,id)=>{const size=interactive&&(id===hovered||id===interaction.current.active)?(id==='camera'?1.55:1.1):1;for(const g of gs){if(Math.abs(g.scale.x-size)>.002){g.scale.lerp(unit.setScalar(size),.18);scaling=true;}else if(g.scale.x!==size)g.scale.setScalar(size);}});

   const watched=focusRig??[...rigs.values()].find(r=>r.live&&r.pose.role!=='staff')??null;
   if(cctv){
    let wanted=camIndex;const fixed=camRef.current;
    if(fixed!==undefined&&fixed>=0&&fixed<3)wanted=fixed;
    else if(watched){const x=watched.px;if(x<-1.9)wanted=0;else if(x>1.9)wanted=2;else if(x>-1.55&&x<1.55)wanted=1;}
    if(wanted!==camIndex){aimCctv(wanted);flash=1;}
    flash*=Math.max(0,1-dt*5);
    const label=cameraStamp(s?.elapsed??0);if(label!==shownClock&&camClock.current){shownClock=label;camClock.current.textContent=label;}
   }else if(controls){
    if(lastView!==viewRef.current){
     const first=lastView<0;lastView=viewRef.current;
     const preset=((lastView%4)+4)%4,zx=ZONE_X[watched?zoneOf(watched.px):0];
     goal=preset===1?new THREE.Vector3(.1,25,.1):preset===2?new THREE.Vector3(zx,2.9,5):preset===3?new THREE.Vector3(zx,3,-3.05):new THREE.Vector3(11,14.6,17);
     goalTarget=preset===2?new THREE.Vector3(zx,.9,-1.5):preset===3?new THREE.Vector3(zx,.5,1.8):new THREE.Vector3(0,.6,0);
     if(first){camera.position.copy(goal);controls.target.copy(goalTarget);goal=null;}
    }
    if(goal){const ease=1-Math.exp(-dt*5);camera.position.lerp(goal,ease);controls.target.lerp(goalTarget,ease);if(camera.position.distanceTo(goal)<.06){controls.target.copy(goalTarget);goal=null;}}
    controls.update();
    const w=target.clientWidth,h=target.clientHeight;
    for(const {el,part} of markers){project.set(...part.position).project(camera);el.style.left=`${(project.x*.5+.5)*w}px`;el.style.top=`${(-project.y*.5+.5)*h}px`;el.style.visibility=project.z>1?'hidden':'visible';}
    zoneMarkers.forEach((el,i)=>{project.set(ZONE_X[i],.18,2.1).project(camera);el.style.left=`${(project.x*.5+.5)*w}px`;el.style.top=`${(-project.y*.5+.5)*h}px`;el.style.visibility=project.z>1?'hidden':'visible';});
   }

   // The key light's shadow map is only redrawn while something that casts a shadow is changing.
   renderer.shadowMap.needsUpdate=frames<4||((anyVisible||scaling)&&frames%(minInterval?2:3)===0);
   renderer.render(scene,camera);rendered++;
   if(cctv)drawOverlay(renderT);
   if(now-measureStart>2500){
    const fps=rendered*1000/(now-measureStart);
    renderer.domElement.dataset.renderFps=fps.toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);renderer.domElement.dataset.triangles=String(renderer.info.render.triangles);
    // Hold a steady 30 fps on slower graphics rather than an uneven higher rate; then trade resolution for speed.
    if(minInterval===0&&fps<46){minInterval=33;steady=0;}
    // A slow spell (page load, another busy tab) should not cap the rate for good: retry full rate a few times.
    else if(minInterval>0&&fps>29&&!lowered&&++steady>=4&&retries-->0)minInterval=0;
    else if(minInterval>0&&fps<23&&pixelRatio>.7){lowered=true;pixelRatio=pixelRatio>1?1:.75;renderer.setPixelRatio(pixelRatio);resize();}
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
  (renderer.domElement as unknown as {debug:unknown}).debug={scene,renderer,camera,THREE,key,controls,rigs,step:(t:number)=>render(t)};
  return()=>{
   cancelAnimationFrame(raf);observer.disconnect();controls?.dispose();
   renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);
   scene.traverse(obj=>{
    if(obj instanceof THREE.Mesh||obj instanceof THREE.LineSegments){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach((m:THREE.Material)=>m.dispose());}
    if(obj instanceof THREE.Sprite)obj.material.dispose();
   });
   store.dispose();backdrop.dispose();blobTex.dispose();tagTextures.forEach(t=>t.dispose());environment.dispose();key.shadow.map?.dispose();
   renderer.dispose();renderer.domElement.remove();
  };
 },[interactive,focus,cctv,background]);
 const visibleParts=PARTS.filter(p=>focus==='all'||(focus==='lighting'?['camera','edge','controller','driver','light','power']:['camera','shelf','checkout','exit']).includes(p.id));
 return <div className={`store-canvas ${interactive?'interactive-canvas':''} ${cctv?'cctv-canvas':''}`} ref={host}>
  {interactive&&<div className="hotspot-layer">{visibleParts.map(p=><button key={p.id} data-part={p.id} aria-label={`Explore ${p.name}`} className={`scene-hotspot ${active===p.id?'active':''}`} onPointerEnter={()=>onHover?.(p.id)} onPointerLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(p.id)} onBlur={()=>onHover?.(null)} onClick={()=>onSelect?.(p.id)}><b>{p.number}</b><span>{p.name}</span></button>)}</div>}
  {interactive&&<div className="zone-sign-layer">{[0,1,2].map(i=><div key={i} data-zone={i} className={`zone-sign ${(state?.zones[i]?.level??0)>60?'bright':''} ${state?.zones[i]?.state==='Evidence boost'?'boost':''}`}><b>A{i+1}</b><span>{state?.zones[i]?`${Math.round(state.zones[i].level)}%`:'Not mapped'}</span></div>)}</div>}
  {cctv&&!error&&<><canvas className="cctv-overlay" ref={overlay} aria-hidden="true"/><div className="cctv-vignette"/><div className="cctv-hud"><span className="cctv-tag"><i/>REC · SIMULATED CAMERA</span><span className="cctv-cam" ref={camName}>CAM 01 · A1 PRODUCE</span><span className="cctv-note">Scripted scene · keypoints, boxes and scores illustrate the proposed analysis, not live AI inference</span><span className="cctv-clock" ref={camClock}>2026-11-11 10:15:00</span></div></>}
  {error&&(fallback??<div className="canvas-error">{error}</div>)}
 </div>;
}
