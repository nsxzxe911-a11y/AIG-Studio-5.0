/**
 * AIG FastModel Cinema "Star Journey" standalone preview runtime V1.
 * Real browser file pickers, canvas animation, imported GLB real geometry,
 * timeline seek/transport, PNG and video-only WebM via MediaRecorder.
 * NOT photo->human 3D, AI generation, 3D skeleton animation or audio mix.
 * Uses local user-owned file bytes; no uploads or external CDNs.
 */
import {buildAIGReal3DGLBStatic} from '../../shared-3d/aig-real3d-glb-native-mesh.mjs';
import {createAIG3DRenderer} from '../../shared-3d/aig-real3d-webgl.mjs';

const $=id=>document.getElementById(id);
const stage=$('screen'),ctx=stage.getContext('2d',{alpha:false});
const THREE_D=$('glb-screen'),INPUT_LIMIT=65_000_000;
const state={
 clips:[],mode:'2D',active:0,time:0,playing:false,lastTs:0,
 glb:null,renderer:null,glbSourceName:null,glbOrbit:0,glow:15,motion:25,
 subtitle:'',audioObjectURL:null,recording:null,busy:false,
 activeVideo:null
};
const ownUrls=new Set();
const releaseURL=u=>{if(!u)return;URL.revokeObjectURL(u);ownUrls.delete(u);};
const urlFor=f=>{const u=URL.createObjectURL(f);ownUrls.add(u);return u;};
const setStatus=(message,ok=false)=>{
 $('feedback').textContent=message;$('feedback').dataset.ok=String(ok);
};
function format(t){
 const s=Math.max(0,Math.floor(t||0));
 return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}
function duration(){return state.clips.reduce((sum,c)=>sum+c.duration,0);}
function clipAt(time){
 if(!state.clips.length)return null;
 let start=0;
 for(let i=0;i<state.clips.length;i++){
  const clip=state.clips[i],end=start+clip.duration;
  if(time<end||i===state.clips.length-1)
   return {clip,index:i,offset:Math.min(clip.duration,Math.max(0,time-start)),start};
  start=end;
 }
 return null;
}
function currentMedia(){
 return clipAt(Math.min(Math.max(0,state.time),Math.max(.001,duration()-1e-3)));
}
function resetOtherVideos(active){
 for(const c of state.clips)if(c.type==='video'&&c.video!==active){
  try{c.video.pause();}catch{}
 }
}
function synchronizeVideo(at){
 const current=at?.clip?.type==='video'?at.clip.video:null;
 if(state.activeVideo!==current){
  resetOtherVideos(current);
  state.activeVideo=current;
 }
 if(!current)return;
 if(current.readyState>=1){
  const t=Math.min(Math.max(0,at.offset),Math.max(0,current.duration-.06));
  if(Math.abs(current.currentTime-t)>.13&&(!current.seeking)){
   try{current.currentTime=t;}catch{}
  }
 }
 if(state.playing&&current.paused){
  const promise=current.play();
  promise?.catch(()=>setStatus('影片聲軌無法自動播放；畫面仍可檢視。',false));
 }else if(!state.playing&&!current.paused)current.pause();
}
function drawCover(img,w,h,progress){
 const iw=img.videoWidth||img.naturalWidth||img.width,
  ih=img.videoHeight||img.naturalHeight||img.height;
 if(!iw||!ih)return;
 const base=Math.max(w/iw,h/ih),parallax=state.mode==='2_5D',
  zoom=1+Math.max(0,state.motion)/100*(parallax?.12:.075)*progress,
  dw=iw*base*zoom,dh=ih*base*zoom;
 let x=(w-dw)/2,y=(h-dh)/2;
 if(parallax){x+=(progress-.5)*state.motion/100*w*.065;
  y+=Math.sin(progress*Math.PI)*state.motion/100*h*.038;}
 ctx.drawImage(img,x,y,dw,dh);
}
function introCanvas(){
 const w=stage.width,h=stage.height;
 const grd=ctx.createLinearGradient(0,0,w,h);
 grd.addColorStop(0,'#0c1539');grd.addColorStop(.56,'#071c36');
 grd.addColorStop(1,'#030710');ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);
 ctx.save();
 let seed=12971;
 for(let n=0;n<115;n++){
  seed=(seed*1664525+1013904223)>>>0;const x=(seed%10000)/10000*w;
  seed=(seed*1664525+1013904223)>>>0;const y=(seed%10000)/10000*h;
  seed=(seed*1664525+1013904223)>>>0;const r=.4+(seed%15)/12;
  ctx.fillStyle=n%9===0?'#ae91fc':'#c5eeff';
  ctx.globalAlpha=.20+(seed%60)/100;
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
 const aura=ctx.createRadialGradient(w*.60,h*.39,0,w*.60,h*.39,w*.42);
 aura.addColorStop(0,'#1e72a65e');aura.addColorStop(1,'#03101900');
 ctx.fillStyle=aura;ctx.fillRect(0,0,w,h);
 ctx.textAlign='center';ctx.fillStyle='#e1efff';
 ctx.font='bold '+Math.round(w/13)+'px system-ui';
 ctx.fillText('星際之旅',w/2,h*.50);
 ctx.fillStyle='#a6c5d8';ctx.font=Math.round(w/49)+'px system-ui';
 ctx.fillText('匯入圖片／影片或 3D GLB，建立真正的預覽',w/2,h*.60);
 ctx.font=Math.round(w/66)+'px system-ui';
 ctx.fillText('此畫面是工作區起始背景，不是已製作完成的電影',w/2,h*.69);
}
function drawSubtitle(){
 const line=state.subtitle.trim();if(!line)return;
 const w=stage.width,h=stage.height,fontsize=Math.max(18,Math.round(w*.025));
 const lines=line.split(/\n+/).slice(0,3);
 const rowH=fontsize*1.35,boxH=lines.length*rowH+fontsize*.7;
 ctx.fillStyle='#000b';ctx.fillRect(w*.09,h*.86-boxH/2,w*.82,boxH);
 ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='600 '+fontsize+'px system-ui';
 ctx.shadowColor='#000';ctx.shadowBlur=7;
 lines.forEach((t,i)=>ctx.fillText(t.slice(0,55),w/2,h*.86-boxH/2+fontsize*1.13+i*rowH,w*.76));
 ctx.shadowBlur=0;
}
function drawFrame(){
 if(state.mode==='3D'&&state.glb){
  try{
   const yaw=Math.PI+state.glbOrbit,renderer=state.renderer;
   renderer.setCamera({projection:'orthographic',yaw,pitch:.08,
    focus:[0,state.glb.heightMm/2000,0],
    orthoSpan:state.glb.heightMm/850,
    distance:4,near:.01,far:20000});
   renderer.render(state.glb.scene);
  }catch(e){setStatus('GLB WebGL 渲染 BLOCK：'+e.message);}
  return;
 }
 ctx.save();ctx.globalAlpha=1;
 const w=stage.width,h=stage.height;
 ctx.clearRect(0,0,w,h);
 const at=currentMedia();
 if(at){
  state.active=at.index;
  ctx.fillStyle='#010612';ctx.fillRect(0,0,w,h);
  synchronizeVideo(at);
  const source=at.clip.type==='image'?at.clip.image:at.clip.video;
  if(at.clip.type==='image'||source.readyState>=2)
   drawCover(source,w,h,at.clip.duration>0?at.offset/at.clip.duration:0);
  else{ctx.fillStyle='#b6cfe0';ctx.fillText('影片首幀載入中',w/2,h/2);}
  if(state.glow>0){
   const a=state.glow/100;
   const g=ctx.createRadialGradient(w*.52,h*.46,0,w*.52,h*.46,w*.75);
   g.addColorStop(0,'rgba(26,128,235,'+(.09*a)+')');
   g.addColorStop(1,'rgba(3,5,21,'+(.57*a)+')');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  drawSubtitle();
 }else{introCanvas();}
 ctx.restore();
 $('time').textContent=format(state.time)+' / '+format(duration());
 $('seek').value=duration()?Math.round(state.time/duration()*1000):0;
 document.querySelectorAll('.clip').forEach((el,i)=>{
  el.classList.toggle('selected',at?.index===i);
 });
}
function updateTimeline(){
 const timeline=$('timeline-clips'),thumbs=$('media-thumbs');
 timeline.replaceChildren();thumbs.replaceChildren();
 if(!state.clips.length){
  timeline.textContent='放入圖片或影片以建立片段';
  thumbs.innerHTML='<div class="empty-assets">放入圖片或影片後，素材會顯示在這裡。</div>';
 }
 for(let i=0;i<state.clips.length;i++){
  const c=state.clips[i];
  const b=document.createElement('button');b.className='clip';
  b.dataset.index=i;
  const t=document.createElement('span');t.textContent=(i+1)+' · '+c.type.toUpperCase();
  const name=document.createElement('small');name.textContent=c.name;
  const dur=document.createElement('small');dur.textContent=format(c.duration)+' 秒段';
  b.append(t,name,dur);
  b.addEventListener('click',()=>{
   state.playing=false;
   state.time=state.clips.slice(0,i).reduce((a,v)=>a+v.duration,0);
   drawFrame();setStatus('已跳到 '+c.name+'；按播放可預覽。',true);
  });
  timeline.append(b);
  const thumb=document.createElement('button');thumb.className='asset-card';
  if(c.thumbnail){const img=document.createElement('img');img.src=c.thumbnail;img.alt=c.name;thumb.append(img);}
  else{const txt=document.createElement('div');txt.style.cssText='padding:12px;font-size:11px';txt.textContent=c.type==='video'?'▣ 影片':'▧ 素材';thumb.append(txt);}
  const n=document.createElement('span');n.className='name';n.textContent=c.name;thumb.append(n);
  thumb.addEventListener('click',()=>b.click());thumbs.append(thumb);
 }
 $('asset-count').textContent=state.clips.length;
 $('timeline-label').textContent=state.clips.length+' 段 · '+format(duration());
 drawFrame();
}
function screenshotThumb(image){
 const c=document.createElement('canvas');c.width=160;c.height=90;
 const x=c.getContext('2d');x.fillStyle='#102b40';x.fillRect(0,0,160,90);
 const iw=image.naturalWidth||image.videoWidth||160,ih=image.naturalHeight||image.videoHeight||90;
 const s=Math.max(160/iw,90/ih);
 if(iw&&ih)x.drawImage(image,(160-iw*s)/2,(90-ih*s)/2,iw*s,ih*s);
 return c.toDataURL('image/jpeg',.65);
}
async function addImage(file){
 if(file.size>INPUT_LIMIT||!/^image\/(jpeg|png|webp|avif)$/.test(file.type))
  throw Error('圖片格式／大小不符（每檔 65MB 內）');
 const u=urlFor(file),img=new Image();
 img.src=u;await img.decode();
 if(!img.naturalWidth||!img.naturalHeight)throw Error('圖片解碼失敗');
 const clip={name:file.name,type:'image',image:img,url:u,
  duration:5,thumbnail:screenshotThumb(img)};
 state.clips.push(clip);
 return clip;
}
async function addVideo(file){
 if(file.size>INPUT_LIMIT||!/^video\/(mp4|webm|ogg)$/.test(file.type))
  throw Error('影片格式／大小不符（每檔 65MB 內）');
 const u=urlFor(file),video=document.createElement('video');
 video.src=u;video.muted=true;video.playsInline=true;video.preload='auto';
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('影片 metadata 逾時或瀏覽器不支援格式')),12000);
  video.onloadedmetadata=()=>{clearTimeout(timer);resolve();};
  video.onerror=()=>{clearTimeout(timer);reject(Error('影片無法解碼'));};
 });
 if(!Number.isFinite(video.duration)||video.duration<=0)
  throw Error('影片時長無法確定');
 const duration=Math.min(90,Math.max(.1,video.duration));
 const clip={name:file.name,type:'video',video,url:u,duration,
  thumbnail:null};
 state.clips.push(clip);
 return clip;
}
async function addGLB(file){
 if(file.size>50_000_000||!file.name.toLowerCase().endsWith('.glb'))
  throw Error('請使用本機 .glb（50MB 內）');
 const bytes=await file.arrayBuffer();
 const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
 const model=buildAIGReal3DGLBStatic({
  bytes,heightMm:1680,sourceName:file.name,sourceSha256:sha});
 if(!model.evidence.renderGeometryPASS)
  throw Error('GLB 幾何比例/退化面未通過，拒絕冒充完整人物');
 if(!state.renderer)state.renderer=createAIG3DRenderer(THREE_D);
 if(state.renderer.status!=='READY')throw Error('裝置 WebGL 未啟用');
 const old=state.glb;
 state.glb={...model,heightMm:1680};
 if(old)for(const node of old.scene.nodes)state.renderer.releaseMesh(node.mesh);
 state.glbSourceName=file.name;state.glbOrbit=0;
 changeMode('3D',true);
 setStatus('已讀取 '+file.name+'，實際網格 '+
  model.evidence.actualTriangles+' 三角面。這是靜態 GLB，不代表真人自然度或骨架動畫 PASS。',true);
}
function selectModeNavigation(mode){
 document.querySelectorAll('.navbutton').forEach(b=>b.classList.toggle('selected',b.dataset.nav===mode));
}
function changeMode(m,silent=false){
 if(m==='3D'&&!state.glb){
  setStatus('3D 需要真 .glb 來源；禁止由照片假稱已重建人體。請先「放入 3D 模型」。');
  return false;
 }
 state.mode=m;state.playing=false;
 stage.hidden=m==='3D';THREE_D.hidden=m!=='3D';
 $('stage-mode').textContent=m==='2_5D'?'2.5D':m;
 document.querySelectorAll('.mode-button').forEach(b=>
  b.classList.toggle('selected',b.dataset.mode===m));
 selectModeNavigation(m==='CINEMA'?'CINEMA':m);
 if(!silent)setStatus(m==='2_5D'?
  '已選 2.5D：單層視差與鏡頭位移，沒有自動補出被遮擋表面。':
  m==='3D'?'顯示匯入的真 GLB 靜態網格。尚未生成骨架動畫。':
  '已切換 '+m+'；原始素材與時間軸保留。',true);
 drawFrame();return true;
}
function play(){
 if(state.recording)return;
 if(state.mode!=='3D'&&!state.clips.length){
  setStatus('沒有素材：先放入圖片或影片，才可以製作動畫。');return;
 }
 if(state.mode==='3D'&&!state.glb){
  setStatus('3D 預覽需要真 GLB');return;
 }
 if(state.time>=duration()&&state.mode!=='3D')state.time=0;
 state.playing=true;state.lastTs=0;drawFrame();
 const audio=$('audio-preview');if(audio.src)audio.play()?.catch(()=>{});
 setStatus(state.mode==='3D'?'GLB 正在真 WebGL 旋轉預覽；這不是骨架動作。':
  '播放匯入素材的實際 Canvas 動畫預覽。',true);
}
function pause(){
 state.playing=false;state.lastTs=0;state.activeVideo?.pause();
 $('audio-preview').pause();drawFrame();setStatus('已暫停預覽。',true);
}
function update(ts){
 if(state.playing){
  const dt=state.lastTs?Math.min(.12,(ts-state.lastTs)/1000):0;
  state.lastTs=ts;
  if(state.mode==='3D')state.glbOrbit+=dt*.38;
  else if(duration()){
   state.time=Math.min(duration(),state.time+dt);
   if(state.time>=duration()){
    state.playing=false;state.activeVideo?.pause();
    $('audio-preview').pause();
   }
  }
  drawFrame();
 }else state.lastTs=0;
 requestAnimationFrame(update);
}
function download(blob,name){
 const u=urlFor(new File([blob],name,{type:blob.type||'application/octet-stream'}));
 const a=document.createElement('a');a.href=u;a.download=name;
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>releaseURL(u),60000);
}
async function still(){
 if(state.mode==='3D'){
  if(!state.glb||!state.renderer)return setStatus('先放入 GLB，才可擷取 3D。');
  try{
   const snap=await state.renderer.captureNativePNG(state.glb.scene,{width:1920,height:1080});
   download(snap.blob,'AIG-StarJourney-real-GLB-view.png');
   setStatus('已輸出 WebGL 真網格 PNG，仍非真實人物外觀驗收。',true);
  }catch(e){setStatus('GPU PNG BLOCK：'+e.message);}
  return;
 }
 if(!state.clips.length)return setStatus('請先匯入影像或影片。');
 drawFrame();
 stage.toBlob(b=>b?
  (download(b,'AIG-StarJourney-preview.png'),setStatus('已輸出真正 Canvas PNG。',true)):
  setStatus('PNG 圖片編碼失敗。'),'image/png');
}
async function record(){
 if(state.recording)return;
 if(state.mode==='3D'){setStatus('3D 僅支援真 GLB 靜態預覽與 PNG；尚無 3D 動畫 WebM encoder Gate。');return;}
 if(!state.clips.length){setStatus('至少要匯入一張圖片或影片才能輸出。');return;}
 if(!stage.captureStream||typeof MediaRecorder==='undefined'){
  setStatus('瀏覽器沒有支援 Canvas captureStream／MediaRecorder，阻擋輸出。');return;
 }
 const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']
  .find(m=>MediaRecorder.isTypeSupported(m));
 if(!mime){setStatus('瀏覽器不支援 WebM 編碼，阻擋輸出。');return;}
 const [w,h]=$('export-size').value.split('x').map(Number),fps=Number($('fps').value);
 if(!Number.isInteger(w)||!Number.isInteger(h)||w*h>1920*1080){
  setStatus('輸出尺寸超出 MVP Gate。');return;
 }
 const pre=[stage.width,stage.height];
 stage.width=w;stage.height=h;state.time=0;state.playing=false;drawFrame();
 const stream=stage.captureStream(fps);
 const chunks=[];
 let recorder;
 try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_500_000});}
 catch(e){stage.width=pre[0];stage.height=pre[1];drawFrame();setStatus('MediaRecorder 初始化失敗：'+e.message);return;}
 state.recording={recorder,stream,pre};
 $('export-webm').disabled=true;
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=()=>{
  if(chunks.length)download(new Blob(chunks,{type:mime}),
   'AIG-StarJourney-2D-Visual-Only.webm');
  else setStatus('WebM 沒有產生有效封包，輸出 BLOCK。');
  for(const track of stream.getTracks())track.stop();
  stage.width=pre[0];stage.height=pre[1];
  state.recording=null;$('export-webm').disabled=false;
  state.playing=false;state.time=0;drawFrame();
  if(chunks.length)setStatus('WebM 真畫面軌已匯出（'+chunks.length+
   ' 個資料塊）；**沒有混入**配樂/配音，也未達完整電影 Gate。',true);
 };
 recorder.onerror=e=>setStatus('錄製失敗：'+(e.error?.message||'未知錯誤'));
 recorder.start(200);state.playing=true;state.lastTs=0;
 setStatus('正在即時錄製 Canvas '+w+'×'+h+' 畫面；必須播完片段後才會下載。',true);
 const expected=duration();
 const check=()=>{
  if(state.recording?.recorder!==recorder)return;
  if(!state.playing||state.time>=expected){
   if(recorder.state!=='inactive')recorder.stop();
  }else requestAnimationFrame(check);
 };
 requestAnimationFrame(check);
}
function wireControls(){
 document.querySelectorAll('[data-command]').forEach(b=>b.addEventListener('click',()=>{
  const action=b.dataset.command;
  if(action==='FM.IMPORT.IMAGE')$('image-file').click();
  else if(action==='FM.IMPORT.VIDEO')$('video-file').click();
  else if(action==='FM.IMPORT.GLB')$('glb-file').click();
  else if(action==='FM.PRODUCE.START')play();
  else setStatus('此功能尚未連接可信 AI 生成後端。');
 }));
 $('image-file').addEventListener('change',async e=>{
  let done=0;for(const file of [...e.target.files]){
   try{await addImage(file);done++;}catch(err){setStatus('圖片 '+file.name+' BLOCK：'+err.message);}
  }
  e.target.value='';if(done){updateTimeline();setStatus('已載入 '+done+' 張圖片，真 Canvas 可直接動畫預覽。',true);}
 });
 $('video-file').addEventListener('change',async e=>{
  let done=0;for(const file of [...e.target.files]){
   try{await addVideo(file);done++;}catch(err){setStatus('影片 '+file.name+' BLOCK：'+err.message);}
  }
  e.target.value='';if(done){updateTimeline();setStatus('已載入 '+done+' 段真影片，可以播放與建立時間軸。',true);}
 });
 $('glb-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(file)try{await addGLB(file);}catch(err){setStatus('真 GLB 匯入 BLOCK：'+err.message);}
 });
 $('audio-button').addEventListener('click',()=>$('audio-file').click());
 $('audio-file').addEventListener('change',e=>{
  const f=e.target.files?.[0];e.target.value='';
  if(!f)return;
  if(f.size>INPUT_LIMIT||!/^audio\//.test(f.type)){setStatus('音訊格式／大小不符。');return;}
  if(state.audioObjectURL)releaseURL(state.audioObjectURL);
  state.audioObjectURL=urlFor(f);$('audio-preview').src=state.audioObjectURL;
  $('audio-short').textContent=f.name;
  setStatus('已放入 '+f.name+' 並可真實預聽；音訊尚未混入 WebM 輸出。',true);
 });
 document.querySelectorAll('[data-mode]').forEach(b=>
  b.addEventListener('click',()=>changeMode(b.dataset.mode)));
 $('play-button').addEventListener('click',play);
 $('pause-button').addEventListener('click',pause);
 $('still-button').addEventListener('click',still);
 $('export-webm').addEventListener('click',record);
 $('seek').addEventListener('input',e=>{
  if(state.mode==='3D'){
   state.glbOrbit=Number(e.target.value)/1000*2*Math.PI;
  }else{
   state.playing=false;state.time=duration()*Number(e.target.value)/1000;
  }
  drawFrame();
 });
 $('glow').addEventListener('input',e=>{
  state.glow=Number(e.target.value);$('glow-value').textContent=state.glow+'%';drawFrame();
 });
 $('camera-motion').addEventListener('input',e=>{
  state.motion=Number(e.target.value);$('camera-motion-value').textContent=state.motion+'%';drawFrame();
 });
 $('subtitle').addEventListener('input',e=>{
  state.subtitle=e.target.value;
  $('subtitle-short').textContent=state.subtitle||'尚無字幕';drawFrame();
 });
 document.querySelectorAll('[data-mobile-tab]').forEach(b=>b.addEventListener('click',()=>{
  const key=b.dataset.mobileTab;
  document.querySelector('.application').dataset.mobileTab=key;
  document.querySelectorAll('[data-mobile-tab]').forEach(b=>
   b.classList.toggle('selected',b.dataset.mobileTab===key));
 }));
 const openControl=id=>{
  if(window.innerWidth<=820){
   document.querySelector('[data-mobile-tab="CONTROL"]').click();
  }
  $(id)?.scrollIntoView({behavior:'smooth',block:'nearest'});
 };
 document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{
  const action=b.dataset.nav;
  selectModeNavigation(action);
  if(['2D','2_5D','3D','CINEMA'].includes(action))changeMode(action);
  else if(action==='ASSETS')$('image-file').click();
  else if(action==='AI')setStatus('AI 生成人物後端未接通，入口只保留明確 BLOCK，不會製造假動畫。');
  else if(action==='VFX')openControl('visual-options');
  else if(action==='SFX'||action==='MUSIC')openControl('audio-options');
  else if(action==='DIALOGUE'){openControl('dialogue-options');$('subtitle').focus();}
  else if(action==='EXPORT')openControl('render-options');
  else if(action==='HOME'){document.querySelector('[data-mobile-tab="STAGE"]').click();
   window.scrollTo({top:0,behavior:'smooth'});}
 }));
}
wireControls();
document.querySelector('.application').dataset.mobileTab='STAGE';
introCanvas();
requestAnimationFrame(update);
window.addEventListener('pagehide',()=>{
 state.playing=false;state.activeVideo?.pause();
 if(state.recording?.recorder?.state==='recording')state.recording.recorder.stop();
 for(const url of ownUrls)URL.revokeObjectURL(url);
 state.renderer?.destroy?.();
});
