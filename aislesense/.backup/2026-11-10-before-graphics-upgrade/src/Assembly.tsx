import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {partById,type PartId} from './explorerData';

export function Assembly({id,explode,selected,onSelect,brightness}:{id:PartId;explode:boolean;selected:number;onSelect:(i:number)=>void;brightness:number}){
 const host=useRef<HTMLDivElement>(null),live=useRef({explode,selected,onSelect,brightness});live.current={explode,selected,onSelect,brightness};
 const [error,setError]=useState('');
 useEffect(()=>{
  const target=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{setError('3D cutaway unavailable. Use the labelled 2D path and component list below.');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));target.appendChild(renderer.domElement);renderer.setClearColor('#e6eee4',1);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1,.1,50);camera.position.set(5,4.5,7);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=5;controls.maxDistance=13;controls.target.set(0,.3,0);
  scene.add(new THREE.HemisphereLight(0xffffff,0x5e775d,2.2));const key=new THREE.DirectionalLight('#fff6dc',2.5);key.position.set(3,8,5);scene.add(key);
  const colors=['#263f37','#5c8e65','#9cb778','#d6b36b'];
  const mat=(c:string)=>new THREE.MeshStandardMaterial({color:c,roughness:.62,metalness:.18});
  const groups:THREE.Group[]=[],meshes:THREE.Mesh[]=[];
  function block(g:THREE.Group,w:number,h:number,d:number,x:number,y:number,z:number,c:string){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);g.add(m);meshes.push(m);return m;}
  function disk(g:THREE.Group,r:number,h:number,x:number,y:number,z:number,c:string){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32),mat(c));m.position.set(x,y,z);g.add(m);meshes.push(m);return m;}
  for(let i=0;i<4;i++){
   const g=new THREE.Group();scene.add(g);groups.push(g);
   if(id==='camera'){
    if(i===0){disk(g,.7,.45,0,0,0,'#344b45');disk(g,.52,.47,0,.03,0,'#192f39');disk(g,.32,.49,0,.06,0,'#6b9da1');}
    else{block(g,1.7,.1,1.4,0,0,0,colors[i]);block(g,i===1?.45:.7,.12,.6,0,.1,0,i===1?'#76989b':'#263f37');for(let j=-3;j<=3;j++)block(g,.05,.04,.25,j*.2,.06,.55,'#d7b96e');}
   }else if(id==='light'){
    block(g,3,.12,.7,0,0,0,i===0?'#c3b78a':colors[i]);
    for(let j=-4;j<=4;j++)block(g,.17,.07,.2,j*.3,.12,0,i===0?'#ffe5a1':'#e0ebd2');
   }else if(id==='review'){
    block(g,1.6,.14,2.3,0,0,0,i===0?'#263f37':colors[i]);
    for(let j=0;j<3;j++)block(g,1.25,.03,.3,0,.1,-.6+j*.55,j===0?'#e5bd79':'#ebf2df');
   }else if(id==='shelf'||id==='checkout'||id==='exit'){
    block(g,2,.16,1.3,0,0,0,colors[i]);
    for(let j=-2;j<=2;j++)block(g,.22,.35,.3,j*.34,.25,0,['#bd8557','#d4c57f','#81a378'][Math.abs(j)%3]);
   }else if(id==='archive'){
    disk(g,.95,.3,0,0,0,colors[i]);disk(g,.88,.04,0,.18,0,'#cdddc1');
   }else{
    block(g,2,.12,1.5,0,0,0,colors[i]);block(g,.72,.15,.65,0,.13,0,'#30483e');
    for(const x of [-.9,.9])for(let j=-3;j<=3;j++)block(g,.13,.06,.1,x,.08,j*.18,'#ddbe78');
    if(id==='controller'||id==='network'){for(let j=0;j<4;j++)block(g,.8-j*.13,.03,.045,0,.09,.49-j*.1,'#d8bf7b');}
    if(id==='power')disk(g,.28,.3,.55,.15,0,'#b8c4b6');
    if(id==='driver')for(let j=-2;j<=2;j++)block(g,.07,.4,.65,j*.13,.2,0,'#58645c');
   }
   g.traverse(o=>o.userData.index=i);
   const c=document.createElement('canvas');c.width=512;c.height=80;const ctx=c.getContext('2d')!;ctx.fillStyle='#fbfdf7';ctx.fillRect(0,0,512,80);ctx.fillStyle='#244c3b';ctx.font='600 25px Segoe UI';ctx.textAlign='center';ctx.fillText(`${i+1}  ${partById(id).internals[i]}`,256,49);const texture=new THREE.CanvasTexture(c);const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));label.position.set(2,.1,0);label.scale.set(2.5,.39,1);g.add(label);
  }
  const floor=new THREE.Mesh(new THREE.CircleGeometry(3.7,48),new THREE.MeshBasicMaterial({color:'#d9e4d4'}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.6;scene.add(floor);
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down=[0,0];
  const press=(e:PointerEvent)=>{down=[e.clientX,e.clientY];};
  const choose=(e:PointerEvent)=>{if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=target.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes)[0];if(hit)live.current.onSelect(hit.object.userData.index);};
  renderer.domElement.addEventListener('pointerdown',press);renderer.domElement.addEventListener('pointerup',choose);
  const resize=()=>{renderer.setSize(target.clientWidth,target.clientHeight);camera.aspect=target.clientWidth/target.clientHeight;camera.updateProjectionMatrix();};const obs=new ResizeObserver(resize);obs.observe(target);resize();
  let raf=0,last=0;const render=(now=0)=>{raf=requestAnimationFrame(render);if(now-last<40||document.hidden)return;last=now;
   groups.forEach((g,i)=>{const desired=live.current.explode?(i-1.5)*.86:(i-1.5)*.23;g.position.y+=(desired-g.position.y)*.14;g.traverse(o=>{if(o instanceof THREE.Mesh){const m=o.material as THREE.MeshStandardMaterial;m.emissive.set(i===live.current.selected?'#486f39':'#000000');m.emissiveIntensity=i===live.current.selected?.35:0;if(id==='light'&&i===0){m.emissive.set('#f6df98');m.emissiveIntensity=live.current.brightness/100;}}});});controls.update();renderer.render(scene,camera);};render();
  return()=>{cancelAnimationFrame(raf);obs.disconnect();controls.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}if(o instanceof THREE.Sprite){o.material.map?.dispose();o.material.dispose();}});renderer.dispose();renderer.domElement.remove();};
 },[id]);
 return <div className="assembly-canvas" ref={host} role="img" aria-label={`Interactive exploded view of ${partById(id).name}. Rotate with mouse; choose numbered parts below.`}>{error&&<p>{error}</p>}</div>;
}
