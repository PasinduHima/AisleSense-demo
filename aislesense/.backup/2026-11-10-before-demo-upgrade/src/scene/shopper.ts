/** Articulated shopper for the authored scenarios. Movement comes from the backend; this file only poses the figure. */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export type ShopperInput={speed:number;action:string;item:boolean;bagged:boolean;time:number};
export const JOINTS=['head','shL','shR','elL','elR','wrL','wrR','hpL','hpR','knL','knR','anL','anR'] as const;
export type JointName=typeof JOINTS[number];
/** Pairs drawn as bones by the simulated camera overlay. */
export const BONES:[JointName,JointName][]=[['shL','shR'],['shL','elL'],['elL','wrL'],['shR','elR'],['elR','wrR'],['shL','hpL'],['shR','hpR'],['hpL','hpR'],['hpL','knL'],['knL','anL'],['hpR','knR'],['knR','anR']];

const L_THIGH=.44,L_SHIN=.42,HIP_Y=.93,STRIDE=1.4;
const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Shoulder pitch, shoulder roll, elbow flex, forearm twist (radians). Negative pitch and flex point forward. */
type ArmPose=[number,number,number,number];
const REST:ArmPose=[0,-.05,-.18,0],REACH:ArmPose=[-1.45,-.06,-.12,0],HOLD:ArmPose=[-.5,.06,-1.45,.25],BAG:ArmPose=[-.15,.28,-1.1,1.1];
const PLACE:ArmPose=[-.95,0,-.5,0],PAY:ArmPose=[-.6,.08,-1.2,.3],CARRY:ArmPose=[-.22,.03,-1.2,.15];
const mix=(parts:[ArmPose,number][]):ArmPose=>{const out:ArmPose=[0,0,0,0];for(const [p,w] of parts)for(let i=0;i<4;i++)out[i]+=p[i]*w;return out;};

export function createShopper(){
 const group=new THREE.Group();
 const std=(color:string,roughness:number)=>new THREE.MeshStandardMaterial({color,roughness});
 const M={shirt:std('#c2703f',.85),trousers:std('#33475a',.9),skin:std('#d3a57c',.7),hair:std('#33251f',.6),shoe:std('#1f2628',.55),bag:std('#6a8049',.95),strap:std('#3c4a30',.9),item:std('#f2d463',.45)};
 const materials=Object.values(M);
 const mesh=(geo:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;};
 const node=(parent:THREE.Object3D,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};

 const body=node(group);                    // carries the vertical bob so the stance foot stays on the floor
 const hips=node(body,0,HIP_Y,0);
 mesh(new RoundedBoxGeometry(.31,.21,.2,3,.07),M.trousers,hips,0,.065,0);
 const spine=node(hips,0,.14,0);
 const torso=mesh(new THREE.CapsuleGeometry(.135,.26,6,14),M.shirt,spine,0,.2,0);torso.scale.set(1.22,1,.78);
 mesh(new THREE.CylinderGeometry(.04,.046,.08,10),M.skin,spine,0,.5,0);
 const head=node(spine,0,.53,0);
 const skull=mesh(new THREE.SphereGeometry(.105,18,14),M.skin,head,0,.09,.004);skull.scale.set(.93,1.1,1);
 const hair=mesh(new THREE.SphereGeometry(.112,18,12,0,Math.PI*2,0,Math.PI*.56),M.hair,head,0,.1,-.018);hair.scale.set(.96,1.08,1.02);
 mesh(new THREE.SphereGeometry(.014,6,5),M.skin,head,0,.075,.105);
 // Cross-body tote: worn on the left hip, strap over the right shoulder.
 mesh(new RoundedBoxGeometry(.11,.3,.34,3,.035),M.bag,spine,.235,-.19,.04);
 const strapGeo=new THREE.TorusGeometry(.31,.011,6,30);strapGeo.rotateY(Math.PI/2);strapGeo.scale(1,1,.5);strapGeo.rotateZ(.76);
 mesh(strapGeo,M.strap,spine,.012,.2,0);

 const arm=(side:number)=>{
  const sh=node(spine,side*.205,.38,0);
  mesh(new THREE.CapsuleGeometry(.044,.2,4,10),M.shirt,sh,0,-.14,0);
  mesh(new THREE.SphereGeometry(.058,10,8),M.shirt,sh,0,-.01,0);
  const el=node(sh,0,-.29,0);el.rotation.order='YXZ';
  mesh(new THREE.CapsuleGeometry(.036,.19,4,10),M.skin,el,0,-.125,0);
  const hand=mesh(new THREE.SphereGeometry(.046,10,8),M.skin,el,0,-.285,0);hand.scale.set(.75,1.12,.6);
  return {sh,el,hand};
 };
 const leg=(side:number)=>{
  const hip=node(hips,side*.085,0,0);
  mesh(new THREE.CapsuleGeometry(.07,.3,4,10),M.trousers,hip,0,-.21,0);
  const knee=node(hip,0,-L_THIGH,0);
  mesh(new THREE.CapsuleGeometry(.053,.3,4,10),M.trousers,knee,0,-.2,0);
  const ankle=node(knee,0,-L_SHIN,0);
  mesh(new RoundedBoxGeometry(.098,.075,.26,2,.03),M.shoe,ankle,0,-.032,.058);
  return {hip,knee,ankle};
 };
 const armL=arm(1),armR=arm(-1),legL=leg(1),legR=leg(-1);
 const item=mesh(new RoundedBoxGeometry(.085,.15,.055,2,.012),M.item,armR.el,0,-.34,.035);item.visible=false;

 const joints:Record<JointName,THREE.Object3D>={head:skull,shL:armL.sh,shR:armR.sh,elL:armL.el,elR:armR.el,wrL:armL.hand,wrR:armR.hand,hpL:legL.hip,hpR:legR.hip,knL:legL.knee,knR:legR.knee,anL:legL.ankle,anR:legR.ankle};

 let phase=0,amp=0,tau=0,lastAction='',opacity=1;
 const cur={r:[...REST] as ArmPose,rw:0,l:[0,0,-.18],lw:0,headX:0,headY:0,lean:0};
 const drop=(h:number,k:number)=>L_THIGH+L_SHIN-(L_THIGH*Math.cos(h)+L_SHIN*Math.cos(h+k));

 function update(dt:number,inp:ShopperInput){
  if(inp.action!==lastAction){lastAction=inp.action;tau=0;}else tau+=dt;
  // Stride shortens with speed; the phase advances with distance, so feet do not slide.
  const targetAmp=inp.speed>.05?Math.min(1.15,Math.pow(inp.speed/1.3,.6)):0;
  amp+=(targetAmp-amp)*Math.min(1,dt*7);
  if(inp.speed>.02)phase+=inp.speed*dt/(STRIDE*Math.max(amp,.35))*Math.PI*2;
  const sL=Math.sin(phase),cL=Math.cos(phase),A=.42*amp,idle=1-Math.min(1,amp*1.6);

  const hipL=-A*sL,hipR=A*sL;
  const swingL=Math.max(0,cL),swingR=Math.max(0,-cL);
  const kneeL=amp*(.07+.95*Math.pow(swingL,1.4)),kneeR=amp*(.07+.95*Math.pow(swingR,1.4));
  legL.hip.rotation.x=hipL;legL.knee.rotation.x=kneeL;legL.ankle.rotation.x=-(hipL+kneeL)*(1-.45*swingL);
  legR.hip.rotation.x=hipR;legR.knee.rotation.x=kneeR;legR.ankle.rotation.x=-(hipR+kneeR)*(1-.45*swingR);
  body.position.y=-Math.min(drop(hipL,kneeL),drop(hipR,kneeR));
  hips.rotation.y=-.07*amp*sL;
  hips.rotation.z=.028*Math.sin(inp.time*.55)*idle;hips.position.x=.012*Math.sin(inp.time*.55)*idle;

  // Arm, head and lean targets for the authored action.
  let r:ArmPose=REST,rw=0,l=[0,0,-.18],lw=0,headX=0,headY=0,lean=0;
  const a=inp.action;
  if(a==='picking'){
   const reach=smooth(.1,.85,tau)-smooth(1.35,2.15,tau),hold=smooth(1.35,2.15,tau);
   r=mix([[REST,Math.max(0,1-reach-hold)],[REACH,reach],[HOLD,hold]]);rw=1;lean=.15*reach;headX=.04*reach+.3*hold;
  }else if(a==='bagging'){
   const inn=smooth(0,.85,tau),out=smooth(1.6,2.4,tau),bag=inn-out;
   r=mix([[HOLD,1-inn],[BAG,bag],[REST,out]]);rw=1;l=[-.12,0,-.75];lw=bag;lean=.05*bag;headX=.36*bag;
   headY=.32*bag+(tau>2.4?.5*Math.sin((tau-2.4)*4.2)*smooth(2.4,2.7,tau):0);
  }else if(a==='browsing'){
   r=HOLD;rw=inp.item?1:0;headX=inp.item?.26:.06;headY=.22*Math.sin(tau*1.3+.4);
  }else if(a==='checkout'){
   const inn=smooth(0,.9,tau),out=smooth(1.6,2.4,tau),pay=smooth(2.4,3,tau);
   r=mix([[HOLD,1-inn],[PLACE,inn-out],[REST,Math.max(0,out-pay)],[PAY,pay]]);rw=1;headX=.2;lean=.06*(inn-out);
  }else if(a==='walking'){
   if(inp.item){r=CARRY;rw=1;}
  }else{
   headY=.3*Math.sin(inp.time*.45);headX=.04;
  }
  const k=1-Math.exp(-dt*9);
  for(let i=0;i<4;i++)cur.r[i]+=(r[i]-cur.r[i])*k;
  for(let i=0;i<3;i++)cur.l[i]+=(l[i]-cur.l[i])*k;
  cur.rw+=(rw-cur.rw)*k;cur.lw+=(lw-cur.lw)*k;cur.headX+=(headX-cur.headX)*k;cur.headY+=(headY-cur.headY)*k;cur.lean+=(lean-cur.lean)*k;

  // Arms counter-swing against the legs unless an action pose has taken over.
  const armSwingL=.42*amp*sL,armSwingR=-.42*amp*sL;
  const elbowL=-(.15+.3*amp+.25*amp*Math.max(0,-sL)),elbowR=-(.15+.3*amp+.25*amp*Math.max(0,sL));
  armR.sh.rotation.x=armSwingR*(1-cur.rw*.8)+cur.r[0]*cur.rw;armR.sh.rotation.z=-.05*(1-cur.rw)+cur.r[1]*cur.rw;
  armR.el.rotation.x=elbowR*(1-cur.rw)+cur.r[2]*cur.rw;armR.el.rotation.y=cur.r[3]*cur.rw;
  armL.sh.rotation.x=armSwingL*(1-cur.lw)+cur.l[0]*cur.lw;armL.sh.rotation.z=.05+cur.l[1]*cur.lw;
  armL.el.rotation.x=elbowL*(1-cur.lw)+cur.l[2]*cur.lw;
  spine.rotation.y=.17*amp*sL;spine.rotation.x=.05*amp+cur.lean;
  head.rotation.x=cur.headX;head.rotation.y=cur.headY-.12*amp*sL;
  const breath=.02*Math.sin(inp.time*1.7);torso.scale.set(1.22*(1+breath*.4),1,.78*(1+breath));
  item.visible=(inp.item&&!(a==='checkout'&&tau>1.45))||(a==='bagging'&&!inp.bagged&&tau<1.05);
 }

 /** Fades the whole figure. Materials are only switched to transparent while a fade is in progress. */
 function setOpacity(value:number){
  const v=Math.min(1,Math.max(0,value));if(v===opacity)return;
  const translucent=v<1;
  for(const m of materials){if(m.transparent!==translucent){m.transparent=translucent;m.needsUpdate=true;}m.opacity=v;}
  opacity=v;group.visible=v>.01;
 }
 return {group,joints,update,setOpacity,actionTime:()=>tau,action:()=>lastAction};
}
export type Shopper=ReturnType<typeof createShopper>;
