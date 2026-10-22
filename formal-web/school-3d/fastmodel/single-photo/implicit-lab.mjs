/** FastModel 7.1 UI — works with original pixel mask and true 3D SDF samples.
 * This page intentionally refuses claims of anatomical reconstruction or 3D skin.
 */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume,renderImplicitVolume,probeSphereContact,AIG71_SCHEMA} from './aig-implicit-volume-7-1.mjs';
const $=id=>document.getElementById(id);
const canvas=$('screen'),ctx=canvas.getContext('2d',{alpha:false}),source=$('source-preview'),pctx=source.getContext('2d',{willReadFrequently:true});
let photo=null,field=null,hash=null,bg=[0,0],raf=0,last=null,drag=null;
function state(msg,pass=false){$('status').textContent=msg;$('status').dataset.level=pass?'ok':'warning';}
function sync(){$('build').disabled=!photo;$('probe').disabled=!field;}
function display(){
 raf=0;if(!ctx)return;
 ctx.fillStyle='#020a14';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(!field)return;
 try{
  const width=Math.min(192,Math.max(70,Math.round(canvas.width/4))),height=Math.min(144,Math.max(52,Math.round(canvas.height/4)));
  const out=renderImplicitVolume(field,{width,height,yaw:Number($('yaw').value),pitch:Number($('pitch').value),bend:Number($('bend').value),maxSteps:80});
  const off=document.createElement('canvas');off.width=out.width;off.height=out.height;
  off.getContext('2d').putImageData(new ImageData(out.pixels,out.width,out.height),0,0);
  ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,canvas.width,canvas.height);
  last=out;report();
 }catch(e){state('BLOCKED：真實 SDF 光線求交失敗 '+String(e.message||e));}
}
function requestDraw(){if(!raf)raf=requestAnimationFrame(display);}
function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(200,Math.round(rect.width*dpr));canvas.height=Math.max(170,Math.round(rect.height*dpr));requestDraw();}
function report(contact=null){
 if(!field)return;
 const probe=contact||probeSphereContact(field,[0,0,field.halfDepth+.025],.06,{bend:Number($('bend').value)});
 $('evidence').textContent=JSON.stringify({
  schema:AIG71_SCHEMA,sourceSHA256:hash||'SHA_UNAVAILABLE',observedXY:'SOURCE_FOREGROUND_MASK',
  grid:[field.gridWidth,field.gridHeight],occupiedCells:field.occupiedCells,
  unobservedDepth:'EXPLICIT_ESTIMATE_NOT_OBSERVED',zThickness:2*field.halfDepth,
  surfaceRayHitPixels:last?.hitPixels??0,camera:last?{yaw:last.yaw,pitch:last.pitch,surfaceDistance:last.nearestSurfaceDistance}:null,
  bend:Number($('bend').value),contact:probe,anatomyVerified:false,elasticMaterialVerified:false,
  skeletal3DCharacterVerified:false,androidWindowsVerified:false
 },null,2);
}
async function checksum(file){
 if(!globalThis.crypto?.subtle)return null;
 const b=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
}
$('source').addEventListener('change',async()=>{
 const file=$('source').files?.[0];photo=null;field=null;hash=null;last=null;sync();requestDraw();
 if(!file)return;
 if(file.size===0||file.size>20*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
  state('BLOCKED：照片只能為 20MB 以內 PNG、JPEG、WebP。');return;
 }
 let bitmap;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  if(!bitmap.width||!bitmap.height)throw Error('INVALID_PHOTO');
  const factor=Math.min(1,Math.sqrt(500000/(bitmap.width*bitmap.height)));
  const w=Math.max(16,Math.round(bitmap.width*factor)),h=Math.max(16,Math.round(bitmap.height*factor));
  if(w*h>1600000)throw Error('IMAGE_SIZE_BUDGET');
  const off=document.createElement('canvas');off.width=w;off.height=h;
  const c=off.getContext('2d',{willReadFrequently:true});c.clearRect(0,0,w,h);c.drawImage(bitmap,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h);
  photo={width:w,height:h,data:pixels.data};bitmap.close();
  source.width=w;source.height=h;pctx.clearRect(0,0,w,h);pctx.drawImage(off,0,0);
  hash=await checksum(file).catch(()=>null);bg=[0,0];sync();
  state('真實照片已解碼 '+w+'×'+h+'；請確認前景識別方式，再建立 3D 估計體積。',true);
 }catch(e){if(bitmap)bitmap.close();photo=null;sync();state('BLOCKED：照片讀取失敗 '+String(e.message||e));}
});
source.addEventListener('click',e=>{
 if(!photo||$('method').value!=='background')return;
 const box=source.getBoundingClientRect(),factor=Math.min(box.width/photo.width,box.height/photo.height),left=(box.width-photo.width*factor)/2,top=(box.height-photo.height*factor)/2,x=Math.floor((e.clientX-box.left-left)/factor),y=Math.floor((e.clientY-box.top-top)/factor);
 bg=[Math.max(0,Math.min(photo.width-1,x)),Math.max(0,Math.min(photo.height-1,y))];
 state('背景點已設定為 '+bg.join(',')+'，請按建立 3D 體積。');
});
$('method').addEventListener('change',()=>{field=null;last=null;sync();requestDraw();});
$('build').addEventListener('click',()=>{
 if(!photo)return;
 try{
  const m=reversePhotoMask(photo,{method:$('method').value,backgroundPoint:bg,threshold:Number($('threshold').value)});
  field=createObservedImplicitVolume({...m,sourceSHA256:hash},{maxGrid:128,halfDepth:Number($('depth').value)});
  last=null;sync();requestDraw();state('已建立有真實 X/Y/Z 距離的隱式體積。Z 是明示推估，尚未還原人體未見結構。',true);
 }catch(e){field=null;last=null;sync();requestDraw();state('BLOCKED：逆向像素或體積建構失敗 '+String(e.message||e));}
});
for(const id of ['yaw','pitch','bend'])$(id).addEventListener('input',requestDraw);
$('depth').addEventListener('change',()=>{
 if(!field)return;const d=Number($('depth').value);
 if(!Number.isFinite(d)||d<.015||d>.8){state('BLOCKED：深度數值超界。');return;}
 field.halfDepth=d;last=null;requestDraw();state('推估深度已更新；三維表面重新計算，非原圖已觀察到的深度。',true);
});
$('probe').addEventListener('click',()=>{
 if(!field)return;
 const impact=probeSphereContact(field,[0,0,field.halfDepth+.025],.06,{bend:Number($('bend').value)});
 report(impact);state('3D 球體穿入量：'+impact.penetrationDepth.toFixed(5)+' 模型單位；僅幾何接觸，不是 FEM 物理。',true);
});
canvas.addEventListener('pointerdown',e=>{
 if(!field)return;
 drag={x:e.clientX,y:e.clientY,yaw:Number($('yaw').value),pitch:Number($('pitch').value)};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!drag)return;
 $('yaw').value=String(Math.max(-3.14,Math.min(3.14,drag.yaw+(e.clientX-drag.x)*.012)));
 $('pitch').value=String(Math.max(-1.2,Math.min(1.2,drag.pitch-(e.clientY-drag.y)*.012)));
 requestDraw();
});
canvas.addEventListener('pointerup',()=>drag=null);
canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize,{passive:true});
sync();resize();
