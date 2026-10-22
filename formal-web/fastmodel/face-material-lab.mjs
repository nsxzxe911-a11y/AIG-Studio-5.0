/** 7.3 local-source face material UI; no image upload, fake default face or identity assertion. */
import {reversePhotoMask} from './aig-reverse-geometry-7-0.mjs';
import {createObservedImplicitVolume} from './aig-implicit-volume-7-1.mjs';
import {createAIG72VolumeBody,stepAIG72Volume} from './aig-volumetric-deform-7-2.mjs';
import {detectAIG67BrowserFace} from './aig-portrait-audio-6-7.mjs';
import {flipAIG73RGBA,validateAIG73FaceROI,makeAIG73Makeup,renderAIG73FaceMaterial,AIG73_SCHEMA} from './aig-face-material-7-3.mjs';
const $=id=>document.getElementById(id),screen=$('screen'),ctx=screen.getContext('2d',{alpha:false});
const preview=$('photo-view'),pctx=preview.getContext('2d',{willReadFrequently:true});
const numeric=id=>Number($(id).value);
let photo=null,field=null,body=null,sourceSHA=null,backgroundPoint=[0,0],reviewed=false,faceProposal='NO_DETECTOR',renderFrame=null;
let renderQueued=false,generation=0,drag=null,baseImageCanvas=null;
const cosmeticIDs=['foundation','blush','eyes','lips'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function status(message,pass=false){$('status').textContent=message;$('status').dataset.level=pass?'ok':'warning';}
function controls(){
 $('build').disabled=!photo;$('confirm').disabled=!photo;$('export').disabled=!field;
 $('confirm').textContent=reviewed?'已確認臉部範圍 ✓':'確認臉框位置（啟用妝容）';
}
function selectedROI(){
 return {x:numeric('face-x'),y:numeric('face-y'),width:numeric('face-w'),height:numeric('face-h')};
}
function makeup(){
 return makeAIG73Makeup({
  foundation:$('foundation-color').value,foundationStrength:numeric('foundation-strength'),
  blush:$('blush-color').value,blushStrength:numeric('blush-strength'),
  lips:$('lips-color').value,lipsStrength:numeric('lips-strength'),
  eyes:$('eyes-color').value,eyesStrength:numeric('eyes-strength'),
  eyeHeight:numeric('eye-height'),lipHeight:numeric('lip-height')
 });
}
function drawPreview(){
 if(!photo||!baseImageCanvas)return;
 preview.width=photo.width;preview.height=photo.height;
 pctx.drawImage(baseImageCanvas,0,0);
 const {x,y,width,height}=selectedROI();
 pctx.strokeStyle=reviewed?'#68f6c6':'#ffd380';
 pctx.lineWidth=Math.max(1,photo.width/190);
 pctx.setLineDash(reviewed?[]:[12,6]);pctx.strokeRect(x*photo.width,y*photo.height,width*photo.width,height*photo.height);
 pctx.setLineDash([]);
}
function writeReport(render=null){
 if(!field)return;
 const roi=validateAIG73FaceROI(photo,selectedROI(),{reviewed,sourceSHA256:sourceSHA});
 const item={
  schema:AIG73_SCHEMA,sourceSHA256:sourceSHA||'UNAVAILABLE',
  sourceImageSize:[photo.width,photo.height],sourceOriginalUnmodified:true,
  faceSourceProposal:faceProposal,faceROI:roi,photoLandmarksVerified:false,
  makeup:makeup(),volumeEstimatedDepth:field.halfDepth*2,
  isTrueXYZField:true,isActualXYZDeformed:body!==null,renderEvidence:render?{
   hitPixels:render.hitPixels,photoFrontPixels:render.photoPixels,inferredRearOrSidePixels:render.inferredPixels,
   makeupPixels:render.cosmeticPixels,transparentFallbackPixels:render.alphaFallbackPixels,
   same3DSurfaceUnderMakeup:true,
   noSecondFaceOnBack:true
  }:renderFrame,
  realistic3DHumanFaceRecovered:false,calibratedSkinMaterial:false,riggedFacialAnimation:false,
  nativeAndroidWindowsVerified:false
 };
 if(render)renderFrame=item.renderEvidence;
 $('evidence').textContent=JSON.stringify(item,null,2);
 return item;
}
function redraw(){
 renderQueued=false;
 ctx.fillStyle='#020a12';ctx.fillRect(0,0,screen.width,screen.height);
 if(!field)return;
 try{
  const roi=validateAIG73FaceROI(photo,selectedROI(),{reviewed,sourceSHA256:sourceSHA});
  const output=renderAIG73FaceMaterial(field,photo,{
   roi,makeup:makeup(),width:70,height:64,maxSteps:76,
   yaw:numeric('yaw'),pitch:numeric('pitch'),body
  });
  const tmp=document.createElement('canvas');tmp.width=output.width;tmp.height=output.height;
  tmp.getContext('2d').putImageData(new ImageData(output.pixels,output.width,output.height),0,0);
  ctx.imageSmoothingEnabled=true;ctx.drawImage(tmp,0,0,screen.width,screen.height);
  writeReport(output);
 }catch(error){status('BLOCKED：3D 來源材質渲染失敗：'+String(error.message||error));}
}
function requestDraw(){if(!renderQueued){renderQueued=true;requestAnimationFrame(redraw);}}
function resize(){
 const rect=screen.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 screen.width=Math.max(230,Math.round(rect.width*dpr));screen.height=Math.max(230,Math.round(rect.height*dpr));
 requestDraw();
}
function invalidateFace(){
 reviewed=false;controls();drawPreview();
 $('face-evidence').textContent='臉框已變更，請重新按「確認臉框」。眼睛與嘴巴位置仍是可調妝容預設。';
 requestDraw();
}
function setROI(rect){
 const x=clamp(rect.x,0,.8),y=clamp(rect.y,0,.8);
 $('face-x').value=String(x);$('face-y').value=String(y);
 $('face-w').value=String(clamp(rect.width,.12,Math.min(.85,1-x)));
 $('face-h').value=String(clamp(rect.height,.12,Math.min(.9,1-y)));
 invalidateFace();
}
function buildGeometry(){
 if(!photo)return;
 body=null;field=null;renderFrame=null;controls();
 try{
  const flipped=flipAIG73RGBA(photo);
  const mask=reversePhotoMask(flipped,{
   method:$('segment').value,backgroundPoint:[backgroundPoint[0],photo.height-1-backgroundPoint[1]],
   threshold:numeric('tolerance')
  });
  field=createObservedImplicitVolume({...mask,sourceSHA256:sourceSHA},{maxGrid:96,halfDepth:.13});
  if($('deform').checked){
   body=createAIG72VolumeBody(field,{nx:4,ny:5,nz:3,gravity:0});
   for(let i=0;i<12;i++)stepAIG72Volume(body,{dt:1/60,iterations:4,tipX:.055,tipZ:.015});
  }
  controls();requestDraw();
  status('已建立來源照片對應的 XYZ SDF 表面'+(body?'與 7.2 三維體積變形':'')+'。'+
   (reviewed?'臉框已確認，妝容可疊加。':'臉框尚未確認，妝容保持關閉。')+
   '\n只有正面使用原圖，側面／背面為中性推估。',true);
 }catch(e){field=null;body=null;controls();requestDraw();status('BLOCKED：照片輪廓或 3D 表面建構失敗 '+String(e.message||e));}
}
async function hashSource(file){
 if(!globalThis.crypto?.subtle)return null;
 const d=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(d),v=>v.toString(16).padStart(2,'0')).join('');
}
$('source').addEventListener('change',async()=>{
 const token=++generation,file=$('source').files?.[0];
 photo=null;field=null;body=null;sourceSHA=null;reviewed=false;renderFrame=null;baseImageCanvas=null;controls();requestDraw();
 if(!file)return;
 if(file.size===0||file.size>20*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
  status('BLOCKED：僅接受小於 20 MB 的 PNG、JPG 或 WebP。');return;
 }
 let bitmap=null;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const factor=Math.min(1,Math.sqrt(500000/(bitmap.width*bitmap.height)));
  const w=Math.round(bitmap.width*factor),h=Math.round(bitmap.height*factor);
  if(w<32||h<32)throw Error('SOURCE_IMAGE_TOO_SMALL');
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;
  const cx=cv.getContext('2d',{willReadFrequently:true});cx.clearRect(0,0,w,h);cx.drawImage(bitmap,0,0,w,h);
  const data=cx.getImageData(0,0,w,h);
  const observed={width:w,height:h,data:data.data};
  const sourceDigest=await hashSource(file).catch(()=>null);
  if(generation!==token)return;
  photo=observed;baseImageCanvas=cv;sourceSHA=sourceDigest;backgroundPoint=[0,0];
  setROI({x:.27,y:.16,width:.46,height:.64});
  controls();drawPreview();
  faceProposal='DEFAULT_CENTRAL_FACE_BOX_UNVERIFIED';
  status('已讀取真實來源像素 '+w+'×'+h+'；請確認臉框位置。未確認前不會自動化妝。',true);
  // Native browser detection is only an optional, untrusted proposal.
  const detection=await detectAIG67BrowserFace(bitmap,{timeoutMs:1600});
  if(generation!==token)return;
  if(detection.verified&&detection.box){
   const b=detection.box;
   setROI({x:b.x/bitmap.width,y:b.y/bitmap.height,width:b.width/bitmap.width,height:b.height/bitmap.height});
   faceProposal='BROWSER_FACE_DETECTOR_RECTANGLE_USER_REVIEW_REQUIRED';
   $('face-evidence').textContent='瀏覽器提出臉框候選；請目視核對並確認。這不代表眼睛、嘴巴已識別。';
  }else{
   faceProposal='NO_TRUSTED_AUTOMATIC_FACE_BOX_'+detection.reason;
   $('face-evidence').textContent='無可靠自動臉框（'+detection.reason+'）。請用四個滑桿定位、再確認；不要誤當作 AI 已辨識。';
  }
 }catch(e){
  if(generation===token){photo=null;controls();status('BLOCKED：來源讀圖失敗：'+String(e.message||e));}
 }finally{bitmap?.close();}
});
$('segment').addEventListener('change',()=>{field=null;body=null;controls();requestDraw();status('前景分割已更改，需重新建立 3D 材質。');});
$('photo-view').addEventListener('pointerdown',e=>{
 if(!photo||$('segment').value!=='background')return;
 const rect=preview.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/rect.width*photo.width),y=Math.floor((e.clientY-rect.top)/rect.height*photo.height);
 backgroundPoint=[clamp(x,0,photo.width-1),clamp(y,0,photo.height-1)];
 field=null;body=null;controls();requestDraw();
 status('已選背景像素 ('+backgroundPoint.join(',')+')，按建立三維來源材質。');
});
for(const id of ['face-x','face-y','face-w','face-h'])$(id).addEventListener('input',invalidateFace);
$('confirm').addEventListener('click',()=>{
 if(!photo)return;
 try{
  validateAIG73FaceROI(photo,selectedROI(),{reviewed:true,sourceSHA256:sourceSHA});
  reviewed=true;controls();drawPreview();requestDraw();
  $('face-evidence').textContent='使用者已確認照片臉框；內部五官位置仍是可調預設，沒有宣稱臉部三維掃描完成。';
  status('臉部位置已確認，可看到照片正面妝容；側面和背面不複製另一張人臉。',true);
 }catch(e){reviewed=false;controls();status('BLOCKED：臉框無效 '+String(e.message||e));}
});
$('build').addEventListener('click',buildGeometry);
$('deform').addEventListener('change',()=>{if(field)buildGeometry();});
for(const name of cosmeticIDs){
 for(const suffix of ['color','strength'])$(name+'-'+suffix).addEventListener('input',requestDraw);
}
for(const id of ['eye-height','lip-height','yaw','pitch'])$(id).addEventListener('input',requestDraw);
$('clear').addEventListener('click',()=>{
 for(const n of cosmeticIDs)$(n+'-strength').value='0';
 requestDraw();status('已將妝容強度全部歸零，照片來源與三維體積保持不變。',true);
});
$('export').addEventListener('click',()=>{
 if(!field)return;
 writeReport();
 const blob=new Blob([$('evidence').textContent+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='AIG-FastModel-7-3-PHOTO-MAKEUP-EVIDENCE.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
screen.addEventListener('pointerdown',e=>{
 if(!field)return;
 drag={x:e.clientX,y:e.clientY,yaw:numeric('yaw'),pitch:numeric('pitch')};
 screen.setPointerCapture(e.pointerId);
});
screen.addEventListener('pointermove',e=>{
 if(!drag)return;
 $('yaw').value=String(clamp(drag.yaw+(e.clientX-drag.x)*.012,-3.14,3.14));
 $('pitch').value=String(clamp(drag.pitch-(e.clientY-drag.y)*.012,-1.1,1.1));
 requestDraw();
});
screen.addEventListener('pointerup',()=>drag=null);
screen.addEventListener('pointercancel',()=>drag=null);
window.addEventListener('resize',resize,{passive:true});
controls();resize();
