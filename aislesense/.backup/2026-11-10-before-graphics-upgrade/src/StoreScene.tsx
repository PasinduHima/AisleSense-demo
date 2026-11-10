import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import type {State} from './types';
import {PARTS,type PartId} from './explorerData';

type Props={state:State|null;cones:boolean;view:number;interactive?:boolean;active?:PartId|null;focus?:'all'|'security'|'lighting';onSelect?:(id:PartId)=>void;onHover?:(id:PartId|null)=>void};
export function StoreScene({state,cones,view,interactive=false,active=null,focus='all',onSelect,onHover}:Props){
 const host=useRef<HTMLDivElement>(null), latest=useRef(state), showCones=useRef(cones), viewRef=useRef(view);
 const interaction=useRef({active,onSelect,onHover});interaction.current={active,onSelect,onHover};
 const [error,setError]=useState(''); latest.current=state;showCones.current=cones;viewRef.current=view;
 useEffect(()=>{
  if(!host.current)return;
  const target=host.current;
  let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:interactive,powerPreference:'low-power'});}catch{setError('3D is unavailable in this browser. Try Chrome or Edge with graphics acceleration enabled. The dashboard and video tools still work.');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x182d30,1);target.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','Interactive 3D supermarket. Drag to orbit, scroll to zoom.');
  const groups=new Map<PartId,THREE.Group[]>(); const selectable:THREE.Object3D[]=[];
  const register=(id:PartId,objects:THREE.Object3D[],pos:THREE.Vector3)=>{const group=new THREE.Group();group.position.copy(pos);scene.add(group);objects.forEach(o=>group.attach(o));group.traverse(o=>o.userData.part=id);selectable.push(group);groups.set(id,[...(groups.get(id)??[]),group]);return group;};
  const scene=new THREE.Scene();scene.background=new THREE.Color('#182d30');
  const camera=new THREE.PerspectiveCamera(41,1,.1,100);camera.position.set(11,14,17);camera.zoom=interactive?1.22:1.08;
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;
  controls.minDistance=12;controls.maxDistance=32;controls.maxPolarAngle=Math.PI*.46;controls.minPolarAngle=.12;
  scene.add(new THREE.HemisphereLight(0xd5ebef,0x526055,1.55));
  const sun=new THREE.DirectionalLight(0xfff9e9,2.2);sun.position.set(-7,16,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.03;scene.add(sun);
  const mat=(color:string)=>new THREE.MeshStandardMaterial({color,roughness:.85});
  const green=mat('#204d3c'),wood=mat('#c6aa7d'),white=mat('#eff0e5'),metal=mat('#62766a'),dark=mat('#263e35');
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,parent:THREE.Object3D=scene)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const cylinder=(r:number,h:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
  };
  const label=(text:string,x:number,y:number,z:number,width=2.1,color='#244a3a',background='#ffffff')=>{
    const c=document.createElement('canvas');c.width=512;c.height=110;const ctx=c.getContext('2d')!;
    ctx.fillStyle=background;ctx.beginPath();ctx.roundRect(5,5,502,100,20);ctx.fill();ctx.fillStyle=color;
    ctx.font='600 33px Segoe UI, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,55);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));s.position.set(x,y,z);s.scale.set(width,width*110/512,1);scene.add(s);return s;
  };
  box(13.3,.42,11.3,0,-.3,0,mat('#102c2a'));
  box(12.7,.08,10.7,0,-.035,0,mat('#cdd8d1'));
  for(let i=-5;i<=5;i++)box(.018,.004,10.6,i,0.012,0,mat('#dddcca'));
  for(let z=-4;z<=4;z++)box(12.6,.004,.018,0,.012,z,mat('#dddcca'));
  box(13,2.1,.16,0,.95,-5.4,green);box(.16,.55,10.7,-6.4,.2,0,green);
  box(.16,.55,8.1,6.4,.2,-1.25,green);
  // Warm edge trims, refrigerated back wall and planters add recognisable store detail.
  box(12.8,.045,.06,0,1.96,-5.28,mat('#ddbc72'));
  for(const x of [-4.7,-2.8,2.8,4.7]){
    box(1.6,1.5,.5,x,.78,-4.95,white);
    box(1.4,1.16,.025,x,.91,-4.68,mat('#406c73'));
    box(.035,1.15,.035,x,.91,-4.64,metal);
    for(let j=0;j<3;j++)box(1.38,.025,.04,x,.5+j*.38,-4.63,wood);
  }
  for(const x of [-5.8,5.8]){
    cylinder(.27,.42,wood,x,.22,4.5);
    for(let j=0;j<5;j++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.26,8,6),green);leaf.scale.set(.65,1.7,.65);leaf.position.set(x+Math.sin(j)*.15,.7+j*.04,4.5+Math.cos(j)*.15);scene.add(leaf);}
  }
  // Back wall fixtures, shelves and contrasting products keep the scene legible at projector size.
  const productMats=['#da9a5e','#d7c783','#82a57a','#a66b59','#8ba7a5','#d4d5bf'].map(mat);
  for(const x of [-5.2,-1.8,1.8,5.2]){
    const start=scene.children.length;
    box(.9,.12,5.1,x,.09,-1.15,green);
    box(.12,1.5,5.1,x,.8,-1.15,metal);
    for(let row=0;row<3;row++){
      const y=.38+row*.5;
      box(1.1,.08,5.1,x,y,-1.15,wood);
      for(let j=0;j<9;j++){
        const z=-3.35+j*.53;
        for(const side of [-1,1])box(.24,.22+(j%3)*.06,.28,x+side*.29,y+.18,z,productMats[(j+row)%6]);
      }
    }
    box(1.15,.1,5.15,x,1.7,-1.15,white);
    register('shelf',scene.children.slice(start),new THREE.Vector3(x,0,-1.15));
  }
  // Checkout and exit.
  const checkoutStart=scene.children.length;
  box(2.4,.95,1.05,.25,.48,3.5,green);box(2.55,.09,1.15,.25,1,3.5,wood);
  box(.9,.035,.65,-.35,1.06,3.5,dark);box(.45,.28,.06,.8,1.29,3.28,dark);
  cylinder(.04,.35,metal,.8,1.15,3.3);
  register('checkout',scene.children.slice(checkoutStart),new THREE.Vector3(.25,0,3.5));
  const exitMat=box(1.8,.015,.65,5.15,.02,4.65,mat('#c9dabd'));register('exit',[exitMat],new THREE.Vector3(5.15,0,4.65));
  label('CHECKOUT',.25,1.85,3.5,2);label('EXIT →',5.15,1,4.7,1.5);
  label('EVERGUARD MARKET',0,2.48,-5.4,3.2);
  const zoneX=[-3.5,0,3.5],zoneZ=[-.8,-.8,-.8];
  const lights:THREE.Mesh[]=[];const pools:THREE.Mesh[]=[];const cameras:THREE.Mesh[]=[];const spots:THREE.SpotLight[]=[];
  for(let i=0;i<3;i++){
    const x=zoneX[i],z=zoneZ[i];
    const bulb=new THREE.MeshStandardMaterial({color:'#fffbea',emissive:'#fff4c4',emissiveIntensity:1.5});
    const fixture=box(.36,.09,3.4,x,3.15,z,bulb);lights.push(fixture);register('light',[fixture],new THREE.Vector3(x,3.15,z));
    const spot=new THREE.SpotLight(0xffe9b2,22,9,.68,.75,1.6);spot.position.set(x,3.1,z);spot.target.position.set(x,0,z);scene.add(spot,spot.target);spots.push(spot);
    const pool=new THREE.Mesh(new THREE.PlaneGeometry(2.1,6.4),new THREE.MeshBasicMaterial({color:0xf3d45a,transparent:true,opacity:.4,depthWrite:false,toneMapped:false}));
    pool.rotation.x=-Math.PI/2;pool.position.set(x,.028,z);scene.add(pool);pools.push(pool);
    if(!interactive)label(`A${i+1} · ${i===0?'PRODUCE':i===1?'ESSENTIALS':'HOUSEHOLD'}`,x,.2,2.35,2.3);
    const rig=new THREE.Group();rig.position.set(x,3.55,-3.6);scene.add(rig);
    box(.4,.22,.3,0,0,0,white,rig);cylinder(.06,.2,metal,0,.2,0,rig);
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),dark);lens.position.set(0,-.1,.12);rig.add(lens);register('camera',[rig],rig.position.clone());
    const cone=new THREE.Mesh(new THREE.ConeGeometry(1.65,3.1,24,1,true),new THREE.MeshBasicMaterial({color:0x6aab94,transparent:true,opacity:.075,side:THREE.DoubleSide,depthWrite:false}));
    cone.position.set(x,1.9,-2.6);scene.add(cone);cameras.push(cone);
    label(`CAM 0${i+1}`,x,3.95,-3.6,1.2);
  }
  if(interactive&&focus!=='security'){
    for(const id of ['network','edge','archive','review','controller','driver','power'] as PartId[]){
      const p=PARTS.find(p=>p.id===id)!;const [x,y,z]=p.position;const bits:THREE.Object3D[]=[];
      if(id==='review'){
        bits.push(box(.95,1.5,.12,x,y,z,dark),box(.78,1.24,.025,x,y+.02,z+.08,mat('#9fbd82')));
        for(let j=0;j<3;j++)bits.push(box(.58,.12,.025,x,y+.34-j*.28,z+.1,white));
      }else{
        bits.push(box(id==='edge'?1.2:.7,.5,.55,x,y,z,id==='power'?white:dark));
        bits.push(box(.5,.26,.035,x,y+.02,z+.3,id==='edge'?green:mat('#76965a')));
        for(let j=0;j<3;j++)bits.push(box(.07,.06,.03,x-.2+j*.14,y-.1,z+.33,mat('#dfbe71')));
      }
      register(id,bits,new THREE.Vector3(x,y,z));
    }
  }
  const person=new THREE.Group();scene.add(person);
  const shirt=mat('#bf754b'),skin=mat('#cfaa85'),trousers=mat('#374b58');
  cylinder(.23,.65,shirt,0,1.05,0,person);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.19,16,12),skin);head.position.y=1.59;head.castShadow=true;person.add(head);
  const legs=[box(.15,.58,.18,-.12,.39,0,trousers,person),box(.15,.58,.18,.12,.39,0,trousers,person)];
  const arm=new THREE.Group();arm.position.set(-.28,1.3,0);person.add(arm);box(.12,.49,.14,0,-.2,0,shirt,arm);
  box(.12,.5,.14,.28,1.05,0,shirt,person);
  const item=box(.15,.23,.14,0,-.48,0,mat('#f2d67d'),arm);
  const bag=box(.31,.45,.2,.34,.6,0,mat('#596d48'),person);bag.rotation.z=-.1;
  const personTag=label('● CUSTOMER',0,2.1,0,1.8,'#173d30','#d8f49a');
  const trackingRing=new THREE.Mesh(new THREE.RingGeometry(.36,.41,32),new THREE.MeshBasicMaterial({color:'#63e4bd',side:THREE.DoubleSide,transparent:true,opacity:.9}));trackingRing.rotation.x=-Math.PI/2;scene.add(trackingRing);
  let rendered=0,measureStart=performance.now();
  let raf=0,lastView=-1,lastFrame=0,hovered:PartId|null=null;
  const pointer=new THREE.Vector2(),ray=new THREE.Raycaster();let down:[number,number]=[0,0];
  const pick=(event:PointerEvent)=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);return (ray.intersectObjects(selectable,true)[0]?.object.userData.part??null) as PartId|null;};
  const move=(e:PointerEvent)=>{if(!interactive||e.buttons)return;const id=pick(e);if(id!==hovered){hovered=id;interaction.current.onHover?.(id);}renderer.domElement.style.cursor=id?'pointer':'grab';};
  const leave=()=>{hovered=null;interaction.current.onHover?.(null);};
  const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
  const pointerUp=(e:PointerEvent)=>{if(interactive&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const id=pick(e);if(id)interaction.current.onSelect?.(id);}};
  renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerleave',leave);renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  const markers=Array.from(target.querySelectorAll<HTMLButtonElement>('[data-part]'));
  const zoneMarkers=Array.from(target.querySelectorAll<HTMLElement>('[data-zone]'));
  const project=new THREE.Vector3();

  const resize=()=>{const w=target.clientWidth,h=target.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(target);resize();
  const render=(now=0)=>{
    raf=requestAnimationFrame(render);if(now-lastFrame<32||document.hidden)return;lastFrame=now;const s=latest.current;
    groups.forEach((gs,id)=>gs.forEach(g=>{const size=interactive&&(id===hovered||id===interaction.current.active)?(id==='camera'?1.55:1.1):1;g.scale.lerp(new THREE.Vector3(size,size,size),.18);}));
    markers.forEach(marker=>{const p=PARTS.find(p=>p.id===marker.dataset.part)!;project.set(...p.position).project(camera);marker.style.left=`${(project.x*.5+.5)*target.clientWidth}px`;marker.style.top=`${(-project.y*.5+.5)*target.clientHeight}px`;marker.style.visibility=project.z>1?'hidden':'visible';});
    zoneMarkers.forEach((marker,i)=>{project.set(zoneX[i],.18,2.1).project(camera);marker.style.left=`${(project.x*.5+.5)*target.clientWidth}px`;marker.style.top=`${(-project.y*.5+.5)*target.clientHeight}px`;});
    if(lastView!==viewRef.current){lastView=viewRef.current;if(lastView%2){camera.position.set(.1,25,.1);}else camera.position.set(11,14,17);controls.target.set(0,0,0);}
    cameras.forEach((c,i)=>{c.visible=showCones.current;(c.material as THREE.MeshBasicMaterial).opacity=s?.zones[i]?.count?.valueOf()? .13:.025;});
    lights.forEach((light,i)=>{const level=s?.zones[i]?.level??30;(light.material as THREE.MeshStandardMaterial).emissiveIntensity=.05+level*.025;const pool=pools[i].material as THREE.MeshBasicMaterial;pool.color.set(level>60?'#f3d45a':'#49665e');pool.opacity=level>60?.42:.32;spots[i].intensity=level*.3;});
    const actor=s?.actors[0];person.visible=!!actor;personTag.visible=!!actor;trackingRing.visible=!!actor;
    if(actor){
      const dx=actor.x-person.position.x,dz=actor.z-person.position.z;
      person.position.lerp(new THREE.Vector3(actor.x,0,actor.z),.16);
      if(Math.abs(dx)+Math.abs(dz)>.03)person.rotation.y=Math.atan2(dx,dz);
      const moving=actor.action==='walking',t=s?.elapsed??0;
      legs[0].rotation.x=moving?Math.sin(t*8)*.35:0;legs[1].rotation.x=-legs[0].rotation.x;
      arm.rotation.z=actor.action==='picking'?1.25:actor.action==='bagging'?.7:0;
      arm.rotation.x=actor.action==='bagging'?-1.2:0;item.visible=actor.item;
      personTag.position.set(person.position.x,2.15,person.position.z);
      trackingRing.position.set(person.position.x,.05,person.position.z);
    }
    controls.update();renderer.render(scene,camera);rendered++;if(now-measureStart>3000){renderer.domElement.dataset.renderFps=(rendered*1000/(now-measureStart)).toFixed(1);renderer.domElement.dataset.drawCalls=String(renderer.info.render.calls);rendered=0;measureStart=now;}
  };render();
  return()=>{cancelAnimationFrame(raf);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);scene.traverse(obj=>{
    if(obj instanceof THREE.Mesh){obj.geometry.dispose();const ms=Array.isArray(obj.material)?obj.material:[obj.material];ms.forEach(m=>m.dispose());}
    if(obj instanceof THREE.Sprite){obj.material.map?.dispose();obj.material.dispose();}
  });renderer.dispose();renderer.domElement.remove();};
 },[interactive,focus]);
 const visibleParts=PARTS.filter(p=>focus==='all'||(focus==='lighting'?['camera','edge','controller','driver','light','power']:['camera','shelf','checkout','exit']).includes(p.id));
 return <div className={`store-canvas ${interactive?'interactive-canvas':''}`} ref={host}>{interactive&&<div className="hotspot-layer">{visibleParts.map(p=><button key={p.id} data-part={p.id} aria-label={`Explore ${p.name}`} className={`scene-hotspot ${active===p.id?'active':''}`} onPointerEnter={()=>onHover?.(p.id)} onPointerLeave={()=>onHover?.(null)} onFocus={()=>onHover?.(p.id)} onBlur={()=>onHover?.(null)} onClick={()=>onSelect?.(p.id)}><b>{p.number}</b><span>{p.name}</span></button>)}</div>}{interactive&&<div className="zone-sign-layer">{[0,1,2].map(i=><div key={i} data-zone={i} className={`zone-sign ${(state?.zones[i]?.level??0)>60?'bright':''}`}><b>A{i+1}</b><span>{state?.zones[i]?`${Math.round(state.zones[i].level)}%`:'Not mapped'}</span></div>)}</div>}{error&&<div className="canvas-error">{error}</div>}</div>;
}
