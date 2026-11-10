/** Articulated figure for the authored scenarios. Movement comes from the backend; this file only poses the figure. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export type ShopperInput={speed:number;action:string;item:boolean;bagged:boolean;time:number};
/** The 17 COCO keypoints, in COCO order, as a pose-estimation model would report them. */
export const JOINTS=['nose','eyL','eyR','erL','erR','shL','shR','elL','elR','wrL','wrR','hpL','hpR','knL','knR','anL','anR'] as const;
export type JointName=typeof JOINTS[number];
/** COCO skeleton edges drawn by the simulated camera overlay. */
export const BONES:[JointName,JointName][]=[['anL','knL'],['knL','hpL'],['anR','knR'],['knR','hpR'],['hpL','hpR'],['shL','hpL'],['shR','hpR'],['shL','shR'],['shL','elL'],['shR','elR'],['elL','wrL'],['elR','wrR'],['eyL','eyR'],['nose','eyL'],['nose','eyR'],['eyL','erL'],['eyR','erR'],['erL','shL'],['erR','shR']];

/** Appearance of one figure. Index 0 is the single shopper of the short scenes; the rest are the demo cast. */
export type Look={shirt:string;trousers:string;skin:string;hair:string;shoe:string;bag:string|null;style:'short'|'long'|'bun'|'cap';height:number;build:number};
export const LOOKS:Look[]=[
 {shirt:'#c2703f',trousers:'#33475a',skin:'#d3a57c',hair:'#33251f',shoe:'#1f2628',bag:'#6a8049',style:'short',height:1,build:1},
 {shirt:'#4a4f5c',trousers:'#2b3340',skin:'#c99873',hair:'#22262c',shoe:'#e8e8e4',bag:'#3d4636',style:'cap',height:1.02,build:1.04},      // hooded top, cap, cross-body bag
 {shirt:'#2f8f8a',trousers:'#cdbfa3',skin:'#e0b48e',hair:'#5a3a22',shoe:'#7a4a34',bag:null,style:'long',height:.94,build:.92},
 {shirt:'#e9e6dc',trousers:'#7a6a4f',skin:'#8d5f42',hair:'#17130f',shoe:'#2a2422',bag:null,style:'short',height:1.05,build:1.08},
 {shirt:'#d9b13a',trousers:'#34495e',skin:'#6f4a34',hair:'#120f0d',shoe:'#f0efe9',bag:null,style:'bun',height:.96,build:.95},
 {shirt:'#9c3d3a',trousers:'#4b4f55',skin:'#d9b08c',hair:'#b9b6ae',shoe:'#3a2c24',bag:null,style:'short',height:.98,build:1.1},
 {shirt:'#2f6b4a',trousers:'#2c3331',skin:'#b98560',hair:'#2a1c14',shoe:'#1f2628',bag:null,style:'bun',height:.95,build:.96},           // cashier
 {shirt:'#1d2a44',trousers:'#141a26',skin:'#a9744f',hair:'#141a26',shoe:'#0e1012',bag:null,style:'cap',height:1.07,build:1.12},         // guard
];

const L_THIGH=.44,L_SHIN=.42,HIP_Y=.93,STRIDE=1.4;
const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Shoulder pitch, shoulder roll, elbow flex, forearm twist (radians). Negative pitch and flex point forward. */
type ArmPose=[number,number,number,number];
const REST:ArmPose=[0,-.05,-.18,0],REACH:ArmPose=[-1.45,-.06,-.12,0],HOLD:ArmPose=[-.5,.06,-1.45,.25],BAG:ArmPose=[-.15,.28,-1.1,1.1];
const PLACE:ArmPose=[-.95,0,-.5,0],PAY:ArmPose=[-.6,.08,-1.2,.3],CARRY:ArmPose=[-.22,.03,-1.2,.15],TALK:ArmPose=[-.4,.1,-1.05,.2];
const mix=(parts:[ArmPose,number][]):ArmPose=>{const out:ArmPose=[0,0,0,0];for(const [p,w] of parts)for(let i=0;i<4;i++)out[i]+=p[i]*w;return out;};

export function createShopper(look:Look=LOOKS[0],seed=0){
 const group=new THREE.Group();group.scale.setScalar(look.height);
 // One vertex-coloured material per figure; the parts attached to each bone are merged into a single mesh,
 // so a person costs about a dozen draw calls instead of thirty.
 const skin=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8}),itemMat=new THREE.MeshStandardMaterial({color:'#f2d463',roughness:.45});
 const materials=[skin,itemMat];
 const C={shirt:new THREE.Color(look.shirt),trousers:new THREE.Color(look.trousers),skin:new THREE.Color(look.skin),hair:new THREE.Color(look.hair),shoe:new THREE.Color(look.shoe),bag:new THREE.Color(look.bag??'#6a8049'),strap:new THREE.Color('#2c3327')};
 const buckets=new Map<THREE.Object3D,THREE.BufferGeometry[]>();
 const part=(geo:THREE.BufferGeometry,color:THREE.Color,parent:THREE.Object3D,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{
  let g=geo;if(g.index){g=geo.toNonIndexed();geo.dispose();}
  g.scale(sx,sy,sz);g.translate(x,y,z);
  const n=g.attributes.position.count,colors=new Float32Array(n*3);
  for(let i=0;i<n;i++){colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;}
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const list=buckets.get(parent);if(list)list.push(g);else buckets.set(parent,[g]);
 };
 const node=(parent:THREE.Object3D,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};

 const body=node(group);                    // carries the vertical bob so the stance foot stays on the floor
 const hips=node(body,0,HIP_Y,0);
 part(new RoundedBoxGeometry(.31,.21,.2,3,.07),C.trousers,hips,0,.065,0,look.build);
 const spine=node(hips,0,.14,0);
 const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.135,.26,6,14),new THREE.MeshStandardMaterial({color:look.shirt,roughness:.85}));torso.position.set(0,.2,0);torso.castShadow=true;spine.add(torso);materials.push(torso.material);
 part(new THREE.CylinderGeometry(.04,.046,.08,10),C.skin,spine,0,.5,0);
 const head=node(spine,0,.53,0);
 part(new THREE.SphereGeometry(.105,18,14),C.skin,head,0,.09,.004,.93,1.1,1);
 part(new THREE.SphereGeometry(.112,18,12,0,Math.PI*2,0,Math.PI*.56),C.hair,head,0,.1,-.018,.96,1.08,1.02);
 part(new THREE.SphereGeometry(.014,6,5),C.skin,head,0,.075,.105);
 if(look.style==='long')part(new THREE.SphereGeometry(.105,14,10),C.hair,head,0,.03,-.05,.98,1.4,.66);
 else if(look.style==='bun')part(new THREE.SphereGeometry(.05,12,9),C.hair,head,0,.2,-.075);
 else if(look.style==='cap')part(new RoundedBoxGeometry(.17,.016,.12,2,.007),C.hair,head,0,.135,.125);
 // Face keypoints have no geometry of their own; they mark where a pose model reports the nose, eyes and ears.
 const face={nose:node(head,0,.075,.112),eyL:node(head,.036,.108,.092),eyR:node(head,-.036,.108,.092),erL:node(head,.1,.09,.004),erR:node(head,-.1,.09,.004)};
 if(look.bag){
  // Cross-body tote: worn on the left hip, strap over the right shoulder.
  part(new RoundedBoxGeometry(.11,.3,.34,3,.035),C.bag,spine,.235,-.19,.04);
  const strapGeo=new THREE.TorusGeometry(.31,.011,6,30);strapGeo.rotateY(Math.PI/2);strapGeo.scale(1,1,.5);strapGeo.rotateZ(.76);
  part(strapGeo,C.strap,spine,.012,.2,0);
 }

 const arm=(side:number)=>{
  const sh=node(spine,side*.205*look.build,.38,0);
  part(new THREE.CapsuleGeometry(.044,.2,4,10),C.shirt,sh,0,-.14,0);
  part(new THREE.SphereGeometry(.058,10,8),C.shirt,sh,0,-.01,0);
  const el=node(sh,0,-.29,0);el.rotation.order='YXZ';
  part(new THREE.CapsuleGeometry(.036,.19,4,10),look.style==='cap'?C.shirt:C.skin,el,0,-.125,0);
  part(new THREE.SphereGeometry(.046,10,8),C.skin,el,0,-.285,0,.75,1.12,.6);
  return {sh,el,hand:node(el,0,-.285,0)};
 };
 const leg=(side:number)=>{
  const hip=node(hips,side*.085,0,0);
  part(new THREE.CapsuleGeometry(.07,.3,4,10),C.trousers,hip,0,-.21,0);
  const knee=node(hip,0,-L_THIGH,0);
  part(new THREE.CapsuleGeometry(.053,.3,4,10),C.trousers,knee,0,-.2,0);
  const ankle=node(knee,0,-L_SHIN,0);
  part(new RoundedBoxGeometry(.098,.075,.26,2,.03),C.shoe,ankle,0,-.032,.058);
  return {hip,knee,ankle};
 };
 const armL=arm(1),armR=arm(-1),legL=leg(1),legR=leg(-1);
 const item=new THREE.Mesh(new RoundedBoxGeometry(.085,.15,.055,2,.012),itemMat);item.position.set(0,-.34,.035);item.castShadow=true;item.visible=false;armR.el.add(item);
 buckets.forEach((list,parent)=>{
  for(const g of list)for(const name of Object.keys(g.attributes))if(!['position','normal','uv','color'].includes(name))g.deleteAttribute(name);
  const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(!merged)return;
  const m=new THREE.Mesh(merged,skin);m.castShadow=true;parent.add(m);
 });
 buckets.clear();

 const joints:Record<JointName,THREE.Object3D>={...face,shL:armL.sh,shR:armR.sh,elL:armL.el,elR:armR.el,wrL:armL.hand,wrR:armR.hand,hpL:legL.hip,hpR:legR.hip,knL:legL.knee,knR:legR.knee,anL:legL.ankle,anR:legR.ankle};

 let phase=seed*2.1,amp=0,tau=0,lastAction='',opacity=1;
 const cur={r:[...REST] as ArmPose,rw:0,l:[0,0,-.18],lw:0,headX:0,headY:0,lean:0,twist:0};
 const drop=(h:number,k:number)=>L_THIGH+L_SHIN-(L_THIGH*Math.cos(h)+L_SHIN*Math.cos(h+k));
 const wide=1.22*look.build;

 function update(dt:number,inp:ShopperInput){
  if(inp.action!==lastAction){lastAction=inp.action;tau=0;}else tau+=dt;
  const clock=inp.time+seed*3.7;
  // Stride shortens with speed; the phase advances with distance, so feet do not slide.
  const targetAmp=inp.speed>.05?Math.min(1.15,Math.pow(inp.speed/1.3,.6)):0;
  amp+=(targetAmp-amp)*Math.min(1,dt*7);
  if(inp.speed>.02)phase+=inp.speed*dt/(STRIDE*look.height*Math.max(amp,.35))*Math.PI*2;
  const sL=Math.sin(phase),cL=Math.cos(phase),A=.42*amp,idle=1-Math.min(1,amp*1.6);

  const hipL=-A*sL,hipR=A*sL;
  const swingL=Math.max(0,cL),swingR=Math.max(0,-cL);
  const kneeL=amp*(.07+.95*Math.pow(swingL,1.4)),kneeR=amp*(.07+.95*Math.pow(swingR,1.4));
  legL.hip.rotation.x=hipL;legL.knee.rotation.x=kneeL;legL.ankle.rotation.x=-(hipL+kneeL)*(1-.45*swingL);
  legR.hip.rotation.x=hipR;legR.knee.rotation.x=kneeR;legR.ankle.rotation.x=-(hipR+kneeR)*(1-.45*swingR);
  body.position.y=-Math.min(drop(hipL,kneeL),drop(hipR,kneeR));
  hips.rotation.y=-.07*amp*sL;
  hips.rotation.z=.028*Math.sin(clock*.55)*idle;hips.position.x=.012*Math.sin(clock*.55)*idle;

  // Arm, head and lean targets for the authored action.
  let r:ArmPose=REST,rw=0,l=[0,0,-.18],lw=0,headX=0,headY=0,lean=0,twist=0;
  const a=inp.action;
  if(a==='picking'){
   const reach=smooth(.1,.85,tau)-smooth(1.35,2.15,tau),hold=smooth(1.35,2.15,tau);
   r=mix([[REST,Math.max(0,1-reach-hold)],[REACH,reach],[HOLD,hold]]);rw=1;lean=.15*reach;headX=.04*reach+.3*hold;
  }else if(a==='bagging'){
   const inn=smooth(0,.85,tau),out=smooth(1.6,2.4,tau),bag=inn-out;
   r=mix([[HOLD,1-inn],[BAG,bag],[REST,out]]);rw=1;l=[-.12,0,-.75];lw=bag;lean=.05*bag;headX=.36*bag;
   headY=.32*bag+(tau>2.4?.5*Math.sin((tau-2.4)*4.2)*smooth(2.4,2.7,tau):0);
  }else if(a==='looking'){
   // Nervous check of the surroundings: quick head turns that pause at each side, shoulders following.
   const glance=Math.max(-1,Math.min(1,1.6*Math.sin(tau*2.3+.6)))*smooth(0,.4,tau);
   headY=.85*glance;twist=.2*glance;headX=-.03;lean=.03;
   if(inp.item){r=CARRY;rw=1;}else if(inp.bagged){l=[-.1,.05,-.9];lw=.8;}
  }else if(a==='browsing'){
   // Reads the shelf, now and then pointing at or touching a product.
   const touch=inp.item?0:Math.pow(Math.max(0,Math.sin(tau*.9+seed)),3)*.55;
   r=inp.item?HOLD:mix([[REST,1-touch],[REACH,touch]]);rw=inp.item||touch>.02?1:0;headX=inp.item?.26:.06+.1*touch;headY=.22*Math.sin(tau*1.3+.4+seed);lean=.06*touch;
  }else if(a==='checkout'){
   const inn=smooth(0,.9,tau),out=smooth(1.6,2.4,tau),pay=smooth(2.4,3,tau);
   r=mix([[HOLD,1-inn],[PLACE,inn-out],[REST,Math.max(0,out-pay)],[PAY,pay]]);rw=1;headX=.2;lean=.06*(inn-out);
  }else if(a==='talking'){
   const beat=.5+.5*Math.sin(tau*2.6);
   r=mix([[REST,1-.75*beat],[TALK,.75*beat]]);rw=1;headX=.05+.05*Math.sin(tau*3.1);headY=.08*Math.sin(tau*1.1);
  }else if(a==='walking'){
   if(inp.item){r=CARRY;rw=1;}
   else if(inp.bagged){l=[-.1,.05,-.9];lw=.75;headY=.4*Math.sin(clock*2.1);}     // hand on the bag, checking over the shoulder
  }else{
   headY=.3*Math.sin(clock*.45);headX=.04;
  }
  const k=1-Math.exp(-dt*9);
  for(let i=0;i<4;i++)cur.r[i]+=(r[i]-cur.r[i])*k;
  for(let i=0;i<3;i++)cur.l[i]+=(l[i]-cur.l[i])*k;
  cur.rw+=(rw-cur.rw)*k;cur.lw+=(lw-cur.lw)*k;cur.headX+=(headX-cur.headX)*k;cur.headY+=(headY-cur.headY)*k;cur.lean+=(lean-cur.lean)*k;cur.twist+=(twist-cur.twist)*k;

  // Arms counter-swing against the legs unless an action pose has taken over.
  const armSwingL=.42*amp*sL,armSwingR=-.42*amp*sL;
  const elbowL=-(.15+.3*amp+.25*amp*Math.max(0,-sL)),elbowR=-(.15+.3*amp+.25*amp*Math.max(0,sL));
  armR.sh.rotation.x=armSwingR*(1-cur.rw*.8)+cur.r[0]*cur.rw;armR.sh.rotation.z=-.05*(1-cur.rw)+cur.r[1]*cur.rw;
  armR.el.rotation.x=elbowR*(1-cur.rw)+cur.r[2]*cur.rw;armR.el.rotation.y=cur.r[3]*cur.rw;
  armL.sh.rotation.x=armSwingL*(1-cur.lw)+cur.l[0]*cur.lw;armL.sh.rotation.z=.05+cur.l[1]*cur.lw;
  armL.el.rotation.x=elbowL*(1-cur.lw)+cur.l[2]*cur.lw;
  spine.rotation.y=.17*amp*sL+cur.twist;spine.rotation.x=.05*amp+cur.lean;
  head.rotation.x=cur.headX;head.rotation.y=cur.headY-.12*amp*sL;
  const breath=.02*Math.sin(clock*1.7);torso.scale.set(wide*(1+breath*.4),1,.78*(1+breath));
  item.visible=(inp.item&&!(a==='checkout'&&tau>1.45))||(a==='bagging'&&!inp.bagged&&tau<1.05);
 }
 torso.scale.set(wide,1,.78);

 /** Fades the whole figure. Materials are only switched to transparent while a fade is in progress. */
 function setOpacity(value:number){
  const v=Math.min(1,Math.max(0,value));if(v===opacity)return;
  const translucent=v<1;
  for(const m of materials){if(m.transparent!==translucent){m.transparent=translucent;m.needsUpdate=true;}m.opacity=v;}
  opacity=v;group.visible=v>.01;
 }
 /** Frees the figure's GPU resources once it has left the scene. */
 function dispose(){
  group.removeFromParent();
  group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
  materials.forEach(m=>m.dispose());
 }
 return {group,joints,update,setOpacity,dispose,actionTime:()=>tau,action:()=>lastAction};
}
export type Shopper=ReturnType<typeof createShopper>;
