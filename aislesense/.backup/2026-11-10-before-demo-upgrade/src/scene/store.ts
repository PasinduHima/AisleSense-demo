/**
 * Builds the supermarket model. Static geometry is merged per material and products are instanced,
 * which keeps the scene light enough for integrated laptop graphics.
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {State} from '../types';
import type {PartId} from '../explorerData';
import {canvasTexture,rng,text,roundRect,paintTiles,paintWood,paintGlow,paintSoftRect,paintFade,paintPack,paintBottle,paintBelt,pillTexture,type Painter} from './textures';

export const ZONE_X=[-3.5,0,3.5];
export const ZONE_NAMES=['PRODUCE','ESSENTIALS','HOUSEHOLD'];
/** Floor area each aisle camera reports on (matches the backend occupancy rule). */
export const ZONE={z0:-3.3,z1:2.4,half:1.1,centre:-.8};
export const cameraLens=(i:number)=>new THREE.Vector3(ZONE_X[i],3.17,-3.42);

export type StoreOptions={devices:boolean;labels:boolean;aniso:number;register:(id:PartId,group:THREE.Group)=>void};

const _m=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_p=new THREE.Vector3(),_s=new THREE.Vector3(1,1,1);

/** Shared vertex-coloured, diffuse-only material for plain painted surfaces; set at the start of each build. */
let paintMaterial:THREE.MeshLambertMaterial;
const painted=(color:string)=>{const m=new THREE.MeshStandardMaterial({color});m.userData.paint=true;return m;};

/** Collects primitives and emits one merged mesh per material. Painted surfaces collapse into a single mesh. */
class Batch{
 private buckets=new Map<THREE.Material,THREE.BufferGeometry[]>();
 constructor(private ox=0,private oy=0,private oz=0){}
 add(geo:THREE.BufferGeometry,mat:THREE.Material,x=0,y=0,z=0,rx=0,ry=0,rz=0){
  let g=geo;if(g.index){g=geo.toNonIndexed();geo.dispose();}
  _q.setFromEuler(_e.set(rx,ry,rz));_m.compose(_p.set(x-this.ox,y-this.oy,z-this.oz),_q,_s);g.applyMatrix4(_m);
  for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal'&&name!=='uv')g.deleteAttribute(name);
  let key=mat;
  if(mat.userData.paint){
   const c=(mat as THREE.MeshStandardMaterial).color,n=g.attributes.position.count,colors=new Float32Array(n*3);
   for(let i=0;i<n;i++){colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;}
   g.setAttribute('color',new THREE.BufferAttribute(colors,3));key=paintMaterial;
  }
  const list=this.buckets.get(key);if(list)list.push(g);else this.buckets.set(key,[g]);
  return this;
 }
 box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material,r=0,rx=0,ry=0,rz=0){
  const geo=r>0?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2-.001,h/2-.001,d/2-.001)):new THREE.BoxGeometry(w,h,d);
  return this.add(geo,mat,x,y,z,rx,ry,rz);
 }
 cyl(rt:number,rb:number,h:number,x:number,y:number,z:number,mat:THREE.Material,seg=16,rx=0,ry=0,rz=0){
  return this.add(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z,rx,ry,rz);
 }
 sphere(r:number,x:number,y:number,z:number,mat:THREE.Material,sx=1,sy=1,sz=1){
  const g=new THREE.SphereGeometry(r,14,10);g.scale(sx,sy,sz);return this.add(g,mat,x,y,z);
 }
 build(parent:THREE.Object3D,cast=true,receive=true){
  const out:THREE.Mesh[]=[];
  this.buckets.forEach((list,mat)=>{
   const merged=mergeGeometries(list,false);list.forEach(g=>g.dispose());if(!merged)return;
   const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=cast;mesh.receiveShadow=receive;parent.add(mesh);out.push(mesh);
  });
  this.buckets.clear();return out;
 }
}

type Item={kind:0|1|2|3;x:number;y:number;z:number;sx:number;sy:number;sz:number;ry:number;color:THREE.Color};
const PALETTES=[
 ['#c9a26a','#a8563a','#e3d9b5','#6f8f4e','#d9b24a','#7a5a3a','#b9c1a0'],             // pantry (wall-facing sides)
 ['#e8a33d','#d9642f','#7fae4a','#c94f4f','#f0cf5a','#5f9a6b','#f3ead0'],             // produce aisle
 ['#d94f3d','#2f6fb0','#f2c14e','#3f8f6b','#e9e4d4','#8a5a3c','#d98a3d','#6b4f8f'],   // everyday essentials
 ['#3b7dc4','#58b7c9','#e9eef2','#8a6fc0','#e86a8a','#2f9c8a','#f1d04b'],             // household
];
const FRUIT=['#c8372d','#e98a2b','#f0d24a','#8dbb3f','#d9442f','#b9c45a','#6a3d6e','#f0a36a'];
const ACCENTS=['#1f4a3b','#6f9a4e','#d9a441','#4f86b5'];

export function buildStore(scene:THREE.Scene,o:StoreOptions){
 paintMaterial=new THREE.MeshLambertMaterial({vertexColors:true});
 const textures:THREE.Texture[]=[];
 const keep=<T extends THREE.Texture>(t:T)=>{textures.push(t);return t;};
 const paint=(w:number,h:number,p:Painter,repeat=false)=>keep(canvasTexture(w,h,p,{aniso:o.aniso,repeat}));
 const S=(p:THREE.MeshStandardMaterialParameters)=>new THREE.MeshStandardMaterial(p);
 /** Self-lit surface for signs and screens. */
 const lit=(map:THREE.Texture,opacity=1)=>new THREE.MeshBasicMaterial({map,transparent:true,opacity,toneMapped:false});
 const glowing=(color:string,intensity:number)=>S({color:'#111111',emissive:color,emissiveIntensity:intensity,roughness:.4});
 const plane=(w:number,h:number,mat:THREE.Material,x:number,y:number,z:number,ry=0,parent:THREE.Object3D=scene)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);return m;
 };
 /** Flat floor marking. Later layers draw on top of earlier ones. */
 const decal=(w:number,d:number,mat:THREE.Material,x:number,z:number,order:number,y=.006)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y+order*.003,z);m.renderOrder=order;scene.add(m);return m;
 };

 const woodTex=paint(256,256,paintWood('#c9a877','#6b4a2a'),true);
 const tilesTex=paint(512,512,paintTiles,true);tilesTex.repeat.set(12.9/2.4,10.9/2.4);
 const M={
  green:painted('#1f4a3b'),greenDark:painted('#153a30'),cream:painted('#ece9db'),
  white:painted('#f3f4ee'),steel:S({color:'#b4bdb9',roughness:.34,metalness:.85}),dark:painted('#232f2c'),
  wood:S({map:woodTex,roughness:.62}),woodDark:S({map:woodTex,color:'#b58d62',roughness:.72}),brass:S({color:'#d8b566',roughness:.36,metalness:.8}),
  rubber:painted('#1b2321'),plinth:painted('#0d2523'),floor:S({map:tilesTex,roughness:.36,metalness:.02}),
  glass:S({color:'#d5eef0',roughness:.05,metalness:.1,transparent:true,opacity:.2,depthWrite:false}),
  fridgeIn:S({color:'#e4f4f5',emissive:'#cfeef1',emissiveIntensity:.5,roughness:.8}),ledCool:glowing('#e8fbff',2.2),
  scanner:S({color:'#0c1413',roughness:.08,metalness:.3}),terracotta:painted('#c98a62'),
  leaf:painted('#3f7a52'),leafLight:painted('#5f9a5c'),basket:painted('#2f6b52'),
  alu:S({color:'#c9cfcc',roughness:.42,metalness:.75}),plastic:painted('#dfe3dd'),
 };
 const accent=ACCENTS.map(painted);

 // ---------------------------------------------------------------- base, floor and walls
 const world=new Batch();
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(18.5,16.5),new THREE.MeshBasicMaterial({map:paint(256,256,paintGlow('0,0,0')),transparent:true,opacity:.75,depthWrite:false}));
 ground.rotation.x=-Math.PI/2;ground.position.y=-.52;scene.add(ground);
 world.box(13.5,.42,11.5,0,-.31,0,M.plinth,.06);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(12.9,.1,10.9),M.floor);floor.position.y=-.05;floor.receiveShadow=true;scene.add(floor);

 world.box(13.1,2.25,.18,0,1.125,-5.45,M.green).box(13.1,1.2,.16,0,2.85,-5.45,M.cream).box(13.1,.04,.2,0,2.27,-5.45,M.brass).box(13.2,.06,.26,0,3.48,-5.45,M.dark);
 for(const x of [-6.45,6.45])world.box(.18,.62,10.9,x,.31,0,M.green).box(.24,.04,10.9,x,.64,0,M.wood);
 for(const [a,b] of [[-6.54,-3.9],[-1.9,4.2],[6.1,6.54]])world.box(b-a,.62,.18,(a+b)/2,.31,5.45,M.green).box(b-a+.04,.04,.24,(a+b)/2,.64,5.45,M.wood);
 // Entrance portal (the exit portal is a selectable component, built below).
 for(const x of [-3.87,-1.93])world.box(.07,2.3,.07,x,1.15,5.45,M.dark);
 world.box(2.01,.34,.1,-2.9,2.3,5.45,M.green);
 const entranceSign=lit(paint(512,96,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,'ENTRANCE',w/2,h/2+2,50,'#f1ecd8',{weight:700,spacing:10});}));
 plane(1.7,.3,entranceSign,-2.9,2.3,5.502);plane(1.7,.3,entranceSign,-2.9,2.3,5.398,Math.PI);
 const mat=(label:string)=>S({roughness:.95,map:paint(256,128,(c,w,h)=>{c.fillStyle='#1c2523';c.fillRect(0,0,w,h);c.strokeStyle='#3a4a45';c.lineWidth=6;c.strokeRect(9,9,w-18,h-18);text(c,label,w/2,h/2+2,34,'#75877f',{weight:700,spacing:6});})});
 decal(1.6,.8,mat('WELCOME'),-2.9,4.92,2).receiveShadow=true;

 const storeSign=lit(paint(1024,160,(c,w,h)=>{
  c.clearRect(0,0,w,h);c.fillStyle='#b8923f';c.beginPath();c.ellipse(118,h/2,26,44,-.7,0,Math.PI*2);c.fill();
  c.strokeStyle='#ece9db';c.lineWidth=4;c.beginPath();c.moveTo(96,h/2+30);c.lineTo(140,h/2-30);c.stroke();
  text(c,'EVERGUARD MARKET',w/2+50,h/2-6,74,'#1f4a3b',{weight:700,spacing:14});
  c.fillStyle='#b8923f';c.fillRect(190,h-28,w-290,5);
 }));
 plane(4.8,.75,storeSign,0,2.86,-5.365);

 // Soft contact shadows where furniture meets the floor.
 const aoTex=paint(128,128,paintSoftRect('rgba(0,0,0,1)',30,22)),aoParts:THREE.BufferGeometry[]=[];
 const ao=(w:number,d:number,x:number,z:number,_weight=.42)=>{const g=new THREE.PlaneGeometry(w,d).toNonIndexed();g.rotateX(-Math.PI/2);g.translate(x,.009,z);aoParts.push(g);};
 ao(13.6,1.9,0,-4.75,.5);ao(1.5,11.4,-6.1,0,.3);ao(1.5,11.4,6.1,0,.3);ao(13.4,1.4,0,5.1,.25);

 // ---------------------------------------------------------------- refrigerated wall and bakery
 const cold:Item[]=[];
 const r0=rng(21);
 ['FRESH','DAIRY','DRINKS','FROZEN'].forEach((name,n)=>{
  const x=[-4.7,-2.95,2.95,4.7][n];
  world.box(1.62,1.95,.5,x,.975,-5.11,M.white,.03).box(1.46,1.48,.02,x,1,-4.855,M.fridgeIn).box(1.62,.26,.22,x,1.83,-4.75,M.white,.02).box(1.62,.2,.22,x,.1,-4.75,M.dark);
  for(const s of [-1,1]){
   world.box(.06,1.6,.2,x+s*.78,1.02,-4.76,M.white).box(.02,1.45,.02,x+s*.72,1,-4.69,M.ledCool);
   world.box(.72,.03,.03,x+s*.365,1.74,-4.655,M.steel).box(.72,.03,.03,x+s*.365,.26,-4.655,M.steel).box(.03,1.48,.03,x+s*.72,1,-4.655,M.steel).box(.03,1.48,.03,x+s*.015,1,-4.655,M.steel);
   world.box(.025,.5,.04,x+s*.07,1.02,-4.625,M.steel,.01);
  }
  [.2,.56,.93,1.3].forEach((y,row)=>{
   if(row)world.box(1.46,.02,.17,x,y-.01,-4.77,M.white);
   const palette=PALETTES[n===0?1:n===3?3:2];
   for(let px=x-.66;px<x+.64;){
    const kind=(r0()<.55?1:0) as 0|1,w=kind?.085+r0()*.02:.1+r0()*.03,h=.2+r0()*.1,color=new THREE.Color(palette[Math.floor(r0()*palette.length)]),count=2+Math.floor(r0()*3);
    for(let i=0;i<count&&px<x+.64;i++,px+=w+.012)cold.push({kind,x:px+w/2,y:y+.01,z:-4.77,sx:kind?w/2:w,sy:h,sz:kind?w/2:.09,ry:0,color});
    px+=.02;
   }
  });
  plane(1.2,.15,lit(paint(384,48,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,name,w/2,h/2+2,30,'#1f4a3b',{weight:700,spacing:8});})),x,1.83,-4.637);
 });
 const glassBatch=new Batch();
 for(const x of [-4.7,-2.95,2.95,4.7])for(const s of [-1,1])glassBatch.box(.69,1.45,.012,x+s*.365,1,-4.655,M.glass);
 glassBatch.build(scene,false,false).forEach(m=>m.renderOrder=6);

 world.box(3.3,1.5,.06,0,.95,-5.33,M.woodDark).box(3.3,.36,.42,0,.18,-5.13,M.green,.02).box(1.5,.26,.04,0,1.92,-5.34,M.wood,.01);
 plane(1.3,.2,lit(paint(384,64,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,'BAKERY',w/2,h/2+2,40,'#3d2b18',{weight:700,spacing:10});})),0,1.92,-5.315);
 const loaves:Item[]=[];
 [.38,.8,1.22].forEach((y,row)=>{
  world.box(3.3,.04,.4,0,y,-5.13,M.wood);
  for(let b=0;b<5;b++){
   const bx=-1.3+b*.65;world.box(.54,.11,.3,bx,y+.075,-5.12,M.woodDark,.02);
   for(let i=0;i<4;i++)loaves.push({kind:3,x:bx-.17+i*.115,y:y+.17,z:-5.12+(i%2?.04:-.04),sx:.062,sy:.05,sz:.11,ry:(r0()-.5)*.5,color:new THREE.Color(row===1?'#b9793a':'#d2a05a').offsetHSL(0,0,(r0()-.5)*.08)});
  }
 });

 // ---------------------------------------------------------------- instanced products
 const boxGeo=new THREE.BoxGeometry(1,1,1);boxGeo.translate(0,.5,0);
 const bottleGeo=new THREE.LatheGeometry([[0,0],[1,0],[1,.6],[.42,.8],[.42,1],[0,1]].map(([x,y])=>new THREE.Vector2(x,y)),8);
 const canGeo=new THREE.CylinderGeometry(1,1,1,10);canGeo.translate(0,.5,0);
 const roundGeo=new THREE.SphereGeometry(1,7,5);
 const geos=[boxGeo,bottleGeo,canGeo,roundGeo];
 const packTex=paint(128,128,paintPack),bottleTex=paint(32,128,paintBottle);
 const L=(map?:THREE.Texture)=>new THREE.MeshLambertMaterial(map?{map}:{});
 const productMats=[L(packTex),L(bottleTex),L(packTex),L()];
 const coldMats=[new THREE.MeshBasicMaterial({map:packTex}),new THREE.MeshBasicMaterial({map:bottleTex}),productMats[2],productMats[3]];
 const dummy=new THREE.Object3D();
 const instances=(parent:THREE.Object3D,items:Item[],mats:THREE.Material[],ox=0,oy=0,oz=0)=>{
  for(let kind=0;kind<4;kind++){
   const list=items.filter(i=>i.kind===kind);if(!list.length)continue;
   const im=new THREE.InstancedMesh(geos[kind],mats[kind],list.length);
   list.forEach((it,i)=>{dummy.position.set(it.x-ox,it.y-oy,it.z-oz);dummy.rotation.set(0,it.ry,0);dummy.scale.set(it.sx,it.sy,it.sz);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);im.setColorAt(i,it.color);});
   im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;
   im.castShadow=false;im.receiveShadow=true;im.computeBoundingSphere();parent.add(im);
  }
 };
 instances(scene,cold,coldMats);instances(scene,loaves,productMats);

 // ---------------------------------------------------------------- gondola shelving
 const LEVELS=[.15,.54,.93,1.32];
 const posterTex=(word:string,bg:string,fg:string)=>paint(256,384,(c,w,h)=>{
  c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.arc(w/2,h*.4,84,0,Math.PI*2);c.fill();
  c.fillStyle=fg;c.beginPath();c.ellipse(w/2,h*.4,30,56,-.6,0,Math.PI*2);c.fill();
  text(c,word,w/2,h*.76,44,fg,{weight:700,spacing:6});c.fillStyle=fg;c.fillRect(w*.3,h*.86,w*.4,4);
 });
 [-5.2,-1.8,1.8,5.2].forEach((x,g)=>{
  const group=new THREE.Group();group.position.set(x,0,-1.15);scene.add(group);
  const b=new Batch(x,0,-1.15),r=rng(100+g*17),items:Item[]=[];
  b.box(.98,.13,5.1,x,.065,-1.15,M.greenDark,.015).box(.04,1.5,5.04,x,.9,-1.15,M.cream).box(1.02,.05,5.12,x,1.72,-1.15,M.white,.012);
  for(const z of [-3.67,-1.99,-.31,1.37])b.box(.05,1.66,.05,x,.88,z,M.steel);
  b.box(.98,1.66,.04,x,.88,1.42,M.green).box(.98,1.66,.04,x,.88,-3.72,M.green);
  for(const side of [-1,1]){
   // Each face is themed for the aisle it serves: 0 wall side, 1 produce, 2 essentials, 3 household.
   const cat=side<0?g:g+1>3?0:g+1;
   b.box(.02,.14,5.04,x+side*.5,1.63,-1.15,accent[cat]);
   LEVELS.forEach((y,level)=>{
    b.box(.46,.025,5.04,x+side*.25,y,-1.15,M.white).box(.012,.05,5.04,x+side*.482,y-.008,-1.15,M.cream);
    const top=y+.0125;
    if(cat===1&&level<2){
     for(let n=0;n<7;n++){
      const zc=-3.25+n*.69,fruit=new THREE.Color(FRUIT[Math.floor(r()*FRUIT.length)]);
      b.box(.42,.1,.62,x+side*.25,top+.05,zc,M.woodDark,.012);
      for(let layer=0;layer<2;layer++){
       const nx=3-layer,nz=5-layer;
       for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
        const rad=.052+r()*.009;
        items.push({kind:3,x:x+side*.25+(i-(nx-1)/2)*.122+(r()-.5)*.012,y:top+.13+layer*.083,z:zc+(j-(nz-1)/2)*.116+(r()-.5)*.012,sx:rad,sy:rad*.94,sz:rad,ry:0,color:fruit.clone().offsetHSL((r()-.5)*.025,0,(r()-.5)*.07)});
       }
      }
     }
     return;
    }
    const palette=PALETTES[cat];
    for(let z=-3.6;z<1.2;){
     const roll=r(),kind=(cat===3?(roll<.55?1:0):roll<.5?0:roll<.82?1:2) as 0|1|2;
     const color=new THREE.Color(palette[Math.floor(r()*palette.length)]).offsetHSL((r()-.5)*.03,(r()-.5)*.1,(r()-.5)*.06);
     const w=kind===0?.13+r()*.15:kind===1?.09+r()*.04:.1+r()*.03,h=kind===0?.19+r()*.14:kind===1?.24+r()*.09:.11+r()*.05,d=kind===0?.1+r()*.12:w;
     const facings=2+Math.floor(r()*4),rows=kind===0&&d<.2?2:1,stack=kind===2?2:1;
     for(let i=0;i<facings&&z+w<1.32;i++,z+=w+.012)for(let row=0;row<rows;row++)for(let s=0;s<stack;s++){
      items.push({kind,x:x+side*(.445-d/2-row*(d+.012)),y:top+s*h,z:z+w/2,sx:kind?w/2:d,sy:h,sz:kind?w/2:w,ry:kind?r()*6:(r()-.5)*.07,color});
     }
     z+=.025;
    }
   });
  }
  b.build(group);instances(group,items,productMats,x,0,-1.15);
  const [word,bg,fg]=[['FRESH','#2f6b4a','#f0e6c0'],['DAILY','#b9822f','#fff4d6'],['HOME','#33658f','#e8f1f6'],['CARE','#1f4a3b','#d8b566']][g];
  plane(.78,1.17,S({map:posterTex(word,bg,fg),roughness:.7}),0,.93,2.593,0,group).receiveShadow=true;
  ao(1.9,6,x,-1.15,.5);
  o.register('shelf',group);
 });

 // ---------------------------------------------------------------- checkout
 const beltTex=paint(128,64,paintBelt,true);beltTex.repeat.set(4,1);
 const posIdle=paint(256,160,(c,w,h)=>{c.fillStyle='#12312b';c.fillRect(0,0,w,h);text(c,'EVERGUARD POS',w/2,34,20,'#9fd0b6',{weight:700,spacing:3});c.fillStyle='#1d4a3f';roundRect(c,18,58,w-36,42,8);c.fill();text(c,'Lane 1 · Ready',w/2,80,20,'#e7f3e4');text(c,'No payment system connected',w/2,130,13,'#7fa595',{weight:400});});
 const posBusy=paint(256,160,(c,w,h)=>{c.fillStyle='#12312b';c.fillRect(0,0,w,h);text(c,'EVERGUARD POS',w/2,34,20,'#9fd0b6',{weight:700,spacing:3});c.fillStyle='#d8b566';roundRect(c,18,58,w-36,42,8);c.fill();text(c,'Item at checkout',w/2,80,20,'#1f3526',{weight:700});text(c,'Scripted scene · illustration',w/2,130,13,'#7fa595',{weight:400});});
 const posMat=lit(posIdle);
 const beltItem=new THREE.Mesh(new RoundedBoxGeometry(.055,.15,.085,2,.012),S({color:'#f2d463',roughness:.45}));beltItem.castShadow=true;beltItem.visible=false;scene.add(beltItem);
 {
  const group=new THREE.Group();group.position.set(.25,0,3.5);scene.add(group);
  const b=new Batch(.25,0,3.5);
  b.box(2.32,.1,.9,.25,.05,3.5,M.dark).box(2.4,.84,.98,.25,.52,3.5,M.green,.04).box(2.52,.05,1.1,.25,.965,3.5,M.wood,.015);
  b.box(1,.012,.46,-.4,.996,3.42,S({map:beltTex,roughness:.85})).box(1,.03,.02,-.4,1.004,3.18,M.steel).box(1,.03,.02,-.4,1.004,3.66,M.steel);
  b.box(.3,.008,.3,.42,.995,3.42,M.scanner).box(.2,.004,.012,.42,1,3.42,glowing('#ff5a4a',2.5)).box(.55,.012,.62,1.08,.996,3.5,M.steel);
  b.cyl(.022,.022,.36,.78,1.17,3.84,M.steel,10).box(.46,.31,.035,.78,1.47,3.84,M.dark,.014).box(.3,.02,.14,.78,1,3.72,M.dark,.006);
  b.cyl(.014,.014,.1,-.05,1.04,3.1,M.steel,8).box(.09,.03,.15,-.05,1.1,3.1,M.dark,.008,.5);
  b.cyl(.025,.025,1.25,1.36,1.61,3.92,M.steel,10).box(1,.3,.08,.9,2.3,3.92,M.green,.02).cyl(.05,.05,.05,1.36,2.48,3.92,glowing('#7dffa8',2.6),12);
  b.build(group);
  plane(.41,.26,posMat,.53,1.47,.359,0,group);
  const laneSign=lit(paint(384,112,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,'CHECKOUT',w/2-22,h/2+3,52,'#f1ecd8',{weight:700,spacing:6});c.fillStyle='#d8b566';c.beginPath();c.arc(w-46,h/2,30,0,Math.PI*2);c.fill();text(c,'1',w-46,h/2+3,38,'#1f4a3b',{weight:700});}));
  plane(.94,.26,laneSign,.65,2.3,.462,0,group);plane(.94,.26,laneSign,.65,2.3,.378,Math.PI,group);
  ao(3.2,1.8,.25,3.5,.5);
  o.register('checkout',group);
 }

 // ---------------------------------------------------------------- exit
 {
  const group=new THREE.Group();group.position.set(5.15,0,4.9);scene.add(group);
  const b=new Batch(5.15,0,4.9);
  for(const x of [4.23,6.07])b.box(.07,2.3,.07,x,1.15,5.45,M.dark);
  b.box(1.91,.34,.1,5.15,2.3,5.45,S({color:'#16794a',emissive:'#1fae66',emissiveIntensity:.55,roughness:.5}));
  b.build(group);
  const exitSign=lit(paint(512,112,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,'EXIT',w/2-36,h/2+3,64,'#f4fff4',{weight:700,spacing:14});c.strokeStyle='#f4fff4';c.lineWidth=9;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(w/2+92,h/2);c.lineTo(w/2+150,h/2);c.moveTo(w/2+128,h/2-22);c.lineTo(w/2+150,h/2);c.lineTo(w/2+128,h/2+22);c.stroke();}));
  plane(1.6,.3,exitSign,0,2.3,.602,0,group);plane(1.6,.3,exitSign,0,2.3,.498,Math.PI,group);
  const exitMat=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.8),mat('THANK YOU'));exitMat.rotation.x=-Math.PI/2;exitMat.position.set(0,.012,.02);exitMat.receiveShadow=true;exitMat.renderOrder=2;group.add(exitMat);
  o.register('exit',group);
 }

 // ---------------------------------------------------------------- planters and baskets
 for(const [x,z] of [[-1.5,4.92],[3.8,4.92]]){
  world.cyl(.26,.2,.42,x,.21,z,M.terracotta,18).cyl(.24,.24,.03,x,.41,z,M.rubber,18);
  const r=rng(Math.round(x*10));
  for(let j=0;j<9;j++){const a=j*2.4,rad=j?.1+r()*.1:0;world.sphere(.17+r()*.07,x+Math.sin(a)*rad,.62+j*.055+r()*.05,z+Math.cos(a)*rad,j%3?M.leaf:M.leafLight,.7,1.5,.7);}
  ao(1,1,x,z,.5);
 }
 for(let i=0;i<5;i++)world.box(.44,.05,.3,-1.52,.05+i*.062,4.2,M.basket,.02).box(.4,.012,.02,-1.52,.1+i*.062,4.2,M.dark);
 ao(.8,.6,-1.52,4.2,.4);

 // ---------------------------------------------------------------- lighting truss, fixtures and aisle zones
 world.box(12.96,.07,.07,0,3.5,-.8,M.dark);
 for(const x of [-6.45,6.45])world.box(.07,2.86,.07,x,2.07,-.8,M.dark);
 const glowTex=paint(128,128,paintGlow()),poolTex=paint(128,384,paintSoftRect('#ffffff',34,30)),fadeTex=paint(8,128,paintFade(.9,0));
 const fixtures=ZONE_X.map((x,i)=>{
  world.box(.012,.012,1.34,x,3.365,-1.45,M.steel,0,-.2).box(.012,.012,1.34,x,3.365,-.15,M.steel,0,.2);
  const group=new THREE.Group();group.position.set(x,3.15,-.8);scene.add(group);
  const b=new Batch(x,3.15,-.8);b.box(.3,.06,3.4,x,3.2,-.8,M.dark,.02);b.build(group);
  const diffuser=new THREE.MeshStandardMaterial({color:'#fff8e4',emissive:'#ffe9b8',emissiveIntensity:2,roughness:.4});
  const lens=new THREE.Mesh(new RoundedBoxGeometry(.24,.035,3.34,2,.012),diffuser);lens.position.y=.012;group.add(lens);
  const halo=new THREE.MeshBasicMaterial({map:glowTex,color:'#ffe6ad',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const sideGeo=new THREE.PlaneGeometry(4.3,.95).toNonIndexed(),underGeo=new THREE.PlaneGeometry(.95,4.3).toNonIndexed();
  sideGeo.rotateY(Math.PI/2);sideGeo.translate(0,-.03,0);underGeo.rotateX(Math.PI/2);underGeo.translate(0,-.02,0);
  const haloMesh=new THREE.Mesh(mergeGeometries([sideGeo,underGeo],false)!,halo);haloMesh.renderOrder=7;group.add(haloMesh);sideGeo.dispose();underGeo.dispose();
  o.register('light',group);
  const spot=new THREE.SpotLight(0xffe7b6,40,9.5,.66,.8,1.6);spot.position.set(x,3.12,-.8);spot.target.position.set(x,0,-.8);scene.add(spot,spot.target);
  const pool=new THREE.MeshBasicMaterial({map:poolTex,color:'#ffe7ae',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
  decal(2.75,7.6,pool,x,ZONE.centre+.05,3);
  // Faint volume between the fixture and the floor suggests the beam without post-processing.
  const beam=new THREE.MeshBasicMaterial({map:fadeTex,color:'#ffe9bd',transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  const top=[[-.12,-2.47],[.12,-2.47],[.12,.87],[-.12,.87]],bottom=[[-1.05,-3.7],[1.05,-3.7],[1.05,2.2],[-1.05,2.2]],pos:number[]=[],uv:number[]=[];
  for(let k=0;k<4;k++){const n=(k+1)%4,quad=[[top[k],3.13,1],[bottom[k],.03,0],[bottom[n],.03,0],[top[k],3.13,1],[bottom[n],.03,0],[top[n],3.13,1]] as [number[],number,number][];quad.forEach(([p,y,v],q)=>{pos.push(x+p[0],y,p[1]);uv.push(q%3===0?0:1,v);});}
  const beamGeo=new THREE.BufferGeometry();beamGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));beamGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const beamMesh=new THREE.Mesh(beamGeo,beam);beamMesh.renderOrder=7;beamMesh.visible=false;scene.add(beamMesh);
  const zoneMark=new THREE.MeshBasicMaterial({transparent:true,opacity:.82,depthWrite:false,map:paint(384,160,(c,w,h)=>{c.clearRect(0,0,w,h);text(c,`A${i+1}`,w/2,56,82,'#f7f3df',{weight:700,spacing:4});text(c,ZONE_NAMES[i],w/2,126,32,'#f7f3df',{weight:600,spacing:8});})});
  decal(1.5,.62,zoneMark,x,.95,4);
  return {diffuser,halo,spot,pool,beam,beamMesh,level:.3};
 });

 // ---------------------------------------------------------------- cameras and their coverage
 const mint=new THREE.Color('#63e4bd');
 const footprintTex=paint(128,384,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle='rgba(255,255,255,.16)';roundRect(c,6,6,w-12,h-12,12);c.fill();c.strokeStyle='#ffffff';c.lineWidth=4;c.setLineDash([16,10]);c.stroke();});
 const cameras=ZONE_X.map((x,i)=>{
  world.box(.05,.05,1.84,x,3.42,-4.47,M.dark);
  const group=new THREE.Group();group.position.set(x,3.3,-3.6);scene.add(group);
  const b=new Batch(x,3.3,-3.6),pitch=.6,d=[0,-Math.sin(pitch),Math.cos(pitch)],n=[0,Math.cos(pitch),Math.sin(pitch)],c0=[x,3.24,-3.56];
  const at=(along:number,up=0):[number,number,number]=>[c0[0],c0[1]+d[1]*along+n[1]*up,c0[2]+d[2]*along+n[2]*up];
  b.cyl(.05,.05,.03,x,3.38,-3.6,M.dark,14).cyl(.018,.018,.1,x,3.33,-3.6,M.steel,8);
  b.cyl(.075,.075,.3,...at(0),M.white,20,Math.PI/2+pitch).cyl(.081,.081,.045,...at(.165),M.dark,20,Math.PI/2+pitch);
  b.sphere(.05,...at(.17),M.scanner,1,1,1).box(.18,.012,.38,...at(.03,.086),M.white,.005,pitch);
  b.build(group);
  const led=new THREE.MeshBasicMaterial({color:'#5dff9a',toneMapped:false});
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),led);lamp.position.set(-.045,at(.19)[1]-3.3-.02,at(.19)[2]+3.6);group.add(lamp);
  o.register('camera',group);
  if(o.labels){const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:keep(pillTexture(`CAM 0${i+1}`,'#d9f7ea','rgba(16,44,40,.88)','#3f8f78')),depthTest:false,toneMapped:false}));tag.position.set(x,3.82,-3.6);tag.scale.set(1.05,.23,1);tag.renderOrder=10;scene.add(tag);}
  const apex=cameraLens(i),corners=[[x-ZONE.half,ZONE.z0],[x+ZONE.half,ZONE.z0],[x+ZONE.half,ZONE.z1],[x-ZONE.half,ZONE.z1]].map(([cx,cz])=>new THREE.Vector3(cx,.04,cz));
  const pos:number[]=[],uv:number[]=[],line:number[]=[];
  corners.forEach((a,k)=>{const c=corners[(k+1)%4];pos.push(apex.x,apex.y,apex.z,a.x,a.y,a.z,c.x,c.y,c.z);uv.push(.5,1,0,0,1,0);line.push(apex.x,apex.y,apex.z,a.x,a.y,a.z);});
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const volume=new THREE.MeshBasicMaterial({color:mint,map:fadeTex,transparent:true,opacity:.06,side:THREE.DoubleSide,depthWrite:false});
  const edges=new THREE.LineBasicMaterial({color:mint,transparent:true,opacity:.4,depthWrite:false});
  const print=new THREE.MeshBasicMaterial({color:mint,map:footprintTex,transparent:true,opacity:.5,depthWrite:false});
  const lineGeo=new THREE.BufferGeometry();lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(line,3));
  const coverage=new THREE.Group();
  const volumeMesh=new THREE.Mesh(geo,volume);volumeMesh.renderOrder=8;coverage.add(volumeMesh,new THREE.LineSegments(lineGeo,edges));scene.add(coverage);
  const floorPrint=decal(ZONE.half*2,ZONE.z1-ZONE.z0,print,x,(ZONE.z0+ZONE.z1)/2,5);scene.remove(floorPrint);coverage.add(floorPrint);
  return {led,coverage,volume,volumeMesh,edges,print};
 });

 // ---------------------------------------------------------------- planned hardware (walkthrough only)
 type Led={x:number;y:number;z:number;color:THREE.Color;rate:number;phase:number};
 const blinkers:{mesh:THREE.InstancedMesh;leds:Led[]}[]=[],ledGeo=new THREE.SphereGeometry(.014,6,5),ledMat=new THREE.MeshBasicMaterial({toneMapped:false}),ledOff=new THREE.Color('#1c2a26');
 let pending:Led[]=[];
 const blink=(_group:THREE.Object3D,x:number,y:number,z:number,color:string,rate:number)=>{pending.push({x,y,z,color:new THREE.Color(color),rate,phase:pending.length*1.7+blinkers.length});};
 const flushLeds=(group:THREE.Group)=>{
  if(!pending.length)return;
  const mesh=new THREE.InstancedMesh(ledGeo,ledMat,pending.length);
  pending.forEach((led,i)=>{dummy.position.set(led.x,led.y,led.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,led.color);});
  mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);blinkers.push({mesh,leds:pending});pending=[];
 };
 const reviewScreens=[['ALL CLEAR','No event to review','#1d4a3f','#9fd0b6'],['L2 · ASSIST','Offer help in A1','#d8b566','#2a3a20'],['L3 · VERIFY','Review the sequence','#e08a52','#2b1d12']].map(([title,sub,bg,fg])=>paint(256,360,(c,w,h)=>{
  c.fillStyle='#0f2925';c.fillRect(0,0,w,h);text(c,'STAFF REVIEW',w/2,36,20,'#9fd0b6',{weight:700,spacing:3});
  c.fillStyle=bg;roundRect(c,18,66,w-36,120,14);c.fill();text(c,title,w/2,110,30,fg,{weight:700});text(c,sub,w/2,152,17,fg,{weight:500});
  for(let k=0;k<3;k++){c.fillStyle='#1a3b35';roundRect(c,18,206+k*46,w-36,34,8);c.fill();}
  text(c,'Illustration · scripted scene',w/2,340,12,'#6f9787',{weight:400});
 }));
 const reviewMat=lit(reviewScreens[0]);
 if(o.devices){
  const device=(id:PartId,px:number,py:number,pz:number,make:(b:Batch,g:THREE.Group)=>void)=>{
   const group=new THREE.Group();group.position.set(px,py,pz);scene.add(group);const b=new Batch(px,py,pz);make(b,group);b.build(group);flushLeds(group);o.register(id,group);
  };
  const plate=(label:string,fg='#e7f3e4',bg='#1c3a33')=>S({roughness:.6,map:paint(256,96,(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);text(c,label,w/2,h/2+2,34,fg,{weight:700,spacing:3});})});
  // Staff desk in the front-left corner carries the analysis computer and the evidence store.
  world.box(.82,.05,2.2,-5.9,.75,4.05,M.wood,.012).box(.04,.72,2.2,-5.5,.36,4.05,M.green).box(1.4,.05,.75,-4.8,.75,4.725,M.wood,.012).box(1.4,.72,.04,-4.8,.36,4.37,M.green).box(.04,.72,.75,-4.11,.36,4.725,M.green);
  ao(1.5,2.9,-5.85,4.05,.45);ao(2.1,1.4,-4.8,4.7,.45);
  device('edge',-4.75,.775,4.72,(b,g)=>{
   b.box(.52,.2,.4,-4.75,.875,4.72,M.dark,.025).box(.36,.006,.26,-4.75,.978,4.72,M.alu).box(.006,.1,.26,-4.488,.875,4.72,M.alu);
   b.box(.02,.26,.34,-6.2,.93,4.35,M.dark,.008).box(.1,.03,.1,-6.2,.79,4.35,M.dark);
   plane(.31,.22,lit(paint(256,180,(c,w,h)=>{c.fillStyle='#0f2925';c.fillRect(0,0,w,h);text(c,'AisleSense engine',w/2,30,18,'#9fd0b6',{weight:700});c.strokeStyle='#63e4bd';c.lineWidth=3;c.beginPath();for(let k=0;k<9;k++)c.lineTo(22+k*26,120-Math.sin(k*1.3)*26-k*3);c.stroke();text(c,'pose → rules → events',w/2,160,14,'#7fa595',{weight:400});})),-1.439,.155,-.37,Math.PI/2,g);
   blink(g,.262,.14,.12,'#5dff9a',1.1);blink(g,.262,.14,.07,'#ffd66b',5);
  });
  device('archive',-5.85,.775,3.65,(b,g)=>{
   b.box(.36,.42,.4,-5.85,.985,3.65,M.dark,.025);
   for(let k=0;k<4;k++){b.box(.012,.075,.3,-5.668,.84+k*.095,3.65,M.alu,.004);blink(g,.184,.065+k*.095,.17,'#5dff9a',.6+k*.5);}
  });
  // Network cabinet in the back-left corner.
  ao(1,1,-5.95,-4.95,.5);
  device('network',-5.95,0,-4.95,(b,g)=>{
   b.box(.62,1.3,.5,-5.95,.65,-4.95,M.dark,.03).box(.5,1.06,.012,-5.95,.68,-4.694,M.glass);
   for(let k=0;k<3;k++){
    b.box(.5,.09,.02,-5.95,.95-k*.2,-4.705,M.alu,.004);
    for(let p=0;p<6;p++){b.box(.045,.035,.008,-6.13+p*.058,.95-k*.2,-4.692,M.rubber);if((p+k)%2===0)blink(g,-.18+p*.058,.995-k*.2,.262,p%3?'#5dff9a':'#ffd66b',2.5+p*.9+k);}
   }
   b.cyl(.14,.14,.035,-5.95,1.32,-4.95,M.plastic,22).cyl(.008,.008,.2,-6.03,1.43,-4.95,M.dark,6).cyl(.008,.008,.2,-5.87,1.43,-4.95,M.dark,6);
   blink(g,0,1.34,.1,'#6bc8ff',.8);
  });
  // Power supply and staff review terminal in the back-right corner.
  ao(1,1,5.95,-4.98,.5);
  device('power',5.95,0,-4.98,(b,g)=>{
   b.box(.6,.62,.42,5.95,.31,-4.98,M.plastic,.025).box(.36,.2,.008,5.95,.2,-4.768,M.dark).box(.6,.1,.42,5.95,.05,-4.98,M.dark);
   plane(.4,.15,plate('12 V SUPPLY','#1f3a30','#e9ecdf'),0,.47,.213,0,g);blink(g,.22,.56,.214,'#5dff9a',.4);
  });
  device('review',5.95,1.55,-5.33,(b,g)=>{
   b.box(.52,.76,.035,5.95,1.55,-5.345,M.dark,.02).box(.3,.08,.06,5.95,1.13,-5.33,M.dark,.02);
   plane(.46,.66,reviewMat,0,0,.008,0,g);
  });
  // Lighting control gear on a rail above the right wall, wired to the truss.
  world.box(.05,.05,3.4,6.45,1.25,-1.4,M.steel);
  for(const z of [-3.05,-1.4,.25])world.box(.05,.62,.05,6.45,.95,z,M.steel);
  world.box(.026,.026,4.5,6.4,.68,-2.72,M.rubber).box(.026,.6,.026,6.4,.98,-.47,M.rubber).box(.026,.026,2.4,6.39,1.18,-1.5,M.rubber).box(.026,2.2,.026,6.39,2.4,-.72,M.rubber);
  device('controller',6.4,1.5,-2.7,(b,g)=>{
   b.box(.16,.46,.36,6.4,1.5,-2.7,M.plastic,.025).cyl(.012,.012,.16,6.4,1.8,-2.58,M.dark,6).cyl(.02,.02,.05,6.4,1.25,-2.62,M.dark,8).cyl(.02,.02,.05,6.4,1.25,-2.78,M.dark,8);
   const label=plate('ESP32 · LIGHT CTRL','#e7f3e4','#2c7a4b');
   plane(.3,.12,label,-.082,.08,0,-Math.PI/2,g);plane(.3,.12,label,.082,.08,0,Math.PI/2,g);
   blink(g,0,.235,.1,'#5dff9a',1.5);blink(g,0,.235,.04,'#6bc8ff',6);
  });
  device('driver',6.4,1.5,-.1,(b,g)=>{
   b.box(.14,.3,.62,6.4,1.5,-.1,M.alu,.012);
   for(let k=0;k<9;k++)b.box(.2,.26,.014,6.4,1.5,-.38+k*.07,M.alu);
   const label=plate('LED DRIVER','#22302b','#d8b566');
   plane(.26,.09,label,-.103,-.02,0,-Math.PI/2,g);plane(.26,.09,label,.103,-.02,0,Math.PI/2,g);
   blink(g,0,.16,.27,'#ffd66b',.9);
  });
 }
 world.build(scene);
 const aoGeo=mergeGeometries(aoParts,false);aoParts.forEach(g=>g.dispose());
 if(aoGeo){const m=new THREE.Mesh(aoGeo,new THREE.MeshBasicMaterial({map:aoTex,transparent:true,opacity:.4,depthWrite:false}));m.renderOrder=1;scene.add(m);}

 /** Advances everything that reacts to controller state. */
 function update(time:number,dt:number,s:State|null,showCoverage:boolean){
  const healthy=s?s.healthy:true;
  fixtures.forEach((f,i)=>{
   const target=(s?.zones[i]?.level??30)/100;
   // The controller command is immediate; the luminaire itself ramps like an LED driver soft-start.
   f.level+=(target-f.level)*(1-Math.exp(-dt*(target>f.level?11:8)));
   const b=f.level;
   f.diffuser.emissiveIntensity=.22+3.4*b*b;f.halo.opacity=.08+.8*b;f.spot.intensity=62*b;
   f.pool.opacity=.04+.56*Math.pow(b,1.7);f.beamMesh.visible=b>.42;f.beam.opacity=.085*(b-.4);
  });
  cameras.forEach((c,i)=>{
   const occupied=(s?.zones[i]?.count??0)>0,pulse=.5+.5*Math.sin(time*4);
   c.coverage.visible=showCoverage&&healthy;
   c.volumeMesh.visible=occupied;c.volume.opacity=.13+.04*pulse;c.edges.opacity=occupied?.85:.3;c.print.opacity=occupied?.75+.2*pulse:.3;
   c.led.color.set(healthy?'#5dff9a':'#ff5a4a');
   const on=healthy?Math.sin(time*2+i)>-.85:Math.sin(time*9)>0;c.led.color.multiplyScalar(on?1:.18);
  });
  for(const b of blinkers){b.leds.forEach((led,i)=>b.mesh.setColorAt(i,Math.sin(time*led.rate+led.phase)>-.3?led.color:ledOff));if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;}
  const actor=s?.actors[0],checkout=actor?.action==='checkout';
  if(checkout)beltTex.offset.x-=dt*.5;
  posMat.map=checkout?posBusy:posIdle;
  const trace=s?.trace??[];
  reviewMat.map=reviewScreens[trace.some(t=>t.text.includes('Approaches exit'))?2:trace.some(t=>t.text.includes('placed inside bag'))?1:0];
 }
 const dispose=()=>textures.forEach(t=>t.dispose());
 return {update,dispose,fixtures,cameras,beltItem};
}
export type Store=ReturnType<typeof buildStore>;
