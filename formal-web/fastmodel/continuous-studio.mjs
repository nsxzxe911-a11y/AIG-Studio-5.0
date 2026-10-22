/** FastModel 7.9 | real local camera/file continuous scanning and adaptive
 * keyframes. Never upload source or pretend unsolved angle/depth is 3D truth.
 */
import {createAIG79ContinuousScan,setAIG79ScanState,scanAIG79Frame,
 summarizeAIG79Scan,exportAIG79Memory,importAIG79Memory} from './aig-continuous-scan-7-9.mjs';
const $=id=>document.getElementById(id),video=$('video'),canvas=$('preview'),
 ctx=canvas.getContext('2d',{alpha:false}),scratch=document.createElement('canvas'),
 sx=scratch.getContext('2d',{willReadFrequently:true});
let file=null,objectURL=null,sourceId=null,sourceVerified=false,
 stream=null,session=null,mode=null,running=false,frameCallback=null,
 requestToken=0,scanStart=0,thumbs=new Map(),lastThumbnail=0;
const finite=Number.isFinite;
function status(value,pass=false){
 $('status').textContent=value;$('status').dataset.ok=pass?'true':'false';
}
function config(){return {maxKeyframes:Number($('max').value),minIntervalMs:Number($('period').value),
 noveltyThreshold:Number($('novelty').value)};}
function pose(){
 if(!$('angle-approved').checked)return null;
 const yaw=Number($('yaw').value),pitch=Number($('pitch').value);
 if(!finite(yaw)||!finite(pitch)||Math.abs(yaw)>180||Math.abs(pitch)>90)throw Error('MANUAL_POSE_OUT_OF_RANGE');
 return {yaw:yaw*Math.PI/180,pitch:pitch*Math.PI/180,reviewed:true};
}
function emptyCanvas(){
 ctx.fillStyle='#020b14';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#80cbdc';ctx.textAlign='center';ctx.font='18px sans-serif';
 ctx.fillText('FastModel 7.9 連續來源影格',canvas.width/2,canvas.height/2);
 ctx.textAlign='start';
}
function drawPreview(){
 ctx.fillStyle='#020b14';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(video.readyState<2||!video.videoWidth||!video.videoHeight)return;
 const scale=Math.min(canvas.width/video.videoWidth,canvas.height/video.videoHeight),
  w=Math.round(video.videoWidth*scale),h=Math.round(video.videoHeight*scale);
 ctx.drawImage(video,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
 ctx.fillStyle='#01121cdd';ctx.fillRect(0,0,canvas.width,38);
 ctx.fillStyle='#a0edff';ctx.font='17px sans-serif';
 ctx.fillText('FastModel 7.9 • '+(mode==='camera'?'CAMERA':'VIDEO')+
  ' • '+(session?.state||'ready'),14,25);
}
function displayStats(){
 const data=session?summarizeAIG79Scan(session):null;
 $('seen').textContent=String(data?.framesSeen??0);
 $('accepted').textContent=String(data?.framesAccepted??0);
 $('rejected').textContent=String(data?.framesRejected??0);
 $('capacity').textContent=(data?.cacheSize??0)+'/'+(data?.cacheLimit??Number($('max').value));
 $('evidence').textContent=JSON.stringify(data||{
  schema:'AIG_FASTMODEL_7_9_CONTINUOUS_VIDEO_KEYFRAME_MEMORY',state:'ready',
  cameraPoseSolvedAutomatically:false,full3DHeadRecovered:false},null,2);
 if(!session){$('keyframes').replaceChildren();return;}
 const retained=new Set(session.keyframes.map(k=>k.id));
 for(const id of Array.from(thumbs.keys()))if(!retained.has(id))thumbs.delete(id);
 const frag=document.createDocumentFragment();
 for(const k of session.keyframes.slice().sort((a,b)=>a.atMs-b.atMs)){
  const card=document.createElement('div');card.className='frame';
  const img=document.createElement('img');img.alt='本機影格 '+k.id;
  img.src=thumbs.get(k.id)||'';
  card.append(img);
  const caption=document.createElement('small');
  caption.textContent='#'+k.id+' · '+(k.atMs/1000).toFixed(1)+'s'+
    '｜細節 '+k.quality.sharpness.toFixed(3)+
    (k.pose.reviewed?'｜角度已確認':'｜角度未測量');
  card.append(caption);frag.append(card);
 }
 $('keyframes').replaceChildren(frag);
}
function controls(){
 $('video-start').disabled=!(file&&objectURL&&mode!=='camera'&&!running);
 $('camera-start').disabled=running;
 $('pause').disabled=!session||session.state==='stopped';
 $('pause').textContent=session?.state==='paused'?'繼續掃描':'暫停掃描';
 $('stop').disabled=!running;
 $('save').disabled=!session||session.keyframes.length<1;
}
function clearVideoCallback(){
 if(frameCallback!==null){
  try{if(typeof video.cancelVideoFrameCallback==='function')video.cancelVideoFrameCallback(frameCallback);
   else cancelAnimationFrame(frameCallback);}catch{}
  frameCallback=null;
 }
}
function stop({clearSource=false}={}){
 ++requestToken;running=false;clearVideoCallback();
 if(stream){for(const t of stream.getTracks())t.stop();stream=null;}
 if(session&&session.state!=='stopped')setAIG79ScanState(session,'stopped');
 video.pause();
 if(video.srcObject)video.srcObject=null;
 if(clearSource){
  if(objectURL)URL.revokeObjectURL(objectURL);
  objectURL=null;file=null;sourceId=null;sourceVerified=false;
  video.removeAttribute('src');video.load();mode=null;
 }
 controls();displayStats();
}
function startSession(sourceMode){
 session=createAIG79ContinuousScan({mode:sourceMode,sourceId,config:config()});
 thumbs.clear();running=true;mode=sourceMode;scanStart=performance.now();
 setAIG79ScanState(session,'scanning');lastThumbnail=0;
 controls();displayStats();
}
function schedule(){
 if(!running||session?.state!=='scanning')return;
 if(typeof video.requestVideoFrameCallback==='function'){
  frameCallback=video.requestVideoFrameCallback(()=>{frameCallback=null;consume();schedule();});
 }else{
  frameCallback=requestAnimationFrame(()=>{frameCallback=null;consume();schedule();});
 }
}
function consume(){
 if(!running||session?.state!=='scanning'||video.readyState<2)return;
 if(!video.videoWidth||!video.videoHeight)return;
 // At most 128x128 source pixels are analyzed; source video resolution need
 // not be upscaled or decoded into a huge RGBA array by our algorithm.
 const side=Number($('scale').value),width=side,height=side;
 if(scratch.width!==width)scratch.width=width;
 if(scratch.height!==height)scratch.height=height;
 sx.clearRect(0,0,width,height);
 sx.drawImage(video,0,0,width,height);
 let timeMs=mode==='video'?Math.max(0,video.currentTime*1000):Math.max(0,performance.now()-scanStart);
 try{
  const e=scanAIG79Frame(session,{
   image:sx.getImageData(0,0,width,height),timeMs,pose:pose()
  });
  if(e.accepted){
   thumbs.set(e.id,scratch.toDataURL('image/webp',.62));
   if(e.replacedId!==null)thumbs.delete(e.replacedId);
   lastThumbnail=e.id;
  }
  drawPreview();
  if(e.accepted||session.framesSeen%6===0){displayStats();controls();}
 }catch(err){
  stop();status('BLOCKED：來源影格解析或模型快取不安全：'+String(err.message||err));
 }
}
async function sourceDigest(blob){
 if(blob.size>64*1024*1024||!crypto?.subtle)return null;
 const buf=await blob.arrayBuffer(),hash=await crypto.subtle.digest('SHA-256',buf);
 return 'sha256:'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
}
$('file').addEventListener('change',async()=>{
 const selected=$('file').files?.[0],token=++requestToken;
 stop({clearSource:true});
 if(!selected)return;
 if(!selected.type.startsWith('video/')||selected.size<1||selected.size>300*1024*1024){
  status('BLOCKED：只接受 300 MB 以內的本機影片；影片格式仍需瀏覽器支援。');return;
 }
 file=selected;objectURL=URL.createObjectURL(selected);mode='video';
 video.src=objectURL;video.muted=true;video.loop=false;video.playsInline=true;
 video.load();
 try{
  const digest=await sourceDigest(selected);
  if(token!==requestToken-1)return; // stop() advanced source generation once
  sourceId=digest;sourceVerified=!!digest;
  status('已選本機影片 '+selected.name+'；'+
   (sourceVerified?'完整來源 SHA-256 已計算，可核對記憶檔。':'影片較大；來源 SHA 未完整驗證，不建議跨工作階段匯入。')+
   ' 按「掃描影片」開始。',true);
 }catch(err){sourceId=null;sourceVerified=false;status('來源 SHA 驗證失敗；仍可於本次工作階段連續掃描。');}
 controls();
});
video.addEventListener('loadedmetadata',()=>{
 controls();status('影片可解碼：'+video.videoWidth+'×'+video.videoHeight+
 '，長度 '+(finite(video.duration)?video.duration.toFixed(1)+' 秒':'未知')+'。',true);
});
video.addEventListener('error',()=>{
 if(file)status('BLOCKED：瀏覽器無法解碼此影片，請改用支援的 MP4 或 WebM。');
});
video.addEventListener('ended',()=>{
 if(mode==='video'&&running){stop();status('影片已掃描至結尾，保留本輪關鍵影格摘要。',true);}
});
$('video-start').addEventListener('click',async()=>{
 if(!file||!objectURL||running)return;
 if(video.readyState<1){status('影片尚未完成載入。');return;}
 startSession('video');
 try{
  video.currentTime=0;await video.play();schedule();
  status('本機影片連續掃描中：依新畫面、細節與亮度自動選取關鍵影格。',true);
 }catch(err){stop();status('BLOCKED：無法播放本機影片：'+String(err.message||err));}
});
$('camera-start').addEventListener('click',async()=>{
 if(running)return;
 stop({clearSource:false});
 if(!navigator.mediaDevices?.getUserMedia){status('BLOCKED：瀏覽器不支援安全相機介面（需要 HTTPS 或本機 localhost）。');return;}
 try{
  stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'environment',
   width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
  video.removeAttribute('src');video.srcObject=stream;video.muted=true;video.playsInline=true;
  sourceId=null;sourceVerified=false;
  await video.play();startSession('camera');schedule();
  status('相機即時連續掃描中；影格只在本機記憶體分析，按「停止」會關閉鏡頭。',true);
 }catch(err){stop();status('BLOCKED：相機開啟失敗或未獲授權：'+String(err.name||err));}
});
$('pause').addEventListener('click',()=>{
 if(!session||session.state==='stopped')return;
 if(session.state==='scanning'){
  setAIG79ScanState(session,'paused');clearVideoCallback();
  if(mode==='video')video.pause();
  status('連續掃描已暫停，原本接受的關鍵影格仍保留。',true);
 }else{
  setAIG79ScanState(session,'scanning');
  if(mode==='video')video.play().catch(e=>status('影片續播失敗：'+String(e.message||e)));
  schedule();status('已接回本次掃描與關鍵影格記憶。',true);
 }
 controls();displayStats();
});
$('stop').addEventListener('click',()=>{stop();status('已停止連續掃描；相機權限已釋放，本輪摘要仍可匯出。',true);});
$('clear').addEventListener('click',()=>{
 stop();session=null;thumbs.clear();emptyCanvas();displayStats();controls();
 status('本輪暫存的觀測摘要已清空，原始影片／照片未刪除。',true);
});
function saveText(name,data){
 const url=URL.createObjectURL(new Blob([data],{type:'application/json'})),
  a=document.createElement('a');a.download=name;a.href=url;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1800);
}
$('save').addEventListener('click',()=>{
 if(!session||!session.keyframes.length)return;
 const out=exportAIG79Memory(session);
 saveText('AIG-FastModel-7-9-local-frame-memory.json',JSON.stringify(out,null,2)+'\n');
 status('已匯出關鍵影格描述子與來源憑證；不含影片、相機影像或真正訓練好的 3D 模型。',true);
});
$('load').addEventListener('change',async()=>{
 const blob=$('load').files?.[0];if(!blob)return;
 try{
  if(running)throw Error('STOP_CURRENT_SCAN_FIRST');
  if(!sourceVerified||!sourceId)throw Error('VERIFIED_LOCAL_SOURCE_REQUIRED');
  if(blob.size<1||blob.size>180000)throw Error('MEMORY_JSON_TOO_LARGE');
  const snapshot=JSON.parse(await blob.text());
  session=importAIG79Memory(snapshot,{requiredSourceId:sourceId});
  thumbs.clear();mode=session.mode;
  displayStats();controls();
  status('已讀回與目前影片 SHA-256 相符的有限容量觀測記憶，未讀回未經保存的原始影格。',true);
 }catch(err){status('BLOCKED：無法核對記憶檔或來源不同：'+String(err.message||err));}
 finally{$('load').value='';}
});
for(const id of ['max','period','novelty','scale'])$(id).addEventListener('change',()=>{
 if(session){status('新掃描設定在下次建立工作階段時生效。',true);}
 else displayStats();
});
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&running){
  if(mode==='camera'){stop();status('離開畫面後已自動關閉相機，避免背景掃描。',true);}
  else if(session?.state==='scanning'){
   setAIG79ScanState(session,'paused');clearVideoCallback();video.pause();controls();displayStats();
  }
 }
});
window.addEventListener('pagehide',()=>stop());
emptyCanvas();displayStats();controls();
