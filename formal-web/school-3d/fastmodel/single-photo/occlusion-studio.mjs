/** FastModel 7.7: reviewed source hair/neck masks + REAL XYZ occlusion. Photo pixels remain local and unchanged. */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {flipAIG73RGBA} from './aig-face-material-7-3.mjs';
import {AIG74_CHANNELS,createAIG74Expression,evaluateAIG74Clip} from './aig-avatar-rig-7-4.mjs';
import {AIG75_SCHEMA,AIG75_KEYS,suggestAIG75GuidePoints,createAIG75ReviewedLandmarks,
 createAIG75Rig,auditAIG75Rig} from './aig-landmark-rig-7-5.mjs';
import {createAIG76DepthProfile,auditAIG76Depth} from './aig-face-depth-7-6.mjs';
import {AIG77_SCHEMA,createAIG77ReviewedRegions,createAIG77Layers,
 auditAIG77Layers,renderAIG77PhotoLayers} from './aig-hair-neck-7-7.mjs';
const $=id=>document.getElementById(id),value=id=>Number($(id).value),
 photoCanvas=$('photo'),photoContext=photoCanvas.getContext('2d',{willReadFrequently:true}),
 canvas=$('view'),context=canvas.getContext('2d',{alpha:false}),
 clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let source=null,imageCanvas=null,field=null,rig=null,depthProfile=null,layers=null,landmarks=null,sha=null,backgroundPoint=[0,0],
 marks={},guide=null,bgMode=false,queued=false,requestToken=0,drag=null,painting=false,playing=false,clipTimer=null,clipStart=0,lastFrame=null,sourceForeground=null,hairMask=null,neckMask=null;
function status(msg,okay=false){$('status').textContent=msg;$('status').dataset.ok=okay?'true':'false';}
function controls(){
 const markCount=Object.keys(marks).length;
 $('confirm').disabled=!(source&&markCount===AIG75_KEYS.length&&$('review').checked);
 $('play').disabled=!layers;$('reset').disabled=!layers;
 $('evidence-download').disabled=!layers;
 const count=regionCount();
 $('apply-layers').disabled=!(rig&&sourceForeground&&count.hair>=12&&count.neck>=12&&$('review-layers').checked);
 $('layer-status').textContent='頭髮 '+count.hair+' 像素、脖子 '+count.neck+' 像素；'+
  (layers?'真 3D 遮擋已核准（照片深度仍為推估）。':'目前不允許宣稱模型已通過頭頸接合 Gate。');
 $('play').textContent=playing?'暫停表情':'播放表情';
 $('point-status').textContent='已手動標記 '+markCount+'／10；黃色為未確認引導點，綠色為已點選的照片位置。';
}
function depthSettings(){return {nose:value('nose-depth'),bridge:value('bridge-depth'),eyeSockets:value('eye-depth'),lips:value('lips-depth'),chin:value('chin-depth'),globalDepthScale:value('depth-scale')};}
function regionCount(){
 const count={hair:0,neck:0};
 if(hairMask)for(let i=0;i<hairMask.length;i++){count.hair+=hairMask[i];count.neck+=neckMask[i];}
 return count;
}
function layerSettings(){return {hairLift:value('hair-lift'),neckSetback:value('neck-back')};}
function updateApprovedLayers(){
 if(!layers||!rig||!depthProfile)return;
 const candidate=createAIG77Layers(depthProfile,layers.regions,layerSettings());
 const audit=auditAIG77Layers(candidate,expression(),{grid:6});
 if(!audit.passed)throw Error('PHOTO_HAIR_NECK_3D_INVERSION_BLOCKED');
 layers=candidate;schedule();controls();
}
function expression(){return createAIG74Expression(Object.fromEntries(AIG74_CHANNELS.map(k=>[k,value(k)])));}
function putExpression(e){const x=createAIG74Expression(e);for(const k of AIG74_CHANNELS)$(k).value=String(x[k]);schedule();}
function stop(){playing=false;if(clipTimer!==null)clearTimeout(clipTimer);clipTimer=null;controls();}
function revokeRig(){
 stop();field=null;rig=null;depthProfile=null;layers=null;sourceForeground=null;landmarks=null;lastFrame=null;controls();schedule();
 $('evidence').textContent='BLOCKED: PHOTO_FEATURES_NEED_REVIEW_OR_GEOMETRY_REBUILD';
}
function drawPhoto(){
 if(!source||!imageCanvas)return;
 photoCanvas.width=source.width;photoCanvas.height=source.height;
 photoContext.drawImage(imageCanvas,0,0);
 const w=source.width,h=source.height;
 if(hairMask&&neckMask){
  const frame=photoContext.getImageData(0,0,w,h);
  for(let i=0;i<w*h;i++){
   const a=hairMask[i],b=neckMask[i];if(!a&&!b)continue;
   const at=i*4,strength=.32;
   const rgb=a?[81,247,142]:[72,183,250];
   for(let k=0;k<3;k++)frame.data[at+k]=Math.round(frame.data[at+k]*(1-strength)+rgb[k]*strength);
  }
  photoContext.putImageData(frame,0,0);
 }
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
 if(!layers)return null;
 const pose=expression(),q=auditAIG77Layers(layers,pose,{grid:6});
 const data={
  schema:AIG77_SCHEMA,sourceSHA256:sha||'CRYPTO_DIGEST_NOT_AVAILABLE',
  photoSize:[source.width,source.height],sourcePhotoRGBUnmodified:true,
  reviewedXYLandmarks:landmarks.points,reviewedHairNeckMasks:true,
  userMarkedHairPixels:layers.regions.hairPixels,userMarkedNeckPixels:layers.regions.neckPixels,
  connectedSourceNeckPixels:layers.regions.sourceConnectionPixels,
  quality:q,estimatedGeometry:layerSettings(),expression:pose,
  render:render?{
   rayHits:render.hitPixels,frontSourcePixels:render.photoPixels,
   unseenRearPixels:render.neutralRearPixels,
   hairHits:render.hairHits,neckHits:render.neckHits,faceHits:render.facialHits,
   cameraYaw:render.cameraYaw
  }:null,
  trueHairFiberGeometryVerified:false,measuredNeckMusclesOrSkinMaterial:false,
  referenceCharacterVisuallyApproved:false,nativeAndroidWindowsVerified:false,
  mmoMultiplayerImplemented:false
 };
 $('evidence').textContent=JSON.stringify(data,null,2);
 return data;
}
function draw(){
 queued=false;context.fillStyle='#020c15';context.fillRect(0,0,canvas.width,canvas.height);
 if(!rig||!depthProfile||!layers)return;
 try{
  const output=renderAIG77PhotoLayers(layers,source,{
   expression:expression(),width:26,height:24,maxSteps:68,
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
 stop();source=null;rig=null;depthProfile=null;layers=null;field=null;sha=null;sourceForeground=null;hairMask=null;neckMask=null;marks={};landmarks=null;guide=null;imageCanvas=null;lastFrame=null;
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
  hairMask=new Uint8Array(w*h);neckMask=new Uint8Array(w*h);$('paint-mode').value='landmark';$('review-layers').checked=false;
  guide=suggestAIG75GuidePoints({x:.22,y:.06,width:.56,height:.78});
  backgroundPoint=[0,0];marks={};drawPhoto();controls();
  status('照片像素已讀取 '+w+'×'+h+'。請按順序點選十個五官位置；黃色只供參考。',true);
 }catch(e){if(t===requestToken){source=null;controls();status('BLOCKED：照片無法讀取 '+String(e.message||e));}}
 finally{bitmap?.close();}
});
function paintAt(e){
 if(!source||!sourceForeground||!rig||!hairMask||!neckMask)return;
 const p=imagePoint(e),cx=Math.round(p[0]*(source.width-1)),
  cy=Math.round(p[1]*(source.height-1)),r=value('brush'),mode=$('paint-mode').value;
 if(!['hair','neck','erase'].includes(mode))return;
 for(let y=Math.max(0,cy-r);y<=Math.min(source.height-1,cy+r);y++)
  for(let x=Math.max(0,cx-r);x<=Math.min(source.width-1,cx+r);x++){
   if((x-cx)**2+(y-cy)**2>r*r)continue;
   const at=y*source.width+x;
   if(!sourceForeground[at])continue;
   if(mode==='erase'){hairMask[at]=0;neckMask[at]=0;}
   else if(mode==='hair'){hairMask[at]=1;neckMask[at]=0;}
   else {neckMask[at]=1;hairMask[at]=0;}
  }
 layers=null;lastFrame=null;$('review-layers').checked=false;
 controls();drawPhoto();schedule();
}
$('photo').addEventListener('pointerdown',e=>{
 if(!source)return;
 const p=imagePoint(e);
 if(bgMode){
  backgroundPoint=[Math.floor(p[0]*(source.width-1)),Math.floor(p[1]*(source.height-1))];
  bgMode=false;$('pick-bg').textContent='改點照片背景';
  revokeRig();status('背景座標已更新 '+backgroundPoint.join(',')+'，需要重新確認模型。');drawPhoto();return;
 }
 if($('paint-mode').value!=='landmark'){
  painting=true;$('photo').setPointerCapture(e.pointerId);paintAt(e);return;
 }
 const key=$('point').value;if(!AIG75_KEYS.includes(key))return;
 marks[key]=p;$('review').checked=false;
 const at=AIG75_KEYS.indexOf(key);if(at<AIG75_KEYS.length-1)$('point').value=AIG75_KEYS[at+1];
 revokeRig();drawPhoto();controls();
});
$('photo').addEventListener('pointermove',e=>{if(painting)paintAt(e);});
$('photo').addEventListener('pointerup',()=>{painting=false;});
$('photo').addEventListener('pointercancel',()=>{painting=false;});
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
  // Source segmentation for 3D uses flipped Y, but user's brush uses original photo Y.
  const unflipped=new Uint8Array(source.width*source.height);
  for(let y=0;y<source.height;y++)
   for(let x=0;x<source.width;x++)
    unflipped[y*source.width+x]=mask.mask[(source.height-1-y)*source.width+x];

  const built=createAIG75Rig(vol,approved);
  const quality=auditAIG75Rig(built,expression());
  if(!quality.passed)throw Error('GEOMETRY_JACOBIAN_REJECTED');
  const estimated=createAIG76DepthProfile(built,depthSettings());
  const zGate=auditAIG76Depth(estimated,expression());
  if(!zGate.passed)throw Error('DEPTH_PRIOR_Z_JACOBIAN_REJECTED');
  landmarks=approved;field=vol;rig=built;depthProfile=estimated;sourceForeground=unflipped;layers=null;
  $('paint-mode').value='hair';$('review-layers').checked=false;controls();drawPhoto();schedule();
  $('depth-status').textContent='目前 Z 深度來自人工參數估計，並非相機量測。最小 Z 導數 '+zGate.minZDerivative.toFixed(3)+'；未出現折疊。';
  $('layer-status').textContent='三維基礎模型已建立。請塗畫真實照片中的頭髮和脖子，再確認分區。';
  status('來源照片十點已確認。XYZ 表情 Jacobian '+quality.minJacobian.toFixed(3)+'，估計深度 Jacobian '+zGate.minZDerivative.toFixed(3)+'；兩者都通過數值檢查。',true);
 }catch(e){rig=null;field=null;landmarks=null;depthProfile=null;layers=null;sourceForeground=null;controls();schedule();status('BLOCKED：來源定位／3D 深度模型不符合 Gate：'+String(e.message||e));}
});
for(const id of ['nose-depth','bridge-depth','eye-depth','lips-depth','chin-depth','depth-scale']){
 $(id).addEventListener('input',()=>{
  stop();
  if(!rig)return;
  try{
   const proposed=createAIG76DepthProfile(rig,depthSettings()),gate=auditAIG76Depth(proposed,expression());
   if(!gate.passed)throw Error('FOLD_OR_DEPTH_INVERSION_BLOCKED');
   const previous=depthProfile;depthProfile=proposed;
   try{updateApprovedLayers();}catch(err){depthProfile=previous;throw err;}
   $('depth-status').textContent='已更新估計深度。局部最小 Z 導數 '+gate.minZDerivative.toFixed(3)+'；最大往返誤差 '+gate.maxRoundtripError.toExponential(2)+'。';
   schedule();
  }catch(e){status('BLOCKED：保留上一個有效的深度工作副本；'+String(e.message||e));}
 });
}
$('clear-layers').addEventListener('click',()=>{
 if(!source)return;
 hairMask.fill(0);neckMask.fill(0);layers=null;lastFrame=null;
 $('review-layers').checked=false;controls();drawPhoto();schedule();
 status('來源照片不變；語意筆刷已清空，需重新畫出頭髮與脖子。',true);
});
$('review-layers').addEventListener('change',controls);
$('apply-layers').addEventListener('click',()=>{
 if(!source||!rig||!depthProfile||!sourceForeground||!$('review-layers').checked)return;
 try{
  const reviewed=createAIG77ReviewedRegions({
   width:source.width,height:source.height,foregroundMask:sourceForeground,
   hairMask,neckMask,sourceSHA256:sha,reviewed:true
  });
  const built=createAIG77Layers(depthProfile,reviewed,layerSettings());
  const audit=auditAIG77Layers(built,expression(),{grid:6});
  if(!audit.passed)throw Error('HAIR_NECK_3D_GEOMETRY_QUALITY_FAILED');
  layers=built;controls();schedule();
  status('已完成來源頭髮／脖子連通與 XYZ 遮擋檢查。來源照片保持不變；髮束／皮膚的真實物理尚未驗證。',true);
 }catch(e){layers=null;controls();schedule();status('BLOCKED：髮頸未接合或幾何不安全：'+String(e.message||e));}
});
for(const id of ['hair-lift','neck-back'])$(id).addEventListener('input',()=>{
 stop();
 if(!layers)return;
 try{updateApprovedLayers();}
 catch(e){status('BLOCKED：維持上一個有效頭頸工作副本：'+String(e.message||e));}
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
 a.href=url;a.download='FastModel-7-7-hair-neck-reviewed-3D-evidence.json';
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
