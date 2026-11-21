// Neon Torino — motore di gioco (Three.js). Dati mappa: data/torino.json (generato da tools/build_map.py).
import * as THREE from 'three';
import { initLandmarks } from './landmarks/index.js';

const glc=document.getElementById('gl'),hud=document.getElementById('hud'),ctx=hud.getContext('2d');
let W=window.innerWidth,H=window.innerHeight,DPR=1;
const renderer=new THREE.WebGLRenderer({canvas:glc,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
const SKY=new THREE.Color('#9fd0ff');scene.background=SKY.clone();scene.fog=new THREE.Fog(SKY.clone(),1100,2800);
const camera=new THREE.PerspectiveCamera(62,1,2,9000);
function resize(){W=window.innerWidth;H=window.innerHeight;DPR=Math.min(window.devicePixelRatio||1,2);renderer.setSize(W,H,false);camera.aspect=W/H;camera.updateProjectionMatrix();hud.width=Math.round(W*DPR);hud.height=Math.round(H*DPR);}
window.addEventListener('resize',resize);resize();

// ---------------- utilità ----------------
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
let seed=20261119;
const srnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function shade(hex,amt){const n=parseInt(hex.slice(1),16);const r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return `rgb(${r},${g},${b})`;}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();}
const tmpC=new THREE.Color(),tmpO=new THREE.Object3D();

// ---------------- mondo: Torino, Santa Rita (dati OpenStreetMap) ----------------
const DATA=await (await fetch(new URL('../data/torino.json', import.meta.url))).json();
// la zona giocabile viene dai dati (clip, in metri): 1 m = 5 unità, 50 m di margine attorno
const CL=DATA.clip||[500,400,2300,2050];
const S5=5,OXm=CL[0]-50,OYm=CL[1]-50;
const T=10,WX=(CL[2]-OXm)*S5+250,WY=(CL[3]-OYm)*S5+250,GW=WX/T,GH=WY/T,WORLD=Math.max(WX,WY);
const PB={x0:250,y0:250,x1:(CL[2]-OXm)*S5,y1:(CL[3]-OYm)*S5};
const OPEN=0,ROAD=1,BUILD=2,PARK=3,SAND=4,WATER=5,OUT=6,WALK=OPEN;
const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
const grid=new Uint8Array(GW*GH),hgrid=new Float32Array(GW*GH);
const tileAt=(tx,ty)=>(tx<0||ty<0||tx>=GW||ty>=GH)?OUT:grid[ty*GW+tx];
const tileAtPx=(x,y)=>tileAt(Math.floor(x/T),Math.floor(y/T));
const heightAt=(x,y)=>{const tx=Math.floor(x/T),ty=Math.floor(y/T);return(tx<0||ty<0||tx>=GW||ty>=GH)?0:hgrid[ty*GW+tx];};
const walkable=t=>t===OPEN||t===PARK||t===ROAD;
const NEONS=['#ff2e88','#00e5ff','#b967ff','#fffb96','#05ffa1'];
const PAL=['#e8c27e','#e3b56c','#efdcb5','#e9d7bd','#d9c3a5','#e6cfb3','#d8b08a','#cfc6b8','#bfb8ac','#e2b8a0','#d9a66e','#c9a07a','#efe6d4','#b9785a','#e6c9a8','#d4cbbb'];
function decPoly(s,q){const pts=[];let i=0,x=0,y=0;const num=()=>{let r=0,sh=0,b;do{b=s.charCodeAt(i++)-63;r|=(b&31)<<sh;sh+=5;}while(b>=32);return(r&1)?~(r>>1):(r>>1);};while(i<s.length){x+=num();y+=num();pts.push([x*q,y*q]);}return pts;}
const toW=p=>[(p[0]-OXm)*S5,(p[1]-OYm)*S5];
const llToW=(lat,lon)=>[((lon-DATA.origin[1])*DATA.k[0]-OXm)*S5,((DATA.origin[0]-lat)*DATA.k[1]-OYm)*S5];
function polyArea(r){let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1];}return Math.abs(a/2);}
function offsetLine(pts,off){if(!off)return pts.map(p=>[p[0],p[1]]);const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)];let dx=b[0]-a[0],dy=b[1]-a[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;out.push([p[0]-dy*off,p[1]+dx*off]);}return out;}
const RW={P:15,S:11,T:9,R:7.5,V:5,X:8};
const CRUISE={P:205,S:185,T:165,R:135,V:90,X:60};
const roads=[];
for(const r of DATA.R){const cls=r[0];let wm=RW[cls];if(r[3]>0&&cls!=='X'&&cls!=='V')wm=clamp(r[3]*3.3+1.5,RW[cls]*0.6,18);else if(cls==='R'&&r[1]!==0)wm=6;
  const raw=decPoly(r[4],1);if(raw.length<2)continue;roads.push({cls,ow:r[1],name:r[2]>=0?DATA.names[r[2]]:'',w:wm*S5,raw,pts:raw.map(toW)});}
const buildingsD=DATA.B.map(b=>({h:b[0],kind:b[1],outer:decPoly(b[2],DATA.qb).map(toW),holes:b.slice(3).map(s=>decPoly(s,DATA.qb).map(toW))})).filter(b=>b.outer.length>=3);
const areasD=DATA.A.map(a=>({t:a[0],outer:decPoly(a[1],DATA.qb).map(toW),holes:a.slice(2).map(s=>decPoly(s,DATA.qb).map(toW))})).filter(a=>a.outer.length>=3);
function fillPoly(rings,fn){let minY=1e9,maxY=-1e9;for(const r of rings)for(const p of r){if(p[1]<minY)minY=p[1];if(p[1]>maxY)maxY=p[1];}
  const ty0=Math.max(0,Math.floor(minY/T)),ty1=Math.min(GH-1,Math.floor(maxY/T));
  for(let ty=ty0;ty<=ty1;ty++){const yc=(ty+0.5)*T,xs=[];
    for(const r of rings)for(let i=0,n=r.length;i<n;i++){const a=r[i],b=r[(i+1)%n];if((a[1]<=yc)!==(b[1]<=yc))xs.push(a[0]+(yc-a[1])/(b[1]-a[1])*(b[0]-a[0]));}
    xs.sort((p,q)=>p-q);
    for(let k=0;k+1<xs.length;k+=2){const tx0=Math.max(0,Math.ceil(xs[k]/T-0.5)),tx1=Math.min(GW-1,Math.floor(xs[k+1]/T-0.5));for(let tx=tx0;tx<=tx1;tx++)fn(ty*GW+tx);}}}
function stroke(pts,w,fn){const r=w/2;for(let i=0;i+1<pts.length;i++){const ax=pts[i][0],ay=pts[i][1],bx=pts[i+1][0],by=pts[i+1][1];
  const x0=Math.max(0,Math.floor((Math.min(ax,bx)-r)/T)),x1=Math.min(GW-1,Math.floor((Math.max(ax,bx)+r)/T)),y0=Math.max(0,Math.floor((Math.min(ay,by)-r)/T)),y1=Math.min(GH-1,Math.floor((Math.max(ay,by)+r)/T));
  const dx=bx-ax,dy=by-ay,L2=dx*dx+dy*dy||1;
  for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){const px=(tx+0.5)*T-ax,py=(ty+0.5)*T-ay;let t=(px*dx+py*dy)/L2;t=t<0?0:t>1?1:t;const ex=px-t*dx,ey=py-t*dy;if(ex*ex+ey*ey<=r*r)fn(ty*GW+tx);}}}
for(let ty=0;ty<GH;ty++)for(let tx=0;tx<GW;tx++){const x=(tx+0.5)*T,y=(ty+0.5)*T;if(x<PB.x0||x>PB.x1||y<PB.y0||y>PB.y1)grid[ty*GW+tx]=OUT;}
for(const a of areasD){const v=a.t==='w'?WATER:(a.t==='g'||a.t==='p')?PARK:-1;if(v<0)continue;fillPoly([a.outer,...a.holes],i=>{if(grid[i]!==OUT)grid[i]=v;});}
for(const r of roads)stroke(r.pts,r.w,i=>{if(grid[i]!==OUT)grid[i]=ROAD;});
let bs=97531;const brnd=()=>{bs=(Math.imul(bs,1664525)+1013904223)>>>0;return bs/4294967296;};
const buildings=[];
for(const b of buildingsD){const am=polyArea(b.outer)/25;
  let floors=b.h;if(!floors)floors=b.kind===3?1:am<60?1+Math.floor(brnd()*2):am<220?2+Math.floor(brnd()*4):5+Math.floor(brnd()*5);
  let h=(floors>=3&&b.kind===0)?20+(floors-1)*15:floors*15;if(b.kind===3)h=Math.min(h,15);if(b.kind===1)h=Math.max(h,95);if(b.kind===2)h=Math.max(h,125);
  const bb=Object.assign({},b,{floors,h3:h,col:b.kind===1?'#efe6d2':b.kind===2?'#c9ccd2':PAL[Math.floor(brnd()*PAL.length)],style:b.kind===1?'chiesa':b.kind===2?'stadio':floors<=2?'tapp':(floors<=5&&brnd()<0.45)?'pers':(brnd()<0.6?'balc':'tapp'),neon:brnd()<0.02?NEONS[Math.floor(brnd()*NEONS.length)]:null});
  buildings.push(bb);fillPoly([b.outer,...b.holes],i=>{if(grid[i]!==OUT){grid[i]=BUILD;hgrid[i]=Math.max(hgrid[i],h);}});}
// grafo stradale per traffico, polizia, pedoni e GPS
const nodes=[],nodeMap=new Map(),edges=[];
const keyOf=p=>p[0]+','+p[1];
const inPB=(x,y)=>x>PB.x0+30&&x<PB.x1-30&&y>PB.y0+30&&y<PB.y1-30;
{const cnt=new Map();for(const r of roads){if(r.cls==='X')continue;for(const p of r.raw){const k=keyOf(p);cnt.set(k,(cnt.get(k)||0)+1);}}
  const nodeAt=(raw,w)=>{const k=keyOf(raw);let n=nodeMap.get(k);if(!n){n={id:nodes.length,x:w[0],y:w[1],edges:[]};nodes.push(n);nodeMap.set(k,n);}return n;};
  for(const r of roads){if(r.cls==='X')continue;let start=0;
    for(let i=1;i<r.raw.length;i++){if(i===r.raw.length-1||cnt.get(keyOf(r.raw[i]))>1){const pts=r.pts.slice(start,i+1);
      if(pts.length>=2&&pts.every(p=>inPB(p[0],p[1]))){let len=0;for(let j=1;j<pts.length;j++)len+=Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]);
        if(len>4){const a=nodeAt(r.raw[start],r.pts[start]),b=nodeAt(r.raw[i],r.pts[i]);
          const e={id:edges.length,a,b,pts,len,cls:r.cls,ow:r.ow,w:r.w,name:r.name};const lo=e.ow?0:e.w/4;e.fwd=offsetLine(pts,lo);e.rev=offsetLine(pts.slice().reverse(),lo);
          const so=e.w/2+7.5;e.sideR=offsetLine(pts,so);e.sideL=offsetLine(pts,-so);edges.push(e);a.edges.push(e);b.edges.push(e);}}
      start=i;}}}}
function edgeOut(n,e){if(e.a===n&&e.ow!==-1)return 1;if(e.b===n&&e.ow!==1)return -1;return 0;}
const EG=200,egW=Math.ceil(WX/EG),egH=Math.ceil(WY/EG),egrid=Array.from({length:egW*egH},()=>[]);
for(const e of edges)for(let j=0;j+1<e.pts.length;j++){const ax=e.pts[j][0],ay=e.pts[j][1],bx=e.pts[j+1][0],by=e.pts[j+1][1];
  const x0=Math.max(0,Math.floor((Math.min(ax,bx)-e.w)/EG)),x1=Math.min(egW-1,Math.floor((Math.max(ax,bx)+e.w)/EG)),y0=Math.max(0,Math.floor((Math.min(ay,by)-e.w)/EG)),y1=Math.min(egH-1,Math.floor((Math.max(ay,by)+e.w)/EG));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)egrid[cy*egW+cx].push([e,j]);}
function nearestEdge(x,y,maxD){const cx=Math.floor(x/EG),cy=Math.floor(y/EG);let best=null,bd=maxD;
  for(let yy=cy-1;yy<=cy+1;yy++)for(let xx=cx-1;xx<=cx+1;xx++){if(xx<0||yy<0||xx>=egW||yy>=egH)continue;
    for(const [e,j] of egrid[yy*egW+xx]){const ax=e.pts[j][0],ay=e.pts[j][1],dx=e.pts[j+1][0]-ax,dy=e.pts[j+1][1]-ay,L2=dx*dx+dy*dy||1;let t=((x-ax)*dx+(y-ay)*dy)/L2;t=clamp(t,0,1);const px=ax+t*dx,py=ay+t*dy,d=Math.hypot(x-px,y-py);if(d<bd){bd=d;best={e,j,t,px,py,d};}}}
  return best;}
function sidewalkNear(x,y){const ne=nearestEdge(x,y,600);if(!ne)return[x,y,0];const e=ne.e,a=e.pts[ne.j],b=e.pts[ne.j+1],dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1;
  const s=((x-ne.px)*(-dy)+(y-ne.py)*dx)>=0?1:-1,o=s*(e.w/2+7.5);return[ne.px-dy/L*o,ne.py+dx/L*o,Math.atan2(dy,dx)];}
const PIAZZA=llToW(45.0467,7.6466),CHIESA=llToW(45.04600,7.64694),STADIO=llToW(45.04175,7.65002);
const sp0=sidewalkNear(PIAZZA[0]+90,PIAZZA[1]+170);const SPAWN={x:sp0[0],y:sp0[1],a:sp0[2]};
const gs0=sidewalkNear(PIAZZA[0]-260,PIAZZA[1]-60);
const signals=[],CLW={P:3,S:2,T:1};
for(const n of nodes){const big=n.edges.filter(e=>CLW[e.cls]);n.sc=big.reduce((a,e)=>a+CLW[e.cls],0);}
for(const n of [...nodes].sort((p,q)=>q.sc-p.sc)){const big=n.edges.filter(e=>CLW[e.cls]);if(n.edges.length<3||big.length<2||!big.some(e=>e.cls!=='T'))continue;
  if(signals.some(m=>Math.hypot(m.x-n.x,m.y-n.y)<110))continue;
  big.sort((p,q)=>CLW[q.cls]-CLW[p.cls]);const ref=big[0],rp=ref.a===n?ref.pts[1]:ref.pts[ref.pts.length-2];
  n.axis=Math.atan2(rp[1]-n.y,rp[0]-n.x);n.sig=true;n.stop=Math.max(...n.edges.map(e=>e.w))/2+16;
  const h=Math.imul(Math.floor(n.x/320)*73856093^Math.floor(n.y/320)*19349663,2654435761)>>>0;n.phase=(h%1600)/100;signals.push(n);}
function sigGreen(n,inAng){const t=(lightT+n.phase)%16,d=Math.abs(angDiff(inAng,n.axis)),cross=d>Math.PI/4&&d<Math.PI*3/4;
  if(!cross)return t<6.5?0:t<8?1:2;return t<8?2:t<14.5?0:1;}
// ---------------- suolo, strade e aree ----------------
function canvasTex(c,repeat){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
function glowCanvas(r,stops){const c=document.createElement('canvas');c.width=c.height=r*2;const g=c.getContext('2d');const gr=g.createRadialGradient(r,r,0,r,r,r);for(const [o,cl] of stops)gr.addColorStop(o,cl);g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c;}
function shapeOf(outer,holes){const s=new THREE.Shape(outer.map(p=>new THREE.Vector2(p[0],-p[1])));for(const h of holes||[])if(h.length>=3)s.holes.push(new THREE.Path(h.map(p=>new THREE.Vector2(p[0],-p[1]))));return s;}
{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#c6bead';g.fillRect(0,0,256,256);
  for(let i=0;i<2200;i++){g.fillStyle=Math.random()<0.5?'rgba(0,0,0,0.05)':'rgba(255,255,255,0.06)';g.fillRect(Math.random()*256,Math.random()*256,2,2);}
  const tex=canvasTex(c,true);tex.repeat.set((WX+8000)/320,(WY+8000)/320);
  const gm=new THREE.Mesh(new THREE.PlaneGeometry(WX+8000,WY+8000).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:tex,roughness:1}));gm.position.set(WX/2,0,WY/2);gm.receiveShadow=true;scene.add(gm);
  const om=new THREE.MeshStandardMaterial({color:'#5d5f63',roughness:1});const big=12000;
  for(const [x0,y0,x1,y1] of [[-big,-big,WX+big,PB.y0],[-big,PB.y1,WX+big,WY+big],[-big,PB.y0,PB.x0,PB.y1],[PB.x1,PB.y0,WX+big,PB.y1]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,y1-y0).rotateX(-Math.PI/2),om);m.position.set((x0+x1)/2,0.4,(y0+y1)/2);m.receiveShadow=true;scene.add(m);}}
let asphMat=null;
const AREA_COL={g:'#5fa35a',p:'#3f8f45',w:'#3b8fd0',k:'#8d8f94',r:'#9b8f7f'};
{const groups={};for(const a of areasD){try{const g=new THREE.ShapeGeometry(shapeOf(a.outer,a.holes)).rotateX(-Math.PI/2).translate(0,a.t==='p'?0.1:a.t==='k'?0.06:0.08,0);(groups[a.t]=groups[a.t]||[]).push(g);}catch(e){}}
  for(const t in groups){const m=new THREE.Mesh(mergeGeo(groups[t]),new THREE.MeshStandardMaterial({color:AREA_COL[t],roughness:t==='w'?0.2:1}));m.receiveShadow=true;scene.add(m);}}
function ribbon(arr,pts,w,y,discs){const r=w/2;for(let i=0;i+1<pts.length;i++){const ax=pts[i][0],ay=pts[i][1],bx=pts[i+1][0],by=pts[i+1][1],dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy);if(L<0.01)continue;const nx=-dy/L*r,ny=dx/L*r;
    arr.push(ax+nx,y,ay+ny,bx+nx,y,by+ny,bx-nx,y,by-ny, ax+nx,y,ay+ny,bx-nx,y,by-ny,ax-nx,y,ay-ny);}
  if(discs)for(const p of pts){const N=10;for(let k=0;k<N;k++){const a0=k/N*TAU,a1=(k+1)/N*TAU;arr.push(p[0],y,p[1],p[0]+Math.cos(a1)*r,y,p[1]+Math.sin(a1)*r,p[0]+Math.cos(a0)*r,y,p[1]+Math.sin(a0)*r);}}}
function flatMesh(arr,color,rough){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));const n=new Float32Array(arr.length);for(let i=1;i<n.length;i+=3)n[i]=1;g.setAttribute('normal',new THREE.BufferAttribute(n,3));g.computeBoundingSphere();
  const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:rough??0.95}));m.receiveShadow=true;scene.add(m);return m;}
{const side=[],asph=[],ped=[],mark=[];
  for(const r of roads){if(r.cls==='X'){ribbon(ped,r.pts,r.w,0.18,true);continue;}
    if(r.cls!=='V')ribbon(side,r.pts,r.w+30,0.12,true);ribbon(asph,r.pts,r.w,0.24,true);
    if((r.cls==='P'||r.cls==='S'||r.cls==='T')&&r.ow===0&&r.w>=42){let acc=-60;for(let i=0;i+1<r.pts.length;i++){const ax=r.pts[i][0],ay=r.pts[i][1],bx=r.pts[i+1][0],by=r.pts[i+1][1],L=Math.hypot(bx-ax,by-ay);if(L<1)continue;const ux=(bx-ax)/L,uy=(by-ay)/L;
      let s=Math.max(0,acc<0?-acc:0);for(;s+30<L-40;s+=60){if(i===0&&s<40)continue;const x0=ax+ux*s,y0=ay+uy*s,x1=x0+ux*30,y1=y0+uy*30;ribbon(mark,[[x0,y0],[x1,y1]],2.6,0.32,false);}acc=0;}}}
  for(const n of signals)for(const e of n.edges){if(e.cls==='V'||e.cls==='X')continue;const far=e.a===n?e.pts[1]:e.pts[e.pts.length-2];let dx=far[0]-n.x,dy=far[1]-n.y;const L=Math.hypot(dx,dy);if(L<n.stop+10)continue;dx/=L;dy/=L;
    const cx=n.x+dx*(n.stop-6),cy=n.y+dy*(n.stop-6),hw=e.w/2-3;for(let k=-hw;k<=hw;k+=9){const ox=-dy*k,oy=dx*k;ribbon(mark,[[cx+ox-dx*6,cy+oy-dy*6],[cx+ox+dx*6,cy+oy+dy*6]],4.5,0.33,false);}}
  flatMesh(side,'#b8b6b0');asphMat=flatMesh(asph,'#3b3e44',0.9).material;flatMesh(ped,'#cdbf9c');const mm=flatMesh(mark,'#f2f2f2');mm.material.roughness=0.6;}
const MS=0.08;const miniCv=document.createElement('canvas');miniCv.width=Math.ceil(WX*MS);miniCv.height=Math.ceil(WY*MS);
{const g=miniCv.getContext('2d');g.fillStyle='#2b313b';g.fillRect(0,0,miniCv.width,miniCv.height);g.fillStyle='#3e4553';g.fillRect(PB.x0*MS,PB.y0*MS,(PB.x1-PB.x0)*MS,(PB.y1-PB.y0)*MS);
  const path=r=>{g.moveTo(r[0][0]*MS,r[0][1]*MS);for(const p of r)g.lineTo(p[0]*MS,p[1]*MS);g.closePath();};
  for(const a of areasD){g.fillStyle={g:'#2f7a3c',p:'#2a6b35',w:'#2b6ca8',k:'#555b66',r:'#5b5348'}[a.t];g.beginPath();path(a.outer);for(const h of a.holes)path(h);g.fill('evenodd');}
  g.lineCap='round';g.lineJoin='round';
  for(const r of roads){g.strokeStyle=r.cls==='X'?'#b8ab8a':r.cls==='P'?'#ffffff':'#d9dde3';g.lineWidth=Math.max(1.3,r.w*MS);g.beginPath();g.moveTo(r.pts[0][0]*MS,r.pts[0][1]*MS);for(const p of r.pts)g.lineTo(p[0]*MS,p[1]*MS);g.stroke();}
  g.fillStyle='#22272f';for(const b of buildingsD){g.beginPath();path(b.outer);for(const h of b.holes)path(h);g.fill('evenodd');}}
const SKN=1200;let skidI=0,skidCount=0;
const skidMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x111111,transparent:true,opacity:0.35,depthWrite:false}),SKN);skidMesh.count=0;skidMesh.renderOrder=1;skidMesh.frustumCulled=false;scene.add(skidMesh);
function addSkid(x0,y0,x1,y1){const dx=x1-x0,dy=y1-y0,L=Math.hypot(dx,dy);if(L<0.5||L>60)return;tmpO.position.set((x0+x1)/2,0.34,(y0+y1)/2);tmpO.rotation.set(0,-Math.atan2(dy,dx),0);tmpO.scale.set(L+1,1,3);tmpO.updateMatrix();
  skidMesh.setMatrixAt(skidI,tmpO.matrix);skidI=(skidI+1)%SKN;skidCount=Math.min(SKN,skidCount+1);skidMesh.count=skidCount;skidMesh.instanceMatrix.needsUpdate=true;}
function markSkid(){}function refreshChunks(){}
// ---------------- luci ----------------
const hemi=new THREE.HemisphereLight(0xdbeeff,0x6a6a5a,1.0);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff6e8,2.4);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-700;sc.right=700;sc.top=700;sc.bottom=-700;sc.near=10;sc.far=3200;sun.shadow.bias=-0.0004;sun.shadow.normalBias=1.2;
scene.add(sun);scene.add(sun.target);
const SUN_OFF=new THREE.Vector3(-0.55,1,-0.38).normalize().multiplyScalar(1400);

// ---------------- città 3D ----------------
const FLOOR=15,GF=20;
function mkCv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return[c,c.getContext('2d')];}
function noiseFill(g,w,h,base,n){g.fillStyle=base;g.fillRect(0,0,w,h);for(let i=0;i<n;i++){g.fillStyle=Math.random()<0.5?'rgba(0,0,0,0.035)':'rgba(255,255,255,0.05)';g.fillRect(Math.random()*w,Math.random()*h,2,2);}}
const rpick=a=>a[Math.floor(Math.random()*a.length)];
// facciate residenziali: 4 moduli x 4 piani (512x512 px = 80 x 60 unità)
function makeRes(kind){
  const [c,g]=mkCv(512,512),[e,ge]=mkCv(512,512);ge.fillStyle='#000';ge.fillRect(0,0,512,512);
  noiseFill(g,512,512,'#f3efe8',2600);
  const SH={balc:['#6b4a32','#7a5a40','#8a8a86','#6b4a32'],tapp:['#6b4a32','#9a9890','#e6e2da','#7a5a40'],pers:['#3e5b3a','#4a6640','#35503a','#5f4630']}[kind];
  const AW=['#2f7d4f','#c2562c','#2f5f9a','#b8892f','#8a2f3a'];
  const lit=(x,y,w,h)=>{if(Math.random()<0.42){ge.fillStyle=rpick(['#e8b060','#f0c47a','#ffd89a','#f5d0a0','#9fc0e0']);ge.fillRect(x,y,w,h);}};
  for(let r=0;r<4;r++){const y0=r*128,balcRow=kind==='balc'||(kind==='tapp'&&Math.random()<0.3);
    if(kind==='pers'){g.fillStyle='rgba(0,0,0,0.10)';g.fillRect(0,y0+120,512,6);g.fillStyle='rgba(255,255,255,0.4)';g.fillRect(0,y0+117,512,3);}
    else{g.fillStyle='rgba(0,0,0,0.05)';g.fillRect(0,y0+124,512,4);}
    for(let k=0;k<4;k++){const x0=k*128,door=balcRow&&(kind==='balc'?(k%2===0):(k===1||k===2));
      const ww=46,wh=door?100:64,wx=x0+41,wy=door?y0+18:y0+30;
      g.fillStyle=kind==='pers'?'#ebe5d8':'#ddd7cc';g.fillRect(wx-5,wy-5,ww+10,wh+(door?5:10));
      g.fillStyle='#2b3746';g.fillRect(wx,wy,ww,wh);g.fillStyle='rgba(255,255,255,0.16)';g.fillRect(wx+3,wy+3,14,wh-6);g.fillStyle='#d8d2c6';g.fillRect(wx+ww/2-1,wy,2,wh);
      if(kind==='pers'){const sc=rpick(SH);
        if(Math.random()<0.35){g.fillStyle=sc;g.fillRect(wx,wy,ww,wh);g.fillStyle='rgba(0,0,0,0.25)';for(let yy=wy+4;yy<wy+wh;yy+=6)g.fillRect(wx,yy,ww,2);g.fillStyle='rgba(0,0,0,0.4)';g.fillRect(wx+ww/2-1,wy,2,wh);}
        else{lit(wx,wy,ww,wh);g.fillStyle=sc;g.fillRect(wx-27,wy,22,wh);g.fillRect(wx+ww+5,wy,22,wh);g.fillStyle='rgba(0,0,0,0.25)';for(let yy=wy+4;yy<wy+wh;yy+=6){g.fillRect(wx-27,yy,22,2);g.fillRect(wx+ww+5,yy,22,2);}}
        g.fillStyle='#efe9dd';g.fillRect(wx-8,wy+wh+3,ww+16,6);g.fillStyle='rgba(0,0,0,0.15)';g.fillRect(wx-8,wy+wh+9,ww+16,2);
        g.fillStyle='#e7e0d2';g.fillRect(wx-8,wy-14,ww+16,7);
      }else{const f=Math.random()<0.15?1:Math.random()*0.85,sh=Math.round(wh*f),sc=rpick(SH);
        if(wh-sh>4)lit(wx,wy+sh,ww,wh-sh);
        g.fillStyle=sc;g.fillRect(wx,wy,ww,sh);g.fillStyle='rgba(0,0,0,0.18)';for(let yy=wy+3;yy<wy+sh;yy+=4)g.fillRect(wx,yy,ww,1);
        g.fillStyle='#cfc8bb';g.fillRect(wx-6,wy-10,ww+12,5);
        if(!door){g.fillStyle='#e6e0d4';g.fillRect(wx-7,wy+wh+4,ww+14,5);}}
    }
    if(balcRow){const segs=kind==='balc'?[[0,512]]:[[128,384]];
      for(const [a,b] of segs){g.fillStyle='#ebe7de';g.fillRect(a,y0+118,b-a,8);g.fillStyle='rgba(0,0,0,0.22)';g.fillRect(a,y0+126,b-a,2);
        if(Math.random()<0.5){g.fillStyle='rgba(228,223,213,0.94)';g.fillRect(a,y0+84,b-a,34);g.fillStyle='rgba(0,0,0,0.08)';g.fillRect(a,y0+84,b-a,3);for(let x=a;x<b;x+=128){g.fillStyle='rgba(0,0,0,0.06)';g.fillRect(x,y0+84,2,34);}}
        else{g.fillStyle='#3b3f45';g.fillRect(a,y0+84,b-a,3);for(let x=a+3;x<b;x+=8)g.fillRect(x,y0+84,2,34);}
        // vasi di fiori sul balcone
        for(let x=a+10;x<b-10;x+=24)if(Math.random()<0.25){g.fillStyle='#a0522d';g.fillRect(x,y0+76,10,8);g.fillStyle=rpick(['#3f8f3a','#5aa04a','#c0392b','#e17055']);g.beginPath();g.arc(x+5,y0+73,7,0,Math.PI*2);g.fill();}}
      for(let k=0;k<4;k++)if(Math.random()<0.3){const x0=k*128+28,ac=rpick(AW);for(let s=0;s<72;s+=12){g.fillStyle=(s/12)%2?ac:'#f1ede4';g.fillRect(x0+s,y0+8,12,26);}g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(x0,y0+33,72,3);}
    }
  }
  return[canvasTex(c,true),canvasTex(e,true)];
}
// piano terra con negozi: 16 vetrine (2048x128 px = 640 x 20 unità)
const SHOPS=[['BAR','#7a1f24','#ffffff'],['TABACCHI','#1d2a4f','#ffffff','T'],['FARMACIA','#f4f4f0','#1f8a3c','+'],['PANETTERIA','#8a5a2b','#fff3d6'],['PIZZERIA','#1f6b3a','#ffffff'],['ALIMENTARI','#c9a227','#2a1f0a'],['CAFFÈ','#3b2a20','#f2d7a0'],['PARRUCCHIERE','#e6d6e8','#5a2d6a'],['FERRAMENTA','#2e4f7a','#ffffff'],['GELATERIA','#f7e3ef','#b0306a'],['EDICOLA','#2b2b2b','#ffd23f'],['MACELLERIA','#9b2226','#ffffff'],['FIORI','#2f6b3f','#ffffff'],['OTTICA','#f2f2f2','#1d3557'],['LAVANDERIA','#3a86c8','#ffffff'],['TRATTORIA','#5c3a21','#f5e6c8']];
function makeShops(){const W=2048,H=128,[c,g]=mkCv(W,H),[e,ge]=mkCv(W,H);ge.fillStyle='#000';ge.fillRect(0,0,W,H);noiseFill(g,W,H,'#ddd6c8',4000);
  const order=[...SHOPS].sort(()=>Math.random()-0.5);
  const sign=(cx,x0,name,bg,fg,ic)=>{cx.fillStyle=bg;cx.fillRect(x0+6,7,116,29);cx.textAlign='center';cx.textBaseline='middle';let fs=21;cx.font='bold '+fs+'px system-ui,sans-serif';const maxW=ic?82:108;while(cx.measureText(name).width>maxW&&fs>9){fs--;cx.font='bold '+fs+'px system-ui,sans-serif';}
    cx.fillStyle=fg;cx.fillText(name,ic?x0+80:x0+64,22);
    if(ic==='T'){cx.fillStyle='#ffffff';cx.fillRect(x0+9,10,24,23);cx.fillStyle='#1d2a4f';cx.fillRect(x0+11,12,20,19);cx.fillStyle='#ffffff';cx.font='bold 20px serif';cx.fillText('T',x0+21,22);}
    if(ic==='+'){cx.fillStyle='#22a046';cx.fillRect(x0+17,10,9,24);cx.fillRect(x0+9,18,25,9);}};
  for(let i=0;i<16;i++){const x0=i*128,[name,bg,fg,ic]=order[i],closed=Math.random()<0.15;
    g.fillStyle='#c9c1b2';g.fillRect(x0,0,7,128);g.fillRect(x0,38,128,6);
    sign(g,x0,name,bg,fg,ic);sign(ge,x0,name,bg==='#f4f4f0'||bg==='#f2f2f2'?'#d8f0dc':bg,fg,ic);
    if(closed){g.fillStyle='#a3a4a6';g.fillRect(x0+9,46,111,82);g.fillStyle='rgba(0,0,0,0.18)';for(let y=48;y<128;y+=5)g.fillRect(x0+9,y,111,1);
      if(Math.random()<0.6){g.strokeStyle=rpick(['#e84393','#0984e3','#00b894','#2d3436']);g.lineWidth=3;g.beginPath();g.moveTo(x0+20,100);for(let k=0;k<6;k++)g.lineTo(x0+25+k*14,85+Math.random()*25);g.stroke();}}
    else{g.fillStyle='#26313d';g.fillRect(x0+9,46,111,82);
      for(let k=0;k<7;k++){g.fillStyle=rpick(['#c9a46a','#d96c4f','#7fb3d5','#e8d9a8','#8bc48a','#f5f0e6']);g.fillRect(x0+14+Math.random()*92,62+Math.random()*50,7+Math.random()*14,6+Math.random()*12);}
      g.fillStyle='rgba(255,255,255,0.13)';g.fillRect(x0+13,50,26,74);g.fillStyle='#55595f';g.fillRect(x0+78,48,3,80);g.fillRect(x0+9,46,111,3);
      ge.fillStyle='rgba(240,196,130,0.6)';ge.fillRect(x0+9,49,111,79);}
  }
  return[canvasTex(c,true),canvasTex(e,true)];}
// piano terra senza negozi: zoccolo in pietra, portone, finestre con inferriate, box auto
function makePlain(){const [c,g]=mkCv(512,128),[e,ge]=mkCv(512,128);ge.fillStyle='#000';ge.fillRect(0,0,512,128);noiseFill(g,512,128,'#e6e0d4',1500);
  g.fillStyle='rgba(0,0,0,0.06)';for(let y=12;y<96;y+=14)g.fillRect(0,y,512,2);
  g.fillStyle='#aaa59b';g.fillRect(0,98,512,30);g.fillStyle='rgba(0,0,0,0.13)';for(let x=0;x<512;x+=42)g.fillRect(x,98,2,30);g.fillRect(0,98,512,2);
  for(let k=0;k<4;k++){const x0=k*128;
    if(k===1){g.fillStyle='#d4ccbd';g.fillRect(x0+32,10,64,118);g.fillStyle='#5a3b26';g.fillRect(x0+38,16,52,112);g.fillStyle='#2b3542';g.fillRect(x0+45,24,38,42);g.fillStyle='rgba(0,0,0,0.3)';g.fillRect(x0+63,16,2,112);g.fillStyle='#c9a227';g.fillRect(x0+56,84,4,6);g.fillRect(x0+68,84,4,6);ge.fillStyle='#b08850';ge.fillRect(x0+45,24,38,42);}
    else if(k===3){g.fillStyle='#8d9095';g.fillRect(x0+18,32,92,96);g.fillStyle='rgba(0,0,0,0.15)';for(let y=36;y<128;y+=8)g.fillRect(x0+18,y,92,2);}
    else{g.fillStyle='#d6cfc2';g.fillRect(x0+38,24,52,62);g.fillStyle='#2b3746';g.fillRect(x0+43,29,42,52);if(Math.random()<0.35){ge.fillStyle='#e0b070';ge.fillRect(x0+43,29,42,52);}g.fillStyle='#2a2d31';for(let x=x0+46;x<x0+86;x+=7)g.fillRect(x,29,2,52);g.fillRect(x0+43,42,42,2);g.fillRect(x0+43,64,42,2);}}
  return[canvasTex(c,true),canvasTex(e,true)];}
function makeChurch(){const [c,g]=mkCv(512,512),[e,ge]=mkCv(512,512);ge.fillStyle='#000';ge.fillRect(0,0,512,512);noiseFill(g,512,512,'#efe6d2',3000);
  g.fillStyle='rgba(0,0,0,0.05)';for(let y=0;y<512;y+=16)g.fillRect(0,y,512,1);
  for(let k=0;k<2;k++){const x0=k*256+98;g.fillStyle='#d9ccb2';g.fillRect(x0-8,96,76,300);g.fillStyle='#2c3a52';g.fillRect(x0,130,60,258);g.beginPath();g.arc(x0+30,130,30,Math.PI,0);g.fill();
    g.fillStyle='#b84a3a';g.fillRect(x0+4,150,24,90);g.fillStyle='#d6a640';g.fillRect(x0+32,150,24,90);g.fillStyle='#3d6fb0';g.fillRect(x0+4,250,52,60);ge.fillStyle='#a0703a';ge.fillRect(x0,130,60,258);}
  g.fillStyle='#d9ccb2';g.fillRect(0,440,512,14);return[canvasTex(c,true),canvasTex(e,true)];}
function makeStadium(){const [c,g]=mkCv(512,512),[e,ge]=mkCv(512,512);ge.fillStyle='#000';ge.fillRect(0,0,512,512);noiseFill(g,512,512,'#c9ccd1',2500);
  for(let x=0;x<512;x+=64){g.fillStyle='#aeb3ba';g.fillRect(x,0,14,512);}g.fillStyle='#8a2432';g.fillRect(0,40,512,26);g.fillStyle='rgba(0,0,0,0.12)';for(let y=128;y<512;y+=128)g.fillRect(0,y,512,6);
  return[canvasTex(c,true),canvasTex(e,true)];}
const FT={balc:makeRes('balc'),tapp:makeRes('tapp'),pers:makeRes('pers'),shop:makeShops(),plain:makePlain(),chiesa:makeChurch(),stadio:makeStadium()};
const FAC_M={};for(const k in FT)FAC_M[k]=new THREE.MeshStandardMaterial({map:FT[k][0],emissiveMap:FT[k][1],emissive:new THREE.Color(k==='shop'?'#ffffff':'#fff0d8'),emissiveIntensity:0,vertexColors:true,roughness:0.85});
const stuccoM=FAC_M.balc,glassBM=FAC_M.tapp;
const roofM=new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.9});
function inst(geo,mat,items,cast,colored){if(!items.length)return null;const m=new THREE.InstancedMesh(geo,mat,items.length);
  items.forEach((it,i)=>{tmpO.position.set(it[0],it[1],it[2]);tmpO.scale.set(it[3]??1,it[4]??1,it[5]??1);tmpO.rotation.set(it[6]||0,it[7]||0,it[8]||0);tmpO.updateMatrix();m.setMatrixAt(i,tmpO.matrix);if(colored)m.setColorAt(i,tmpC.set(it[9]||'#ffffff'));});
  m.castShadow=!!cast;m.receiveShadow=true;scene.add(m);return m;}
const STD=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:0.85},o||{}));
const neonM=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});
const bulbM=new THREE.MeshBasicMaterial({color:0x888888,toneMapped:false});
const antM=new THREE.MeshBasicMaterial({color:0x550000,toneMapped:false});
let lampDecalM,tlLamps=null,tlAxis=[];
function buildCity(){
  const WA={},roofA={p:[],n:[],c:[]};for(const k in FAC_M)WA[k]={p:[],n:[],u:[],c:[]};
  const ac=[],neon=[],ant=[],antL=[],torr=[],tvp=[],tvx=[];
  // vicinanza alle strade (2 = corso/via principale, 1 = via residenziale): decide dove ci sono i negozi
  const nearMain=new Uint8Array(GW*GH);for(const r of roads){const lv=(r.cls==='P'||r.cls==='S'||r.cls==='T')?2:r.cls==='R'?1:0;if(lv)stroke(r.pts,r.w+90,i=>{if(nearMain[i]<lv)nearMain[i]=lv;});}
  const tIdx=(x,y)=>{const tx=Math.floor(x/T),ty=Math.floor(y/T);return(tx<0||ty<0||tx>=GW||ty>=GH)?-1:ty*GW+tx;};
  const wall=(o,ax,ay,bx,by,y0,y1,u0,u1,v0,v1,nx,ny,col,left)=>{const P=[[ax,y0,ay],[bx,y0,by],[bx,y1,by],[ax,y1,ay]],U=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]];
    for(const i of (left?[0,1,2,0,2,3]:[0,2,1,0,3,2])){o.p.push(P[i][0],P[i][1],P[i][2]);o.n.push(nx,0,ny);o.u.push(U[i][0],U[i][1]);o.c.push(col.r,col.g,col.b);}};
  const ringArea=r=>{let a=0;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=p[0]*q[1]-q[0]*p[1];}return a/2;};
  const WHITE=new THREE.Color('#ffffff');
  // pareti di un anello (esterno o cortile): piano terra (negozi/portoni) + piani superiori
  function addWalls(ring,isHole,h,style,col,base,off,streetFn){const A=ringArea(ring),n=ring.length;let u=off;
    for(let i=0;i<n;i++){const p=ring[i],q=ring[(i+1)%n],dx=q[0]-p[0],dy=q[1]-p[1],L=Math.hypot(dx,dy);if(L<0.5)continue;
      const left=isHole?(A>0):(A<=0),nx=left?-dy/L:dy/L,ny=left?dx/L:-dx/L,u1=u+L,ua=left?u:-u,ub=left?u1:-u1;
      if(!base){const V=style==='chiesa'?h:60;wall(WA[style],p[0],p[1],q[0],q[1],0,h,ua/80,ub/80,0,h/V,nx,ny,col,left);}
      else{const lv=isHole?0:streetFn((p[0]+q[0])/2,(p[1]+q[1])/2,nx,ny),sh=(lv===2&&base.s2)||(lv===1&&base.s1)?'shop':'plain';
        if(sh==='shop')wall(WA.shop,p[0],p[1],q[0],q[1],0,GF,ua/640,ub/640,0,1,nx,ny,WHITE,left);
        else wall(WA.plain,p[0],p[1],q[0],q[1],0,GF,ua/80,ub/80,0,1,nx,ny,base.col,left);
        wall(WA[style],p[0],p[1],q[0],q[1],GF,h,ua/80,ub/80,0,(h-GF)/60,nx,ny,col,left);}
      u=u1;}}
  function addRoof(outer,holes,h,rc){const c2=outer.map(p=>new THREE.Vector2(p[0],p[1])),h2=holes.map(r=>r.map(p=>new THREE.Vector2(p[0],p[1])));
    let tris;try{tris=THREE.ShapeUtils.triangulateShape(c2,h2);}catch(e){return;}const all=[...outer];for(const r of holes)all.push(...r);
    for(const t of tris){const a=all[t[0]],b=all[t[1]],c=all[t[2]];if(!a||!b||!c)continue;const up=(b[1]-a[1])*(c[0]-a[0])-(b[0]-a[0])*(c[1]-a[1]);
      for(const v of (up>=0?[a,b,c]:[a,c,b])){roofA.p.push(v[0],h,v[1]);roofA.n.push(0,1,0);roofA.c.push(rc.r,rc.g,rc.b);}}}
  const clean=r=>{const o=[];for(const p of r){const l=o[o.length-1];if(!l||Math.abs(l[0]-p[0])>0.01||Math.abs(l[1]-p[1])>0.01)o.push(p);}
    if(o.length>2&&Math.abs(o[0][0]-o[o.length-1][0])<0.01&&Math.abs(o[0][1]-o[o.length-1][1])<0.01)o.pop();return o;};
  const gridStreet=(mx,my,nx,ny)=>{for(const d of [22,40,60]){const i=tIdx(mx+nx*d,my+ny*d);if(i<0)return 0;if(grid[i]===ROAD)return nearMain[i]||1;if(grid[i]===BUILD)return 0;}return 0;};
  const ROOFC=['#8b8c90','#7d7f84','#9b978e','#85878a'];
  for(const b of buildings){const outer=clean(b.outer),holes=b.holes.map(clean).filter(h=>h.length>=3);if(outer.length<3)continue;
    const col=new THREE.Color(b.col),hasBase=b.style!=='chiesa'&&b.style!=='stadio'&&b.floors>=3;
    const base=hasBase?{col:col.clone().multiplyScalar(0.84),s2:brnd()<0.88,s1:brnd()<0.38}:null,off=brnd()*640;
    addWalls(outer,false,b.h3,b.style,col,base,off,gridStreet);for(const h of holes)addWalls(h,true,b.h3,b.style,col,base,off,gridStreet);
    const rc=new THREE.Color(b.kind===1?'#a65a3e':b.kind===2?'#9aa0a8':(b.floors<=5&&brnd()<0.35)?'#a35b40':ROOFC[Math.floor(brnd()*ROOFC.length)]);
    addRoof(outer,holes,b.h3,rc);
    const ar=polyArea(b.outer);let cx=0,cy=0;for(const p of outer){cx+=p[0];cy+=p[1];}cx/=outer.length;cy/=outer.length;
    const onRoof=(x,y)=>tileAtPx(x,y)===BUILD&&Math.abs(heightAt(x,y)-b.h3)<1;
    let la=0,ll=0;for(let i=0;i<outer.length;i++){const p=outer[i],q=outer[(i+1)%outer.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>ll){ll=L;la=Math.atan2(q[1]-p[1],q[0]-p[0]);}}
    if(b.kind===0&&b.floors>=5&&onRoof(cx,cy))torr.push([cx,b.h3+9,cy,26,18,18,0,-la,0]);
    if(ar>6000&&b.kind===0){const n=1+Math.floor(brnd()*2);for(let i=0;i<n;i++){const x=cx+(brnd()-0.5)*40,y=cy+(brnd()-0.5)*40;if(onRoof(x,y))ac.push([x,b.h3+4,y,14,8,12]);}}
    if(b.kind===0&&b.floors>=3){const n=1+Math.floor(brnd()*3);for(let i=0;i<n;i++){const x=cx+(brnd()-0.5)*50,y=cy+(brnd()-0.5)*50;if(!onRoof(x,y))continue;const hh=10+brnd()*6,ra=brnd()*3;tvp.push([x,b.h3+hh/2,y,1,hh,1]);tvx.push([x,b.h3+hh-1,y,9,0.5,0.5,0,ra,0]);tvx.push([x,b.h3+hh-4,y,6,0.5,0.5,0,ra,0]);}}
    if(b.floors>=11){ant.push([cx,b.h3+22,cy]);antL.push([cx,b.h3+44,cy]);}
    if(b.neon){const r=b.outer;for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L<8)continue;neon.push([(p[0]+q[0])/2,b.h3+1,(p[1]+q[1])/2,L,1.6,1.6,0,-Math.atan2(q[1]-p[1],q[0]-p[0]),0,b.neon]);}}
  }
  // la città continua oltre il bordo: isolati a corte orientati come la griglia di Santa Rita
  {const hist=new Float64Array(90);for(const e of edges)for(let j=0;j+1<e.pts.length;j++){const a=e.pts[j],c=e.pts[j+1],L=Math.hypot(c[0]-a[0],c[1]-a[1]);let ang=Math.atan2(c[1]-a[1],c[0]-a[0])*180/Math.PI;ang=((ang%90)+90)%90;hist[Math.floor(ang)%90]+=L;}
    let ba=0,bv=-1;for(let i=0;i<90;i++){let v=0;for(let k=-3;k<=3;k++)v+=hist[(i+k+90)%90];if(v>bv){bv=v;ba=i;}}
    const th=ba*Math.PI/180,cs=Math.cos(th),sn=Math.sin(th),cx0=(PB.x0+PB.x1)/2,cy0=(PB.y0+PB.y1)/2,BS=560,HB=230,TK=74,M=70;
    const inM=(x,y)=>x>PB.x0-M&&x<PB.x1+M&&y>PB.y0-M&&y<PB.y1+M,dPB=(x,y)=>Math.hypot(Math.max(PB.x0-x,0,x-PB.x1),Math.max(PB.y0-y,0,y-PB.y1));
    const toXY=(u,v)=>[cx0+u*cs-v*sn,cy0+u*sn+v*cs];const N=Math.ceil((Math.hypot(PB.x1-PB.x0,PB.y1-PB.y0)/2+2200)/BS);
    for(let i=-N;i<N;i++)for(let j=-N;j<N;j++){const uc=(i+0.5)*BS,vc=(j+0.5)*BS,[bx,by]=toXY(uc,vc);if(dPB(bx,by)>1900)continue;
      const slabs=[[-HB,-HB,HB,-HB+TK,0],[-HB,HB-TK,HB,HB,0],[-HB,-HB+TK,-HB+TK,HB-TK,1],[HB-TK,-HB+TK,HB,HB-TK,1]];
      for(const [u0,v0,u1,v1,ax] of slabs){const parts=1+Math.floor(brnd()*3),len=ax===0?u1-u0:v1-v0;let t0=0;
        for(let k=0;k<parts;k++){const t1=k===parts-1?len:t0+len/parts*(0.7+brnd()*0.6);const a0=ax===0?[u0+t0,v0]:[u0,v0+t0],a1=ax===0?[u0+t1,v1]:[u1,v0+t1];t0=t1;
          const ring=[[a0[0],a0[1]],[a1[0],a0[1]],[a1[0],a1[1]],[a0[0],a1[1]]].map(p=>toXY(uc+p[0],vc+p[1]));if(ring.some(p=>inM(p[0],p[1])))continue;
          const fl=5+Math.floor(brnd()*5),h=GF+(fl-1)*FLOOR,col=new THREE.Color(PAL[Math.floor(brnd()*PAL.length)]),st=brnd()<0.55?'balc':brnd()<0.5?'tapp':'pers';
          const base={col:col.clone().multiplyScalar(0.84),s2:brnd()<0.55,s1:false};
          addWalls(ring,false,h,st,col,base,brnd()*640,(mx,my,nx,ny)=>((mx-bx)*nx+(my-by)*ny>100)?2:0);
          addRoof(ring,[],h,new THREE.Color(ROOFC[Math.floor(brnd()*ROOFC.length)]));}}}}
  const mk=(o,mat)=>{if(!o.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(o.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(o.n,3));if(o.u)g.setAttribute('uv',new THREE.Float32BufferAttribute(o.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(o.c,3));g.computeBoundingSphere();const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;};
  for(const k in WA)mk(WA[k],FAC_M[k]);mk(roofA,roofM);
  inst(new THREE.BoxGeometry(1,1,1),STD('#c9c4ba'),torr,true);
  inst(new THREE.CylinderGeometry(0.35,0.35,1,4),STD('#9aa0a6',{metalness:0.6,roughness:0.4}),tvp,false);inst(new THREE.BoxGeometry(1,1,1),STD('#9aa0a6',{metalness:0.6,roughness:0.4}),tvx,false);
  const box=new THREE.BoxGeometry(1,1,1);
  inst(box,STD('#bfc4cc',{roughness:0.6,metalness:0.3}),ac,true);
  inst(new THREE.CylinderGeometry(0.8,1.2,44,6),STD('#9aa3ad',{metalness:0.5}),ant,false);inst(new THREE.SphereGeometry(2,8,6),antM,antL,false);
  inst(box,neonM,neon,false,true);
  // alberi: viali alberati lungo i corsi e alberi nei parchi
  const trunks=[],crowns=[],TC=['#2e7d32','#388e3c','#43a047','#2f6f3a'];
  const addTree=(x,y)=>{const r=11+brnd()*6;trunks.push([x,8,y,1,1,1]);crowns.push([x,16+r*0.6,y,r,r*0.95,r,0,brnd()*3,0,TC[Math.floor(brnd()*4)]]);};
  for(const e of edges){if(!(e.cls==='P'||e.cls==='S'||(e.cls==='T'&&e.ow===0)))continue;
    for(const sd of [1,-1]){const line=offsetLine(e.pts,sd*(e.w/2+12));let acc=30;
      for(let j=0;j+1<line.length;j++){const ax=line[j][0],ay=line[j][1],bx=line[j+1][0],by=line[j+1][1],L=Math.hypot(bx-ax,by-ay);
        while(acc<L){const t=acc/L,x=ax+(bx-ax)*t,y=ay+(by-ay)*t;acc+=55;const tt=tileAtPx(x,y);if(tt===BUILD||tt===ROAD||tt===OUT)continue;if(Math.hypot(x-e.a.x,y-e.a.y)<50||Math.hypot(x-e.b.x,y-e.b.y)<50)continue;addTree(x,y);}acc-=L;}}}
  for(const a of areasD){if(a.t!=='g')continue;{let ax=0,az=0;for(const p of a.outer){ax+=p[0];az+=p[1];}if(LMX.ownsTrees(ax/a.outer.length,az/a.outer.length))continue;}const n=Math.min(60,Math.floor(polyArea(a.outer)/9000));let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;for(const p of a.outer){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
    for(let i=0,tries=0;i<n&&tries<n*6;tries++){const x=minX+brnd()*(maxX-minX),y=minY+brnd()*(maxY-minY);if(tileAtPx(x,y)!==PARK)continue;addTree(x,y);i++;}}
  inst(new THREE.CylinderGeometry(2,2.6,16,7),STD('#6d4c41'),trunks,true);inst(new THREE.IcosahedronGeometry(1,1),STD('#ffffff'),crowns,true,true);
  // lampioni
  const posts=[],heads=[],decals=[];
  for(const e of edges){if(e.cls==='V')continue;let acc=60,sd=1;
    for(let j=0;j+1<e.pts.length;j++){const ax=e.pts[j][0],ay=e.pts[j][1],bx=e.pts[j+1][0],by=e.pts[j+1][1],L=Math.hypot(bx-ax,by-ay);if(L<1)continue;const nx=-(by-ay)/L,ny=(bx-ax)/L;
      while(acc<L){const t=acc/L,o=sd*(e.w/2+5),x=ax+(bx-ax)*t+nx*o,y=ay+(by-ay)*t+ny*o;acc+=170;sd=-sd;const tt=tileAtPx(x,y);if(tt===BUILD||tt===OUT||Math.hypot(x-SPAWN.x,y-SPAWN.y)<110)continue;posts.push([x,22,y,1,1,1]);heads.push([x,44.5,y,7,2.4,7]);decals.push([x,0.9,y,1,1,1]);}acc-=L;}}
  inst(new THREE.CylinderGeometry(1,1.4,44,6),STD('#3f4652',{metalness:0.5,roughness:0.5}),posts,true);inst(box,bulbM,heads,false);
  const lt=canvasTex(glowCanvas(64,[[0,'rgba(255,205,140,0.9)'],[0.35,'rgba(255,175,95,0.35)'],[1,'rgba(255,160,80,0)']]));
  lampDecalM=new THREE.MeshBasicMaterial({map:lt,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0,fog:false});
  const ld=inst(new THREE.PlaneGeometry(170,170).rotateX(-Math.PI/2),lampDecalM,decals,false);if(ld){ld.receiveShadow=false;ld.renderOrder=1;}
  // semafori
  const tp=[],th=[],tl=[];
  for(const n of signals)for(const e of n.edges){if(e.cls==='V'||e.cls==='X'||e.len<n.stop+20)continue;if(!((e.b===n&&e.ow!==-1)||(e.a===n&&e.ow!==1)))continue;
    const far=e.a===n?e.pts[1]:e.pts[e.pts.length-2];let dx=n.x-far[0],dy=n.y-far[1];const L=Math.hypot(dx,dy)||1;dx/=L;dy/=L;
    const bx=n.x-dx*n.stop,by=n.y-dy*n.stop,o=e.w/2+6,x=bx-dy*o,y=by+dx*o;if(tileAtPx(x,y)===BUILD)continue;
    tp.push([x,13,y,1,1,1]);th.push([x,27,y,4,9,4]);tl.push([x-dx*2.3,27,y-dy*2.3,1,1,1,0,0,0,'#2ecc71']);tlAxis.push([n,Math.atan2(dy,dx)]);}
  inst(new THREE.CylinderGeometry(0.9,0.9,26,6),STD('#2b2f36'),tp,true);inst(box,STD('#1b1e24'),th,true);
  tlLamps=inst(new THREE.SphereGeometry(1.9,10,8),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),tl,false,true);
  // etichette dei luoghi
  const label=(text,x,y,h,col)=>{const tx=labelTex(text,col),sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,depthWrite:false,fog:false}));sp.scale.set(30*tx.image.width/64,30,1);sp.position.set(x,h,y);scene.add(sp);};
  label('Santa Rita',CHIESA[0],CHIESA[1],150,'#ffd166'); // le etichette dei landmark le mettono i moduli in src/landmarks/
}
// ---------------- landmark modellati a mano (src/landmarks/) ----------------
const envHooks=[];
const LMX=initLandmarks({THREE,scene,DATA,toW,fillPoly,grid,hgrid,BUILD,WATER,OUT,ROAD,PARK,tileAtPx,miniCv,MS,canvasTex,labelTex,nearestEdge,edges,envHooks});
buildCity();

// ---------------- orizzonte: Alpi, collina e Mole ----------------
const skyline=new THREE.Group();scene.add(skyline);
const skyM=new THREE.MeshBasicMaterial({vertexColors:true,fog:false,depthWrite:false,side:THREE.DoubleSide,transparent:true,opacity:0.92});
const moleM=new THREE.MeshBasicMaterial({color:'#cdd5e4',fog:false,depthWrite:false,transparent:true,opacity:0.95}),moleDay=new THREE.Color('#cdd5e4');
{const pos=[],col=[],cMt=new THREE.Color('#6d82a6'),cSnow=new THREE.Color('#eef3fa'),cHill=new THREE.Color('#6f8a7a'),cBase=new THREE.Color('#9fb1c9');
  const arc=(R,a0,a1,N,hf,snow,c1)=>{let prev=null;const tc=h=>{const k=Math.min(1,Math.max(0,(h-snow+160)/320));return c1.clone().lerp(cSnow,k*k*(3-2*k));};
    const quad=(px,pz,py0,py1,x,z,y0,y1,pc0,pc1,c0,cc1)=>{pos.push(px,py0,pz,x,y0,z,x,y1,z,px,py0,pz,x,y1,z,px,py1,pz);for(const c of [pc0,c0,cc1,pc0,cc1,pc1])col.push(c.r,c.g,c.b);};
    for(let i=0;i<=N;i++){const t=i/N,a=a0+(a1-a0)*t,h=hf(t),x=Math.cos(a)*R,z=Math.sin(a)*R,m=Math.max(0,h-280),top=tc(h);
    if(prev){const [px,pz,ph,pm,ptop]=prev;quad(px,pz,-300,pm,x,z,-300,m,cBase,c1,cBase,c1);quad(px,pz,pm,ph,x,z,m,h,c1,ptop,c1,top);}prev=[x,z,h,m,top];}};
  const alps=t=>{let h=560+Math.sin(t*23)*120+Math.sin(t*57+1)*80+Math.sin(t*131+2)*45;for(const [c,k] of [[0.13,1],[0.32,0.55],[0.55,0.7],[0.8,0.6]])h+=Math.max(0,1-Math.abs(t-c)*14)*950*k;return h;};
  arc(7000,Math.PI*0.72,Math.PI*1.72,240,alps,830,cMt);
  arc(6800,-Math.PI*0.45,Math.PI*0.08,100,t=>150+Math.sin(t*9)*50+Math.sin(t*23)*20+Math.max(0,1-Math.abs(t-0.3)*8)*90,9999,cHill);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));const m=new THREE.Mesh(g,skyM);m.renderOrder=-10;skyline.add(m);
  const mole=new THREE.Group(),am=-0.6;const add=(geo,y)=>{const mm=new THREE.Mesh(geo,moleM);mm.position.y=y;mm.renderOrder=-5;mole.add(mm);};
  add(new THREE.BoxGeometry(62,150,62),75);add(new THREE.ConeGeometry(46,120,4).rotateY(Math.PI/4),210);add(new THREE.BoxGeometry(18,34,18),287);add(new THREE.ConeGeometry(7,170,6),389);
  mole.scale.setScalar(1.25);mole.position.set(Math.cos(am)*5200,0,Math.sin(am)*5200);skyline.add(mole);}
function updateSkyline(dk){skyline.position.set(camera.position.x,0,camera.position.z);skyM.color.setScalar(1-0.78*dk);skyM.opacity=0.92*(1-0.7*rain)*(1-fogW);moleM.color.copy(moleDay).multiplyScalar(1-0.45*dk);moleM.opacity=0.95*(1-0.6*rain)*(1-fogW);skyline.visible=fogW<0.97;}
// ---------------- meteo: pioggia ----------------
let rain=0,rainTarget=0,weatherT=75,rainA=null,fogW=0,fogTarget=0;const cRain=new THREE.Color('#7f8a96'),cFogW=new THREE.Color('#c3c7cb'),asphBase=new THREE.Color('#3b3e44');
function updateWeather(dt){weatherT-=dt;if(weatherT<=0){weatherT=rand(80,180);const wr=rainTarget,wf=fogTarget,r=Math.random();rainTarget=r<0.3?1:0;fogTarget=(r>=0.3&&r<0.5)?1:0;
  if(state==='play'){if(rainTarget&&!wr)toast('Inizia a piovere: strade scivolose!',2.5);else if(fogTarget&&!wf)toast('Scende la nebbia: visibilità ridotta',2.5);else if(!rainTarget&&!fogTarget&&(wr||wf))toast(wr?'Smette di piovere.':'La nebbia si dirada.',2.5);}}
  rain+=(rainTarget-rain)*Math.min(1,dt*0.12);fogW+=(fogTarget-fogW)*Math.min(1,dt*0.1);}
const RN=2200,rainPos=new Float32Array(RN*6),rainGeo=new THREE.BufferGeometry();
for(let i=0;i<RN;i++){const x=rand(-500,500),y=rand(0,420),z=rand(-500,500);rainPos.set([x,y,z,x+1,y-9,z],i*6);}
rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainM=new THREE.LineBasicMaterial({color:'#b8c8e0',transparent:true,opacity:0,depthWrite:false}),rainL=new THREE.LineSegments(rainGeo,rainM);rainL.frustumCulled=false;rainL.visible=false;scene.add(rainL);
function updateRain(dt){rainL.visible=rain>0.03;if(!rainL.visible)return;rainM.opacity=0.55*rain;rainL.position.set(camera.position.x,0,camera.position.z);const f=520*dt;
  for(let i=0;i<RN;i++){const k=i*6;let y=rainPos[k+1]-f;if(y<0)y+=420;rainPos[k+1]=y;rainPos[k+4]=y-9;}rainGeo.attributes.position.needsUpdate=true;}
// ---------------- tram GTT sui binari veri (OSM): linee 4 e 10 ----------------
const trams=[],tramRoutes=[],TRAM_L=52,TRAM_W=19;
const tramWinM=new THREE.MeshStandardMaterial({color:'#3a4c60',roughness:0.15,metalness:0.5,emissive:new THREE.Color('#ffe2a8'),emissiveIntensity:0});
function tramPosAt(R,s){s=clamp(s,0,R.len);let lo=0,hi=R.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(R.cum[m]<=s)lo=m;else hi=m;}const a=R.pts[lo],b=R.pts[hi],L=R.cum[hi]-R.cum[lo]||1,t=(s-R.cum[lo])/L;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
{const TW=(DATA.TW||[]).map(w=>w.map(toW));
  const bed=[],rails=[],wires=[],poles=[],arms=[];
  const samp=[];for(const w of TW)for(let i=0;i+1<w.length;i++){const a=w[i],b=w[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let s=0;s<L;s+=12)samp.push([a[0]+(b[0]-a[0])*s/L,a[1]+(b[1]-a[1])*s/L]);}
  const nearTrack=(x,y,r)=>{for(const p of samp)if(Math.abs(p[0]-x)<r&&Math.abs(p[1]-y)<r&&Math.hypot(p[0]-x,p[1]-y)<r)return true;return false;};
  const EXT=1600,inExt=(x,y)=>x>PB.x0-EXT&&x<PB.x1+EXT&&y>PB.y0-EXT&&y<PB.y1+EXT;
  for(const w of TW){ribbon(bed,w,22,0.34,true);for(const o of [-7.2,7.2])ribbon(rails,offsetLine(w,o),1.4,0.42,false);
    let acc=40;for(let i=0;i+1<w.length;i++){const a=w[i],b=w[i+1],L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.5)continue;const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L;
      if(inExt(a[0],a[1]))wires.push(a[0],33,a[1],b[0],33,b[1]);
      while(acc<L){const x=a[0]+ux*acc,y=a[1]+uy*acc;acc+=150;if(!inExt(x,y))continue;const sd=nearTrack(x-uy*20,y+ux*20,10)?-1:1,px=x-uy*20*sd,py=y+ux*20*sd;if(tileAtPx(px,py)===BUILD)continue;
        poles.push([px,19,py]);arms.push([(px+x)/2,35,(py+y)/2,21,0.8,0.8,0,-Math.atan2(ux*sd,-uy*sd),0]);}acc-=L;}}
  if(bed.length){flatMesh(bed,'#5e5c58',0.95);const rm=flatMesh(rails,'#b3b7bd',0.3);rm.material.metalness=0.75;}
  if(wires.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));scene.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#24262a'})));}
  inst(new THREE.CylinderGeometry(0.9,1.2,38,6),STD('#4a5059',{metalness:0.5,roughness:0.5}),poles,true);inst(new THREE.BoxGeometry(1,1,1),STD('#4a5059',{metalness:0.5}),arms,false);
  {const g=miniCv.getContext('2d');g.strokeStyle='rgba(255,140,40,0.9)';g.lineWidth=1.3;for(const w of TW){g.beginPath();g.moveTo(w[0][0]*MS,w[0][1]*MS);for(const p of w)g.lineTo(p[0]*MS,p[1]*MS);g.stroke();}}
  // percorsi delle linee (tratto dentro la zona estesa)
  const clipR=pts=>{const M=1000,inE=p=>p[0]>PB.x0-M&&p[0]<PB.x1+M&&p[1]>PB.y0-M&&p[1]<PB.y1+M;let best=[],cur=[];for(const p of pts){if(inE(p))cur.push(p);else{if(cur.length>best.length)best=cur;cur=[];}}return cur.length>best.length?cur:best;};
  for(const [line,raw] of (DATA.TR||[])){const pts=clipR(raw.map(toW));if(pts.length<2)continue;const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const R={line,pts,cum,len:cum[cum.length-1],stops:[],sigs:[]};if(R.len<600)continue;
    R.proj=(x,y)=>{let bd=1e9,bs=0;for(let i=0;i+1<pts.length;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1;const t=clamp(((x-a[0])*dx+(y-a[1])*dy)/L2,0,1),d=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);if(d<bd){bd=d;bs=cum[i]+t*Math.sqrt(L2);}}return[bd,bs];};
    for(const s of (DATA.TS||[])){const w=toW(s),[d,ss]=R.proj(w[0],w[1]);if(d<40)R.stops.push(ss);}
    for(const n of signals){const [d,ss]=R.proj(n.x,n.y);if(d<70)R.sigs.push({s:ss,n});}
    R.stops.sort((a,b)=>a-b);R.sigs.sort((a,b)=>a.s-b.s);tramRoutes.push(R);}
  // fermate: banchine del tram tra i binari, pali e pensiline dei bus sul marciapiede
  const plat=[],shRoof=[],shPanel=[],shPost=[],sPole=[],sBoard=[],sBoardT=[];
  const shelter=(x,y,a,nx,ny)=>{shRoof.push([x,17,y,26,1,10,0,-a,0]);shPanel.push([x+nx*4.5,9,y+ny*4.5,26,12,0.6,0,-a,0]);const ux=Math.cos(a),uy=Math.sin(a);for(const k of [-12,12])shPost.push([x+ux*k+nx*4.5,8.5,y+uy*k+ny*4.5,0.8,17,0.8]);};
  for(const s of (DATA.TS||[])){const [x,y]=toW(s);if(!inPB(x,y))continue;let best=null,bd=60;for(const R of tramRoutes){const [d,ss]=R.proj(x,y);if(d<bd){bd=d;best=[R,ss];}}if(!best)continue;
    const [R,ss]=best,p=tramPosAt(R,ss),p0=tramPosAt(R,ss-6),p1=tramPosAt(R,ss+6),a=Math.atan2(p1[1]-p0[1],p1[0]-p0[0]);let nx=-Math.sin(a),ny=Math.cos(a);
    if(!nearTrack(p[0]+nx*64,p[1]+ny*64,22)&&nearTrack(p[0]-nx*64,p[1]-ny*64,22)){nx=-nx;ny=-ny;}
    const cx=p[0]+nx*16,cy=p[1]+ny*16;plat.push([cx,1.1,cy,80,2.2,10,0,-a,0]);shelter(cx+nx*1,cy+ny*1,a,nx,ny);sPole.push([cx-Math.cos(a)*30,10,cy-Math.sin(a)*30]);sBoardT.push([cx-Math.cos(a)*30,21,cy-Math.sin(a)*30,0.6,6,6,0,-a,0]);}
  for(const s of (DATA.BS||[])){const [x0,y0]=toW(s);if(!inPB(x0,y0))continue;const ne=nearestEdge(x0,y0,120);if(!ne)continue;const e=ne.e,a0=e.pts[ne.j],b0=e.pts[ne.j+1],dx=b0[0]-a0[0],dy=b0[1]-a0[1],L=Math.hypot(dx,dy)||1;
    const sd=((x0-ne.px)*(-dy)+(y0-ne.py)*dx)>=0?1:-1,nx=-dy/L*sd,ny=dx/L*sd,a=Math.atan2(dy,dx),px=ne.px+nx*(e.w/2+4),py=ne.py+ny*(e.w/2+4);
    if(tileAtPx(px,py)===BUILD)continue;sPole.push([px,10,py]);sBoard.push([px,21,py,0.6,6,6,0,-a,0]);
    const qx=ne.px+nx*(e.w/2+12),qy=ne.py+ny*(e.w/2+12);if(brnd()<0.45&&tileAtPx(qx+nx*6,qy+ny*6)!==BUILD&&tileAtPx(qx+Math.cos(a)*14,qy+Math.sin(a)*14)!==BUILD)shelter(qx,qy,a,nx,ny);}
  const signTex=txt=>{const [c,g]=mkCv(64,64);g.fillStyle='#f5f5f2';g.fillRect(0,0,64,64);g.fillStyle='#f07f1f';g.fillRect(0,0,64,20);g.fillStyle='#fff';g.font='bold 13px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('FERMATA',32,11);g.fillStyle='#1d2433';g.font='bold 20px system-ui,sans-serif';g.fillText(txt,32,42);g.strokeStyle='#1d2433';g.lineWidth=3;g.strokeRect(1.5,1.5,61,61);return canvasTex(c);};
  inst(new THREE.BoxGeometry(1,1,1),STD('#c2bbae'),plat,false);inst(new THREE.BoxGeometry(1,1,1),STD('#3a414a',{metalness:0.4}),shRoof,true);
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#a8c4d8',transparent:true,opacity:0.45,roughness:0.1}),shPanel,false);
  inst(new THREE.BoxGeometry(1,1,1),STD('#5b636d',{metalness:0.5}),shPost,false);inst(new THREE.CylinderGeometry(0.6,0.6,20,5),STD('#6b737d',{metalness:0.5}),sPole,false);
  inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({map:signTex('BUS'),roughness:0.6}),sBoard,false);inst(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({map:signTex('TRAM'),roughness:0.6}),sBoardT,false);
  // i tram: due casse arancioni articolate, pantografo, numero di linea
  const bodyM=STD('#ff8a24',{roughness:0.45,metalness:0.05,emissive:new THREE.Color('#ff7a10'),emissiveIntensity:0.12}),creamM=STD('#efe7d4',{roughness:0.6}),darkM=STD('#2a2d33'),litM=new THREE.MeshBasicMaterial({color:'#fff4cc'});
  const G={body:new THREE.BoxGeometry(TRAM_L,10,TRAM_W).translate(0,8,0),win:new THREE.BoxGeometry(TRAM_L-5,5.2,TRAM_W+0.3).translate(0,14.6,0),band:new THREE.BoxGeometry(TRAM_L+0.1,1.3,TRAM_W+0.36).translate(0,11.4,0),
    roof:new THREE.BoxGeometry(TRAM_L-2,2,TRAM_W-1).translate(0,18.2,0),skirt:new THREE.BoxGeometry(TRAM_L-6,3,TRAM_W-1.6).translate(0,1.8,0),pant:new THREE.BoxGeometry(1,7,1).translate(4,22.5,0),pbar:new THREE.BoxGeometry(2,0.6,13).translate(4,26,0),
    front:new THREE.BoxGeometry(0.5,6.5,TRAM_W-3).translate(TRAM_L/2+0.1,14,0),lamps:new THREE.BoxGeometry(0.6,1.4,TRAM_W-5).translate(TRAM_L/2+0.2,6,0)};
  const lineTex={};const lineM=l=>{if(lineTex[l])return lineTex[l];const [c,g]=mkCv(128,32);g.fillStyle='#111';g.fillRect(0,0,128,32);g.fillStyle='#ffb020';g.font='bold 24px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText(l+'  GTT',64,17);return lineTex[l]=new THREE.MeshBasicMaterial({map:canvasTex(c)});};
  const mkSec=(front,line)=>{const g=new THREE.Group();for(const [k,m] of [['body',bodyM],['win',tramWinM],['band',creamM],['roof',creamM],['skirt',darkM]]){const me=new THREE.Mesh(G[k],m);me.castShadow=k==='body';g.add(me);}
    if(front){g.add(new THREE.Mesh(G.pant,darkM));g.add(new THREE.Mesh(G.pbar,darkM));g.add(new THREE.Mesh(G.front,tramWinM));g.add(new THREE.Mesh(G.lamps,litM));const sgn=new THREE.Mesh(new THREE.PlaneGeometry(10,2.6).rotateY(Math.PI/2),lineM(line));sgn.position.set(TRAM_L/2+0.4,18.4,0);g.add(sgn);}
    scene.add(g);return{g,x:0,y:0,a:0};};
  for(const R of tramRoutes){const n=Math.max(1,Math.round(R.len/5200));for(let i=0;i<n;i++){const t={R,s:130+(i+Math.random()*0.85)*(R.len-260)/n,v:0,dwell:0,lastStop:-1e9,bellT:0,secs:[mkSec(true,R.line),mkSec(false,R.line)]};trams.push(t);}}
}
function placeTram(t){for(let k=0;k<2;k++){const sc=t.s-TRAM_L/2-k*(TRAM_L+2),a=tramPosAt(t.R,sc+TRAM_L/2),b=tramPosAt(t.R,sc-TRAM_L/2),S=t.secs[k];S.x=(a[0]+b[0])/2;S.y=(a[1]+b[1])/2;S.a=Math.atan2(a[1]-b[1],a[0]-b[0]);S.g.position.set(S.x,0,S.y);S.g.rotation.y=-S.a;}}
for(const t of trams)placeTram(t);
function updateTrams(dt){
  for(const t of trams){const R=t.R;let target=130;
    if(t.dwell>0){t.dwell-=dt;target=0;}
    else{const ns=R.stops.find(s=>s>t.lastStop+20&&s>t.s-3);if(ns!==undefined){const d=ns-t.s;if(d<3&&t.v<25){t.dwell=rand(5,8);t.lastStop=ns;target=0;}else target=Math.min(target,Math.sqrt(Math.max(0,d)*2*60)+8);}}
    for(const q of R.sigs){const d=q.s-34-t.s;if(d<-4)continue;if(d>260)break;const p0=tramPosAt(R,q.s-6),p1=tramPosAt(R,q.s+6),sg=sigGreen(q.n,Math.atan2(p1[1]-p0[1],p1[0]-p0[0]));if(sg===2||(sg===1&&d>30))target=Math.min(target,Math.sqrt(Math.max(0,d)*2*70));break;}
    const f=t.secs[0],fx=Math.cos(f.a),fy=Math.sin(f.a),hx=f.x+fx*TRAM_L/2,hy=f.y+fy*TRAM_L/2;let ob=999;
    const chk=(x,y,r)=>{const dx=x-hx,dy=y-hy,al=dx*fx+dy*fy;if(al<-6||al>170)return;if(Math.abs(-dx*fy+dy*fx)<TRAM_W/2+r)ob=Math.min(ob,al-r);};
    for(const c of cars)if(Math.abs(c.x-hx)<200&&Math.abs(c.y-hy)<200)chk(c.x,c.y,c.d.wid*0.55);
    if(!player.car&&state==='play')chk(player.x,player.y,5);
    for(const p of peds)if(p.down<=0&&Math.abs(p.x-hx)<180&&Math.abs(p.y-hy)<180)chk(p.x,p.y,4);
    if(ob<999){target=Math.min(target,Math.max(0,(ob-14)*1.5));if(ob<110&&t.v>15&&!(t.bellT>gtime)){t.bellT=gtime+2.5;if(AC&&Math.hypot(hx-camera.position.x,hy-camera.position.z)<700){tone(1320,0.5,'triangle',0.09);tone(1320,0.5,'triangle',0.09,0.28);}}}
    if(t.v<target)t.v=Math.min(target,t.v+42*dt);else t.v=Math.max(target,t.v-(ob<45?260:110)*dt);
    t.s+=t.v*dt;if(t.s>R.len-5){t.s=130;t.v=60;t.lastStop=-1e9;}
    placeTram(t);
    // collisioni: il tram non si sposta, sposta tutto il resto
    for(const S of t.secs){const cs=Math.cos(S.a),sn=Math.sin(S.a),tvx=cs*t.v,tvy=sn*t.v;
      const sep=(ex,ey,r)=>{const lf=ex*cs+ey*sn,ll=-ex*sn+ey*cs,ox=TRAM_L/2+r-Math.abs(lf),oy=TRAM_W/2+r-Math.abs(ll);if(ox<=0||oy<=0)return null;if(oy<ox){const g=ll>=0?1:-1;return[-sn*g,cs*g,oy];}const g=lf>=0?1:-1;return[cs*g,sn*g,ox];};
      for(const c of cars){const dx=c.x-S.x,dy=c.y-S.y;if(dx*dx+dy*dy>8100)continue;const r=c.d.wid/2+1;
        for(const p of circles(c)){const h=sep(p[0]-S.x,p[1]-S.y,r);if(!h)continue;const [nx,ny,ov]=h;pushCar(c,nx*ov,ny*ov);
          const rv=(c.vx-tvx)*nx+(c.vy-tvy)*ny;if(rv<0){c.vx-=nx*rv*1.4;c.vy-=ny*rv*1.4;if(-rv>60&&!(c.tramHit>gtime)){c.tramHit=gtime+0.4;damage(c,-rv*0.08);sparks(p[0],p[1],-rv);if(c===player.car){shake=Math.max(shake,Math.min(9,-rv/35));sfx.crash(-rv);}}}}}
      if(!player.car){const h=sep(player.x-S.x,player.y-S.y,4);if(h){tryMovePed(player,h[0]*h[2],h[1]*h[2]);if(t.v>40&&player.stun<=0){player.stun=1;say(player,'Ahi!',1.2);shake=Math.max(shake,5);}}}
      for(const p of peds){if(Math.abs(p.x-S.x)>60||Math.abs(p.y-S.y)>60)continue;const h=sep(p.x-S.x,p.y-S.y,4);if(h){tryMovePed(p,h[0]*h[2],h[1]*h[2]);if(t.v>40&&p.down<=0){p.down=2.2;p.hitFrom=[S.x,S.y];}}}}
  }
}
// ---------------- stato ----------------
let state='title',gtime=0,lightT=0,clockT=0,shake=0,bustT=0,introT=0,frameN=0,camMode=0,camYaw=0;
let money=0;const save={tokens:[],owned:{},done:0};
try{const sv=JSON.parse(localStorage.getItem('neonriviera3d_save')||'null');if(sv){money=sv.money||0;save.tokens=sv.tokens||[];save.owned=sv.owned||{};save.done=sv.done||0;}else money=parseInt(localStorage.getItem('neonriviera_money')||'0',10)||0;}catch(e){}
function saveMoney(){try{localStorage.setItem('neonriviera3d_save',JSON.stringify({money,tokens:save.tokens,owned:save.owned,done:save.done}));}catch(e){}}
let cars=[],peds=[],parts=[],bubbles=[],toasts=[],big=null,offers=[],mission=null,offerQueue=[];
const SKINS=['#f1c27d','#e0ac69','#c68642','#8d5524','#ffdbac'];
const player={x:SPAWN.x,y:SPAWN.y,a:0,car:null,stun:0,t:0,moving:false,shirt:'#00e08a',hair:'#1b1b1b',skin:'#e0ac69',lastCar:null,down:0};
const wanted={level:0,lost:0,seen:false,bust:0,lastX:0,lastY:0,flash:0};
let started=false;

// ---------------- veicoli ----------------
const CARS={
  berlina:{name:'Berlina',len:34,wid:17,max:330,acc:260,grip:7,turn:2.7,hp:100,cruise:165,cols:['#a9adb3','#eceef0','#1c1f24','#2b4c7e','#a3262a','#5b6169','#2f5d50','#8c7b6b']},
  utilitaria:{name:'Utilitaria',len:28,wid:15,max:290,acc:230,grip:7,turn:3.0,hp:90,cruise:160,cols:['#e9ecef','#b3202a','#9aa3ab','#2d3436','#e1b12c','#5d7f99','#7a8f4a','#d9d4c7']},
  sportiva:{name:'Sportiva',len:35,wid:16,max:480,acc:430,grip:6.5,turn:3.0,hp:80,cruise:205,cols:['#ff3f6c','#feca57','#00d2d3','#ff9f43','#1e272e']},
  furgone:{name:'Furgone',len:44,wid:20,max:250,acc:170,grip:8,turn:2.1,hp:160,cruise:140,cols:['#dfe4ea','#a4b0be','#e1b12c','#6ab04c']},
  taxi:{name:'Taxi',len:34,wid:17,max:345,acc:280,grip:7,turn:2.7,hp:100,cruise:195,cols:['#f4f4f2']},
  polizia:{name:'Polizia',len:36,wid:17,max:430,acc:370,grip:7.5,turn:2.9,hp:150,cruise:170,cols:['#1f4e96','#16213e']},
  fulmine:{name:'Fulmine',len:36,wid:17,max:600,acc:560,grip:7.4,turn:3.1,hp:90,cruise:220,cols:['#7c3aed','#00e5ff','#ff2e88','#f8fafc']},
  corazzato:{name:'Corazzato',len:46,wid:22,max:320,acc:240,grip:8.5,turn:2.2,hp:500,cruise:140,cols:['#2f3b2f','#1f2937'],mass:2.2},
  autobus:{name:'Autobus',len:66,wid:21,max:230,acc:150,grip:8,turn:1.7,hp:320,cruise:140,cols:['#ff8c1a'],mass:3},
};
function makeCar(type,x,y,a){const d=CARS[type];return{type,d,x,y,a,vx:0,vy:0,col:pick(d.cols),hp:d.hp,driver:null,ai:null,wreck:false,burn:0,siren:false,brake:false,skid:null,keep:false,heatCd:0,lost:false,mesh:null,m:null,tilt:0,pitch:0,lastVf:0,z:0,vz:0,air:0,onRamp:false,rampTop:0,rampVf:0,nitro:1};}
const CP=[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
function blockedN(c,x,y,a){const cs=Math.cos(a),sn=Math.sin(a),hl=c.d.len/2-1,hw=c.d.wid/2-1;let n=0;
  for(const [p,q] of CP){const lx=p*hl,ly=q*hw;const t=tileAtPx(x+cs*lx-sn*ly,y+sn*lx+cs*ly);if(t===BUILD||t===WATER||t===OUT)n++;}return n;}
function circles(c){const o=c.d.len/2-c.d.wid/2,cs=Math.cos(c.a)*o,sn=Math.sin(c.a)*o;return[[c.x+cs,c.y+sn],[c.x-cs,c.y-sn]];}
function carPhysics(c,thr,steer,hand,dt,boost){
  const d=c.d;let fx=Math.cos(c.a),fy=Math.sin(c.a);
  if(!c.onRamp&&(c.z>0.01||c.vz>0)){c.vz-=560*dt;c.z+=c.vz*dt;c.air+=dt;c.brake=false;c.skid=null;c.pitch+=(clamp(-c.vz/1400,-0.25,0.25)-c.pitch)*Math.min(1,dt*4);
    if(c.z<=0){const imp=-c.vz;c.z=0;c.vz=0;landed(c,imp);}
    moveCar(c,dt);return;}
  let vf=c.vx*fx+c.vy*fy,vr=-c.vx*fy+c.vy*fx;
  const t=tileAtPx(c.x,c.y),rough=(t===PARK||t===SAND)?0.62:1;
  c.brake=false;
  if(c.wreck){thr=0;steer=0;hand=true;}
  if(thr>0){vf+=(vf<0?d.acc*2.2:d.acc*rough)*thr*dt;if(boost)vf+=d.acc*1.1*dt;}
  else if(thr<0){if(vf>0){vf=Math.max(0,vf-d.acc*2.4*(-thr)*dt);c.brake=true;}else vf-=d.acc*0.7*(-thr)*dt;}
  const mx=d.max*rough*(c.hp<d.hp*0.3?0.75:1)*(boost?1.35:1);
  if(vf>mx)vf+=(mx-vf)*Math.min(1,3*dt);
  if(vf<-mx*0.35)vf=-mx*0.35;
  vf*=1-(thr===0?0.8:0.15)*dt;
  if(hand){vf*=1-1.4*dt;c.brake=true;}
  const grip=(hand?1.3:d.grip*(rough<1?0.7:1))*(1-0.3*rain);
  vr*=Math.max(0,1-grip*dt);
  const spf=clamp(Math.abs(vf)/110,0,1)*(1-clamp((Math.abs(vf)-350)/400,0,0.35));
  const na=c.a+steer*d.turn*spf*(vf>=0?1:-1)*dt*(hand?1.4:1);
  if(na!==c.a){const cur=blockedN(c,c.x,c.y,c.a);if(blockedN(c,c.x,c.y,na)<=cur)c.a=na;}
  fx=Math.cos(c.a);fy=Math.sin(c.a);
  c.vx=fx*vf-fy*vr;c.vy=fy*vf+fx*vr;
  c.tilt+=(clamp(-steer*spf*Math.abs(vf)/400,-0.6,0.6)*0.12-c.tilt)*Math.min(1,dt*6);
  c.pitch+=(clamp((vf-c.lastVf)/dt/4000,-0.05,0.05)-c.pitch)*Math.min(1,dt*5);c.lastVf=vf;
  const skidding=!c.wreck&&(Math.abs(vr)>75||(hand&&Math.abs(vf)>120));
  if(skidding&&Math.abs(c.x-camera.position.x)<1500&&Math.abs(c.y-camera.position.z)<1500){
    const bx=c.x-fx*(d.len/2-6),by=c.y-fy*(d.len/2-6),ox=-fy*(d.wid/2-3),oy=fx*(d.wid/2-3);
    const w1=[bx+ox,by+oy],w2=[bx-ox,by-oy];
    if(c.skid){addSkid(c.skid[0][0],c.skid[0][1],w1[0],w1[1]);addSkid(c.skid[1][0],c.skid[1][1],w2[0],w2[1]);}
    c.skid=[w1,w2];
    if(Math.random()<0.3)puff(bx+rand(-4,4),by+rand(-4,4),'#dddddd',rand(4,7),rand(0.5,0.9),rand(-10,10),rand(-10,10),16,0.4,3,8);
  }else c.skid=null;
  moveCar(c,dt);
  const ra=rampAt(c);
  if(ra){c.onRamp=true;c.z=ra.h;c.rampTop=ra.r.h;c.rampVf=ra.vf;}
  else if(c.onRamp){c.onRamp=false;if(c.z>c.rampTop*0.6){c.vz=Math.min(330,c.rampVf*0.62);c.air=0;}else c.z=0;}
}
function moveCar(c,dt){
  const nx=c.x+c.vx*dt,ny=c.y+c.vy*dt;
  const cur=blockedN(c,c.x,c.y,c.a),nb=blockedN(c,nx,ny,c.a);
  if(nb===0||(cur>0&&nb<=cur)){c.x=nx;c.y=ny;return;}
  const imp=Math.hypot(c.vx,c.vy);
  if(blockedN(c,nx,c.y,c.a)===0){c.x=nx;c.vy*=-0.2;c.vx*=0.85;}
  else if(blockedN(c,c.x,ny,c.a)===0){c.y=ny;c.vx*=-0.2;c.vy*=0.85;}
  else{c.vx*=-0.3;c.vy*=-0.3;}
  if(imp>130&&!(c.hitCd>gtime)){c.hitCd=gtime+0.3;sparks(c.x+Math.cos(c.a)*c.d.len/2,c.y+Math.sin(c.a)*c.d.len/2,imp);if(c===player.car){shake=Math.max(shake,Math.min(10,imp/45));sfx.crash(imp);}damage(c,(imp-130)*0.07);}
}
function damage(c,amt){if(c.wreck)return;c.hp-=amt;if(c.hp<=0){c.hp=0;wreckCar(c);}}
function wreckCar(c){
  c.wreck=true;c.siren=false;c.burn=7;if(Math.hypot(c.x-player.x,c.y-player.y)<700)sfx.boom();
  for(let i=0;i<22;i++){const a=rand(0,TAU),s=rand(20,140);puff(c.x,c.y,pick(['#ff8c1a','#ffd23f','#ff5a1f']),rand(5,10),rand(0.4,0.9),Math.cos(a)*s,Math.sin(a)*s,24,0.95,8,rand(10,60));}
  if(c===player.car){exitCar(true);bigMsg('AUTO DISTRUTTA','Trovane un\'altra…','#ff8c1a',2.5);shake=12;}
  else if(c.driver==='npc'||c.driver==='cop'){ejectDriver(c);}
  c.driver=null;
}
function ejectDriver(c){
  const lx=Math.sin(c.a),ly=-Math.cos(c.a);let x=c.x+lx*(c.d.wid/2+8),y=c.y+ly*(c.d.wid/2+8);
  if(pedSolidAt(x,y,4)){x=c.x-lx*(c.d.wid/2+8);y=c.y-ly*(c.d.wid/2+8);}
  const p=makePed(x,y);p.flee=4;p.fleeFrom=[c.x,c.y];if(c.type==='polizia')p.shirt='#1e3a8a';peds.push(p);return p;
}

// ---------------- pedoni ----------------
const SHIRTS=['#e74c3c','#3498db','#f1c40f','#9b59b6','#1abc9c','#e67e22','#ecf0f1','#34495e','#ff6b81','#2ecc71','#fd79a8'];
const HAIRS=['#2d1b0e','#5a3825','#111111','#c49a6c','#e0c080','#7f8c8d','#a0522d'];
function makePed(x,y){return{x,y,a:rand(0,TAU),sp:rand(28,50),shirt:pick(SHIRTS),hair:pick(HAIRS),skin:pick(SKINS),t:rand(0,10),dir:pick(DIRS),turnT:rand(2,8),down:0,flee:0,fleeFrom:null,dodge:0,dvx:0,dvy:0,moving:true,hitFrom:null,m:null};}
const pedSolid=t=>t===BUILD||t===WATER||t===OUT;
function pedSolidAt(x,y,r){return pedSolid(tileAtPx(x-r,y-r))||pedSolid(tileAtPx(x+r,y-r))||pedSolid(tileAtPx(x-r,y+r))||pedSolid(tileAtPx(x+r,y+r));}
function tryMovePed(p,dx,dy){const r=4;if(!pedSolidAt(p.x+dx,p.y,r))p.x+=dx;if(!pedSolidAt(p.x,p.y+dy,r))p.y+=dy;}
function chooseDir(p){const opts=[];for(const d of DIRS)if(walkable(tileAtPx(p.x+d[0]*16,p.y+d[1]*16)))opts.push(d);
  const fwd=opts.filter(d=>!(d[0]===-p.dir[0]&&d[1]===-p.dir[1]));p.dir=fwd.length?pick(fwd):(opts.length?pick(opts):pick(DIRS));p.turnT=rand(3,9);}
function movePed(p,dt){
  p.t+=dt;p.moving=true;
  if(p.wait){p.moving=false;p.a=Math.atan2(player.y-p.y,player.x-p.x);if(Math.random()<dt*0.3)say(p,pick(['Taxi!','Ehi, taxi!','Di qua!']),1.4);return;}
  if(p.flee>0){p.we=null;p.flee-=dt;let ax=p.x-p.fleeFrom[0],ay=p.y-p.fleeFrom[1];const l=Math.hypot(ax,ay)||1;ax/=l;ay/=l;p.a=Math.atan2(ay,ax);const ox=p.x,oy=p.y;tryMovePed(p,ax*120*dt,ay*120*dt);
    if(Math.abs(p.x-ox)+Math.abs(p.y-oy)<0.3)p.fleeFrom=[p.x+rand(-60,60),p.y+rand(-60,60)];p.t+=dt;return;}
  if(p.dodge>0){p.we=null;p.dodge-=dt;tryMovePed(p,p.dvx*dt,p.dvy*dt);p.a=Math.atan2(p.dvy,p.dvx);p.t+=dt;return;}
  if(!p.we){const ne=nearestEdge(p.x,p.y,200);if(!ne){p.moving=false;return;}const e=ne.e,a=e.pts[ne.j],b=e.pts[ne.j+1],side=((p.x-ne.px)*(-(b[1]-a[1]))+(p.y-ne.py)*(b[0]-a[0]))>=0?1:-1,dir=Math.random()<0.5?1:-1,l=side>0?e.sideR:e.sideL;
    pedStart(p,e,side,dir,dir>0?ne.j+1:l.length-1-ne.j);}
  let tg=p.wl[p.wi];if(!tg){pedNext(p);tg=p.wl[p.wi];if(!tg)return;}
  const dx=tg[0]-p.x,dy=tg[1]-p.y,d=Math.hypot(dx,dy);if(d<6){p.wi++;if(p.wi>=p.wl.length)pedNext(p);return;}
  const ox=p.x,oy=p.y;tryMovePed(p,dx/d*p.sp*dt,dy/d*p.sp*dt);p.a=Math.atan2(dy,dx);
  if(Math.abs(p.x-ox)+Math.abs(p.y-oy)<0.05){p.stuckT=(p.stuckT||0)+dt;if(p.stuckT>1.5){p.stuckT=0;p.wi++;if(p.wi>=p.wl.length)pedNext(p);}}else p.stuckT=0;
}
function updatePeds(dt){
  for(const p of peds){
    if(p.down>0){p.down-=dt;if(p.down<=0){p.flee=3;p.fleeFrom=p.hitFrom||[p.x+1,p.y];}continue;}
    if(p.wait){movePed(p,dt);continue;}
    for(const c of cars){const dx=p.x-c.x,dy=p.y-c.y;if(dx>70||dx<-70||dy>70||dy<-70||c.z>8)continue;
      const sp=Math.hypot(c.vx,c.vy),d=Math.hypot(dx,dy)||1;let hit=false;
      for(const q of circles(c))if(Math.hypot(p.x-q[0],p.y-q[1])<c.d.wid/2+4){hit=true;break;}
      if(hit){
        if(sp>95){p.down=2.2;p.hitFrom=[c.x,c.y];tryMovePed(p,c.vx*0.06,c.vy*0.06);if(Math.random()<0.7)say(p,pick(['Ahi!','Ouch!','Mamma mia!','Ma che fai?!']));
          if(c===player.car){shake=Math.max(shake,3);if(copNear(p.x,p.y,450))addHeat(1);}}
        else tryMovePed(p,dx/d*3,dy/d*3);
        break;}
      if(sp>70&&d<75&&p.dodge<=0&&p.flee<=0){const dot=(dx*c.vx+dy*c.vy)/(d*sp);
        if(dot>0.55){const side=(c.vx*dy-c.vy*dx)>0?1:-1;p.dodge=0.5;p.dvx=-c.vy/sp*side*170;p.dvy=c.vx/sp*side*170;if(Math.random()<0.35)say(p,pick(['Ehi!','Attento!','Guarda dove vai!','Ma sei matto?!']));}}
    }
    if(p.down>0)continue;
    movePed(p,dt);
  }
}

// ---------------- traffico ----------------
function lightState(){return 0;}function canGo(){return true;}
function pickEdge(list,ws,tot){let r=Math.random()*tot;for(let i=0;i<list.length;i++){r-=ws[i];if(r<=0)return list[i];}return list[list.length-1];}
const driveEdges=edges.filter(e=>e.cls!=='V'),driveW=driveEdges.map(e=>e.len*({P:3,S:2.2,T:1.6,R:1}[e.cls]||1)),driveTot=driveW.reduce((a,b)=>a+b,0);
const walkEdges=edges.filter(e=>e.cls!=='V'),walkW=walkEdges.map(e=>e.len),walkTot=walkW.reduce((a,b)=>a+b,0);
function setPath(c,e,dir,startI){c.ai.e=e;c.ai.dir=dir;c.ai.path=dir>0?e.fwd:e.rev;c.ai.i=startI;c.ai.cruise=CRUISE[e.cls]*c.ai.k;}
function nextEdge(c){const ai=c.ai,e=ai.e,n=ai.dir>0?e.b:e.a,pa=ai.path[ai.path.length-2]||ai.path[0],pb=ai.path[ai.path.length-1],ia=Math.atan2(pb[1]-pa[1],pb[0]-pa[0]);
  const opts=[];for(const f of n.edges){const d=edgeOut(n,f);if(!d)continue;if(f===e&&f.a!==f.b)continue;const p=d>0?f.fwd:f.rev;if(p.length<2)continue;const oa=Math.atan2(p[1][1]-p[0][1],p[1][0]-p[0][0]),turn=Math.abs(angDiff(oa,ia));
    opts.push([f,d,({P:3,S:2.5,T:2,R:1.2,V:0.3}[f.cls]||1)*(turn<0.5?2.5:turn<2.3?1:0.12)]);}
  if(!opts.length){setPath(c,e,edgeOut(n,e)||-ai.dir,1);return;}
  let tot=0;for(const o of opts)tot+=o[2];let r=Math.random()*tot,ch=opts[0];for(const o of opts){r-=o[2];if(r<=0){ch=o;break;}}
  setPath(c,ch[0],ch[1],1);}
function obstacleAhead(c){
  const fx=Math.cos(c.a),fy=Math.sin(c.a),look=110,hl=c.d.len/2;let best=999;
  for(const o of cars){if(o===c)continue;const dx=o.x-c.x,dy=o.y-c.y;if(dx>look+30||dx<-look-30||dy>look+30||dy<-look-30)continue;
    const al=dx*fx+dy*fy;if(al<=0||al>look+hl)continue;const lat=Math.abs(-dx*fy+dy*fx);
    const sa=Math.abs(Math.sin(o.a-c.a)),ca=Math.abs(Math.cos(o.a-c.a));
    if(lat<10+o.d.wid*0.5+sa*o.d.len*0.5){const g=al-hl-o.d.len*0.5*ca-o.d.wid*0.5*sa-8;if(g<best)best=g;}}
  const chk=(x,y,rad)=>{const dx=x-c.x,dy=y-c.y,al=dx*fx+dy*fy;if(al<=0||al>look+hl)return;if(Math.abs(-dx*fy+dy*fx)<rad){const g=al-hl-rad;if(g<best)best=g;}};
  if(!player.car&&state==='play')chk(player.x,player.y,14);
  for(const p of peds)if(tileAtPx(p.x,p.y)===ROAD)chk(p.x,p.y,12);
  for(const t of trams)for(const S of t.secs){const ox=Math.cos(S.a)*TRAM_L*0.32,oy=Math.sin(S.a)*TRAM_L*0.32;chk(S.x+ox,S.y+oy,13);chk(S.x,S.y,13);chk(S.x-ox,S.y-oy,13);}
  return Math.max(0,best);
}
function trafficAI(c,dt){
  const ai=c.ai;let p=ai.path[ai.i];if(!p){nextEdge(c);p=ai.path[ai.i]||ai.path[ai.path.length-1];}
  let dist=Math.hypot(p[0]-c.x,p[1]-c.y);
  if(dist<22){ai.i++;if(ai.i>=ai.path.length)nextEdge(c);p=ai.path[ai.i]||ai.path[ai.path.length-1];dist=Math.hypot(p[0]-c.x,p[1]-c.y);}
  {const q=ai.path[Math.max(0,ai.i-1)],dx=p[0]-q[0],dy=p[1]-q[1],L2=dx*dx+dy*dy||1,t=clamp(((c.x-q[0])*dx+(c.y-q[1])*dy)/L2,0,1);if(Math.hypot(c.x-q[0]-t*dx,c.y-q[1]-t*dy)>160)c.lost=true;}
  const want=Math.atan2(p[1]-c.y,p[0]-c.x),diff=angDiff(want,c.a),steer=clamp(diff*2.6,-1,1);
  const vf=c.vx*Math.cos(c.a)+c.vy*Math.sin(c.a);let target=ai.cruise;
  const end=ai.path[ai.path.length-1],de=Math.hypot(end[0]-c.x,end[1]-c.y);if(de<100)target=Math.min(target,75+de*1.1);
  {const sn=ai.dir>0?ai.e.b:ai.e.a;if(sn.sig&&de<sn.stop+90&&de>sn.stop-12){const q=ai.path[ai.path.length-2]||ai.path[0],sg=sigGreen(sn,Math.atan2(end[1]-q[1],end[0]-q[0]));if(sg===2||(sg===1&&de>sn.stop+14))target=Math.min(target,Math.max(0,(de-sn.stop)*1.8));}}
  if(Math.abs(diff)>0.6)target=Math.min(target,60);
  if(ai.ignore>0)ai.ignore-=dt;else{const ob=obstacleAhead(c);if(ob<900)target=Math.min(target,ob*2.4);}
  if(vf<4&&target<4){ai.wait+=dt;if(ai.wait>4){ai.ignore=1.4;ai.wait=0;}}else ai.wait=0;
  let thr=0;if(target<2)thr=vf>1?-1:0;else if(vf<target-6)thr=1;else if(vf>target+20)thr=-1;
  if(ai.rev>0){ai.rev-=dt;carPhysics(c,-1,ai.revS,false,dt);return;}
  if(thr>0&&vf<3){ai.stk=(ai.stk||0)+dt;if(ai.stk>2.5){ai.stk=0;ai.rev=1;ai.revS=diff>0?-1:1;ai.tries=(ai.tries||0)+1;if(ai.tries>3)c.lost=true;}}else ai.stk=0;
  carPhysics(c,thr,steer,false,dt);
}
function spawnTrafficCar(fx,fy,minD,maxD,allowVisible,forceType){
  for(let tries=0;tries<25;tries++){const e=pickEdge(driveEdges,driveW,driveTot);const dir=e.ow===1?1:e.ow===-1?-1:(Math.random()<0.5?1:-1),path=dir>0?e.fwd:e.rev;if(path.length<2)continue;
    const j=1+Math.floor(Math.random()*(path.length-1)),a=path[j-1],b=path[j],t=Math.random(),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const d=Math.hypot(x-fx,y-fy);if(d<minD||d>maxD)continue;if(!allowVisible&&onScreen(x,y,80))continue;if(cars.some(o=>Math.abs(o.x-x)<60&&Math.abs(o.y-y)<60))continue;
    const r=Math.random(),type=forceType||((e.cls==='P'||e.cls==='S')&&Math.random()<(cars.filter(o=>o.type==='autobus').length<3?0.5:0.08)?'autobus':(r<0.34?'utilitaria':r<0.6?'berlina':r<0.68?'taxi':r<0.8?'furgone':r<0.88?'sportiva':'polizia'));
    const c=makeCar(type,x,y,ang);if(blockedN(c,x,y,ang)>0)continue;c.driver='npc';c.ai={k:rand(0.88,1.1)*(type==='autobus'?0.72:1),ignore:0,wait:0};setPath(c,e,dir,j);
    const sp=c.ai.cruise*0.6;c.vx=Math.cos(ang)*sp;c.vy=Math.sin(ang)*sp;cars.push(c);return c;}
  return null;
}
function pedStart(p,e,side,dir,j){p.we=e;p.wside=side;p.wdir=dir;p.wl=dir>0?(side>0?e.sideR:e.sideL):(side>0?(e.sideRr||(e.sideRr=e.sideR.slice().reverse())):(e.sideLr||(e.sideLr=e.sideL.slice().reverse())));p.wi=j;}
function pedNext(p){const e=p.we,n=p.wdir>0?e.b:e.a,opts=n.edges.filter(f=>f!==e&&f.cls!=='V'),f=opts.length?pick(opts):e;pedStart(p,f,Math.random()<0.7?p.wside:-p.wside,f.a===n?1:-1,0);}
function spawnPed(fx,fy,minD,maxD,allowVisible){
  for(let tries=0;tries<30;tries++){const e=pickEdge(walkEdges,walkW,walkTot),side=Math.random()<0.5?1:-1,dir=Math.random()<0.5?1:-1,l=side>0?e.sideR:e.sideL;if(l.length<2)continue;
    const j=1+Math.floor(Math.random()*(l.length-1)),a=l[j-1],b=l[j],t=Math.random(),x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
    const d=Math.hypot(x-fx,y-fy);if(d<minD||d>maxD)continue;if(!allowVisible&&onScreen(x,y,40))continue;const tt=tileAtPx(x,y);if(tt===BUILD||tt===OUT||tt===WATER)continue;
    const p=makePed(x,y);pedStart(p,e,side,dir,dir>0?j:l.length-j);peds.push(p);return;}
}

// ---------------- polizia ----------------
const COPS_BY=[0,1,2,3,5,6];
function los(x0,y0,x1,y1){const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/18);for(let i=1;i<n;i++){const t=i/n;if(tileAtPx(x0+(x1-x0)*t,y0+(y1-y0)*t)===BUILD)return false;}return true;}
function nearestNode(x,y){let best=nodes[0],bd=1e18;for(const n of nodes){if(!n.edges.length)continue;const d=(n.x-x)*(n.x-x)+(n.y-y)*(n.y-y);if(d<bd){bd=d;best=n;}}return best;}
function astar(n0,n1){const N=nodes.length,g=new Float64Array(N).fill(Infinity),f=new Float64Array(N).fill(Infinity),came=new Int32Array(N).fill(-1),cameE=new Array(N),inOpen=new Uint8Array(N),open=[n0.id];
  const hh=n=>Math.hypot(n.x-n1.x,n.y-n1.y);g[n0.id]=0;f[n0.id]=hh(n0);inOpen[n0.id]=1;let it=0;
  while(open.length&&it++<30000){let bi=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[bi]])bi=i;const cur=open[bi];open[bi]=open[open.length-1];open.pop();inOpen[cur]=0;if(cur===n1.id)break;const cn=nodes[cur];
    for(const e of cn.edges){const nb=e.a===cn?e.b:e.a,ng=g[cur]+e.len;if(ng<g[nb.id]){g[nb.id]=ng;f[nb.id]=ng+hh(nb);came[nb.id]=cur;cameE[nb.id]=e;if(!inOpen[nb.id]){open.push(nb.id);inOpen[nb.id]=1;}}}}
  if(n0!==n1&&came[n1.id]<0)return null;const out=[];let c=n1.id;while(c!==n0.id){out.push([c,cameE[c]]);c=came[c];}return out.reverse();}
function roadPath(x,y,tx,ty){const n0=nearestNode(x,y),n1=nearestNode(tx,ty),pth=astar(n0,n1);const pts=[[n0.x,n0.y]];
  if(pth){let prev=n0.id;for(const [nid,e] of pth){const seq=e.a.id===prev?e.pts:e.pts.slice().reverse();for(let i=1;i<seq.length;i++)pts.push(seq[i]);prev=nid;}}
  pts.push([tx,ty]);const out=[];let px=x,py=y;for(const p of pts){if(Math.hypot(p[0]-px,p[1]-py)>40){out.push(p);px=p[0];py=p[1];}}return out;}
function makeCop(c){c.driver='cop';c.siren=true;c.ai={path:[],repath:0,stuck:0,rev:0,revSteer:1};}
function copNear(x,y,r){for(const c of cars)if(!c.wreck&&(c.driver==='cop'||(c.type==='polizia'&&c.driver==='npc'))&&Math.hypot(c.x-x,c.y-y)<r)return true;return false;}
function addHeat(n){if(state!=='play')return;const before=wanted.level;wanted.level=Math.min(5,wanted.level+n);wanted.lost=0;wanted.lastX=player.x;wanted.lastY=player.y;
  if(wanted.level>before){wanted.flash=1.2;sfx.heat();if(before===0)toast('La polizia ti sta cercando!');}}
function calmCops(){for(const c of cars)if(c.driver==='cop'){c.driver='idle';c.siren=false;c.ai=null;}}
function copAI(c,dt){
  const ai=c.ai,tg=player.car||player,tx=tg.x,ty=tg.y,dist=Math.hypot(tx-c.x,ty-c.y);
  let gx,gy;
  if(dist<320&&los(c.x,c.y,tx,ty)){gx=tx+(player.car?player.car.vx*0.3:0);gy=ty+(player.car?player.car.vy*0.3:0);ai.path.length=0;}
  else{ai.repath-=dt;if(ai.repath<=0||!ai.path.length){ai.path=roadPath(c.x,c.y,wanted.lastX,wanted.lastY);ai.repath=1.2;}
    while(ai.path.length&&Math.hypot(ai.path[0][0]-c.x,ai.path[0][1]-c.y)<45)ai.path.shift();
    if(ai.path.length){gx=ai.path[0][0];gy=ai.path[0][1];}else{gx=wanted.lastX;gy=wanted.lastY;}}
  const want=Math.atan2(gy-c.y,gx-c.x),diff=angDiff(want,c.a),sp=Math.hypot(c.vx,c.vy);
  let thr=1,steer=clamp(diff*2.4,-1,1),hand=false;
  if(Math.abs(diff)>1.2&&sp>220)thr=-0.6;
  if(Math.abs(diff)>1.3&&sp>180)hand=true;
  if(Math.abs(diff)>2.3&&sp<60&&dist<220){thr=-1;steer=diff>0?-1:1;}
  if(!player.car&&dist<58)thr=0;
  if(Math.hypot(gx-c.x,gy-c.y)<30&&dist>320)thr=0;
  if(ai.rev>0){ai.rev-=dt;thr=-1;steer=ai.revSteer;hand=false;}
  else{if(sp<20&&thr>0)ai.stuck+=dt;else ai.stuck=Math.max(0,ai.stuck-dt);if(ai.stuck>0.9){ai.rev=0.9;ai.revSteer=diff>0?-1:1;ai.stuck=0;}}
  carPhysics(c,thr,steer,hand,dt);
}
function updateWanted(dt){
  if(wanted.flash>0)wanted.flash-=dt;
  if(wanted.level===0){wanted.bust=0;return;}
  let seen=false;
  for(const c of cars){if(c.driver!=='cop')continue;if(Math.hypot(c.x-player.x,c.y-player.y)<450&&los(c.x,c.y,player.x,player.y)){seen=true;break;}}
  if(heli&&heli.sees)seen=true;
  wanted.seen=seen;
  if(seen){wanted.lost=0;wanted.lastX=player.x;wanted.lastY=player.y;}
  else{wanted.lost+=dt;if(wanted.lost>7+wanted.level*2.5){wanted.level--;wanted.lost=0;
    if(wanted.level===0){calmCops();if(mission&&mission.type==='colpo')completeMission();else bigMsg('SEMINATI!','La polizia ha perso le tue tracce','#4da3ff',2.5);}
    else toast('Calore in calo…');}}
  const mySp=player.car?Math.hypot(player.car.vx,player.car.vy):(player.moving?140:0);
  let near=false;const R=player.car?52:85;
  for(const c of cars)if(c.driver==='cop'&&Math.hypot(c.x-player.x,c.y-player.y)<R){near=true;break;}
  if(near&&mySp<38){wanted.bust+=dt;if(wanted.bust>1.5)busted();}else wanted.bust=Math.max(0,wanted.bust-dt*0.7);
}
function busted(){
  const fine=Math.min(money,200+wanted.level*150);money-=fine;saveMoney();
  bustT=3.2;bigMsg('ARRESTATO',fine>0?'Multa: -€'+fine:'Niente multa: sei al verde','#4da3ff',3.2);
  if(mission){clearPax();offerQueue.push({type:mission.type,t:5});mission=null;toast('Missione fallita');}
  sfx.fail();
  wanted.level=0;wanted.bust=0;
}
function respawnAfterBust(){
  if(player.car){player.car.driver=null;player.car=null;}
  player.x=SPAWN.x;player.y=SPAWN.y;player.stun=0;player.a=SPAWN.a;
  cars=cars.filter(c=>c.driver!=='cop'&&c.driver!=='idle');
  updateCamera(0,true);
}

// ---------------- giocatore ----------------
function tryEnterCar(){
  let best=null,bd=50;
  for(const c of cars){if(c.wreck)continue;const d=Math.hypot(c.x-player.x,c.y-player.y);if(d<bd){bd=d;best=c;}}
  if(!best)return;
  const c=best;
  if(c.driver==='npc'||c.driver==='cop'||c.driver==='idle'){
    const p=ejectDriver(c);say(p,c.type==='polizia'?'Ehi! Quella è dello Stato!':pick(['La mia macchina!','Al ladro!','Mamma mia!','Ma che fai?!']));
    if(c.type==='polizia')addHeat(2);else if(copNear(c.x,c.y,450))addHeat(1);
  }else if(c.type==='polizia')addHeat(2);
  c.driver='player';c.ai=null;c.siren=false;c.lost=false;player.car=c;
  if(player.lastCar&&player.lastCar!==c)player.lastCar.keep=false;
  player.lastCar=c;c.keep=true;
  toast((c.type==='polizia'&&c.col==='#16213e'?'Carabinieri':c.d.name)+(c.type==='polizia'?' — ottima idea…?':''),1.6);
}
function exitCar(forced){
  const c=player.car;if(!c)return;
  if(!forced&&(Math.hypot(c.vx,c.vy)>70||c.z>1)){toast('Rallenta per scendere',1.4);return;}
  const fx=Math.cos(c.a),fy=Math.sin(c.a);
  const spots=[[fy,-fx,c.d.wid/2+9],[-fy,fx,c.d.wid/2+9],[fx,fy,c.d.len/2+9],[-fx,-fy,c.d.len/2+9]];
  for(const [ox,oy,d] of spots){const x=c.x+ox*d,y=c.y+oy*d;if(!pedSolidAt(x,y,5)){player.x=x;player.y=y;break;}}
  if(!c.wreck)c.driver=null;
  player.car=null;player.a=c.a;
}
function honk(){const c=player.car;say(c,'BEEP BEEP!',1);sfx.horn();
  for(const p of peds)if(p.down<=0&&Math.hypot(p.x-c.x,p.y-c.y)<120){p.flee=1;p.fleeFrom=[c.x,c.y];}
  for(const o of cars)if(o!==c&&o.driver==='npc'&&Math.hypot(o.x-c.x,o.y-c.y)<130&&Math.random()<0.5)say(o,pick(['Ehi!','Calma!','Ma va\' là!','Che fretta!']),1.5);}
function updatePlayer(dt){
  const up=keys.KeyW||keys.ArrowUp,dn=keys.KeyS||keys.ArrowDown,lf=keys.KeyA||keys.ArrowLeft,rt=keys.KeyD||keys.ArrowRight;
  if(player.car){const c=player.car,thr=(up?1:0)-(dn?1:0);const boost=(keys.ShiftLeft||keys.ShiftRight||keys.KeyN)&&thr>0&&!c.wreck&&c.nitro>0.02&&c.z<1;
    if(boost&&!player.boosting)sfx.nitro();player.boosting=boost;
    if(boost){c.nitro=Math.max(0,c.nitro-dt/3.2);if(Math.random()<0.85){const bx=c.x-Math.cos(c.a)*c.d.len/2,by=c.y-Math.sin(c.a)*c.d.len/2;puff(bx,by,Math.random()<0.5?'#66ccff':'#ff9f43',rand(3,5),rand(0.15,0.3),-c.vx*0.2,-c.vy*0.2,10,0.9,5,rand(0,10));}}
    else c.nitro=Math.min(1,c.nitro+dt/9);
    carPhysics(c,thr,(rt?1:0)-(lf?1:0),!!keys.Space,dt,boost);if(player.car){player.x=c.x;player.y=c.y;player.a=c.a;}return;}
  player.boosting=false;
  if(player.stun>0){player.stun-=dt;player.moving=false;return;}
  const turn=(rt?1:0)-(lf?1:0),fwd=(up?1:0)-(dn?1:0);
  player.a+=turn*3.2*dt;
  if(fwd){const run=keys.ShiftLeft||keys.ShiftRight,sp=(run?235:130)*(fwd<0?0.6:1);
    tryMovePed(player,Math.cos(player.a)*sp*fwd*dt,Math.sin(player.a)*sp*fwd*dt);player.t+=dt*(sp/130);player.moving=true;}
  else{player.moving=!!turn;if(turn)player.t+=dt*0.7;}
}
function playerCarCollide(){
  for(const c of cars){const dx=player.x-c.x,dy=player.y-c.y;if(dx*dx+dy*dy>2500||c.z>8)continue;const sp=Math.hypot(c.vx,c.vy);
    for(const [px,py] of circles(c)){let ex=player.x-px,ey=player.y-py,d=Math.hypot(ex,ey);const md=c.d.wid/2+7;
      if(d<md){if(d<0.01){ex=1;ey=0;d=1;}const nx=ex/d,ny=ey/d,ov=md-d;
        if(!pedSolidAt(player.x+nx*ov,player.y+ny*ov,5)){player.x+=nx*ov;player.y+=ny*ov;}else{c.x-=nx*ov;c.y-=ny*ov;}
        if(sp>110&&player.stun<=0){player.stun=0.9;tryMovePed(player,c.vx*0.05,c.vy*0.05);say(player,'Ahi!',1.2);shake=Math.max(shake,5);}}}}
}

// ---------------- collisioni auto ----------------
function pushCar(c,dx,dy){const cur=blockedN(c,c.x,c.y,c.a);if(blockedN(c,c.x+dx,c.y+dy,c.a)<=cur){c.x+=dx;c.y+=dy;}}
function collideCars(){
  for(let i=0;i<cars.length;i++){const a=cars[i];
    for(let j=i+1;j<cars.length;j++){const b=cars[j];const dx=b.x-a.x,dy=b.y-a.y;if(dx*dx+dy*dy>3600)continue;if(Math.abs((a.z||0)-(b.z||0))>12)continue;
      const ca=circles(a),cb=circles(b),ra=a.d.wid/2+1,rb=b.d.wid/2+1;let hitDone=false;
      for(const p of ca)for(const q of cb){let ex=q[0]-p[0],ey=q[1]-p[1],d=Math.hypot(ex,ey);const md=ra+rb;if(d>=md)continue;
        if(d<0.01){ex=1;ey=0;d=1;}const nx=ex/d,ny=ey/d,ov=md-d;
        const ma=a.d.len*a.d.wid*(a.d.mass||1)*(a.wreck?1.5:1),mb=b.d.len*b.d.wid*(b.d.mass||1)*(b.wreck?1.5:1),ta=mb/(ma+mb),tb=ma/(ma+mb);
        pushCar(a,-nx*ov*ta,-ny*ov*ta);pushCar(b,nx*ov*tb,ny*ov*tb);
        const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
        if(rv<0){const J=-1.3*rv;a.vx-=nx*J*ta;a.vy-=ny*J*ta;b.vx+=nx*J*tb;b.vy+=ny*J*tb;
          if(!hitDone&&-rv>60){hitDone=true;const imp=-rv;damage(a,imp*0.07);damage(b,imp*0.07);sparks((p[0]+q[0])/2,(p[1]+q[1])/2,imp);onCrash(a,b,imp);}}
      }
    }
  }
}
function onCrash(a,b,imp){
  const pc=player.car;if(!pc||(a!==pc&&b!==pc))return;const o=a===pc?b:a;
  shake=Math.max(shake,Math.min(8,imp/40));sfx.crash(imp);
  if(o.heatCd>0)return;o.heatCd=2.5;
  if(o.type==='polizia'&&(o.driver==='npc'||o.driver==='cop'||o.driver==='idle')){addHeat(1);if(o.driver!=='cop')makeCop(o);say(o,'Accosti subito!',1.6);}
  else if(o.driver==='npc'){if(Math.random()<0.6)say(o,pick(['Ehi!!','La mia fiancata!','Assicurazione!','Ma dove guardi?!']),1.6);if(imp>140&&copNear(o.x,o.y,400))addHeat(1);}
}

// ---------------- particelle (sprite) ----------------
const puffTex=canvasTex(glowCanvas(32,[[0,'rgba(255,255,255,1)'],[0.55,'rgba(255,255,255,0.55)'],[1,'rgba(255,255,255,0)']]));
const freeSprites=[];for(let i=0;i<200;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex,transparent:true,depthWrite:false}));s.visible=false;scene.add(s);freeSprites.push(s);}
function puff(x,y,col,r,life,vx,vy,grow,alpha,h,vh){if(!freeSprites.length)return;const s=freeSprites.pop();s.material.color.set(col);s.visible=true;
  parts.push({x,y,vx:vx||0,vy:vy||0,r,col,life,max:life,grow:grow||10,alpha:alpha||0.5,h:h??6,vh:vh??12,s});}
function sparks(x,y,imp){if(!onScreen(x,y,50))return;const n=Math.min(12,4+(imp/40|0));for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(60,200);puff(x,y,'#ffd166',1.6,rand(0.15,0.4),Math.cos(a)*s,Math.sin(a)*s,0,1,rand(4,10),rand(20,80));}}
function say(ent,text,dur){bubbles=bubbles.filter(b=>b.ent!==ent);bubbles.push({ent,text,t:dur||2});}
function toast(s,d){toasts.push({s,t:d||2.6});if(toasts.length>3)toasts.shift();}
function bigMsg(title,sub,col,d){big={title,sub,col:col||'#ffd32a',t:d||3,max:d||3};}

// ---------------- missioni ----------------
const MT={consegna:{name:'Consegna',col:'#ffd32a',ic:'C'},corsa:{name:'Corsa clandestina',col:'#3ae374',ic:'R'},colpo:{name:'Il colpo',col:'#ff4d6d',ic:'€'},taxi:{name:'Taxi',col:'#ff9f43',ic:'T'}};
const spotEdges=edges.filter(e=>e.cls==='R'||e.cls==='T'||e.cls==='S'),spotW=spotEdges.map(e=>e.len),spotTot=spotW.reduce((a,b)=>a+b,0);
function randomSpot(fx,fy,minD,maxD){for(let i=0;i<700;i++){const e=pickEdge(spotEdges,spotW,spotTot),l=Math.random()<0.5?e.sideR:e.sideL;if(l.length<2)continue;const j=1+Math.floor(Math.random()*(l.length-1)),a=l[j-1],b=l[j],t=0.2+Math.random()*0.6,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
  const tt=tileAtPx(x,y);if(tt===BUILD||tt===OUT||tt===WATER)continue;const d=Math.hypot(x-fx,y-fy);if(d>=minD&&d<=maxD)return[x,y];}return[SPAWN.x,SPAWN.y];}
function newOffer(type){const [x,y]=randomSpot(player.x,player.y,600,3500);offers.push({type,x,y,warn:0,mesh:null});}
function startMission(o){
  if((o.type==='corsa'||o.type==='taxi')&&!player.car){if(o.warn<=0){toast(o.type==='taxi'?'Ti serve un\'auto per fare il taxi!':'Ti serve un veicolo per la corsa!');o.warn=3;}return;}
  offers.splice(offers.indexOf(o),1);
  if(o.type==='consegna'){
    const a=randomSpot(o.x,o.y,1200,2600),b=randomSpot(a[0],a[1],2000,4000);
    const d=Math.hypot(a[0]-o.x,a[1]-o.y)+Math.hypot(b[0]-a[0],b[1]-a[1]);
    mission={type:'consegna',steps:[{x:a[0],y:a[1],label:'Ritira il pacco'},{x:b[0],y:b[1],label:'Consegna il pacco'}],idx:0,time:d/180+18,reward:Math.round((150+d*0.12)/10)*10};
    bigMsg('CONSEGNA','Zio Tonino ha un pacco "delicato". Niente domande, niente ritardi.',MT.consegna.col,3.6);
  }else if(o.type==='corsa'){
    let n=nearestNode(player.x,player.y),prevE=null,d=0;const steps=[];
    for(let i=0;i<7;i++){let hops=3+Math.floor(Math.random()*3);while(hops-->0){const opts=n.edges.filter(f=>f!==prevE&&f.cls!=='V'),f=opts.length?pick(opts):(prevE||n.edges[0]);if(!f)break;d+=f.len;prevE=f;n=f.a===n?f.b:f.a;}
      steps.push({x:n.x,y:n.y,label:'Checkpoint '+(i+1)+'/7'});}
    mission={type:'corsa',steps,idx:0,time:d/230+8,reward:700};
    bigMsg('CORSA CLANDESTINA','Sette checkpoint per le strade della città. Il cronometro corre.',MT.corsa.col,3.6);
  }else if(o.type==='taxi'){
    const a=randomSpot(o.x,o.y,600,1800),b=randomSpot(a[0],a[1],1800,3600);
    const d=Math.hypot(a[0]-o.x,a[1]-o.y)+Math.hypot(b[0]-a[0],b[1]-a[1]);
    const pax=makePed(a[0],a[1]);pax.wait=true;pax.keep=true;peds.push(pax);
    mission={type:'taxi',steps:[{x:a[0],y:a[1],label:'Raggiungi il cliente e fermati accanto'},{x:b[0],y:b[1],label:'Porta il cliente a destinazione'}],idx:0,time:d/170+22,reward:Math.round((220+d*0.1)/10)*10,pax,car:null,hp0:0};
    bigMsg('TAXI','Un cliente ha fretta. Guida pulito: la mancia dipende dai danni.',MT.taxi.col,3.6);
  }else{
    mission={type:'colpo',steps:[],idx:0,time:0,reward:900};addHeat(3);
    bigMsg('IL COLPO','Hai "preso in prestito" i gioielli della Contessa. Semina la polizia!',MT.colpo.col,3.6);
  }
}
function completeMission(){const r=mission.reward,ty=mission.type;clearPax();money+=r;save.done++;saveMoney();sfx.win();bigMsg('MISSIONE COMPIUTA','+€'+r+(mission.tipNote||''),'#ffd32a',3.2);mission=null;offerQueue.push({type:ty,t:4});}
function failMission(reason){const ty=mission.type;clearPax();sfx.fail();bigMsg('MISSIONE FALLITA',reason,'#ff4d4d',3);mission=null;offerQueue.push({type:ty,t:4});}
function updateMission(dt){
  for(let i=offerQueue.length-1;i>=0;i--){offerQueue[i].t-=dt;if(offerQueue[i].t<=0){newOffer(offerQueue[i].type);offerQueue.splice(i,1);}}
  for(const o of offers){if(o.warn>0)o.warn-=dt;if(!mission&&Math.hypot(o.x-player.x,o.y-player.y)<30){startMission(o);break;}}
  if(!mission||mission.type==='colpo')return;
  const m=mission;m.time-=dt;if(m.time<=0){failMission('Tempo scaduto!');return;}
  if(m.type==='taxi'&&m.idx===1&&player.car!==m.car){failMission('Il cliente è sceso dall\'auto');return;}
  const s=m.steps[m.idx],rad=m.type==='corsa'?55:m.type==='taxi'?50:34;
  if(Math.hypot(s.x-player.x,s.y-player.y)<rad&&(m.type!=='corsa'||player.car)){
    if(m.type==='taxi'){if(!player.car)return;if(Math.hypot(player.car.vx,player.car.vy)>70){if(!(m.warnT>gtime)){toast('Rallenta e fermati!',1.2);m.warnT=gtime+1.5;}return;}}
    m.idx++;
    if(m.type==='taxi'&&m.idx===1){clearPax();m.car=player.car;m.hp0=player.car.hp;say(player.car,pick(['Al lungomare, e di corsa!','Svelto, sono in ritardo!','Vada pure, conosco la strada… più o meno.','Piano con le curve, eh!']),2.4);sfx.coin();return;}
    if(m.idx>=m.steps.length){if(m.type==='taxi'){const dmg=Math.max(0,m.hp0-(m.car?m.car.hp:0)),pen=Math.round(dmg*4/10)*10;m.reward=Math.max(60,m.reward-pen);m.tipNote=pen>0?'   (−€'+pen+' per i danni)':'   (mancia piena!)';}completeMission();return;}
    if(m.type==='consegna'){toast('Pacco ritirato! Ora consegnalo.');sfx.coin();}else{m.time+=2.5;toast('Checkpoint! +2,5s',1.2);sfx.coin();}}
}

// ---------------- spawn ----------------
const TRAFFIC_N=30,PED_N=40;let spawnT=0;
const _v=new THREE.Vector3();
function onScreen(x,y,m){const dx=x-camera.position.x,dz=y-camera.position.z;if(dx*dx+dz*dz>2700*2700)return false;_v.set(x,8,y).project(camera);if(_v.z>1||_v.z<-1)return false;const k=1+m/300;return Math.abs(_v.x)<k&&Math.abs(_v.y)<k*1.2;}
function populate(fx,fy){for(let i=0;i<TRAFFIC_N;i++)spawnTrafficCar(fx,fy,60,1500,true);for(let i=0;i<PED_N;i++)spawnPed(fx,fy,30,1100,true);}
function manageSpawns(dt,fx,fy){
  spawnT-=dt;if(spawnT>0)return;spawnT=0.2;
  for(let i=cars.length-1;i>=0;i--){const c=cars[i];if(c===player.car)continue;const d=Math.hypot(c.x-fx,c.y-fy),vis=onScreen(c.x,c.y,80);let kill;
    if(c.keep)kill=d>2600&&!vis;else if(c.driver==='npc'||c.driver==='cop')kill=(d>1800&&!vis)||(c.lost&&!vis&&d>500);else kill=d>1200&&!vis;
    if(kill)cars.splice(i,1);}
  for(let i=peds.length-1;i>=0;i--){const p=peds[i];if(!p.keep&&Math.hypot(p.x-fx,p.y-fy)>1300&&!onScreen(p.x,p.y,40))peds.splice(i,1);}
  let tr=0,cops=0;for(const c of cars){if(c.driver==='npc')tr++;else if(c.driver==='cop')cops++;}
  if(tr<TRAFFIC_N)spawnTrafficCar(fx,fy,500,1500,false);
  if(peds.length<PED_N)spawnPed(fx,fy,350,1100,false);
  const want=state==='play'?COPS_BY[wanted.level]:0;
  if(cops<want){let best=null,bd=800;for(const c of cars)if(c.type==='polizia'&&c.driver==='npc'&&!c.wreck){const d=Math.hypot(c.x-fx,c.y-fy);if(d<bd){bd=d;best=c;}}
    if(best)makeCop(best);else{const c=spawnTrafficCar(fx,fy,600,1250,false,'polizia');if(c)makeCop(c);}}
}

// ---------------- aggiornamento logico ----------------
function updateWorld(dt){
  updateTrams(dt);
  for(const c of cars){
    if(c===player.car)continue;
    if(c.wreck||!c.driver||c.driver==='idle')carPhysics(c,0,0,true,dt);
    else if(c.driver==='npc'){if(wanted.level>0&&c.type==='polizia'&&state==='play'&&Math.hypot(c.x-player.x,c.y-player.y)<650){makeCop(c);copAI(c,dt);}else trafficAI(c,dt);}
    else if(c.driver==='cop')copAI(c,dt);
  }
  collideCars();
  for(const c of cars){if(c.heatCd>0)c.heatCd-=dt;if(Math.abs(c.x-camera.position.x)>1300||Math.abs(c.y-camera.position.z)>1300)continue;
    if(c.wreck){if(c.burn>0){c.burn-=dt;if(Math.random()<0.5)puff(c.x+rand(-8,8),c.y+rand(-6,6),Math.random()<0.5?'#ff8c1a':'#ffd23f',rand(4,7),rand(0.3,0.6),rand(-10,10),rand(-10,10),14,0.9,10,rand(15,35));}
      if(Math.random()<0.25)puff(c.x,c.y,'#333333',rand(6,10),rand(1.2,2.2),rand(-15,15),rand(-15,15),14,0.5,14,rand(20,40));}
    else if(c.hp<c.d.hp*0.35&&Math.random()<0.2)puff(c.x+Math.cos(c.a)*c.d.len*0.4,c.y+Math.sin(c.a)*c.d.len*0.4,'#999999',rand(4,7),rand(0.8,1.5),rand(-10,10),rand(-10,10),12,0.45,9,rand(15,30));}
  updatePeds(dt);
  if(state==='play'&&!player.car&&bustT<=0)playerCarCollide();
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){p.s.visible=false;freeSprites.push(p.s);parts.splice(i,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.h+=p.vh*dt;p.r+=p.grow*dt;p.vx*=0.97;p.vy*=0.97;if(p.grow===0)p.vh-=200*dt;}
  for(let i=bubbles.length-1;i>=0;i--){bubbles[i].t-=dt;if(bubbles[i].t<=0)bubbles.splice(i,1);}
}
function update(dt){
  if(state==='pause'||state==='map'||state==='garage')return;
  gtime+=dt;lightT+=dt;clockT+=dt;shake*=Math.exp(-dt*6);updateWeather(dt);
  for(let i=toasts.length-1;i>=0;i--){toasts[i].t-=dt;if(toasts[i].t<=0)toasts.splice(i,1);}
  if(big){big.t-=dt;if(big.t<=0)big=null;}
  if(state==='title'){updateWorld(dt);manageSpawns(dt,SPAWN.x,SPAWN.y);return;}
  introT+=dt;
  if(bustT>0){bustT-=dt;if(bustT<=0)respawnAfterBust();}else updatePlayer(dt);
  updateWorld(dt);
  if(bustT<=0){updateWanted(dt);updateMission(dt);updateTokens();updateGarage();boundaryCheck();}
  updateHeli(dt);
  manageSpawns(dt,player.x,player.y);
}

// ---------------- modelli 3D ----------------
const boxAt=(w,h,d,x,y,z)=>new THREE.BoxGeometry(w,h,d).translate(x,y,z);
function mergeGeo(list){const pos=[],nor=[];for(const g0 of list){const g=g0.index?g0.toNonIndexed():g0;pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));o.computeBoundingSphere();return o;}
const geoCache={};
function carGeo(type){
  if(geoCache[type])return geoCache[type];
  const d=CARS[type],L=d.len,Wd=d.wid,G={},wr=type==='utilitaria'?3.1:type==='autobus'?4.8:(type==='furgone'||type==='corazzato')?4.2:3.6;
  if(type==='autobus'){G.body=boxAt(L,13,Wd,0,9,0);G.cabin=boxAt(L*0.86,5,Wd+0.3,-1.5,11.8,0);G.roof=boxAt(L-4,0.9,Wd-2,0,15.9,0);G.ly=6;G.wind=boxAt(1.2,6.5,Wd-3,L/2+0.2,11,0);G.stripe=boxAt(L+0.2,2.2,Wd+0.25,0,5,0);}
  else if(type==='fulmine'){G.body=boxAt(L,4.2,Wd,0,4.2,0);G.cabin=boxAt(L*0.36,3.2,Wd-3,-L*0.06,7.9,0);G.roof=boxAt(L*0.28,0.6,Wd-3.6,-L*0.07,9.7,0);G.ly=4.2;G.wing=mergeGeo([boxAt(4.5,0.8,Wd,-L/2+2.5,10.6,0),boxAt(1,3.6,1,-L/2+2.5,8.6,-Wd*0.3),boxAt(1,3.6,1,-L/2+2.5,8.6,Wd*0.3)]);}
  else if(type==='corazzato'){G.body=boxAt(L,12,Wd,0,8.5,0);G.cabin=boxAt(L*0.16,4,Wd+0.3,L/2-L*0.08-0.5,11.2,0);G.roof=boxAt(L-8,1.5,Wd-2,-3,15.2,0);G.ly=6;G.armor=mergeGeo([boxAt(2.4,6,Wd-2,L/2+1.2,5.5,0),boxAt(L*0.62,4.5,Wd+0.8,-2,6.5,0)]);}
  else if(type==='sportiva'){G.body=boxAt(L,5,Wd,0,4.6,0);G.cabin=boxAt(L*0.42,3.6,Wd-2.4,-L*0.08,8.9,0);G.roof=boxAt(L*0.34,0.8,Wd-3,-L*0.09,10.9,0);G.ly=4.8;}
  else if(type==='furgone'){G.body=boxAt(L,11,Wd,0,8,0);G.cabin=boxAt(L*0.2,5,Wd+0.3,L/2-L*0.1-0.5,10.4,0);G.roof=boxAt(L-6,0.8,Wd-2,-2,13.9,0);G.ly=5.5;}
  else if(type==='utilitaria'){G.body=boxAt(L,6,Wd,0,5.2,0);G.cabin=boxAt(L*0.62,5.6,Wd-1.4,-L*0.04,10.9,0);G.roof=boxAt(L*0.56,0.8,Wd-2,-L*0.05,14.1,0);G.ly=5.8;}
  else{G.body=boxAt(L,6,Wd,0,5.5,0);G.cabin=boxAt(L*0.48,4.6,Wd-2,-L*0.06,10.8,0);G.roof=boxAt(L*0.4,0.9,Wd-2.6,-L*0.07,13.4,0);G.ly=6;}
  const ws=[];for(const sx of [-1,1])for(const sz of [-1,1])ws.push(new THREE.CylinderGeometry(wr,wr,2.6,12).rotateX(Math.PI/2).translate(sx*L*0.31,wr,sz*(Wd/2-0.9)));
  G.wheels=mergeGeo(ws);
  G.heads=mergeGeo([boxAt(1,1.8,3.2,L/2+0.3,G.ly,-(Wd/2-2.6)),boxAt(1,1.8,3.2,L/2+0.3,G.ly,Wd/2-2.6)]);
  G.tails=mergeGeo([boxAt(1,1.8,3.2,-L/2-0.3,G.ly,-(Wd/2-2.6)),boxAt(1,1.8,3.2,-L/2-0.3,G.ly,Wd/2-2.6)]);
  if(type==='taxi')G.extra=boxAt(5,2.6,7,-L*0.07,15.1,0);
  if(type==='polizia'){G.stripe=boxAt(L*0.84,2.8,Wd+0.3,-0.5,5.4,0);G.red=boxAt(3,1.8,Wd*0.38,-L*0.07,14.75,-Wd*0.21);G.blue=boxAt(3,1.8,Wd*0.38,-L*0.07,14.75,Wd*0.21);}
  if(type==='sportiva')G.stripes=mergeGeo([boxAt(L*0.98,0.3,1.2,0,7.2,-1.3),boxAt(L*0.98,0.3,1.2,0,7.2,1.3)]);
  return geoCache[type]=G;
}
const MAT={};
function sm(hex,o){const k=hex+'|'+(o?JSON.stringify(o):'');return MAT[k]||(MAT[k]=new THREE.MeshStandardMaterial(Object.assign({color:hex,roughness:0.4,metalness:0.25},o||{})));}
const carGlassM=new THREE.MeshStandardMaterial({color:0x1b2738,roughness:0.12,metalness:0.6});
const tireM=new THREE.MeshStandardMaterial({color:0x161616,roughness:0.9});
const headM=new THREE.MeshBasicMaterial({color:0xfff2c0});
const tailM=new THREE.MeshBasicMaterial({color:0x6a0c0c}),brakeM=new THREE.MeshBasicMaterial({color:0xff2424,toneMapped:false});
const charM=new THREE.MeshStandardMaterial({color:0x1d1d1d,roughness:1});
const sirR=[new THREE.MeshBasicMaterial({color:0x4a0a10}),new THREE.MeshBasicMaterial({color:0xff2a3a,toneMapped:false})];
const sirB=[new THREE.MeshBasicMaterial({color:0x0a1a4a}),new THREE.MeshBasicMaterial({color:0x2a6bff,toneMapped:false})];
const glowR=new THREE.SpriteMaterial({map:canvasTex(glowCanvas(64,[[0,'rgba(255,60,70,0.9)'],[1,'rgba(255,0,0,0)']])),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
const glowB=new THREE.SpriteMaterial({map:canvasTex(glowCanvas(64,[[0,'rgba(60,130,255,0.9)'],[1,'rgba(0,60,255,0)']])),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
const underglowM=new THREE.MeshBasicMaterial({map:puffTex,color:'#00e5ff',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.9});
const headDecalGeo=new THREE.PlaneGeometry(200,120).rotateX(-Math.PI/2).translate(100,0,0);
const headDecalM=new THREE.MeshBasicMaterial({map:canvasTex((()=>{const L=256,Hh=160,c=document.createElement('canvas');c.width=L;c.height=Hh;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,L,0);gr.addColorStop(0,'rgba(255,245,210,0.75)');gr.addColorStop(1,'rgba(255,245,210,0)');g.fillStyle=gr;g.beginPath();g.moveTo(0,Hh/2-10);g.lineTo(L,6);g.lineTo(L,Hh-6);g.lineTo(0,Hh/2+10);g.closePath();g.fill();return c;})()),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0});
const livCache={};function livM(col){if(livCache[col])return livCache[col];const cc=col==='#16213e',[cv,g]=mkCv(512,48);g.fillStyle=cc?'#c1121f':'#ffffff';g.fillRect(0,0,512,48);g.fillStyle=cc?'#ffffff':'#1f4e96';g.font='bold 34px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(cc?'CARABINIERI':'POLIZIA',256,26);
  return livCache[col]=new THREE.MeshStandardMaterial({map:canvasTex(cv),roughness:0.4});}
const plateM=(()=>{const [cv,g]=mkCv(128,28);g.fillStyle='#f7f7f2';g.fillRect(0,0,128,28);g.fillStyle='#1f3fa0';g.fillRect(0,0,14,28);g.fillRect(114,0,14,28);g.fillStyle='#fff';g.font='bold 10px sans-serif';g.textAlign='center';g.fillText('I',7,22);g.fillStyle='#111';g.font='bold 17px monospace';g.textBaseline='middle';g.fillText('FT 742 RA',64,15);return new THREE.MeshStandardMaterial({map:canvasTex(cv),roughness:0.5});})();
const plateCache={};function plateGeo(type){if(plateCache[type]!==undefined)return plateCache[type];const d=CARS[type];if(!d)return plateCache[type]=null;const pos=[],nor=[],uv=[];
  for(const sx of [-1,1]){const g=new THREE.BoxGeometry(0.5,2.2,7).translate(sx*(d.len/2+0.35),3.6,0).toNonIndexed();pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);uv.push(...g.attributes.uv.array);}
  const o=new THREE.BufferGeometry();o.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));o.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));o.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return plateCache[type]=o;}
function buildCarMesh(c){
  const G=carGeo(c.type),g=new THREE.Group(),inner=new THREE.Group();g.add(inner);const bm=sm(c.col);
  const add=(geo,mat,cast)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=!!cast;inner.add(m);return m;};
  c.m={inner,body:add(G.body,bm,true),cabin:add(G.cabin,carGlassM,true),roof:add(G.roof,c.type==='polizia'?sm('#f4f6f8'):bm,false),wheels:add(G.wheels,tireM,false),heads:add(G.heads,headM),tails:add(G.tails,tailM),wreckDone:false};
  if(G.extra)add(G.extra,sm('#fff3c4'));
  if(G.wind)add(G.wind,carGlassM);
  if(G.stripe)add(G.stripe,c.type==='polizia'?livM(c.col):sm(c.type==='autobus'?'#f2f2f2':'#1e2a4a'));
  if(c.type!=='autobus'){const pg=plateGeo(c.type);if(pg)add(pg,plateM);}
  if(G.stripes)add(G.stripes,sm('#ffffff'));
  if(G.wing)add(G.wing,sm('#111111'));
  if(G.armor)add(G.armor,sm('#3a3f44',{metalness:0.6,roughness:0.5}));
  if(c.type==='fulmine'){const ug=new THREE.Mesh(new THREE.PlaneGeometry(c.d.len+20,c.d.wid+20).rotateX(-Math.PI/2),underglowM);ug.position.y=0.7;ug.renderOrder=2;g.add(ug);}
  if(G.red){c.m.red=add(G.red,sirR[0]);c.m.blue=add(G.blue,sirB[0]);const s=new THREE.Sprite(glowR);s.scale.set(80,80,1);s.position.set(0,18,0);s.visible=false;g.add(s);c.m.glow=s;}
  const hd=new THREE.Mesh(headDecalGeo,headDecalM);hd.position.set(c.d.len/2+2,0.8,0);hd.renderOrder=2;g.add(hd);c.m.hd=hd;
  scene.add(g);c.mesh=g;
}
const pedM={};const pm=hex=>pedM[hex]||(pedM[hex]=new THREE.MeshStandardMaterial({color:hex,roughness:0.85}));
const legGeo=new THREE.BoxGeometry(2.4,6.5,2.4).translate(0,-3.25,0),torsoGeo=new THREE.BoxGeometry(3.4,5.8,6.2),armGeo=new THREE.BoxGeometry(1.8,5.4,1.8).translate(0,-2.7,0),headGeo=new THREE.BoxGeometry(3.6,3.6,3.6),hairGeo=new THREE.BoxGeometry(3.9,1.5,3.9);
function buildPedMesh(p){
  const g=new THREE.Group(),b=new THREE.Group();g.add(b);g.scale.setScalar(0.9);
  const legs=[],arms=[];
  for(const s of [-1,1]){const lp=new THREE.Group();lp.position.set(0,6.5,s*1.4);lp.add(new THREE.Mesh(legGeo,pm('#2d3436')));b.add(lp);legs.push(lp);
    const ap=new THREE.Group();ap.position.set(0,12,s*3.9);ap.add(new THREE.Mesh(armGeo,pm(p.shirt)));b.add(ap);arms.push(ap);}
  const torso=new THREE.Mesh(torsoGeo,pm(p.shirt));torso.position.y=9.4;torso.castShadow=true;b.add(torso);
  const head=new THREE.Mesh(headGeo,pm(p.skin));head.position.y=14.2;head.castShadow=true;b.add(head);
  const hair=new THREE.Mesh(hairGeo,pm(p.hair));hair.position.set(-0.2,16.1,0);b.add(hair);
  p.m={g,b,legs,arms};scene.add(g);
}
function iconTex(ic,col){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle=col;g.beginPath();g.arc(32,32,28,0,TAU);g.fill();g.lineWidth=5;g.strokeStyle='#fff';g.stroke();g.fillStyle='#111';g.font='bold 34px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(ic,32,34);return canvasTex(c);}
const ringGeo=new THREE.RingGeometry(20,27,40).rotateX(-Math.PI/2);
function beamMat(col,op){return new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});}
function buildOfferMesh(o){const m=MT[o.type],g=new THREE.Group();
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(14,14,120,24,1,true),beamMat(m.col,0.35));beam.position.y=60;g.add(beam);
  const ring=new THREE.Mesh(ringGeo,beamMat(m.col,0.8));ring.position.y=1;g.add(ring);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex(m.ic,m.col),depthWrite:false,fog:false}));sp.scale.set(24,24,1);sp.position.y=34;g.add(sp);
  g.position.set(o.x,0,o.y);scene.add(g);o.mesh=g;o.icon=sp;}
const tgt=new THREE.Group();scene.add(tgt);
const tgtBeam=new THREE.Mesh(new THREE.CylinderGeometry(26,26,900,32,1,true),beamMat('#ffd32a',0.28));tgtBeam.position.y=450;tgt.add(tgtBeam);
const tgtRing=new THREE.Mesh(new THREE.RingGeometry(26,36,48).rotateX(-Math.PI/2),beamMat('#ffd32a',0.9));tgtRing.position.y=1;tgt.add(tgtRing);
const tgtArrow=new THREE.Mesh(new THREE.ConeGeometry(10,20,16).rotateX(Math.PI),new THREE.MeshBasicMaterial({color:'#ffd32a',toneMapped:false}));tgt.add(tgtArrow);
const nextRing=new THREE.Mesh(new THREE.RingGeometry(22,27,40).rotateX(-Math.PI/2),beamMat('#3ae374',0.4));nextRing.position.y=1;scene.add(nextRing);
tgt.visible=false;nextRing.visible=false;
buildPedMesh(player);player.m.g.visible=false;

// ---------------- sincronizzazione scena ----------------
let meshCars=[],meshPeds=[],meshOffers=[],lastLights=-1;
function syncScene(dt){
  frameN++;
  const on=Math.floor(gtime*8)%2===0;
  for(const c of cars){c._f=frameN;if(!c.mesh){buildCarMesh(c);meshCars.push(c);}
    c.mesh.position.set(c.x,c.z||0,c.y);c.mesh.rotation.y=-c.a;c.m.inner.rotation.x=c.wreck?0:c.tilt;c.m.inner.rotation.z=c.wreck?0:c.pitch;
    c.m.tails.material=c.brake?brakeM:tailM;
    if(c.m.red){c.m.red.material=sirR[c.siren&&on?1:0];c.m.blue.material=sirB[c.siren&&!on?1:0];c.m.glow.visible=c.siren;c.m.glow.material=on?glowR:glowB;}
    if(c.wreck&&!c.m.wreckDone){c.m.wreckDone=true;c.m.body.material=charM;c.m.roof.material=charM;c.m.cabin.material=charM;c.m.heads.material=charM;}
    c.m.hd.visible=!c.wreck&&!!c.driver&&c.driver!=='idle';}
  meshCars=meshCars.filter(c=>{if(c._f!==frameN){scene.remove(c.mesh);return false;}return true;});
  const all=state!=='title'?peds.concat([player]):peds;
  for(const p of peds){p._f=frameN;if(!p.m){buildPedMesh(p);meshPeds.push(p);}}
  meshPeds=meshPeds.filter(p=>{if(p._f!==frameN){scene.remove(p.m.g);return false;}return true;});
  player.m.g.visible=state!=='title'&&!player.car;
  for(const p of all){const m=p.m;if(!m)continue;m.g.position.set(p.x,0,p.y);m.g.rotation.y=-p.a;
    const down=p.down>0||(p===player&&p.stun>0);
    if(down){m.b.rotation.z=Math.PI/2;m.b.position.y=2;}else{m.b.rotation.z=0;m.b.position.y=0;}
    const s=p.moving&&!down?Math.sin(p.t*11)*0.7:0;m.legs[0].rotation.z=s;m.legs[1].rotation.z=-s;m.arms[0].rotation.z=-s*0.8;m.arms[1].rotation.z=s*0.8;m.arms[1].rotation.x=p.wait?-2.6+Math.sin(gtime*9)*0.4:0;}
  for(const o of offers){o._f=frameN;if(!o.mesh){buildOfferMesh(o);meshOffers.push(o);}o.mesh.visible=!mission&&state!=='title';o.icon.position.y=34+Math.sin(gtime*3)*3;}
  meshOffers=meshOffers.filter(o=>{if(o._f!==frameN){scene.remove(o.mesh);return false;}return true;});
  if(mission&&mission.type!=='colpo'&&state!=='title'){const s=mission.steps[mission.idx],col=MT[mission.type].col;tgt.visible=true;tgt.position.set(s.x,0,s.y);
    tgtBeam.material.color.set(col);tgtRing.material.color.set(col);tgtArrow.material.color.set(col);tgtArrow.position.y=42+Math.abs(Math.sin(gtime*3))*10;tgtArrow.rotation.y=gtime*2;
    const n=mission.steps[mission.idx+1];nextRing.visible=mission.type==='corsa'&&!!n;if(n)nextRing.position.set(n.x,1,n.y);}
  else{tgt.visible=false;nextRing.visible=false;}
  for(const p of parts){p.s.position.set(p.x,p.h,p.y);const sc=p.r*2;p.s.scale.set(sc,sc,1);p.s.material.opacity=clamp(p.life/p.max,0,1)*p.alpha;}
  if(tlLamps&&!(lastLights>gtime)){lastLights=gtime+0.2;const cols=['#2ecc71','#f1c40f','#ff4136'];for(let i=0;i<tlAxis.length;i++){const q=tlAxis[i];tlLamps.setColorAt(i,tmpC.set(cols[sigGreen(q[0],q[1])]));}tlLamps.instanceColor.needsUpdate=true;}
  antM.color.set(Math.floor(gtime*1.2)%2?'#ff2030':'#3a0005');
  syncExtras(dt);updateRain(dt);LMX.tick(dt,gtime);
}

// ---------------- telecamera e ambiente ----------------
const camPos=new THREE.Vector3(WORLD/2+1100,720,WORLD/2),camLook=new THREE.Vector3(WORLD/2,0,WORLD/2),tPos=new THREE.Vector3(),tLook=new THREE.Vector3();
let camOverride=null; // usata dai test e dagli strumenti: {x,y,z,lx,ly,lz,fov}
function updateCamera(dt,snap){
  if(camOverride){const o=camOverride;camera.position.set(o.x,o.y,o.z);camera.fov=o.fov||55;camera.updateProjectionMatrix();camera.lookAt(o.lx,o.ly||0,o.lz);sun.position.set(o.lx+SUN_OFF.x,SUN_OFF.y,o.lz+SUN_OFF.z);sun.target.position.set(o.lx,0,o.lz);return;}
  if(state==='title'){const a=gtime*0.05;camPos.set(SPAWN.x+Math.cos(a)*1050,650,SPAWN.y+Math.sin(a)*1050);camLook.set(SPAWN.x,0,SPAWN.y);camera.fov=55;}
  else{
    const car=player.car,tg=car||player,sp=car?Math.hypot(car.vx,car.vy):0;
    const head=car?car.a:player.a;
    camYaw=snap?head:camYaw+angDiff(head,camYaw)*(1-Math.exp(-dt*(car?3.2:5)));
    const fx=Math.cos(camYaw),fy=Math.sin(camYaw);
    if(camMode===0){
      const dist=car?84+sp*0.06:50,hgt=car?40+sp*0.02:26;
      let dd=dist;for(let s=6;s<=dist;s+=6){if(heightAt(tg.x-fx*s,tg.y-fy*s)>hgt*0.6){dd=Math.max(12,s-8);break;}}
      tPos.set(tg.x-fx*dd,hgt+(dist-dd)*0.55+(car?car.z*0.7:0),tg.y-fy*dd);
      tLook.set(tg.x+fx*(car?34:22),car?9+car.z:13,tg.y+fy*(car?34:22));
      camera.fov=62+(car?Math.min(sp/480,1)*12:0)+(player.boosting?9:0);
    }else{
      const lx=car?car.vx*0.35:0,ly=car?car.vy*0.35:0;
      tPos.set(tg.x+lx,620+sp*0.4,tg.y+ly+170+sp*0.15);tLook.set(tg.x+lx,0,tg.y+ly);camera.fov=55;
    }
    if(snap){camPos.copy(tPos);camLook.copy(tLook);}else{camPos.lerp(tPos,1-Math.exp(-dt*10));camLook.lerp(tLook,1-Math.exp(-dt*12));}
  }
  camera.updateProjectionMatrix();
  camera.position.copy(camPos);
  if(shake>0.05)camera.position.add(_v.set((Math.random()-0.5)*shake,(Math.random()-0.5)*shake,(Math.random()-0.5)*shake));
  camera.lookAt(camLook);
  sun.position.set(camLook.x+SUN_OFF.x,SUN_OFF.y,camLook.z+SUN_OFF.z);sun.target.position.set(camLook.x,0,camLook.z);
}
const hour=()=>(17+clockT/15)%24;
function darkness(h){if(h>=7&&h<17.5)return 0;if(h>=17.5&&h<20.5)return(h-17.5)/3;if(h>=20.5||h<5)return 1;return 1-(h-5)/2;}
function sunsetTint(h){if(h>=16.5&&h<20)return Math.sin((h-16.5)/3.5*Math.PI);if(h>=5&&h<7.5)return Math.sin((h-5)/2.5*Math.PI)*0.7;return 0;}
const cDay=new THREE.Color('#9fd0ff'),cDusk=new THREE.Color('#ff9a72'),cNight=new THREE.Color('#0b1236'),sDay=new THREE.Color('#fff6e8'),sDusk=new THREE.Color('#ffae70'),sMoon=new THREE.Color('#8fa8ff'),hNight=new THREE.Color('#5566aa'),hDay=new THREE.Color('#dbeeff');
function updateEnv(){
  const h=hour(),dk=darkness(h),tn=sunsetTint(h);
  SKY.copy(cDay).lerp(cDusk,tn*(1-dk)*0.8).lerp(cNight,dk);scene.background.copy(SKY);scene.fog.color.copy(SKY);
  sun.color.copy(sDay).lerp(sDusk,tn*(1-dk)).lerp(sMoon,dk);sun.intensity=2.4*(1-dk)+0.4*dk;
  hemi.color.copy(hDay).lerp(hNight,dk);hemi.intensity=1.0*(1-dk)+0.55*dk;
  if(rain>0.01){SKY.lerp(cRain,rain*0.55*(1-dk*0.5));scene.background.copy(SKY);scene.fog.color.copy(SKY);sun.intensity*=1-0.65*rain;}
  if(fogW>0.01){SKY.lerp(cFogW,fogW*0.8*(1-dk*0.7));scene.background.copy(SKY);scene.fog.color.copy(SKY);sun.intensity*=1-0.45*fogW;}
  scene.fog.near=Math.max(120,1100-500*rain-900*fogW);scene.fog.far=Math.max(750,2800-1100*rain-2000*fogW);if(asphMat){asphMat.roughness=0.9-0.6*rain;asphMat.color.copy(asphBase).multiplyScalar(1-0.3*rain);}
  updateSkyline(dk);
  for(const k in FAC_M)FAC_M[k].emissiveIntensity=k==='shop'?0.06+dk*1.15:0.02+dk*0.9;tramWinM.emissiveIntensity=dk*0.85;
  lampDecalM.opacity=dk*0.85;headDecalM.opacity=dk*0.85;bulbM.color.setScalar(0.22+dk*1.8);neonM.color.setScalar(0.6+dk*1.3);
  for(const f of envHooks)f(dk);
}

// ---------------- HUD 2D ----------------
const _p=new THREE.Vector3();
function project(x,y,h){_p.set(x,h,y).project(camera);return{x:(_p.x+1)/2*W,y:(1-_p.y)/2*H,behind:_p.z>1,in:Math.abs(_p.x)<=1&&Math.abs(_p.y)<=1&&_p.z<1&&_p.z>-1};}
function outlineText(s,x,y,col,lw){ctx.lineWidth=lw||5;ctx.strokeStyle='rgba(0,0,0,0.85)';ctx.lineJoin='round';ctx.strokeText(s,x,y);ctx.fillStyle=col;ctx.fillText(s,x,y);}
let streetT=0,curStreet='';
const HUDF='"Arial Black","Segoe UI Black",Impact,system-ui,sans-serif';
function drawHUD(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  if(state==='title'){drawOverlay('NEON TORINO',['Santa Rita e dintorni: strade e palazzi veri da OpenStreetMap.'],true);return;}
  ctx.font='bold 13px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const b of bubbles){const e=b.ent;if(Math.hypot(e.x-camera.position.x,e.y-camera.position.z)>900)continue;const pr=project(e.x,e.y,e.d?22:20);if(!pr.in)continue;
    const w=ctx.measureText(b.text).width+14,sx=pr.x,y=pr.y-14;
    ctx.globalAlpha=Math.min(1,b.t*3);ctx.fillStyle='rgba(255,255,255,0.95)';rr(ctx,sx-w/2,y-11,w,22,8);ctx.fill();ctx.beginPath();ctx.moveTo(sx-5,y+10);ctx.lineTo(sx+5,y+10);ctx.lineTo(sx,y+17);ctx.fill();ctx.fillStyle='#111';ctx.fillText(b.text,sx,y);}
  ctx.globalAlpha=1;
  let tg=null;if(mission&&mission.type!=='colpo')tg=mission.steps[mission.idx];
  if(tg){const pr=project(tg.x,tg.y,30);if(!pr.in){let dx=pr.x-W/2,dy=pr.y-H/2;if(pr.behind){dx=-dx;dy=-dy;}const a=Math.atan2(dy,dx),ex=W/2-60,ey=H/2-60;
    const s=Math.min(Math.abs(ex/(Math.cos(a)||1e-9)),Math.abs(ey/(Math.sin(a)||1e-9))),ax=W/2+Math.cos(a)*s,ay=H/2+Math.sin(a)*s;
    ctx.save();ctx.translate(ax,ay);ctx.rotate(a);ctx.fillStyle=MT[mission.type].col;ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-13);ctx.lineTo(-4,0);ctx.lineTo(-10,13);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();}}
  const rx=W-22;ctx.textAlign='right';ctx.textBaseline='alphabetic';
  const h=hour(),hh=Math.floor(h),mm=Math.floor((h-hh)*60);
  ctx.font='bold 18px '+HUDF;outlineText(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'),rx,34,'#e8f1ff',4);
  ctx.font='bold 30px '+HUDF;ctx.shadowColor='#ff2e88';ctx.shadowBlur=12;outlineText('€ '+money.toLocaleString('it-IT'),rx,72,'#ffe3f1');ctx.shadowBlur=0;
  {const segW=22,gap=5,x0=rx-5*segW-4*gap,y0=86,blink=wanted.level>0&&!wanted.seen&&Math.floor(gtime*3)%2===0,fl=wanted.flash>0&&Math.floor(gtime*10)%2===0;
    ctx.font='bold 11px system-ui,sans-serif';ctx.textAlign='right';outlineText('CALORE',x0-8,y0+11,'#cbd5e1',3);
    for(let i=0;i<5;i++){const x=x0+i*(segW+gap),on=i<wanted.level;ctx.fillStyle='rgba(0,0,0,0.5)';rr(ctx,x-2,y0-2,segW+4,16,4);ctx.fill();
      if(on&&!blink)ctx.fillStyle=fl?'#ffffff':(Math.floor(gtime*6+i)%2?'#ff2d3c':'#2d7bff');else ctx.fillStyle=on?'rgba(255,255,255,0.25)':'rgba(255,255,255,0.08)';rr(ctx,x,y0,segW,12,3);ctx.fill();}}
  ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='bold 13px system-ui,sans-serif';outlineText('GETTONI '+tokens.filter(t=>t.got).length+'/'+tokens.length,rx,124,'#ffd23f',3);
  if(mission&&mission.type!=='colpo'){const t=Math.max(0,mission.time),s=Math.floor(t)%60,m=Math.floor(t/60);ctx.textAlign='center';ctx.font='bold 34px '+HUDF;outlineText(m+':'+String(s).padStart(2,'0'),W/2,48,t<10&&Math.floor(gtime*4)%2?'#ff4d4d':'#ffffff');}
  ctx.textAlign='center';ctx.textBaseline='middle';
  let label=null,col='#fff';
  if(mission){label=mission.type==='colpo'?(wanted.level>0?'Semina la polizia! (resta fuori dalla loro vista)':'Fatto!'):mission.steps[mission.idx].label;col=MT[mission.type].col;}
  else if(introT<30)label='Raggiungi un fascio di luce missione (C · R · T · €) — li vedi sulla minimappa';
  if(state==='play'){if(!(streetT>gtime)){streetT=gtime+0.3;const ne=nearestEdge(player.x,player.y,90);curStreet=ne&&ne.e.name?ne.e.name:'';}
    if(curStreet){ctx.font='italic bold 19px '+HUDF;outlineText(curStreet,W/2,label?H-80:H-44,'#fff7e0',4);}}
  if(label){ctx.font='bold 16px system-ui,sans-serif';const w=ctx.measureText(label).width+36;ctx.fillStyle='rgba(8,10,20,0.72)';rr(ctx,W/2-w/2,H-58,w,34,17);ctx.fill();ctx.fillStyle=col;ctx.fillText(label,W/2,H-41);}
  if(!player.car&&bustT<=0){let best=null,bd=50;for(const c of cars){if(c.wreck)continue;const d=Math.hypot(c.x-player.x,c.y-player.y);if(d<bd){bd=d;best=c;}}
    if(best){const t=best.type==='polizia'?'[E] Ruba l\'auto della polizia':(best.driver==='npc'?'[E] Ruba l\'auto':'[E] Sali');const pr=project(best.x,best.y,24);
      if(pr.in){ctx.font='bold 13px system-ui,sans-serif';const w=ctx.measureText(t).width+16;ctx.fillStyle='rgba(8,10,20,0.75)';rr(ctx,pr.x-w/2,pr.y-30,w,22,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(t,pr.x,pr.y-19);}}}
  if(player.car){const c=player.car,kmh=Math.round(Math.hypot(c.vx,c.vy)*0.38);ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='bold 40px '+HUDF;outlineText(String(kmh),W-70,H-34,'#ffffff');
    ctx.font='bold 14px system-ui,sans-serif';outlineText('km/h',W-22,H-36,'#cbd5e1',3);outlineText(c.d.name,W-22,H-84,'#e2e8f0',3);
    const hp=c.hp/c.d.hp;ctx.fillStyle='rgba(0,0,0,0.55)';rr(ctx,W-142,H-24,120,8,4);ctx.fill();ctx.fillStyle=hp>0.5?'#3ae374':hp>0.25?'#ffd32a':'#ff4d4d';rr(ctx,W-142,H-24,120*Math.max(0,hp),8,4);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.55)';rr(ctx,W-142,H-13,120,6,3);ctx.fill();ctx.fillStyle=player.boosting?'#ffffff':'#38bdf8';rr(ctx,W-142,H-13,120*c.nitro,6,3);ctx.fill();
    ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='right';outlineText(radioStation?('♪ '+RADIO[radioStation].name):'radio spenta',W-22,H-104,'#c4b5fd',3);}
  {const R=Math.round(clamp(Math.min(W,H)*0.13,58,92)),mx=20+R,my=H-20-R,sc=0.045,k=sc/MS,cx=player.x,cy=player.y,rot=camMode===0?-camYaw-Math.PI/2:0;
    ctx.save();ctx.beginPath();ctx.arc(mx,my,R,0,TAU);ctx.fillStyle='#123b5c';ctx.fill();ctx.clip();
    ctx.translate(mx,my);ctx.rotate(rot);
    ctx.drawImage(miniCv,-cx*sc,-cy*sc,miniCv.width*k,miniCv.height*k);
    const blip=(wx,wy,colr,sz,txt)=>{let dx=(wx-cx)*sc,dy=(wy-cy)*sc;const d=Math.hypot(dx,dy);if(d>R-7){dx*=(R-7)/d;dy*=(R-7)/d;}
      ctx.fillStyle=colr;ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(dx,dy,sz,0,TAU);ctx.fill();ctx.stroke();
      if(txt){ctx.save();ctx.translate(dx,dy);ctx.rotate(-rot);ctx.fillStyle='#111';ctx.font='bold 8px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,0,0.5);ctx.restore();}};
    const gp=gpsTarget();if(gp){const pts=[[cx,cy]].concat(roadPath(cx,cy,gp.x,gp.y));ctx.strokeStyle=gp.col;ctx.lineWidth=3.5;ctx.lineJoin='round';ctx.lineCap='round';ctx.globalAlpha=0.85;ctx.beginPath();pts.forEach((q,i)=>{const X=(q[0]-cx)*sc,Y=(q[1]-cy)*sc;if(i)ctx.lineTo(X,Y);else ctx.moveTo(X,Y);});ctx.stroke();ctx.globalAlpha=1;}
    for(const t of tokens)if(!t.got&&Math.hypot(t.x-cx,t.y-cy)<260)blip(t.x,t.y,'#ffd23f',2.6);
    blip(GARAGE.x,GARAGE.y,'#38bdf8',6,'G');
    if(!mission)for(const o of offers)blip(o.x,o.y,MT[o.type].col,6,MT[o.type].ic);
    if(mission&&mission.type!=='colpo'){const s=mission.steps[mission.idx];blip(s.x,s.y,MT[mission.type].col,5+Math.sin(gtime*6)*1.5);}
    const on=Math.floor(gtime*6)%2===0;for(const c of cars)if(c.driver==='cop')blip(c.x,c.y,on?'#ff2d3c':'#2d7bff',3.2);if(heli)blip(heli.x,heli.y,'#e2e8f0',5,'H');
    ctx.save();ctx.rotate(player.a);ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-5.5);ctx.lineTo(-2,0);ctx.lineTo(-5,5.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.restore();ctx.strokeStyle='rgba(255,255,255,0.85)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(mx,my,R,0,TAU);ctx.stroke();
    const na=rot-Math.PI/2;ctx.font='bold 11px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';outlineText('N',mx+Math.cos(na)*(R-10),my+Math.sin(na)*(R-10),'#fff',3);}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 15px system-ui,sans-serif';
  toasts.forEach((t,i)=>{const y=(mission&&mission.type!=='colpo'?88:40)+i*32,w=ctx.measureText(t.s).width+30;ctx.globalAlpha=Math.min(1,t.t*2.5);ctx.fillStyle='rgba(8,10,20,0.78)';rr(ctx,W/2-w/2,y-14,w,28,14);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(t.s,W/2,y);});
  ctx.globalAlpha=1;
  if(big){const a=Math.min(1,big.t/0.5,(big.max-big.t)/0.25+0.2);ctx.globalAlpha=clamp(a,0,1);const fs=Math.round(clamp(W/14,30,64));
    ctx.font='bold '+fs+'px '+HUDF;ctx.shadowColor=big.col;ctx.shadowBlur=18;outlineText(big.title,W/2,H*0.3,big.col,7);ctx.shadowBlur=0;
    if(big.sub){ctx.font='bold '+Math.round(fs*0.32)+'px system-ui,sans-serif';outlineText(big.sub,W/2,H*0.3+fs*0.75,'#ffffff',4);}ctx.globalAlpha=1;}
  if(bustT>0){ctx.fillStyle=`rgba(20,40,110,${0.25*Math.min(1,(3.2-bustT)*2)})`;ctx.fillRect(0,0,W,H);}
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='12px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.55)';ctx.fillText('[C] telecamera: '+(camMode===0?'inseguimento':'dall\'alto')+'    [M] mappa    [R] radio    [V] audio '+(audioOn?'sì':'no')+'    [Q] grafica '+(quality?'alta':'bassa'),14,20);ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px system-ui,sans-serif';ctx.fillText('Mappa © OpenStreetMap contributors',14,36);
  if(state==='pause')drawOverlay('PAUSA',['Missioni completate: '+save.done+'   ·   Gettoni: '+tokens.filter(t=>t.got).length+'/'+tokens.length],true);
  if(state==='map')drawBigMap();
  if(state==='garage')drawGarage();
}
const CONTROLS=[['W / S','avanti · indietro (o frena)'],['A / D','sterza · gira'],['Spazio','freno a mano (derapate!)'],['Shift','nitro in auto · corri a piedi'],['E oppure F','sali · scendi · ruba un\'auto'],['M','mappa con GPS'],['R','cambia stazione radio'],['C','cambia telecamera'],['H · V · Q','clacson · audio · grafica'],['P / Esc','pausa']];
function drawOverlay(title,lines,showControls){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(10,6,30,0.72)');g.addColorStop(1,'rgba(30,6,40,0.82)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const fs=Math.round(clamp(W/9,40,104));let y=H*0.2;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic bold '+fs+'px '+HUDF;
  const tg=ctx.createLinearGradient(W/2-fs*3,0,W/2+fs*3,0);tg.addColorStop(0,'#ff2e88');tg.addColorStop(0.5,'#ffd1f0');tg.addColorStop(1,'#00e5ff');
  ctx.shadowColor='#ff2e88';ctx.shadowBlur=30;ctx.fillStyle=tg;ctx.fillText(title,W/2,y);ctx.shadowBlur=0;
  y+=fs*0.72;ctx.font='bold '+Math.round(fs*0.2)+'px system-ui,sans-serif';
  for(const l of lines){ctx.fillStyle='#e9d5ff';ctx.fillText(l,W/2,y);y+=fs*0.3;}
  if(showControls){y+=10;const bw=Math.min(480,W-40),bh=CONTROLS.length*25+22;ctx.fillStyle='rgba(255,255,255,0.08)';rr(ctx,W/2-bw/2,y,bw,bh,12);ctx.fill();
    CONTROLS.forEach(([k,v],i)=>{const yy=y+22+i*25;ctx.textAlign='right';ctx.fillStyle='#00e5ff';ctx.font='bold 15px system-ui,sans-serif';ctx.fillText(k,W/2-8,yy);ctx.textAlign='left';ctx.fillStyle='#f1f5f9';ctx.font='15px system-ui,sans-serif';ctx.fillText(v,W/2+8,yy);});
    y+=bh+28;}
  ctx.textAlign='center';ctx.font='bold 18px system-ui,sans-serif';ctx.globalAlpha=0.6+0.4*Math.sin(gtime*4);ctx.fillStyle='#ffffff';
  ctx.fillText(state==='title'?'Clicca o premi INVIO per giocare':'Clicca o premi P per riprendere',W/2,Math.min(H-30,y));ctx.globalAlpha=1;ctx.font='12px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fillText('Dati mappa © OpenStreetMap contributors (ODbL)',W/2,H-12);
}

// ---------------- rampe e salti ----------------
const ramps=[];
{const cand=areasD.filter(a=>a.t==='g').map(a=>({a,ar:polyArea(a.outer)})).sort((p,q)=>q.ar-p.ar);
  for(const {a,ar} of cand){if(ramps.length>=6||ar<50000)break;let cx=0,cy=0;for(const p of a.outer){cx+=p[0];cy+=p[1];}cx/=a.outer.length;cy/=a.outer.length;
    if(tileAtPx(cx,cy)!==PARK)continue;let best=0,ang=0;for(let i=0;i<a.outer.length;i++){const p=a.outer[i],q=a.outer[(i+1)%a.outer.length],L=Math.hypot(q[0]-p[0],q[1]-p[1]);if(L>best){best=L;ang=Math.atan2(q[1]-p[1],q[0]-p[0]);}}
    ramps.push({x:cx,y:cy,a:ang,len:72,w:46,h:24});}}
const rampTex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='#ffd23f';g.fillRect(0,0,64,64);g.fillStyle='#1b1e24';
  for(let i=-64;i<64;i+=16){g.beginPath();g.moveTo(i,0);g.lineTo(i+8,0);g.lineTo(i+72,64);g.lineTo(i+64,64);g.closePath();g.fill();}return canvasTex(c,true);})();
rampTex.repeat.set(3,2);
const rampM=new THREE.MeshStandardMaterial({map:rampTex,roughness:0.6});
function wedgeGeo(L,Wd,Hh){const g=new THREE.BoxGeometry(L,Hh,Wd).translate(0,Hh/2,0);const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getX(i)<0&&p.getY(i)>0.01)p.setY(i,0.01);g.computeVertexNormals();return g;}
for(const r of ramps){const m=new THREE.Mesh(wedgeGeo(r.len,r.w,r.h),rampM);m.position.set(r.x,0,r.y);m.rotation.y=-r.a;m.castShadow=true;m.receiveShadow=true;scene.add(m);}
{const g=miniCv.getContext('2d');g.fillStyle='#ff9f43';for(const r of ramps){g.save();g.translate(r.x*MS,r.y*MS);g.rotate(r.a);g.fillRect(-r.len*MS/2,-r.w*MS/2,r.len*MS,r.w*MS);g.restore();}}
function rampAt(c){for(const r of ramps){const dx=c.x-r.x,dy=c.y-r.y;if(dx>60||dx<-60||dy>60||dy<-60)continue;
  const ca=Math.cos(r.a),sa=Math.sin(r.a),al=dx*ca+dy*sa,lat=-dx*sa+dy*ca;if(Math.abs(lat)>r.w/2+4||al<-r.len/2||al>r.len/2)continue;
  const vf=c.vx*ca+c.vy*sa;if(vf<40)continue;return{h:(al+r.len/2)/r.len*r.h,r,vf};}return null;}
function landed(c,imp){
  if(imp>300)damage(c,(imp-300)*0.05);
  if(c===player.car){shake=Math.max(shake,Math.min(10,imp/50));sfx.land(imp);
    if(c.air>0.55){const r=Math.round(c.air*150/10)*10;money+=r;saveMoney();bigMsg('SALTO!',c.air.toFixed(1).replace('.',',')+' s in volo   +€'+r,'#00e5ff',2.2);sfx.stunt();}}
  c.air=0;
}

// ---------------- gettoni neon ----------------
let gseed=4242;const grnd=()=>{gseed=(Math.imul(gseed,1664525)+1013904223)>>>0;return gseed/4294967296;};
const tokens=[];
for(let tries=0;tries<20000&&tokens.length<25;tries++){const tx=Math.floor(grnd()*GW),ty=Math.floor(grnd()*GH),t=tileAt(tx,ty);
  if(!(t===PARK||t===OPEN))continue;if(t===OPEN){const ne=nearestEdge((tx+0.5)*T,(ty+0.5)*T,60);if(!ne||ne.d<ne.e.w/2+2||ne.d>ne.e.w/2+16)continue;}
  const x=(tx+0.5)*T,y=(ty+0.5)*T;if(Math.hypot(x-SPAWN.x,y-SPAWN.y)<250)continue;if(tokens.some(o=>Math.hypot(o.x-x,o.y-y)<900))continue;
  tokens.push({id:tokens.length,x,y,got:save.tokens.includes(tokens.length),mesh:null,coin:null});}
const coinGeo=new THREE.CylinderGeometry(7,7,1.8,24).rotateX(Math.PI/2);
const coinM=new THREE.MeshStandardMaterial({color:'#ffd23f',emissive:'#ff2e88',emissiveIntensity:0.55,metalness:0.6,roughness:0.3});
const coinGlowM=new THREE.SpriteMaterial({map:puffTex,color:'#ff7ac8',blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.7});
for(const t of tokens){if(t.got)continue;const g=new THREE.Group();const m=new THREE.Mesh(coinGeo,coinM);m.castShadow=true;g.add(m);const s=new THREE.Sprite(coinGlowM);s.scale.set(34,34,1);g.add(s);g.position.set(t.x,12,t.y);scene.add(g);t.mesh=g;t.coin=m;}
function updateTokens(){for(const t of tokens){if(t.got)continue;if(Math.hypot(t.x-player.x,t.y-player.y)<26&&(!player.car||player.car.z<20)){
  t.got=true;if(t.mesh)scene.remove(t.mesh);save.tokens.push(t.id);money+=50;const n=tokens.filter(o=>o.got).length;sfx.coin();
  if(n===tokens.length){money+=5000;bigMsg('TUTTI I GETTONI!','Hai esplorato tutta la città: +€5.000','#ffd23f',4);sfx.win();}else toast('Gettone neon '+n+'/'+tokens.length+'  (+€50)',2);
  saveMoney();}}}

// ---------------- garage ----------------
const GARAGE={x:gs0[0],y:gs0[1],a:gs0[2]};let garageLatch=true,garageSel=0;
const SHOP=[{id:'repair',label:'Ripara l\'auto',desc:'Torna come nuova',price:100},{id:'fulmine',label:'Fulmine',desc:'Supercar: la più veloce della città',price:1500},{id:'corazzato',label:'Corazzato',desc:'Blindato pesante: sfonda le volanti',price:2500},{id:'sportiva',label:'Sportiva Neon',desc:'La tua prima auto, sempre gratis',price:0}];
function labelTex(text,col){const c=document.createElement('canvas');const F='italic bold 40px "Arial Black",Impact,sans-serif';{const m=c.getContext('2d');m.font=F;c.width=Math.max(256,Math.ceil(m.measureText(text).width)+48);}c.height=64;const g=c.getContext('2d');g.font=F;g.textAlign='center';g.textBaseline='middle';g.shadowColor=col;g.shadowBlur=14;g.fillStyle='#ffffff';g.fillText(text,c.width/2,34);g.shadowBlur=0;g.lineWidth=2;g.strokeStyle=col;g.strokeText(text,c.width/2,34);return canvasTex(c);}
let garageMesh,garageIcon;
{const g=new THREE.Group();const beam=new THREE.Mesh(new THREE.CylinderGeometry(16,16,140,24,1,true),beamMat('#38bdf8',0.35));beam.position.y=70;g.add(beam);
  const ring=new THREE.Mesh(ringGeo,beamMat('#38bdf8',0.8));ring.position.y=1;g.add(ring);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:iconTex('G','#38bdf8'),depthWrite:false,fog:false}));sp.scale.set(26,26,1);sp.position.y=36;g.add(sp);
  const lb=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTex('GARAGE','#38bdf8'),depthWrite:false,fog:false}));lb.scale.set(72,18,1);lb.position.y=62;g.add(lb);
  g.position.set(GARAGE.x,0,GARAGE.y);scene.add(g);garageMesh=g;garageIcon=sp;}
function updateGarage(){const d=Math.hypot(player.x-GARAGE.x,player.y-GARAGE.y);if(d>60)garageLatch=false;
  if(d<30&&!garageLatch){garageLatch=true;if(wanted.level>0){toast('Il garage non apre con la polizia alle calcagna!');return;}state='garage';sfx.ui();}}
function garageKey(k){
  if(k==='Escape'||k==='KeyE'||k==='KeyF'){state='play';return;}
  if(k==='ArrowUp'||k==='KeyW'){garageSel=(garageSel+SHOP.length-1)%SHOP.length;sfx.ui();return;}
  if(k==='ArrowDown'||k==='KeyS'){garageSel=(garageSel+1)%SHOP.length;sfx.ui();return;}
  const map={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3};
  let i=map[k];if(k==='Enter'||k==='Space')i=garageSel;if(i===undefined)return;garageSel=i;const it=SHOP[i];
  if(it.id==='repair'){const c=player.car;if(!c){toast('Entra nel garage con l\'auto da riparare');return;}if(c.hp>=c.d.hp){toast('L\'auto è già a posto');return;}
    if(money<it.price){toast('Non hai abbastanza soldi');sfx.fail();return;}money-=it.price;c.hp=c.d.hp;saveMoney();sfx.coin();toast('Auto riparata come nuova!');return;}
  const owned=it.price===0||save.owned[it.id];
  if(!owned){if(money<it.price){toast('Ti servono €'+it.price.toLocaleString('it-IT'));sfx.fail();return;}money-=it.price;save.owned[it.id]=true;saveMoney();sfx.win();toast(CARS[it.id].name+' acquistata!');}
  deliverCar(it.id);state='play';
}
function deliverCar(type){
  const x=GARAGE.x-Math.cos(GARAGE.a)*70,y=GARAGE.y-Math.sin(GARAGE.a)*70;
  for(let i=cars.length-1;i>=0;i--){const c=cars[i];if(c!==player.car&&!c.driver&&Math.hypot(c.x-x,c.y-y)<50)cars.splice(i,1);}
  if(player.car)exitCar(true);
  const c=makeCar(type,x,y,GARAGE.a);if(type==='sportiva')c.col='#ff2e88';cars.push(c);
  player.x=x;player.y=y;c.driver='player';player.car=c;c.keep=true;
  if(player.lastCar&&player.lastCar!==c)player.lastCar.keep=false;player.lastCar=c;
  updateCamera(0,true);toast('Ecco la tua '+c.d.name+'!',2);
}
function drawGarage(){
  ctx.fillStyle='rgba(5,8,20,0.7)';ctx.fillRect(0,0,W,H);
  const pw=Math.min(600,W-30),ph=380,px=(W-pw)/2,py=(H-ph)/2;
  ctx.fillStyle='rgba(15,18,40,0.96)';rr(ctx,px,py,pw,ph,18);ctx.fill();ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.stroke();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic bold 34px '+HUDF;ctx.shadowColor='#38bdf8';ctx.shadowBlur=16;ctx.fillStyle='#e0f2fe';ctx.fillText('GARAGE NEON',W/2,py+42);ctx.shadowBlur=0;
  ctx.font='bold 15px system-ui,sans-serif';ctx.fillStyle='#ffe3f1';ctx.fillText('Hai € '+money.toLocaleString('it-IT'),W/2,py+78);
  SHOP.forEach((it,i)=>{const y=py+104+i*58,sel=i===garageSel;ctx.fillStyle=sel?'rgba(56,189,248,0.22)':'rgba(255,255,255,0.05)';rr(ctx,px+20,y,pw-40,50,10);ctx.fill();if(sel){ctx.strokeStyle='#38bdf8';ctx.lineWidth=2;ctx.stroke();}
    ctx.textAlign='left';ctx.fillStyle='#38bdf8';ctx.font='bold 17px system-ui,sans-serif';ctx.fillText(String(i+1),px+38,y+25);
    ctx.fillStyle='#f8fafc';ctx.font='bold 16px system-ui,sans-serif';ctx.fillText(it.label,px+64,y+18);ctx.font='13px system-ui,sans-serif';ctx.fillStyle='#94a3b8';ctx.fillText(it.desc,px+64,y+36);
    let right;if(it.id==='repair')right=player.car?(player.car.hp>=player.car.d.hp?'già a posto':'€ '+it.price):'serve un\'auto';else right=(it.price===0||save.owned[it.id])?'RITIRA':'€ '+it.price.toLocaleString('it-IT');
    ctx.textAlign='right';ctx.font='bold 16px system-ui,sans-serif';ctx.fillStyle=right==='RITIRA'?'#3ae374':(right.startsWith('€')&&it.price>money?'#ff6b81':'#ffd23f');ctx.fillText(right,px+pw-38,y+25);});
  ctx.textAlign='center';ctx.font='13px system-ui,sans-serif';ctx.fillStyle='#cbd5e1';ctx.fillText('Tasti 1–4 oppure ↑ ↓ e Invio   ·   Esc per uscire',W/2,py+ph-20);
}

// ---------------- elicottero della polizia ----------------
let heli=null;
const UP=new THREE.Vector3(0,1,0),hv1=new THREE.Vector3(),hv2=new THREE.Vector3();
const spotM=new THREE.MeshBasicMaterial({map:puffTex,color:'#fff6cc',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.6});
const beamConeM=new THREE.MeshBasicMaterial({color:'#fff6cc',transparent:true,opacity:0.08,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
const heliGeo={body:boxAt(34,13,16,0,0,0),nose:boxAt(12,9,14,16,0.5,0),belly:boxAt(34.4,3,16.4,0,-4,0),boom:boxAt(34,4,4,-33,2,0),fin:boxAt(7,11,1.5,-49,7,0),
  skid:mergeGeo([boxAt(36,1.4,1.4,0,-11,-8),boxAt(36,1.4,1.4,0,-11,8),boxAt(1.2,5,1.2,8,-8.5,-8),boxAt(1.2,5,1.2,-8,-8.5,-8),boxAt(1.2,5,1.2,8,-8.5,8),boxAt(1.2,5,1.2,-8,-8.5,8)]),
  rotor:mergeGeo([boxAt(130,0.6,5,0,0,0),boxAt(5,0.6,130,0,0,0)]),tail:boxAt(1,16,2.4,0,0,0)};
function spawnHeli(){
  heli={x:player.x+800,y:player.y-600,vx:0,vy:0,alt:270,sx:player.x,sy:player.y,leaving:false,t:0,yaw:0,sees:false};
  const g=new THREE.Group(),navy=sm('#1e2a4a'),white=sm('#f5f6fa'),dark=sm('#222222');
  const add=(geo,mat,cast)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=!!cast;g.add(m);return m;};
  add(heliGeo.body,navy,true);add(heliGeo.nose,carGlassM);add(heliGeo.belly,white);add(heliGeo.boom,navy,true);add(heliGeo.fin,navy);add(heliGeo.skid,dark);
  const rotor=add(heliGeo.rotor,dark,true);rotor.position.y=9;const tail=add(heliGeo.tail,dark);tail.position.set(-49,8,2.5);
  const bl=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,6),antM);bl.position.set(-52,12,0);g.add(bl);scene.add(g);
  const spot=new THREE.Mesh(new THREE.PlaneGeometry(190,190).rotateX(-Math.PI/2),spotM);spot.renderOrder=3;scene.add(spot);
  const cone=new THREE.Mesh(new THREE.CylinderGeometry(2.5,70,1,24,1,true),beamConeM);scene.add(cone);
  heli.g=g;heli.rotor=rotor;heli.tailR=tail;heli.spot=spot;heli.cone=cone;
  toast('Elicottero della polizia in arrivo!');
}
function removeHeli(){scene.remove(heli.g);scene.remove(heli.spot);scene.remove(heli.cone);heli=null;}
function updateHeli(dt){
  if(state!=='play')return;
  if(!heli&&wanted.level>=3&&bustT<=0)spawnHeli();
  if(!heli)return;
  heli.t+=dt;
  if((wanted.level<3||bustT>0)&&!heli.leaving){heli.leaving=true;heli.leaveT=0;const dx=heli.x-player.x,dy=heli.y-player.y,d=Math.hypot(dx,dy)||1;heli.ex=heli.x+dx/d*3000;heli.ey=heli.y+dy/d*3000;}
  let tx,ty;
  if(heli.leaving){heli.leaveT+=dt;tx=heli.ex;ty=heli.ey;if(heli.leaveT>9){removeHeli();return;}}
  else if(wanted.lost<2){tx=player.x+(player.car?player.car.vx*0.8:0);ty=player.y+(player.car?player.car.vy*0.8:0);}
  else{tx=wanted.lastX+Math.cos(heli.t*0.5)*200;ty=wanted.lastY+Math.sin(heli.t*0.5)*200;}
  const dx=tx-heli.x,dy=ty-heli.y,d=Math.hypot(dx,dy)||1,want=Math.min(heli.leaving?340:300,d*1.1);
  heli.vx+=(dx/d*want-heli.vx)*Math.min(1,dt*1.2);heli.vy+=(dy/d*want-heli.vy)*Math.min(1,dt*1.2);heli.x+=heli.vx*dt;heli.y+=heli.vy*dt;
  const pd=Math.hypot(player.x-heli.x,player.y-heli.y);
  let ax=heli.x+Math.cos(heli.t*0.9)*90,ay=heli.y+Math.sin(heli.t*1.3)*90;if(!heli.leaving&&pd<420){ax=player.x;ay=player.y;}
  heli.sx+=(ax-heli.sx)*Math.min(1,dt*1.8);heli.sy+=(ay-heli.sy)*Math.min(1,dt*1.8);
  heli.sees=!heli.leaving&&Math.hypot(player.x-heli.sx,player.y-heli.sy)<80;
}
function syncExtras(dt){
  for(const t of tokens)if(t.mesh&&!t.got){t.coin.rotation.y=gtime*2.6+t.id;t.mesh.position.y=12+Math.sin(gtime*2+t.id)*2.5;}
  garageMesh.visible=state!=='title';garageIcon.position.y=36+Math.sin(gtime*3)*3;
  if(heli){const h=heli,sp=Math.hypot(h.vx,h.vy);if(sp>20)h.yaw+=angDiff(Math.atan2(h.vy,h.vx),h.yaw)*Math.min(1,dt*2);
    h.g.position.set(h.x,h.alt+Math.sin(h.t*1.5)*4,h.y);h.g.rotation.set(0,-h.yaw,-Math.min(0.28,sp/1100));h.rotor.rotation.y+=dt*28;h.tailR.rotation.z+=dt*40;
    h.spot.position.set(h.sx,1.3,h.sy);hv1.set(h.x,h.alt-8,h.y);hv2.set(h.sx,0,h.sy);h.cone.position.copy(hv1).add(hv2).multiplyScalar(0.5);
    const dir=hv1.sub(hv2),len=dir.length();h.cone.scale.set(1,len,1);h.cone.quaternion.setFromUnitVectors(UP,dir.normalize());
    const dk=darkness(hour());spotM.opacity=0.3+dk*0.5;beamConeM.opacity=0.03+dk*0.1;}
}

// ---------------- GPS e mappa grande ----------------
function gpsTarget(){if(mission&&mission.type!=='colpo'){const s=mission.steps[mission.idx];return{x:s.x,y:s.y,col:MT[mission.type].col};}return null;}
function clearPax(){if(mission&&mission.pax){const i=peds.indexOf(mission.pax);if(i>=0)peds.splice(i,1);mission.pax=null;}}
function drawBigMap(){
  ctx.fillStyle='rgba(5,8,20,0.9)';ctx.fillRect(0,0,W,H);
  const S=Math.min(W,H-90)*0.92,ox=(W-S)/2,oy=(H-S)/2+12,k=S/WORLD,Pp=(x,y)=>[ox+x*k,oy+y*k];
  ctx.drawImage(miniCv,ox,oy,WX*k,WY*k);ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=2;ctx.strokeRect(ox,oy,WX*k,WY*k);
  const icon=(x,y,col,r,txt)=>{const [X,Y]=Pp(x,y);ctx.fillStyle=col;ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.arc(X,Y,r,0,TAU);ctx.fill();ctx.stroke();if(txt){ctx.fillStyle='#111';ctx.font='bold '+Math.round(r*1.2)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,X,Y+0.5);}};
  const gp=gpsTarget();if(gp){const pts=[[player.x,player.y]].concat(roadPath(player.x,player.y,gp.x,gp.y));ctx.strokeStyle=gp.col;ctx.lineWidth=4;ctx.lineJoin='round';ctx.beginPath();pts.forEach((q,i)=>{const [X,Y]=Pp(q[0],q[1]);if(i)ctx.lineTo(X,Y);else ctx.moveTo(X,Y);});ctx.stroke();icon(gp.x,gp.y,gp.col,8);}
  icon(GARAGE.x,GARAGE.y,'#38bdf8',10,'G');
  if(!mission)for(const o of offers)icon(o.x,o.y,MT[o.type].col,10,MT[o.type].ic);
  for(const c of cars)if(c.driver==='cop')icon(c.x,c.y,Math.floor(gtime*6)%2?'#ff2d3c':'#2d7bff',4);
  if(heli)icon(heli.x,heli.y,'#e2e8f0',7,'H');
  {const [X,Y]=Pp(player.x,player.y);ctx.save();ctx.translate(X,Y);ctx.rotate(player.a);ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-8);ctx.lineTo(-3,0);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='italic bold 26px '+HUDF;ctx.fillStyle='#ffd1f0';ctx.fillText('MAPPA: SANTA RITA, TORINO',W/2,Math.max(22,oy-22));
  ctx.font='13px system-ui,sans-serif';ctx.fillStyle='#cbd5e1';ctx.fillText('C consegna · R corsa · T taxi · € colpo · G garage · arancione = rampe    —    M per chiudere',W/2,Math.min(H-14,oy+S+20));
}

// ---------------- qualità grafica ----------------
let quality=1,perfAcc=0,perfN=0,perfDone=false;
function setQuality(q){quality=q;renderer.setPixelRatio(q?Math.min(window.devicePixelRatio||1,1.5):1);renderer.setSize(W,H,false);
  renderer.shadowMap.enabled=!!q;sun.castShadow=!!q;scene.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)m.needsUpdate=true;});}
function perfCheck(raw){if(perfDone||state!=='play'||raw>0.5)return;perfAcc+=raw;perfN++;
  if(perfAcc>5){perfDone=true;const fps=perfN/perfAcc;if(fps<40&&quality===1){setQuality(0);toast('Grafica ridotta per andare più fluido (Q per cambiarla)',4);}}}

// ---------------- audio ----------------
let AC=null,master=null,noiseBuf=null,eng=null,skidA=null,sirenA=null,heliA=null,radioBus=null,audioOn=true;
function initAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return;}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;return;}
  master=AC.createGain();master.gain.value=audioOn?0.8:0;const comp=AC.createDynamicsCompressor();master.connect(comp);comp.connect(AC.destination);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  {const o1=AC.createOscillator(),o2=AC.createOscillator(),f=AC.createBiquadFilter(),g=AC.createGain();o1.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=700;g.gain.value=0;
    o1.connect(f);o2.connect(f);f.connect(g);g.connect(master);o1.start();o2.start();eng={o1,o2,f,g};}
  {const n=AC.createBufferSource(),bp=AC.createBiquadFilter(),g=AC.createGain();n.buffer=noiseBuf;n.loop=true;bp.type='bandpass';bp.frequency.value=1800;bp.Q.value=3;g.gain.value=0;n.connect(bp);bp.connect(g);g.connect(master);n.start();skidA={g};}
  {const o=AC.createOscillator(),g=AC.createGain();o.type='triangle';g.gain.value=0;o.connect(g);let pan=null;if(AC.createStereoPanner){pan=AC.createStereoPanner();g.connect(pan);pan.connect(master);}else g.connect(master);o.start();sirenA={o,g,pan};}
  {const n=AC.createBufferSource(),lp=AC.createBiquadFilter(),am=AC.createGain(),g=AC.createGain(),lfo=AC.createOscillator(),lg=AC.createGain();n.buffer=noiseBuf;n.loop=true;lp.type='lowpass';lp.frequency.value=380;am.gain.value=0.5;lfo.frequency.value=13;lg.gain.value=0.5;g.gain.value=0;
    lfo.connect(lg);lg.connect(am.gain);n.connect(lp);lp.connect(am);am.connect(g);g.connect(master);n.start();lfo.start();heliA={g};}
  {const n=AC.createBufferSource(),bp=AC.createBiquadFilter(),g=AC.createGain();n.buffer=noiseBuf;n.loop=true;bp.type='highpass';bp.frequency.value=1400;g.gain.value=0;n.connect(bp);bp.connect(g);g.connect(master);n.start();rainA={g};}
  radioBus=AC.createGain();radioBus.gain.value=0;radioBus.connect(master);
}
function tone(f,dur,type,vol,delay,slide){if(!AC)return;const t=AC.currentTime+(delay||0),o=AC.createOscillator(),g=AC.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(0.001,vol),t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.05);}
function noiseHit(vol,dur,freq){if(!AC)return;const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=freq;
  g.gain.setValueAtTime(Math.max(0.001,vol),t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t,Math.random());s.stop(t+dur+0.05);}
const sfx={
  crash(imp){if(!AC)return;const v=Math.min(0.5,imp/700);noiseHit(v,0.35,700);tone(70,0.3,'sine',v*0.8,0,35);},
  boom(){noiseHit(0.6,1.0,400);tone(55,0.8,'sine',0.5,0,25);},
  horn(){tone(392,0.4,'square',0.05);tone(494,0.4,'square',0.04);},
  coin(){tone(988,0.09,'square',0.05);tone(1319,0.16,'square',0.05,0.08);},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,0.25,'triangle',0.09,i*0.11));},
  fail(){[392,330,262].forEach((f,i)=>tone(f,0.3,'triangle',0.09,i*0.15));},
  heat(){tone(1200,0.08,'square',0.04);tone(1200,0.08,'square',0.04,0.13);},
  stunt(){tone(300,0.5,'sawtooth',0.05,0,1200);},
  land(imp){noiseHit(Math.min(0.35,imp/900),0.2,500);},
  nitro(){noiseHit(0.18,0.6,2500);tone(200,0.5,'sawtooth',0.04,0,600);},
  ui(){tone(660,0.06,'square',0.04);}
};
function updateAudio(dt){
  if(!AC)return;const t=AC.currentTime,live=state==='play'&&bustT<=0;
  const c=live&&player.car&&!player.car.wreck?player.car:null;
  if(c){const sp=Math.hypot(c.vx,c.vy),ratio=Math.min(1.35,sp/c.d.max)*4,gear=Math.min(4,Math.floor(ratio)),rpm=gear<4?ratio-gear:1+(ratio-4)*0.5;
    const base=(c.type==='furgone'||c.type==='corazzato'||c.type==='autobus')?36:c.type==='utilitaria'?58:c.type==='fulmine'?62:50,f=base+(0.25+rpm*0.75)*120+(player.boosting?40:0),thr=keys.KeyW||keys.ArrowUp;
    eng.o1.frequency.setTargetAtTime(f,t,0.06);eng.o2.frequency.setTargetAtTime(f*0.502,t,0.06);eng.f.frequency.setTargetAtTime(thr?1600+rpm*1200:700,t,0.08);eng.g.gain.setTargetAtTime(thr?0.075:0.045,t,0.08);
    skidA.g.gain.setTargetAtTime(c.skid&&c.z<1?0.07:0,t,0.05);}
  else{eng.g.gain.setTargetAtTime(0,t,0.1);skidA.g.gain.setTargetAtTime(0,t,0.05);}
  let best=null,bd=900;if(live)for(const o of cars)if(o.siren){const d=Math.hypot(o.x-player.x,o.y-player.y);if(d<bd){bd=d;best=o;}}
  if(best){sirenA.o.frequency.setTargetAtTime(Math.floor(gtime*1.7)%2?740:988,t,0.01);sirenA.g.gain.setTargetAtTime(0.05*(1-bd/900),t,0.1);
    if(sirenA.pan){const rx=Math.cos(camYaw+Math.PI/2),ry=Math.sin(camYaw+Math.PI/2);sirenA.pan.pan.setTargetAtTime(clamp(((best.x-player.x)*rx+(best.y-player.y)*ry)/Math.max(60,bd),-1,1)*0.8,t,0.1);}}
  else sirenA.g.gain.setTargetAtTime(0,t,0.15);
  heliA.g.gain.setTargetAtTime(live&&heli?0.16*clamp(1-Math.hypot(heli.x-player.x,heli.y-player.y)/1400,0,1):0,t,0.2);
  radioBus.gain.setTargetAtTime(live&&player.car&&radioStation?0.32:0,t,0.3);
  if(rainA)rainA.g.gain.setTargetAtTime(state!=='title'?0.05*rain:0,t,0.3);
}

// ---------------- radio (musica generata) ----------------
const RADIO=[null,{name:'Radio Mole FM',bpm:104,kind:'synth'},{name:'Po Lounge',bpm:86,kind:'lounge'}];
let radioStation=1,nextNoteT=0,rStep=0;
const mf=m=>440*Math.pow(2,(m-69)/12);
const SYN=[[45,48,52],[41,45,48],[48,52,55],[43,47,50]];
const LNG=[[50,53,57,60],[55,59,62,65],[48,52,55,59],[57,61,64,67]];
function rKick(t,v){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.25);o.connect(g);g.connect(radioBus);o.start(t);o.stop(t+0.3);}
function rNoise(t,dur,vol,hp){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=hp;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(radioBus);s.start(t,Math.random()*1.5);s.stop(t+dur+0.02);}
function rNote(t,m,dur,type,vol,cut,att,det){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=mf(m);if(det)o.detune.value=det;const a=att||0.005;
  g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+Math.max(dur,a+0.02));let n=o;if(cut){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;o.connect(f);n=f;}n.connect(g);g.connect(radioBus);o.start(t);o.stop(t+Math.max(dur,a+0.02)+0.05);}
function playStep(st,s,t,s16){const bar=Math.floor(s/16)%4,b=s%16;
  if(st.kind==='synth'){const ch=SYN[bar];
    if(b%4===0)rKick(t,0.55);
    if(b===4||b===12)rNoise(t,0.18,0.22,1800);
    if(b%4===2)rNoise(t,0.05,0.07,7000);
    if(b%2===0)rNote(t,ch[0]-12+(b%4===2?12:0),s16*1.8,'sawtooth',0.1,700);
    const arp=[ch[0],ch[1],ch[2],ch[0]+12];rNote(t,arp[b%4]+24,s16*0.9,'square',0.03,2600);
    if(b===0)for(const n of ch){rNote(t,n+12,s16*16,'sawtooth',0.022,1400,0.4,7);rNote(t,n+12,s16*16,'sawtooth',0.022,1400,0.4,-7);}
  }else{const ch=LNG[bar];
    if(b%4===0)rNote(t,ch[b/4]-12,s16*3.6,'triangle',0.16,800);
    if(b===0||b===6||b===10)for(const n of ch)rNote(t+(b===6?s16*0.33:0),n+12,s16*3,'sine',0.04,3000,0.01);
    if(b%4===0)rNoise(t,0.12,0.045,6000);
    if(b===4||b===12)rNoise(t,0.2,0.06,2500);
  }}
function scheduleRadio(){if(!AC||!radioBus||radioStation===0)return;const st=RADIO[radioStation],s16=60/st.bpm/4;
  if(nextNoteT<AC.currentTime-0.1)nextNoteT=AC.currentTime+0.05;
  while(nextNoteT<AC.currentTime+0.15){playStep(st,rStep,nextNoteT,s16);nextNoteT+=s16;rStep=(rStep+1)%64;}}

let edgeWarnT=0;
function boundaryCheck(){const c=player.car||player,a=player.a;const x=c.x+Math.cos(a)*40,y=c.y+Math.sin(a)*40;if(tileAtPx(x,y)===OUT&&!(edgeWarnT>gtime)){edgeWarnT=gtime+6;toast('Confine della mappa: per ora Torino finisce qui!',2.5);}}
// ---------------- input ----------------
const keys={};
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(!e.repeat)onPress(e.code);});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;if(state==='play')state='pause';});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')state='pause';});
glc.addEventListener('pointerdown',()=>{glc.focus();initAudio();if(state==='title')startGame();else if(state==='pause'||state==='map')state='play';});
function onPress(k){
  initAudio();
  if(state==='title'){if(k==='Enter'||k==='Space')startGame();return;}
  if(state==='garage'){garageKey(k);return;}
  if(state==='map'){if(k==='KeyM'||k==='Escape')state='play';return;}
  if(k==='KeyP'||k==='Escape'){state=state==='pause'?'play':'pause';return;}
  if(k==='KeyV'){audioOn=!audioOn;if(master)master.gain.setTargetAtTime(audioOn?0.8:0,AC.currentTime,0.05);toast(audioOn?'Audio attivo':'Audio disattivato',1.2);return;}
  if(k==='KeyQ'){setQuality(1-quality);perfDone=true;toast('Grafica '+(quality?'alta (ombre attive)':'bassa (più fluida)'),1.6);return;}
  if(state!=='play')return;
  if(k==='KeyM'){state='map';return;}
  if(bustT>0)return;
  if(k==='KeyE'||k==='KeyF'){if(player.car)exitCar(false);else if(player.stun<=0)tryEnterCar();}
  if(k==='KeyH'&&player.car)honk();
  if(k==='KeyC'){camMode=1-camMode;updateCamera(0,true);}
  if(k==='KeyR'){radioStation=(radioStation+1)%RADIO.length;nextNoteT=0;toast(radioStation?'Radio: '+RADIO[radioStation].name:'Radio spenta',1.5);}
}
function startGame(){
  initAudio();state='play';introT=0;
  if(!started){started=true;
    player.x=SPAWN.x;player.y=SPAWN.y;player.a=SPAWN.a;
    let s=null;for(const dd of [45,-45,70,-70,30,95]){const x=SPAWN.x+Math.cos(SPAWN.a)*dd,y=SPAWN.y+Math.sin(SPAWN.a)*dd,t=makeCar('sportiva',x,y,SPAWN.a);if(blockedN(t,x,y,SPAWN.a)===0){s=t;break;}}
    if(!s)s=makeCar('sportiva',SPAWN.x,SPAWN.y,SPAWN.a);s.col='#ff2e88';s.keep=true;cars.push(s);
    for(let i=cars.length-2;i>=0;i--){const c=cars[i];if(Math.hypot(c.x-s.x,c.y-s.y)<70)cars.splice(i,1);}
    newOffer('consegna');newOffer('corsa');newOffer('colpo');newOffer('taxi');
    toast('Benvenuto a Santa Rita, Torino! C\'è una sportiva rosa qui accanto…',4);
    updateCamera(0,true);
  }
}

// ---------------- avvio ----------------
populate(SPAWN.x,SPAWN.y);
const ld=document.getElementById('load');if(ld)ld.remove();
let last=performance.now();
function frame(now){const raw=(now-last)/1000,dt=Math.min(0.033,raw);last=now;
  try{update(dt);syncScene(dt);updateCamera(dt,false);updateEnv();refreshChunks(dt);renderer.render(scene,camera);drawHUD();updateAudio(dt);scheduleRadio();perfCheck(raw);}catch(err){console.error(err);}
  requestAnimationFrame(frame);}
requestAnimationFrame(frame);
window.__nr={landmarks:LMX,L:DATA.L,toW,set cam(v){camOverride=v;},get cam(){return camOverride;},setHour(h){clockT=((h-17+24)%24)*15;},get rain(){return rain;},set fogT(v){fogTarget=v;fogW=v;},trams,tramRoutes,set rainT(v){rainTarget=v;rain=v;},signals,get heli(){return heli;},tokens,ramps,GARAGE,set money(v){money=v;},set clock(v){clockT=v;},get state(){return state;},player,get cars(){return cars;},get peds(){return peds;},wanted,get mission(){return mission;},get offers(){return offers;},startGame,renderer};
