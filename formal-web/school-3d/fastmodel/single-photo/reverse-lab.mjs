import {
 reversePhotoMask,traceMaskContours,resampleClosedContour,createElasticContour,
 stepElasticContour,auditElasticContour,exportObservedSvg,AIG70_SCHEMA
} from './aig-reverse-geometry-7-0.mjs';

const el=id=>document.getElementById(id);
const canvas=el('drawing'),ctx=canvas.getContext('2d',{alpha:false});
let image=null,mask=null,contours=null,simulation=null,playing=false,drag=null;
let backgroundPoint=[0,0],sourceSHA=null,sourceName='',scale=1,offsetX=0,offsetY=0,last=0,carry=0,frameID=0;
const MAX_BYTES=20*1024*1024;
function status(message,good=false){el('status').textContent=message;el('status').dataset.level=good?'ok':'warning';}
function buttons(){
 el('extract').disabled=!image;
 el('play').disabled=!contours;
 el('reset').disabled=!contours;
 el('export-svg').disabled=!contours;
 el('export-json').disabled=!contours;
 el('play').textContent=playing?'暫停數值模擬':'開始模擬';
}
function stop(){playing=false;drag=null;carry=0;buttons();}
function resetSimulation(){
 stop();
 if(!contours)return;
 const selected=contours.rings.find(r=>!r.hole);
 if(!selected){status('BLOCKED：未找到有效外輪廓。');return;}
 const nodes=Number(el('nodes').value),gravity=Number(el('gravity').value);
 simulation=createElasticContour(resampleClosedContour(selected.points,nodes),{pin:true,gravity,damping:.985,floor:image.height-1});
 publishEvidence();
 buttons();draw();
}
async function sha256(file){
 if(!globalThis.crypto?.subtle)return null;
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
function publishEvidence(){
 if(!simulation)return;
 const report=auditElasticContour(simulation);
 el('evidence').textContent=JSON.stringify({
  schema:AIG70_SCHEMA,sourceFilename:sourceName,sourceSHA256:sourceSHA||'UNAVAILABLE',
  imageResolution:[image.width,image.height],segmentation:mask?{
   method:mask.method,coverage:mask.coverage,bounds:mask.bounds,confidence:mask.confidence
  }:null,observedContour:contours?{
   pathCount:contours.rings.length,outerAreaPx:contours.rings[0]?.signedArea,
   sourcePixels:mask.foregroundPixels,topology:"SOURCE_MASK_PIXEL_EDGES"
  }:null,physics:report,verified3DModel:false,verified3DAnimation:false,
  nativeDeviceVerified:false
 },null,2);
}
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
 canvas.width=Math.max(320,Math.round(rect.width*dpr));
 canvas.height=Math.max(300,Math.round(rect.height*dpr));
 draw();
}
function screenToImage(clientX,clientY){
 const rect=canvas.getBoundingClientRect();
 const x=(clientX-rect.left)*canvas.width/rect.width,y=(clientY-rect.top)*canvas.height/rect.height;
 return [(x-offsetX)/scale,(y-offsetY)/scale];
}
function drawRing(points,color,width=1.6){
 if(!points?.length)return;
 ctx.beginPath();
 points.forEach((p,i)=>i===0?ctx.moveTo(p[0],p[1]):ctx.lineTo(p[0],p[1]));
 ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width/scale;ctx.stroke();
}
function draw(){
 if(!ctx)return;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#020a12';ctx.fillRect(0,0,canvas.width,canvas.height);
 if(!image)return;
 const padding=18*Math.min(devicePixelRatio||1,2);
 scale=Math.min((canvas.width-2*padding)/image.width,(canvas.height-2*padding)/image.height);
 offsetX=(canvas.width-image.width*scale)/2;
 offsetY=(canvas.height-image.height*scale)/2;
 ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
 ctx.globalAlpha=contours && contours.rings.length ? 0.62 : 1;
 ctx.drawImage(image.bitmap,0,0,image.width,image.height);
 ctx.globalAlpha=1;
 if(contours){
  for(const ring of contours.rings)drawRing(ring.points,ring.hole?'#ffb66d':'#32b2ff',2);
 }
 if(simulation){
  drawRing(simulation.live,'#6af6ae',2.7);
  const radius=Math.max(2,4/scale);
  simulation.live.forEach((p,i)=>{
   if(i%Math.max(1,Math.floor(simulation.live.length/24))!==0&&!simulation.pins.includes(i)&&drag?.index!==i)return;
   ctx.beginPath();ctx.arc(p[0],p[1],radius,0,Math.PI*2);
   ctx.fillStyle=simulation.pins.includes(i)?'#ffd07e':drag?.index===i?'#ffffff':'#88f0ba';ctx.fill();
  });
  ctx.strokeStyle='#ffaa70';ctx.lineWidth=1/scale;ctx.beginPath();ctx.moveTo(0,simulation.floor);ctx.lineTo(image.width,simulation.floor);ctx.stroke();
 }
 if(el('segmentation').value==='background'){
  ctx.fillStyle='#ffd07c';ctx.beginPath();ctx.arc(backgroundPoint[0]+.5,backgroundPoint[1]+.5,Math.max(3,5/scale),0,Math.PI*2);ctx.fill();
 }
 ctx.restore();
}
el('source').addEventListener('change',async()=>{
 const file=el('source').files?.[0];stop();
 contours=null;simulation=null;mask=null;image=null;sourceSHA=null;sourceName='';buttons();draw();
 if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>MAX_BYTES||file.size===0){
  status('BLOCKED：只能讀取不超過 20MB 的 PNG、JPEG 或 WebP。');return;
 }
 let bitmap;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  const ratio=Math.min(1,Math.sqrt(900000/(bitmap.width*bitmap.height)));
  const w=Math.max(16,Math.round(bitmap.width*ratio)),h=Math.max(16,Math.round(bitmap.height*ratio));
  if(!bitmap.width||!bitmap.height||w*h>1600000)throw Error('INVALID_DIMENSIONS');
  const intermediate=document.createElement('canvas');
  intermediate.width=w;intermediate.height=h;
  const c=intermediate.getContext('2d',{willReadFrequently:true});
  c.clearRect(0,0,w,h);c.drawImage(bitmap,0,0,w,h);
  const rgba=c.getImageData(0,0,w,h);
  sourceName=file.name;
  image={width:w,height:h,data:rgba.data,bitmap:intermediate};
  bitmap.close();
  backgroundPoint=[0,0];
  sourceSHA=await sha256(file).catch(()=>null);
  buttons();draw();
  status('已讀取真實來源像素 '+w+'×'+h+'；'+(sourceSHA?'原始檔 SHA-256 已計算。':'SHA-256 尚無法計算。')+'\n目前只有照片，尚未驗證幾何。按逆向輪廓建立 2D 來源證據。',true);
 }catch(err){
  if(bitmap)bitmap.close();
  image=null;buttons();draw();status('BLOCKED：照片解碼／讀取失敗：'+String(err.message||err));
 }
});
el('segmentation').addEventListener('change',()=>{stop();contours=null;simulation=null;mask=null;buttons();draw();status('分割來源已切換，請重新人工核對及逆向輪廓。')});
el('extract').addEventListener('click',()=>{
 if(!image)return;
 stop();
 try{
  mask=reversePhotoMask(image,{method:el('segmentation').value,backgroundPoint,threshold:Number(el('threshold').value)});
  contours=traceMaskContours(mask);
  resetSimulation();
  status('已實際從像素建立 '+contours.rings.length+' 條封閉輪廓；最大外輪廓面積 '+Math.round(contours.rings[0].signedArea)+' px²。請目視核對，複雜遮擋或背景不能當成可信分割。',true);
 }catch(err){
  mask=null;contours=null;simulation=null;buttons();draw();status('BLOCKED：逆向輪廓失敗：'+String(err.message||err));
 }
});
el('nodes').addEventListener('change',resetSimulation);
el('gravity').addEventListener('change',resetSimulation);
el('reset').addEventListener('click',resetSimulation);
el('play').addEventListener('click',()=>{
 if(!contours)return;
 if(!simulation)resetSimulation();
 playing=!playing;last=0;carry=0;buttons();
 if(playing)status('2D 逐步數值模擬進行中：實際更新節點、彈性約束及地板碰撞。不是 3D 全身角色動作。',true);
 else{status('數值模擬已暫停，可拖動節點；原始照片與輪廓未被修改。',true);publishEvidence();}
});
canvas.addEventListener('pointerdown',event=>{
 if(!image)return;
 const p=screenToImage(event.clientX,event.clientY);
 if(el('segmentation').value==='background'&&!contours){
  backgroundPoint=[Math.min(image.width-1,Math.max(0,Math.round(p[0]))),Math.min(image.height-1,Math.max(0,Math.round(p[1])))];
  draw();status('背景像素已指定：'+backgroundPoint.join(', ')+'。按「逆向輪廓」重新計算分割。');return;
 }
 if(!simulation)return;
 let best=-1,d2=Infinity;
 simulation.live.forEach((xy,i)=>{const dd=(xy[0]-p[0])**2+(xy[1]-p[1])**2;if(dd<d2){d2=dd;best=i;}});
 if(best<0||d2>(Math.max(12,22/scale)**2)||simulation.pins.includes(best))return;
 drag={index:best,xy:p};
 canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
 if(!drag||!simulation)return;
 drag.xy=screenToImage(event.clientX,event.clientY);
 stepElasticContour(simulation,1/60,{dragPoint:drag});
 publishEvidence();draw();
});
function finishDrag(){drag=null;}
canvas.addEventListener('pointerup',finishDrag);
canvas.addEventListener('pointercancel',finishDrag);
function save(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
el('export-svg').addEventListener('click',()=>{
 if(!contours)return;
 try{save('AIG-FastModel-7-0-OBSERVED-2D.svg',exportObservedSvg(contours,{sourceSHA256:sourceSHA}),'image/svg+xml;charset=utf-8');}
 catch(err){status('BLOCKED：SVG 匯出失敗：'+String(err.message||err));}
});
el('export-json').addEventListener('click',()=>{
 if(!simulation)return;
 publishEvidence();
 save('AIG-FastModel-7-0-SIM-EVIDENCE.json',el('evidence').textContent+'\n','application/json');
});
function frame(time){
 frameID=requestAnimationFrame(frame);
 if(!playing||!simulation||document.hidden){last=time;return;}
 if(!last){last=time;return;}
 const elapsed=Math.min(.066,Math.max(0,(time-last)/1000));last=time;
 carry+=elapsed;
 let ticks=0;
 try{
  while(carry>=1/60&&ticks<4){stepElasticContour(simulation,1/60,{dragPoint:drag});carry-=1/60;ticks++;}
  if(ticks){publishEvidence();draw();}
 }catch(err){stop();status('BLOCKED：模擬數值錯誤 '+String(err.message||err));}
}
window.addEventListener('resize',resize,{passive:true});
document.addEventListener('visibilitychange',()=>{last=0;carry=0;});
buttons();resize();frameID=requestAnimationFrame(frame);
