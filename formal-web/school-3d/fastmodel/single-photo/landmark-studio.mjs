/** FastModel 7.5: user-reviewed 2D source feature positions drive truly
 * deforming XYZ SDF. No source uploads or automatic anatomy claim.
 */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {flipAIG73RGBA} from './aig-face-material-7-3.mjs';
import {AIG74_CHANNELS,createAIG74Expression,evaluateAIG74Clip} from './aig-avatar-rig-7-4.mjs';
import {AIG75_SCHEMA,AIG75_KEYS,suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,
 createAIG75Rig,auditAIG75Rig,renderAIG75LandmarkAvatar} from './aig-landmark-rig-7-5.mjs';
const $=id=>document.getElementById(id),value=id=>Number($(id).value),
 photoCanvas=$('photo'),photoContext=photoCanvas.getContext('2d',{willReadFrequently:true}),
 canvas=$('view'),context=canvas.getContext('2d',{alpha:false}),
 clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let source=null,imageCanvas=null,field=null,rig=null,landmarks=null,sha=null,backgroundPoint=[0,0],
 marks={},guide=null,bgMode=false,queued=false,requestToken=0,drag=null,playing=false,clipTimer=null,clipStart=0,lastFrame=null;
function status(msg,okay=false){$('status').textContent=msg;$('status').dataset.ok=okay?'true':'false';}
function controls(){
 const markCount=Object.keys(marks).length;
 $('confirm').disabled=!(source&&markCount===AIG75_KEYS.length&&$('review').checked);
 $('play').disabled=!rig;$('reset').disabled=!rig;
 $('evidence-download').disabled=!rig;
 $('play').textContent=playing?'暫停表情':'播放表情';
 $('point-status').textContent='已手動標記 '+markCount+'／10；黃色為未確認引導點，綠色為已點選的照片位置。';
}
function expression(){return createAIG74Expression(Object.fromEntries(AIG74_CHANNELS.map(k=>[k,value(k)])));}
function putExpression(e){const x=createAIG74Expression(e);for(const k of AIG74_CHANNELS)$(k).value=String(x[k]);schedule();}
function stop(){playing=false;if(clipTimer!==null)clearTimeout(clipTimer);clipTimer=null;controls();}
function revokeRig(){
 stop();field=null;rig=null;landmarks=null;lastFrame=null;controls();schedule();
 $('evidence').textContent='BLOCKED: PHOTO_FEATURES_NEED_REVIEW_OR_GEOMETRY_REBUILD';
}
function drawPhoto(){
 if(!source||!imageCanvas)return;
 photoCanvas.width=source.width;photoCanvas.height=source.height;
 photoContext.drawImage(imageCanvas,0,0);
 const size=Math.max(3,source.width/70);
 for(const name of AIG75_KEYS){
  const p=marks[name]||guide?.points[name];if(!p)continue;
  const [x,y]=p,confirmed=Object.hasOwn(marks,name);
  photoContext.beginPath();photoContext.arc(x*source.width,y*source.height,size,0,Math.PI*2);
  photoContext.lineWidth=Math.max(1,source.width/225);
  photoContext.fillStyle=confirmed?'#78f0be':'#ffd381';
  photoContext.fill();photoContext.strokeStyle='#061524';photoContext.stroke();
  photoContext.font=Math.max(10,source.width/30)+'px sans-serif';
  photoContext.fillStyle=confirmed?'#85ffe5':'#fff0b3';
  photoContext.fillText(String(AIG75_KEYS.indexOf(name)+1),x*source.width+size+2,y*source.height-size-2);
 }
 if(bgMode){
  photoContext.fillStyle='#fb9f7f';photoContext.fillText('BACKGROUND PICK',8,20);
 }
}
function imagePoint(e){
 const rect=photoCanvas.getBoundingClientRect();
 const scale=Math.min(rect.width/source.width,rect.height/source.height);
 const ox=(rect.width-source.width*scale)/2,oy=(rect.height-source.height*scale)/2;
 return [clamp((e.clientX-rect.left-ox)/(scale*source.width),0,1),
  clamp((e.clientY-rect.top-oy)/(scale*source.height),0,1)];
}
function faceROIFromMarks(){
 const list=Object.values(marks),xs=list.map(x=>x[0]),ys=list.map(x=>x[1]);
 let x=clamp(Math.min(...xs)-.04,0,1),y=clamp(Math.min(...ys)-.045,0,1);
 const maxX=clamp(Math.max(...xs)+.04,0,1),maxY=clamp(Math.max(...ys)+.035,0,1);
 const width=maxX-x,height=maxY-y;
 if(width<.12||height<.16)throw Error('FACE_TOO_SMALL_FOR_RELIABLE_REVIEW');
 return {x,y,width,height,reviewed:true};
}
function evidence(render=lastFrame){
 if(!rig)return null;
 const quality=auditAIG75Rig(rig,expression(),{grid:6}),record={
  schema:AIG75_SCHEMA,sourceSHA256:sha||'HASH_NOT_AVAILABLE',
  marked2DLandmarks:landmarks.points,reviewedByUser:landmarks.reviewed,
  origin:'USER_CLICKED_2D_NOT_AUTOMATIC_FACE_RECOGNITION',
  estimatedDepth:field.halfDepth*2,expression:expression(),quality,
  imageSourceUnchanged:true,render:render?{
   rayHits:render.hitPixels,originalFrontPhotoPixels:render.photoPixels,
   estimatedNeutralRearPixels:render.neutralRearPixels,cameraYaw:render.cameraYaw
  }:null,
  anatomicalFaceDepthVerified:false,hairNeckLikenessVerified:false,
  physicalSkinMaterialVerified:false,nativeAndroidWindowsVerified:false,actualOnlineGameServer:false
 };
 $('evidence').textContent=JSON.stringify(record,null,2);return record;
}
function draw(){
 queued=false;context.fillStyle='#020c15';context.fillRect(0,0,canvas.width,canvas.height);
 if(!rig)return;
 try{
  const output=renderAIG75LandmarkAvatar(rig,source,{
   expression:expression(),width:30,height:28,maxSteps:64,
   yaw:value('yaw'),pitch:value('pitch')
  });
  const temp=document.createElement('canvas');temp.width=output.width;temp.height=output.height;
  temp.getContext('2d').putImageData(new ImageData(output.pixels,output.width,output.height),0,0);
  context.imageSmoothingEnabled=true;context.drawImage(temp,0,0,canvas.width,canvas.height);
  lastFrame=output;evidence(output);
 }catch(e){stop();status('BLOCKED：三維模型品質驗證或光線運算失敗：'+String(e.message||e));}
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(draw);}}
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(200,Math.round(rect.width*dpr));canvas.height=Math.max(200,Math.round(rect.height*dpr));
 schedule();
}
async function getDigest(file){
 if(!globalThis.crypto?.subtle)return null;
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
$('source').addEventListener('change',async()=>{
 const t=++requestToken,file=$('source').files?.[0];
 stop();source=null;rig=null;field=null;sha=null;marks={};landmarks=null;guide=null;imageCanvas=null;lastFrame=null;
 $('review').checked=false;controls();schedule();
 if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<1||file.size>20*1024*1024){
  status('BLOCKED：僅支援 20 MB 以下 PNG／JPG／WebP。');return;
 }
 let bitmap=null;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const scale=Math.min(1,Math.sqrt(500000/(bitmap.width*bitmap.height)));
  const w=Math.round(bitmap.width*scale),h=Math.round(bitmap.height*scale);
  if(w<32||h<32)throw Error('IMAGE_TOO_SMALL');
  const off=document.createElement('canvas');off.width=w;off.height=h;
  const cx=off.getContext('2d',{willReadFrequently:true});cx.clearRect(0,0,w,h);cx.drawImage(bitmap,0,0,w,h);
  const rgba=cx.getImageData(0,0,w,h),hash=await getDigest(file).catch(()=>null);
  if(t!==requestToken)return;
  source={width:w,height:h,data:rgba.data};imageCanvas=off;sha=hash;
  guide=suggestAIG75GuidePoints({x:.22,y:.06,width:.56,height:.78});
  backgroundPoint=[0,0];marks={};drawPhoto();controls();
  status('照片像素已讀取 '+w+'×'+h+'。請按順序點選十個五官位置；黃色只供參考。',true);
 }catch(e){if(t===requestToken){source=null;controls();status('BLOCKED：照片無法讀取 '+String(e.message||e));}}
 finally{bitmap?.close();}
});
$('photo').addEventListener('pointerdown',e=>{
 if(!source)return;
 const p=imagePoint(e);
 if(bgMode){
  backgroundPoint=[Math.floor(p[0]*(source.width-1)),Math.floor(p[1]*(source.height-1))];
  bgMode=false;$('pick-bg').textContent='改點照片背景';
  revokeRig();status('背景座標已更新 '+backgroundPoint.join(',')+'，需要重新確認模型。');drawPhoto();return;
 }
 const key=$('point').value;if(!AIG75_KEYS.includes(key))return;
 marks[key]=p;$('review').checked=false;
 const at=AIG75_KEYS.indexOf(key);if(at<AIG75_KEYS.length-1)$('point').value=AIG75_KEYS[at+1];
 revokeRig();drawPhoto();controls();
});
$('point').addEventListener('change',drawPhoto);
$('pick-bg').addEventListener('click',()=>{
 if(!source)return;
 bgMode=!bgMode;$('pick-bg').textContent=bgMode?'現在請點照片背景':'改點照片背景';drawPhoto();
});
$('review').addEventListener('change',controls);
$('method').addEventListener('change',()=>{if(source){revokeRig();status('背景分割方法已修改，請重新確認並建立三維模型。');}});
$('confirm').addEventListener('click',()=>{
 if(!source||Object.keys(marks).length!==10||!$('review').checked)return;
 try{
  const roi=faceROIFromMarks();
  const approved=createAIG75ReviewedLandmarks({roi,points:marks,reviewed:true,sourceSHA256:sha});
  const flipped=flipAIG73RGBA(source);
  const mask=reversePhotoMask(flipped,{method:$('method').value,
   backgroundPoint:[backgroundPoint[0],source.height-1-backgroundPoint[1]],
   threshold:value('threshold')
  });
  const vol=createObservedImplicitVolume({...mask,sourceSHA256:sha},{maxGrid:96,halfDepth:.13});
  const built=createAIG75Rig(vol,approved);
  const quality=auditAIG75Rig(built,expression());
  if(!quality.passed)throw Error('GEOMETRY_JACOBIAN_REJECTED');
  landmarks=approved;field=vol;rig=built;controls();drawPhoto();schedule();
  status('十個照片五官點已核對，真 XYZ 表情曲面已建立。最小 Jacobian '+quality.minJacobian.toFixed(3)+'。未觀測的深度仍為推估。',true);
 }catch(e){rig=null;field=null;landmarks=null;controls();schedule();status('BLOCKED：五官定位或三維模型不符合 Gate：'+String(e.message||e));}
});
for(const key of AIG74_CHANNELS)$(key).addEventListener('input',()=>{stop();schedule();});
$('reset').addEventListener('click',()=>{stop();putExpression({});});
$('clip').addEventListener('change',stop);
$('play').addEventListener('click',()=>{
 if(playing){stop();status('動畫預覽已暫停，照片沒有修改。',true);return;}
 if(!rig)return;
 playing=true;clipStart=performance.now();controls();
 function next(){
  if(!playing)return;
  try{putExpression(evaluateAIG74Clip($('clip').value,(performance.now()-clipStart)/1000));}
  catch(e){stop();status('BLOCKED：片段計算失敗 '+String(e.message||e));return;}
  clipTimer=setTimeout(next,320);
 }
 next();status('3D 五官表情依照片定位資料逐步播放。',true);
});
for(const key of ['yaw','pitch'])$(key).addEventListener('input',schedule);
$('evidence-download').addEventListener('click',()=>{
 if(!rig)return;
 const data=JSON.stringify(evidence(),null,2)+'\n',
  url=URL.createObjectURL(new Blob([data],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download='FastModel-7-5-reviewed-landmarks-XYZ-evidence.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
canvas.addEventListener('pointerdown',e=>{
 if(!rig)return;drag={x:e.clientX,y:e.clientY,yaw:value('yaw'),pitch:value('pitch')};
 canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(!drag)return;
 $('yaw').value=String(clamp(drag.yaw+(e.clientX-drag.x)*.012,-3.14,3.14));
 $('pitch').value=String(clamp(drag.pitch-(e.clientY-drag.y)*.012,-1.2,1.2));schedule();
});
canvas.addEventListener('pointerup',()=>drag=null);
canvas.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',stop);
controls();resize();
