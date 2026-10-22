/** FastModel 7.2 UI: exact forward 3D PBD nodes with numerical inverse-SDF view.
 * No human rig, phantom skin model, fake animation or network uploads.
 */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {createAIG72VolumeBody,stepAIG72Volume,auditAIG72Volume,
 renderAIG72DeformedVolume,AIG72_SCHEMA} from './aig-volumetric-deform-7-2.mjs';

const el=id=>document.getElementById(id);
const canvas=el('volume-view'),context=canvas.getContext('2d',{alpha:false});
let bitmap=null,source=null,sourceSHA=null,body=null,surface=null,active=false;
let yaw=.7,pitch=.15,drag=null,renderRequested=false,frame=null,clock=0;
let report=null,loopTimer=null,loopSerial=0;const MAX_FILE_BYTES=20*1024*1024;
const message=(str,okay=false)=>{el('status').textContent=str;el('status').dataset.level=okay?'ok':'warning';};
const enabled=()=>{
 el('create').disabled=!source;
 for(const id of ['step','play','reset','contact','download'])el(id).disabled=!body;
 el('play').textContent=active?'暫停模擬':'連續模擬';
};
function stop(){
 active=false;loopSerial++;
 if(loopTimer!==null)clearTimeout(loopTimer);
 loopTimer=null;enabled();
}
async function sha(file){
 if(!globalThis.crypto?.subtle)return null;
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function writeReport(lastRender=null){
 if(!body)return;
 report=auditAIG72Volume(body);
 const evidence={
  schema:AIG72_SCHEMA,sourceSHA256:sourceSHA||'UNAVAILABLE',sourceResolution:source?[source.width,source.height]:null,
  sourceProvenance:'PHOTO_XY_MASK_ONLY',estimatedZThickness:body.field.halfDepth*2,
  numerical3D:{...report,worldAxes:'X_Y_Z',tetraSignedVolumeVerified:report.invertedTetraCount===0},
  surface:lastRender?{rayHitPixels:lastRender.hitPixels,realDeformedSurfaceQuery:lastRender.realDeformedFieldQuery}:frame,
  realAnatomicalRig:false,realClothMaterial:false,realHumanLikeness:false,
  nativeAndroidWindowsVerified:false
 };
 if(lastRender)frame=evidence.surface;
 el('evidence').textContent=JSON.stringify(evidence,null,2);
 return evidence;
}
function draw(){
 renderRequested=false;if(!context)return;
 context.fillStyle='#020b15';context.fillRect(0,0,canvas.width,canvas.height);
 if(!body)return;
 try{
  // Intentionally low-resolution CPU ray march. FPS or GPU claims not inferred.
  const width=50,height=42;
  const output=renderAIG72DeformedVolume(body,{
   width,height,yaw:Number(el('yaw').value),pitch:Number(el('pitch').value),maxSteps:78
  });
  const buffer=document.createElement('canvas');buffer.width=width;buffer.height=height;
  const bctx=buffer.getContext('2d');bctx.putImageData(new ImageData(output.pixels,width,height),0,0);
  context.imageSmoothingEnabled=true;context.drawImage(buffer,0,0,canvas.width,canvas.height);
  const evidence=writeReport(output);
  if(evidence.numerical3D.invertedTetraCount>0){stop();message('BLOCKED：四面體出現反轉；停止模擬，不接受這個變形結果。');}
 }catch(e){stop();message('BLOCKED：三維表面運算失敗 '+String(e.message||e));}
}
function requestDraw(){if(!renderRequested){renderRequested=true;requestAnimationFrame(draw);}}
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
 canvas.width=Math.max(230,Math.round(rect.width*dpr));
 canvas.height=Math.max(210,Math.round(rect.height*dpr));
 requestDraw();
}
function createBody(){
 stop();if(!source)return;
 try{
  const mask=reversePhotoMask(source,{method:el('segment').value,threshold:Number(el('tolerance').value),backgroundPoint:[0,0]});
  surface=createObservedImplicitVolume({...mask,sourceSHA256:sourceSHA},{maxGrid:96,halfDepth:Number(el('thickness').value)});
  body=createAIG72VolumeBody(surface,{nx:5,ny:7,nz:4,gravity:Number(el('gravity').value)});
  frame=null;enabled();requestDraw();
  message('已建立真正的 XYZ 數值體積：'+body.positions.length+' 個 3D 節點、'+body.tetra.length+' 個有向四面體約束。Z 深度屬推估，不是人物外觀核准。',true);
 }catch(e){body=null;surface=null;frame=null;enabled();requestDraw();message('BLOCKED：真實前景或 3D 體積建立失敗：'+String(e.message||e));}
}
function simulate({collide=false}={}){
 if(!body)return false;
 try{
  const options={dt:1/60,iterations:5,tipX:Number(el('tip-x').value),tipZ:Number(el('tip-z').value)};
  if(collide){const free=body.positions.findIndex((point,i)=>body.inverseMass[i]>0&&point[2]>=-.005);if(free<0)throw Error('NO_FREE_PROBE_NODE');options.sphere={center:[...body.positions[free]],radius:.05};}
  const result=stepAIG72Volume(body,options);
  writeReport();
  if(result.invertedTetraCount>0)throw Error('INVERTED_VOLUME_GATE');
  return true;
 }catch(e){stop();message('BLOCKED：3D 物理積分失敗：'+String(e.message||e));return false;}
}
function animate(serial){
 if(!active||serial!==loopSerial)return;
 if(!simulate())return;
 requestDraw();
 // Limit CPU ray-render frequency; never claim native 60 FPS for this preview.
 loopTimer=setTimeout(()=>animate(serial),240);
}
el('source').addEventListener('change',async()=>{
 stop();body=null;surface=null;source=null;sourceSHA=null;frame=null;enabled();requestDraw();
 const file=el('source').files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<=0||file.size>MAX_FILE_BYTES){message('BLOCKED：僅支援 20 MB 以下 PNG/JPEG/WebP。');return;}
 let decoded=null;
 try{
  decoded=await createImageBitmap(file,{imageOrientation:'from-image'});
  const factor=Math.min(1,Math.sqrt(500000/(decoded.width*decoded.height)));
  const w=Math.round(decoded.width*factor),h=Math.round(decoded.height*factor);
  if(!w||!h||w<16||h<16)throw Error('PHOTO_DIMENSION_TOO_SMALL');
  const temporary=document.createElement('canvas');temporary.width=w;temporary.height=h;
  const cx=temporary.getContext('2d',{willReadFrequently:true});cx.clearRect(0,0,w,h);
  cx.drawImage(decoded,0,0,w,h);
  source={width:w,height:h,data:cx.getImageData(0,0,w,h).data};
  sourceSHA=await sha(file).catch(()=>null);
  decoded.close();enabled();
  message('照片已解碼 '+w+' × '+h+'，尚未宣稱有 3D；請檢查分割類型並按建立體積。',true);
 }catch(e){if(decoded)decoded.close();source=null;enabled();message('BLOCKED：照片處理失敗：'+String(e.message||e));}
});
el('segment').addEventListener('change',()=>{stop();body=null;enabled();requestDraw();message('分割方式已切換，需重新建立和目視核對。')});
el('create').addEventListener('click',createBody);
el('step').addEventListener('click',()=>{stop();if(simulate()){requestDraw();message('完成真三維物理步進；位移和體積反轉數據已重新計算。',true);}});
el('play').addEventListener('click',()=>{
 if(!body)return;
 if(active){stop();message('已暫停 3D 數值模擬；保留當前真實節點。',true);}
 else{active=true;const n=++loopSerial;enabled();message('正在逐步計算四面體 PBD，畫面使用省資源的 CPU 渲染。',true);animate(n);}
});
el('reset').addEventListener('click',()=>{stop();createBody();});
el('contact').addEventListener('click',()=>{
 stop();if(simulate({collide:true})){requestDraw();message('完成 3D 球形碰撞投影；請看 collisionProjections，這仍不是已校準的人類皮膚材質。',true);}
});
for(const id of ['yaw','pitch'])el(id).addEventListener('input',requestDraw);
for(const id of ['tip-x','tip-z'])el(id).addEventListener('change',()=>{
 if(!body)return;
 stop();if(simulate())requestDraw();
});
el('download').addEventListener('click',()=>{
 if(!body)return;
 const contents=el('evidence').textContent;
 const blob=new Blob([contents+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='AIG-FastModel-7-2-3D-NUMERIC-NOT-HUMAN.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
canvas.addEventListener('pointerdown',e=>{
 if(!body)return;
 drag={x:e.clientX,y:e.clientY,yaw:Number(el('yaw').value),pitch:Number(el('pitch').value)};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!drag)return;
 el('yaw').value=String(Math.max(-3.14,Math.min(3.14,drag.yaw+(e.clientX-drag.x)*.01)));
 el('pitch').value=String(Math.max(-1.2,Math.min(1.2,drag.pitch-(e.clientY-drag.y)*.01)));
 requestDraw();
});
canvas.addEventListener('pointerup',()=>drag=null);
canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active){stop();message('網頁切換背景：物理模擬暫停，原始資料未被修改。');}});
enabled();resize();
