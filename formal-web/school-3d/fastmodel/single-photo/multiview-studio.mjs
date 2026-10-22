/** FastModel 7.10: two real decoded video frames, user-reviewed stereo
 * correspondences, physical XYZ mm and bounded incremental 3D observation.
 * Decline geometry when calibrated rectification cannot be established.
 */
import {createAIG710Calibration,createAIG710Fusion,addAIG710StereoMatch,
 summarizeAIG710Fusion,exportAIG710Fusion,importAIG710Fusion}
 from './aig-multiview-fusion-7-10.mjs';
const $=id=>document.getElementById(id),video=$('video');
const canvases={a:$('frame-a'),b:$('frame-b')};
const contexts={a:canvases.a.getContext('2d'),b:canvases.b.getContext('2d')};
const cloud=$('cloud'),cloudContext=cloud.getContext('2d');
let file=null,objectURL=null,sourceId=null,frames={a:null,b:null},
 marked={a:null,b:null},fusion=null,drawVersion=0;
const good=(s,ok=false)=>{$('status').textContent=s;$('status').dataset.ok=ok?'true':'false';};
const numeric=id=>Number($(id).value);
const hasCalibration=()=>Boolean($('calibrated').checked&&$('rectified').checked&&
 $('focal').value.trim()&&$('baseline').value.trim());
function controls(){
 const ready=Boolean(file&&sourceId&&video.readyState>=1);
 for(const tag of ['a','b'])$('capture-'+tag).disabled=!ready;
 $('add').disabled=!(sourceId&&frames.a&&frames.b&&marked.a&&marked.b&&hasCalibration());
 $('save').disabled=!fusion||fusion.features.size===0;
 $('match-status').textContent='A：'+(marked.a?marked.a.x.toFixed(1)+','+marked.a.y.toFixed(1):'待標記')+
  '　B：'+(marked.b?marked.b.x.toFixed(1)+','+marked.b.y.toFixed(1):'待標記')+
  '。請確認兩次都是同一個實際位置。';
}
function clearFrames(){
 frames={a:null,b:null};marked={a:null,b:null};
 for(const tag of ['a','b']){const c=canvases[tag],x=contexts[tag];
  x.fillStyle='#010915';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#accbd9';x.fillText('尚未擷取影格 '+tag.toUpperCase(),14,27);
  $('label-'+tag).textContent='尚未擷取';
 }
 controls();
}
function drawFrame(tag){
 const f=frames[tag],c=canvases[tag],ctx=contexts[tag];
 if(!f)return;
 ctx.putImageData(f.pixels,0,0);
 const p=marked[tag];if(p){
  ctx.lineWidth=2;ctx.strokeStyle='#74f6d0';
  ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(p.x-11,p.y);ctx.lineTo(p.x+11,p.y);
  ctx.moveTo(p.x,p.y-11);ctx.lineTo(p.x,p.y+11);ctx.stroke();
 }
}
function refresh(){
 const summary=fusion?summarizeAIG710Fusion(fusion):null;
 $('evidence').textContent=JSON.stringify(summary||{
  status:'NO_CALIBRATED_XYZ_POINTS',physicalDepthMeasured:false,
  cameraCalibrationAutomaticallySolved:false,modelMeshGenerated:false},null,2);
 const body=$('point-table');body.replaceChildren();
 if(!fusion||fusion.features.size===0){
  const tr=document.createElement('tr'),td=document.createElement('td');
  td.colSpan=5;td.textContent='尚無通過幾何 Gate 的量測點';tr.append(td);body.append(tr);
 }else{
  for(const p of fusion.features.values()){
   const tr=document.createElement('tr');
   for(const v of [p.label,...p.xyzMm.map(x=>x.toFixed(2)),p.observations]){
    const td=document.createElement('td');td.textContent=String(v);tr.append(td);
   }body.append(tr);
  }
 }
 drawCloud();controls();
}
function drawCloud(){
 const ctx=cloudContext,w=cloud.width,h=cloud.height;
 ctx.fillStyle='#020b14';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle='#244255';ctx.lineWidth=1;
 for(let i=0;i<12;i++){
  const y=30+i*34;ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(w-10,y);ctx.stroke();
 }
 const points=fusion?Array.from(fusion.features.values()):[];
 if(!points.length){
  ctx.fillStyle='#a9d0db';ctx.font='18px sans-serif';
  ctx.fillText('等待已校準影片視差 XYZ 點雲',24,h/2);
  return;
 }
 const raw=points.map(p=>p.xyzMm);
 const center=[0,1,2].map(i=>raw.reduce((s,p)=>s+p[i],0)/raw.length),
  span=Math.max(50,...raw.flatMap(p=>p.map((v,i)=>Math.abs(v-center[i]))))*2;
 const spin=numeric('orbit'),scale=numeric('scale'),co=Math.cos(spin),si=Math.sin(spin);
 const projected=points.map(p=>{
  const x=p.xyzMm[0]-center[0],y=p.xyzMm[1]-center[1],z=p.xyzMm[2]-center[2];
  return {name:p.label,x:w/2+(x*co+z*si)*w*.8*scale/span,
   y:h/2-y*h*.8*scale/span,depth:-x*si+z*co,mm:p.xyzMm};
 }).sort((a,b)=>b.depth-a.depth);
 for(const p of projected){
  ctx.beginPath();ctx.arc(p.x,p.y,7,0,2*Math.PI);ctx.fillStyle='#72efcf';ctx.fill();
  ctx.strokeStyle='#164c65';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#d2f5fd';ctx.font='15px sans-serif';
  ctx.fillText(p.name+'  Z '+p.mm[2].toFixed(1)+' mm',p.x+11,p.y-7);
 }
 ctx.fillStyle='#9cbbcb';ctx.font='14px sans-serif';
 ctx.fillText('原點 = 校準相機 A；Z = 深度 mm（僅校準正確才有物理意義）',15,h-14);
}
async function sha(blob){
 if(blob.size>64*1024*1024)throw Error('VIDEO_OVER_64MB_SOURCE_SHA_UNVERIFIED');
 if(!crypto?.subtle)throw Error('CRYPTO_SHA_UNAVAILABLE');
 const dig=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
 return 'sha256:'+Array.from(dig,v=>v.toString(16).padStart(2,'0')).join('');
}
function waitFor(target,event,timeoutMs=15000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{target.removeEventListener(event,done);reject(Error('VIDEO_EVENT_TIMEOUT_'+event));},timeoutMs);
  function done(){clearTimeout(timer);target.removeEventListener(event,done);resolve();}
  target.addEventListener(event,done,{once:true});
 });
}
$('source').addEventListener('change',async()=>{
 const selected=$('source').files?.[0],stamp=++drawVersion;
 if(objectURL)URL.revokeObjectURL(objectURL);
 file=null;sourceId=null;objectURL=null;fusion=null;clearFrames();refresh();
 if(!selected)return;
 if(!selected.type.startsWith('video/')||selected.size<1||selected.size>64*1024*1024){
  good('BLOCKED：7.10 必須先以完整 SHA-256 證明來源；此頁接受 64MB 以下的影片。');return;
 }
 try{
  const digest=await sha(selected);
  if(stamp!==drawVersion)return;
  file=selected;sourceId=digest;objectURL=URL.createObjectURL(selected);
  video.src=objectURL;video.load();controls();
  good('來源影片 SHA-256 已確認。請選兩個有實際量測平移的影格。',true);
 }catch(e){good('BLOCKED：影片來源驗證失敗：'+String(e.message||e));}
});
video.addEventListener('loadedmetadata',()=>{
 if(!video.videoWidth||!video.videoHeight)return;
 const w=320,h=Math.round(320*video.videoHeight/video.videoWidth);
 if(h<32||h>1000){good('BLOCKED：影片長寬比不支援相機校準。');return;}
 for(const tag of ['a','b']){canvases[tag].width=w;canvases[tag].height=h;}
 clearFrames();controls();
 good('影片 '+video.videoWidth+'×'+video.videoHeight+
  '，測量座標已縮放為 '+w+'×'+h+'。焦距請填**此測量座標尺寸**的校準值。',true);
});
video.addEventListener('error',()=>good('BLOCKED：瀏覽器無法解碼選取的影片。'));
async function capture(tag){
 if(!file||!sourceId||video.readyState<1)return;
 const sec=numeric('time-'+tag);
 if(!Number.isFinite(sec)||sec<0||!Number.isFinite(video.duration)||sec>=video.duration){
  good('BLOCKED：影格 '+tag.toUpperCase()+' 的影片時間必須介於 0 與影片結尾之間。');return;
 }
 try{
  video.pause();
  // Seeking works from real file-backed decoded HTMLVideoElement.
  const future=waitFor(video,'seeked');
  video.currentTime=sec;await future;
  if(video.readyState<2)await waitFor(video,'loadeddata');
  const c=canvases[tag],ctx=contexts[tag];
  ctx.drawImage(video,0,0,c.width,c.height);
  frames[tag]={pixels:ctx.getImageData(0,0,c.width,c.height),
   timeMs:Math.round(video.currentTime*1000),id:'video-'+Math.round(video.currentTime*1000)};
  marked[tag]=null;drawFrame(tag);
  $('label-'+tag).textContent='來源時刻 '+video.currentTime.toFixed(3)+' 秒　'+c.width+'×'+c.height;
  controls();good('已擷取影格 '+tag.toUpperCase()+'；請在兩張影格點同一個來源特徵。',true);
 }catch(e){good('BLOCKED：擷取影片影格失敗 '+String(e.message||e));}
}
for(const tag of ['a','b']){
 $('capture-'+tag).addEventListener('click',()=>capture(tag));
 canvases[tag].addEventListener('pointerdown',e=>{
  if(!frames[tag])return;
  const c=canvases[tag],rect=c.getBoundingClientRect(),
   scaleX=c.width/rect.width,scaleY=c.height/rect.height;
  marked[tag]={x:Math.min(c.width-1,Math.max(0,(e.clientX-rect.left)*scaleX)),
   y:Math.min(c.height-1,Math.max(0,(e.clientY-rect.top)*scaleY))};
  drawFrame(tag);controls();
 });
}
function readCalibration(){
 if(!hasCalibration()||!sourceId||!frames.a||!frames.b)
  throw Error('EXPLICIT_USER_CALIBRATION_AND_SOURCE_REQUIRED');
 return createAIG710Calibration({width:canvases.a.width,height:canvases.a.height,
  focalPx:numeric('focal'),baselineMm:numeric('baseline'),
  calibrationReviewed:true,rectifiedParallelReviewed:true,sourceId});
}
$('add').addEventListener('click',()=>{
 try{
  const c=readCalibration();
  if(!fusion)fusion=createAIG710Fusion(c);
  if(fusion.calibration.focalPx!==c.focalPx||fusion.calibration.baselineMm!==c.baselineMm||
    fusion.calibration.width!==c.width||fusion.calibration.height!==c.height||
    fusion.calibration.sourceId!==c.sourceId)throw Error('FUSION_CALIBRATION_CHANGED_CLEAR_WORK_COPY_FIRST');
  const label=$('feature').value.trim();
  const o=addAIG710StereoMatch(fusion,{
   label,frameAId:frames.a.id,frameBId:frames.b.id,
   timeAMs:frames.a.timeMs,timeBMs:frames.b.timeMs,
   left:marked.a,right:marked.b,reviewed:true
  });
  good('已接受 '+o.label+' 的校準 XYZ：'+o.xyzMm.map(v=>v.toFixed(2)).join(' / ')+
    ' mm。通過對應點、正視差與重投影 Gate。',true);
  marked={a:null,b:null};drawFrame('a');drawFrame('b');refresh();
 }catch(e){good('BLOCKED：不能將此配對加入三維模型：'+String(e.message||e));}
});
$('clear').addEventListener('click',()=>{
 fusion=null;marked={a:null,b:null};
 for(const tag of ['a','b'])drawFrame(tag);
 refresh();good('已清空本次 XYZ 工作副本，原始影片沒有修改。',true);
});
$('orbit').addEventListener('input',drawCloud);
$('scale').addEventListener('input',drawCloud);
for(const name of ['calibrated','rectified','focal','baseline'])$(name).addEventListener('change',controls);
$('save').addEventListener('click',()=>{
 if(!fusion)return;
 const value=JSON.stringify(exportAIG710Fusion(fusion),null,2)+'\n',
  url=URL.createObjectURL(new Blob([value],{type:'application/json'})),
  a=document.createElement('a');
 a.href=url;a.download='FastModel-7-10-calibrated-video-XYZ.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
 good('三維證據已匯出；不包含任何來源影片畫素，也不是完整人物模型。',true);
});
$('restore').addEventListener('change',async()=>{
 const blob=$('restore').files?.[0];if(!blob)return;
 try{
  if(blob.size<1||blob.size>300000)throw Error('3D_EVIDENCE_JSON_SIZE_INVALID');
  if(!sourceId)throw Error('VERIFIED_VIDEO_SOURCE_REQUIRED');
  const candidate=importAIG710Fusion(JSON.parse(await blob.text()),{requiredSourceId:sourceId});
  if(candidate.calibration.width!==canvases.a.width||
    candidate.calibration.height!==canvases.a.height)throw Error('CAMERA_FRAME_RESOLUTION_DIFFERENT');
  fusion=candidate;
  $('focal').value=String(fusion.calibration.focalPx);
  $('baseline').value=String(fusion.calibration.baselineMm);
  $('calibrated').checked=true;$('rectified').checked=true;
  refresh();good('已從匹配點重新計算並驗證同來源 XYZ；沒有直接信任 JSON 內的三維座標。',true);
 }catch(e){good('BLOCKED：不能匯入不同影片、未校準或被修改的三維證據：'+String(e.message||e));}
 finally{$('restore').value='';}
});
window.addEventListener('pagehide',()=>{
 if(objectURL)URL.revokeObjectURL(objectURL);
 video.pause();video.removeAttribute('src');
});
clearFrames();refresh();
