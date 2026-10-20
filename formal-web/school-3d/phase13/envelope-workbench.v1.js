/* AIG 自研幾何: 2.5D reference silhouette envelope / skinned pose preview. No licensed character assets. */
(()=>{
'use strict';
const $=sel=>document.querySelector(sel);
const canvas=$('#model'),ctx=canvas.getContext('2d',{alpha:false}),file=$('#source'),status=$('#status');
const spec=JSON.parse($('#spec').textContent),W=spec.source.width,H=spec.source.height;
const head=$('#headYaw'),left=$('#leftArm'),right=$('#rightArm'),grid=$('#wire'),bones=$('#bones');
const stat=$('#stats'),reset=$('#reset'),edit=$('#edit'),save=$('#save');
let dragging=null,edited=false;
let img=null,verts=[],faces=[],request=0,verified=false;
function report(s){status.textContent=s;}
function rot(x,y,cx,cy,a){let co=Math.cos(a),si=Math.sin(a);return [cx+(x-cx)*co-(y-cy)*si,cy+(x-cx)*si+(y-cy)*co];}
function xprod(a,b,c){return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function triangles(poly){
  const pts=poly.map(p=>p.slice()),area=pts.reduce((acc,p,i)=>acc+p[0]*pts[(i+1)%pts.length][1]-pts[(i+1)%pts.length][0]*p[1],0),sgn=Math.sign(area);
  if(!sgn)throw Error('zero polygon area');let idx=pts.map((_,i)=>i),out=[];
  let guard=0;
  while(idx.length>3 && guard++<1000){let found=false;
   for(let k=0;k<idx.length;k++){
    let a=idx[(k-1+idx.length)%idx.length],b=idx[k],c=idx[(k+1)%idx.length];
    if(sgn*xprod(pts[a],pts[b],pts[c])<=1e-7)continue;
    const inside=p=>[[a,b],[b,c],[c,a]].every(([i,j])=>sgn*xprod(pts[i],pts[j],p)>1e-8);
    if(idx.some(t=>t!==a&&t!==b&&t!==c&&inside(pts[t])))continue;
    out.push([a,b,c]);idx.splice(k,1);found=true;break;
   }
   if(!found)throw Error('polygon must not self-intersect');
  }
  if(idx.length!==3)throw Error('failed mesh ear-clip');out.push(idx);return [pts,out];
}
function subdivide(pts,tri,iter){
 for(let i=0;i<iter;i++){
  const next=[],memo=new Map();
  function mid(a,b){const key=a<b?`${a}_${b}`:`${b}_${a}`;if(!memo.has(key)){
   const p=pts[a],q=pts[b];memo.set(key,pts.length);pts.push([(p[0]+q[0])/2,(p[1]+q[1])/2]);
  }return memo.get(key);}
  for(const [a,b,c] of tri){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
   next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}
  tri=next;
 }return [pts,tri];
}
function weights([x,y],region){
 if(region==='face'||region==='hair'){
  const w=Math.max(0,Math.min(.18,(y-245)/250));return [['Head',1-w],['Neck',w]];}
 if(region==='torso_uniform'){
  const w=Math.max(0,Math.min(1,(y-425)/315));return [['Chest',1-w],['Hips',w]];}
 if(region==='skirt')return [['Hips',1]];
 if(region==='left_sleeve')return [['LeftShoulder',.85],['Chest',.15]];
 if(region==='right_sleeve')return [['RightShoulder',.85],['Chest',.15]];
 throw Error('Unknown mesh region');
}
function build(){
 verts=[];faces=[];
 for(const region of spec.regions){
  const [pts,tris]=subdivide(...triangles(region.polygon),2),off=verts.length;
  for(const p of pts)verts.push({p,weights:weights(p,region.id),region:region.id});
  for(const t of tris)faces.push(t.map(v=>v+off));
 }
 stat.textContent=`${verts.length.toLocaleString()} 頂點 · ${faces.length.toLocaleString()} 正面三角形 · 7 關節`; 
}
function pose(v){
 const [x,y]=v.p,hw=Number(head.value)*Math.PI/180,lw=Number(left.value)*Math.PI/180,rw=Number(right.value)*Math.PI/180;
 let X=0,Y=0;
 for(const [joint,weight] of v.weights){
   let xx=x,yy=y;
   if(joint==='Head'){
     const cx=644.5,cz=0.018;xx=cx+(x-cx)*Math.cos(hw)+(cz*360)*Math.sin(hw);
   }else if(joint==='LeftShoulder') [xx,yy]=rot(x,y,450,354,lw);
   else if(joint==='RightShoulder')[xx,yy]=rot(x,y,803,375,rw);
   X+=xx*weight;Y+=yy*weight;
 }
 return [X,Y];
}
function drawTri(s,d){
 const [p0,p1,p2]=s,[q0,q1,q2]=d;
 const ux=p1[0]-p0[0],uy=p1[1]-p0[1],vx=p2[0]-p0[0],vy=p2[1]-p0[1],det=ux*vy-uy*vx;
 if(Math.abs(det)<1e-7)return;
 const dx=q1[0]-q0[0],dy=q1[1]-q0[1],ex=q2[0]-q0[0],ey=q2[1]-q0[1];
 const a=(dx*vy-ex*uy)/det,b=(dy*vy-ey*uy)/det,c=(ex*ux-dx*vx)/det,d0=(ey*ux-dy*vx)/det;
 const e=q0[0]-a*p0[0]-c*p0[1],f=q0[1]-b*p0[0]-d0*p0[1];
 ctx.save();ctx.beginPath();ctx.moveTo(...q0);ctx.lineTo(...q1);ctx.lineTo(...q2);ctx.closePath();ctx.clip();
 ctx.transform(a,b,c,d0,e,f);ctx.drawImage(img,0,0);ctx.restore();
}
function render(){
 request=0;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#07111b';ctx.fillRect(0,0,W,H);
 if(!verified)return;
 ctx.globalAlpha=.22;ctx.drawImage(img,0,0);ctx.globalAlpha=1;
 const transformed=verts.map(pose);
 for(const t of faces){drawTri(t.map(i=>verts[i].p),t.map(i=>transformed[i]));}
 if(grid.checked){
  ctx.lineWidth=0.45;ctx.strokeStyle='rgba(95,240,242,.60)';
  for(const tri of faces){ctx.beginPath();ctx.moveTo(...transformed[tri[0]]);ctx.lineTo(...transformed[tri[1]]);ctx.lineTo(...transformed[tri[2]]);ctx.closePath();ctx.stroke();}
 }
 if(edit.checked){
  ctx.lineWidth=1.75;ctx.strokeStyle='#ffc773';ctx.fillStyle='#fff0b8';
  for(const region of spec.regions){for(const p of region.polygon){
   ctx.beginPath();ctx.arc(p[0],p[1],5,0,Math.PI*2);ctx.fill();ctx.stroke();
  }}
 }
 if(bones.checked){
  const nodes=spec.skeleton.joints;
  ctx.lineWidth=2;ctx.strokeStyle='#fbc773';ctx.fillStyle='#a0faff';
  for(const j of nodes){if(!j.parent)continue;
   const a=nodes.find(x=>x.name===j.parent);
   const deformed=p=>pose({p,weights:[[j.name,1]]});
   const aa=deformed(a.xy),bb=deformed(j.xy);
   ctx.beginPath();ctx.moveTo(...aa);ctx.lineTo(...bb);ctx.stroke();
   ctx.beginPath();ctx.arc(...bb,3,0,Math.PI*2);ctx.fill();
  }
 }
 $('#headVal').textContent=`${head.value}°`;$('#leftVal').textContent=`${left.value}°`;$('#rightVal').textContent=`${right.value}°`;
}
function drawSoon(){if(!request)request=requestAnimationFrame(render);}
// Original, dependency-free SHA-256: compatible with file:// and no third-party runtime.
function sha256(bytes){
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 const oldLen=bytes.length,fullLen=Math.ceil((oldLen+9)/64)*64,data=new Uint8Array(fullLen);data.set(bytes);data[oldLen]=0x80;
 const hi=Math.floor(oldLen*8/4294967296),lo=oldLen*8>>>0;
 for(let i=0;i<4;i++){data[fullLen-8+i]=(hi>>>(24-i*8))&255;data[fullLen-4+i]=(lo>>>(24-i*8))&255;}
 const w=new Int32Array(64),rr=(x,n)=>x>>>n|x<<32-n;
 for(let i=0;i<fullLen;i+=64){
  for(let j=0;j<16;j++){const o=i+j*4;w[j]=(data[o]<<24)|(data[o+1]<<16)|(data[o+2]<<8)|data[o+3];}
  for(let j=16;j<64;j++){const a=w[j-15],b=w[j-2];w[j]=(w[j-16]+(rr(a,7)^rr(a,18)^a>>>3)+w[j-7]+(rr(b,17)^rr(b,19)^b>>>10))|0;}
  let [a,b,c,d,e,f,g,h]=H;
  for(let j=0;j<64;j++){
   const s1=rr(e,6)^rr(e,11)^rr(e,25),ch=e&f^~e&g;
   const t1=(h+s1+ch+K[j]+w[j])|0;
   const s0=rr(a,2)^rr(a,13)^rr(a,22),maj=a&b^a&c^b&c,t2=(s0+maj)|0;
   h=g;g=f;f=e;e=d+t1|0;d=c;c=b;b=a;a=t1+t2|0;
  }
  H=H.map((v,j)=>(v+[a,b,c,d,e,f,g,h][j])|0);
 }
 return H.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
file.addEventListener('change',async()=>{
 const f=file.files?.[0];if(!f)return;
 try{
  if(f.size>16*1024*1024||f.type!=='image/png')throw Error('需要原始 PNG（小於 16MB）');
  report('驗證核准原圖 SHA-256 中…');
  const bytes=new Uint8Array(await f.arrayBuffer());
  if(sha256(bytes)!==spec.source.sha256)throw Error('原圖 SHA 不相符：拒絕使用非核准圖片');
  const src=URL.createObjectURL(f);const x=new Image();
  await new Promise((ok,bad)=>{x.onload=ok;x.onerror=bad;x.src=src;});
  if(x.naturalWidth!==W||x.naturalHeight!==H)throw Error('圖片尺寸與原圖不符');
  img=x;verified=true;build();drawSoon();
  report('SHA PASS：6 個逆向輪廓網格包覆於 7 關節，轉向只影響包覆網格。背面深度仍為推定，正式 3D 未核准。');
 }catch(e){verified=false;report('BLOCKED：'+e.message);drawSoon();}
});
for(const el of [head,left,right,grid,bones])el.addEventListener('input',drawSoon);
reset.addEventListener('click',()=>{head.value=0;left.value=0;right.value=0;grid.checked=true;drawSoon();});
edit.addEventListener('change',()=>{
 if(edit.checked){head.value=0;left.value=0;right.value=0;report('輪廓編輯中：拖曳黃色節點，右鍵不會修改骨架位置。匯出 JSON 後可用自研 Python 程式重建 GLB。');}
 drawSoon();
});
function pointerPixel(ev){const b=canvas.getBoundingClientRect();return [(ev.clientX-b.left)/b.width*W,(ev.clientY-b.top)/b.height*H];}
canvas.addEventListener('pointerdown',ev=>{
 if(!edit.checked||!verified)return;const [x,y]=pointerPixel(ev);let best=null,err=21;
 for(const region of spec.regions){region.polygon.forEach((p,i)=>{
  const dist=Math.hypot(p[0]-x,p[1]-y);if(dist<err){err=dist;best={region,i};}
 });}
 if(!best)return;dragging=best;canvas.setPointerCapture(ev.pointerId);
});
canvas.addEventListener('pointermove',ev=>{
 if(!dragging)return;const [x,y]=pointerPixel(ev);
 dragging.region.polygon[dragging.i]=[Math.round(Math.max(0,Math.min(W,x))),Math.round(Math.max(0,Math.min(H,y)))];
 try{build();edited=true;drawSoon();}catch(e){report('幾何錯誤，請把節點移回原輪廓順序：'+e.message);}
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{dragging=null;});
save.addEventListener('click',()=>{
 if(!verified){report('請先載入並驗證原始核准 PNG，才可以匯出');return;}
 const result=structuredClone(spec);
 result.approved3DModel=false;result.releaseAllowed=false;
 result.mesh.reviewStatus='USER_EDITED_VISIBLE_CONTOUR_ONLY_NOT_3D_APPROVAL';
 result.editedWith='AIG_SELF_DEVELOPED_PHASE13_BROWSER_WORKBENCH';
 const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='AIG-Phase13-edited-envelope-NOT-APPROVED.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),800);report('已匯出輪廓 JSON。仍是 2.5D 技術候選；請另行做三維與多視角驗收。');
});
// Visible safety contract: the source image is never submitted anywhere.
if(spec.releaseAllowed!==false||spec.approved3DModel!==false||spec.legacyDollGeometryUsed!==false)throw Error('Phase13 Authority Gate broken');
report('選擇已核准的原始 PNG 以離線驗證，圖片只在瀏覽器本機處理。');
})();