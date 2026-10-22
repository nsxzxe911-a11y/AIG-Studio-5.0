/** FastModel 7.4 -- offline MMORPG-style avatar workshop.
 * Original photo stays in local memory. No MMO server / real face-rig claim.
 */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {flipAIG73RGBA,validateAIG73FaceROI} from './aig-face-material-7-3.mjs';
import {AIG74_SCHEMA,AIG74_CHANNELS,createAIG74Expression,evaluateAIG74Clip,
 createAIG74AvatarPreset,parseAIG74AvatarPreset,renderAIG74Avatar} from './aig-avatar-rig-7-4.mjs';
const $=id=>document.getElementById(id),num=id=>Number($(id).value),
 stage=$('screen'),ctx=stage.getContext('2d',{alpha:false}),
 sourceCanvas=$('photo-view'),sctx=sourceCanvas.getContext('2d',{willReadFrequently:true}),
 cosmetics=['foundation','blush','eyes','lips'];
let photo=null,field=null,sha=null,bg=[0,0],originalCanvas=null,reviewed=false,rendered=null,
 drag=null,queued=false,token=0,playing=false,clipTimer=null,clipOrigin=0;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function status(msg,pass=false){$('status').textContent=msg;$('status').dataset.level=pass?'ok':'warning';}
function controls(){
 $('build').disabled=!photo;$('confirm').disabled=!photo;
 $('export').disabled=!field;$('save-preset').disabled=!(field&&reviewed&&sha);
 $('play-clip').disabled=!(field&&reviewed);$('play-clip').textContent=playing?'暫停表情片段':'播放表情片段';
}
function faceBox(){return {x:num('face-x'),y:num('face-y'),width:num('face-w'),height:num('face-h')};}
function makeup(){
 return {foundation:$('foundation-color').value,foundationStrength:num('foundation-strength'),
 blush:$('blush-color').value,blushStrength:num('blush-strength'),
 eyes:$('eyes-color').value,eyesStrength:num('eyes-strength'),
 lips:$('lips-color').value,lipsStrength:num('lips-strength'),
 eyeHeight:num('eye-height'),lipHeight:num('lip-height')};
}
function expression(){return createAIG74Expression(Object.fromEntries(AIG74_CHANNELS.map(k=>[k,num(k)])));}
function setExpression(expr){const safe=createAIG74Expression(expr);for(const k of AIG74_CHANNELS)$(k).value=String(safe[k]);requestDraw();}
function stopClip(){playing=false;if(clipTimer!==null)clearTimeout(clipTimer);clipTimer=null;controls();}
function preview(){
 if(!photo||!originalCanvas)return;
 sourceCanvas.width=photo.width;sourceCanvas.height=photo.height;
 sctx.drawImage(originalCanvas,0,0);const b=faceBox();
 sctx.strokeStyle=reviewed?'#6ef3c4':'#f0ce73';sctx.lineWidth=Math.max(1,photo.width/180);
 sctx.setLineDash(reviewed?[]:[10,6]);
 sctx.strokeRect(b.x*photo.width,b.y*photo.height,b.width*photo.width,b.height*photo.height);
 sctx.setLineDash([]);
}
function evidence(output=rendered){
 if(!field)return null;
 const rec={schema:AIG74_SCHEMA,photoSHA256:sha||'CRYPTO_SHA_UNAVAILABLE',faceBoxReviewed:reviewed,
  sourceSize:[photo.width,photo.height],faceROI:faceBox(),estimatedDepth:field.halfDepth*2,
  expression:expression(),cosmetics:makeup(),
  render:output?{hitPixels:output.hits,frontPhotoPixels:output.sourcePhotoPixels,
   neutralSideBackPixels:output.estimatedRearPixels,cosmeticPixels:output.cosmeticPixels,
   deformRealXYZ:output.realXYZZSurfaceMotion}:null,
  actualHumanFaceDepthVerified:false,faceLandmarksMeasured:false,calibratedSkinVerified:false,
  actualMMONetworking:false,nativeAndroidWindowsVerified:false};
 $('evidence').textContent=JSON.stringify(rec,null,2);return rec;
}
function draw(){
 queued=false;ctx.fillStyle='#020a12';ctx.fillRect(0,0,stage.width,stage.height);
 if(!field||!reviewed)return;
 try{
  const roi=validateAIG73FaceROI(photo,faceBox(),{reviewed:true,sourceSHA256:sha});
  const output=renderAIG74Avatar(field,photo,{faceROI:roi,cosmetics:makeup(),
   expression:expression(),yaw:num('yaw'),pitch:num('pitch'),width:70,height:64,maxSteps:100});
  const target=document.createElement('canvas');target.width=output.width;target.height=output.height;
  target.getContext('2d').putImageData(new ImageData(output.pixels,output.width,output.height),0,0);
  ctx.imageSmoothingEnabled=true;ctx.drawImage(target,0,0,stage.width,stage.height);
  rendered=output;evidence(output);
 }catch(e){stopClip();status('BLOCKED：真 3D 表情光線運算失敗 '+String(e.message||e));}
}
function requestDraw(){if(!queued){queued=true;requestAnimationFrame(draw);}}
function resize(){const r=stage.getBoundingClientRect(),scale=Math.min(devicePixelRatio||1,2);
 stage.width=Math.max(230,Math.round(r.width*scale));
 stage.height=Math.max(220,Math.round(r.height*scale));requestDraw();}
function unreview(){
 stopClip();reviewed=false;rendered=null;controls();preview();
 $('face-evidence').textContent='臉框已更新，需重新確認；五官位置仍是相對預設，非照片關鍵點量測。';requestDraw();
}
function applyFaceBox(r){
 const x=clamp(r.x,0,.8),y=clamp(r.y,0,.8);
 $('face-x').value=String(x);$('face-y').value=String(y);
 $('face-w').value=String(clamp(r.width,.12,Math.min(.85,1-x)));
 $('face-h').value=String(clamp(r.height,.12,Math.min(.9,1-y)));
 unreview();
}
async function digest(file){
 if(!globalThis.crypto?.subtle)return null;
 const bytes=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
$('source').addEventListener('change',async()=>{
 const file=$('source').files?.[0],t=++token;
 stopClip();photo=null;field=null;sha=null;originalCanvas=null;reviewed=false;rendered=null;controls();requestDraw();
 if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size<1||file.size>20*1024*1024){
  status('BLOCKED：只支援 20 MB 以內的 PNG／JPG／WebP。');return;
 }
 let bitmap;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const factor=Math.min(1,Math.sqrt(500000/(bitmap.width*bitmap.height)));
  const w=Math.round(bitmap.width*factor),h=Math.round(bitmap.height*factor);
  if(w<32||h<32)throw Error('SMALL_SOURCE_IMAGE');
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const context=cv.getContext('2d',{willReadFrequently:true});
  context.clearRect(0,0,w,h);context.drawImage(bitmap,0,0,w,h);
  const pixels=context.getImageData(0,0,w,h),hash=await digest(file).catch(()=>null);
  if(t!==token)return;
  photo={width:w,height:h,data:pixels.data};originalCanvas=cv;sha=hash;bg=[0,0];
  applyFaceBox({x:.27,y:.16,width:.46,height:.64});preview();controls();
  status('來源 '+w+'×'+h+' 已讀取。先確認照片臉框，再建立角色三維表面。'+(sha?'':' 本機缺 SHA-256，不能保存角色預設。'),true);
 }catch(e){if(t===token){photo=null;controls();status('BLOCKED：來源照片處理失敗 '+String(e.message||e));}}
 finally{bitmap?.close();}
});
$('segment').addEventListener('change',()=>{field=null;unreview();status('分割規則改變，需重新確認臉框和建立幾何。');});
$('photo-view').addEventListener('pointerdown',e=>{
 if(!photo||$('segment').value!=='background')return;
 const rect=sourceCanvas.getBoundingClientRect();
 // Canvas object-fit: contain: account for letterboxing without sampling another pixel.
 const scale=Math.min(rect.width/photo.width,rect.height/photo.height);
 const sx=(rect.width-photo.width*scale)/2,sy=(rect.height-photo.height*scale)/2;
 bg=[clamp(Math.floor((e.clientX-rect.left-sx)/scale),0,photo.width-1),
     clamp(Math.floor((e.clientY-rect.top-sy)/scale),0,photo.height-1)];
 field=null;rendered=null;controls();requestDraw();
 status('背景取樣座標 '+bg.join(',')+'。請重新建立角色幾何。');
});
for(const id of ['face-x','face-y','face-w','face-h'])$(id).addEventListener('input',unreview);
$('confirm').addEventListener('click',()=>{
 if(!photo)return;
 try{
  validateAIG73FaceROI(photo,faceBox(),{reviewed:true,sourceSHA256:sha});
  reviewed=true;controls();preview();requestDraw();
  $('face-evidence').textContent='臉框已由使用者確認；眨眼／嘴巴的位置仍是程序性的相對控制點。';
  status('臉框已確認。表情控制會改變 3D 表面，而非只更換臉部貼圖。',true);
 }catch(e){reviewed=false;controls();status('BLOCKED：臉框資料無效 '+String(e.message||e));}
});
$('build').addEventListener('click',()=>{
 if(!photo)return;
 try{
  const flipped=flipAIG73RGBA(photo),m=reversePhotoMask(flipped,{
   method:$('segment').value,threshold:num('tolerance'),
   backgroundPoint:[bg[0],photo.height-1-bg[1]]
  });
  field=createObservedImplicitVolume({...m,sourceSHA256:sha},{maxGrid:96,halfDepth:.13});
  controls();requestDraw();
  status('已建立估計深度的真 XYZ SDF 角色表面。'+(reviewed?'可使用表情控制。':'請先確認臉框以啟用表情。')+
  ' 未從照片恢復真正人體背面或真實顏面骨骼。',true);
 }catch(e){field=null;controls();requestDraw();status('BLOCKED：逆向角色幾何失敗 '+String(e.message||e));}
});
for(const key of AIG74_CHANNELS)$(key).addEventListener('input',()=>{stopClip();requestDraw();});
$('clip').addEventListener('change',stopClip);
$('play-clip').addEventListener('click',()=>{
 if(playing){stopClip();status('表情播放已暫停。',true);return;}
 if(!field||!reviewed)return;
 playing=true;clipOrigin=performance.now();controls();
 function tick(){
  if(!playing)return;
  try{setExpression(evaluateAIG74Clip($('clip').value,(performance.now()-clipOrigin)/1000));}
  catch(e){stopClip();status('BLOCKED：表情片段失敗 '+String(e.message||e));return;}
  clipTimer=setTimeout(tick,220);
 }
 tick();status('動畫通道驅動三維幾何；此 CPU 預覽尚未達實機 FPS 認證。',true);
});
$('reset-expression').addEventListener('click',()=>{stopClip();setExpression({});status('表情已清零，角色原始像素未更動。',true);});
for(const name of cosmetics)for(const suffix of ['color','strength'])$(name+'-'+suffix).addEventListener('input',requestDraw);
for(const id of ['eye-height','lip-height','yaw','pitch'])$(id).addEventListener('input',requestDraw);
$('clear').addEventListener('click',()=>{for(const k of cosmetics)$(k+'-strength').value='0';requestDraw();});
function saveFile(filename,string){
 const url=URL.createObjectURL(new Blob([string],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('export').addEventListener('click',()=>{if(!field||!reviewed)return;saveFile('AIG-FastModel-7-4-NUMERIC-EVIDENCE.json',JSON.stringify(evidence(),null,2)+'\n');});
$('save-preset').addEventListener('click',()=>{
 if(!field||!photo||!sha||!reviewed)return;
 try{
  const roi=validateAIG73FaceROI(photo,faceBox(),{reviewed:true,sourceSHA256:sha});
  const preset=createAIG74AvatarPreset({name:$('avatar-name').value,sourceSHA256:sha,
   faceROI:roi,makeup:makeup(),expression:expression()});
  saveFile('AIG-FastModel-7-4-Avatar-Preset.json',JSON.stringify(preset,null,2)+'\n');
  status('角色參數已儲存至本機 JSON，沒有上傳照片，也沒有遠端角色伺服器。',true);
 }catch(e){status('BLOCKED：角色預設錯誤 '+String(e.message||e));}
});
$('load-preset').addEventListener('change',async()=>{
 const file=$('load-preset').files?.[0];if(!file)return;
 try{
  if(!sha||!photo||file.size>16000)throw Error('PHOTO_SHA_OR_FILE_BUDGET_MISSING');
  const p=parseAIG74AvatarPreset(await file.text(),sha);
  stopClip();$('avatar-name').value=p.name;applyFaceBox(p.faceROI);reviewed=true;controls();preview();
  for(const key of cosmetics){
   $(key+'-color').value=p.cosmetics[key];
   $(key+'-strength').value=String(p.cosmetics[key+'Strength']);
  }
  $('eye-height').value=String(p.cosmetics.eyeHeight);$('lip-height').value=String(p.cosmetics.lipHeight);
  setExpression(p.expression);$('face-evidence').textContent='已從與照片 SHA 相符的角色預設恢復臉框。';
  status('角色預設已從本機 JSON 安全讀回。',true);
 }catch(e){status('BLOCKED：拒絕無法驗證的角色預設 '+String(e.message||e));}
 finally{$('load-preset').value='';}
});
stage.addEventListener('pointerdown',e=>{
 if(!field||!reviewed)return;
 drag={x:e.clientX,y:e.clientY,yaw:num('yaw'),pitch:num('pitch')};stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
 if(!drag)return;
 $('yaw').value=String(clamp(drag.yaw+(e.clientX-drag.x)*.012,-3.14,3.14));
 $('pitch').value=String(clamp(drag.pitch-(e.clientY-drag.y)*.012,-1.1,1.1));requestDraw();
});
stage.addEventListener('pointerup',()=>drag=null);
stage.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize,{passive:true});
window.addEventListener('pagehide',stopClip);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopClip();});
controls();resize();
