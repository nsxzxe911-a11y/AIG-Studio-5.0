/** Cross-project, read-only CNC tool-center preview. Never opens a CNC
 * connection, postprocesses NC, certifies material removal or animates a
 * human rig. Input arrives ONLY through local user-selected JSON files.
 */
export const AIG_MOTION_SCHEMA='AIG_READONLY_MOTION_PREVIEW_V1';
const HEADER='tSeconds,xMm,yMm,zMm,aDeg,bDeg,cDeg,rapid';
const AXES=new Set(['3AX','4AX','5AX','6AX']);
const finite=Number.isFinite;
const within=(value,max)=>finite(value)&&Math.abs(value)<=max;
const numberString=(digits)=>new RegExp('^-?\\d{1,7}\\.\\d{'+digits+'}$');
const timeFormat=numberString(4),valueFormat=numberString(3);
export async function parseAigReadOnlyMotionPreview(source){
 const payload=typeof source==='string'?JSON.parse(source):source;
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||
  payload.schema!==AIG_MOTION_SCHEMA||
  payload.sourceDomain!=='CNC_CAM_SIM'||
  payload.representation!=='CNC_TOOL_CENTER_PREVIEW'||
  !AXES.has(payload.axisMode)||
  payload.positionUnit!=='mm'||payload.angleUnit!=='deg'||payload.timeUnit!=='s'||
  payload.interpolation!=='LINEAR_TOOL_CENTER_ONLY'||
  payload.sourceMotion!=='G0_G1_ONLY'||
  payload.previewOnly!==true||payload.machineExecutionAllowed!==false||
  payload.physicalKinematicsCertified!==false||
  payload.numericalMaterialRemovalCertified!==false||
  payload.humanRiggedAnimation!==false)
  throw Error('AIG_MOTION_PREVIEW_NOT_SAFE_READONLY_SCHEMA');
 if(!Number.isInteger(payload.pointCount)||payload.pointCount<2||
  payload.pointCount>4000||typeof payload.data!=='string'||
  payload.data.length>600000||!/^[a-f0-9]{64}$/.test(payload.sha256||''))
  throw Error('AIG_MOTION_PREVIEW_INVALID_BOUNDS_OR_HASH');
 const crypt=globalThis.crypto?.subtle;
 if(!crypt)throw Error('AIG_MOTION_PREVIEW_SHA256_UNAVAILABLE');
 const encoded=new TextEncoder().encode(payload.data);
 const actual=Array.from(new Uint8Array(await crypt.digest('SHA-256',encoded)))
  .map(v=>v.toString(16).padStart(2,'0')).join('');
 if(actual!==payload.sha256)throw Error('AIG_MOTION_PREVIEW_TAMPERED_SHA256');
 const lines=payload.data.split('\n');
 if(lines[0]!==HEADER||lines.length!==payload.pointCount+1)
  throw Error('AIG_MOTION_PREVIEW_INVALID_HEADER_OR_COUNT');
 const frames=[];
 for(const [index,line] of lines.slice(1).entries()){
  const cells=line.split(',');
  if(cells.length!==8||!timeFormat.test(cells[0])||
   !cells.slice(1,7).every(v=>valueFormat.test(v))||
   !['0','1'].includes(cells[7]))
   throw Error('AIG_MOTION_PREVIEW_BAD_FRAME_ENCODING');
  const [timeSeconds,x,y,z,a,b,c]=cells.slice(0,7).map(Number);
  const rapid=cells[7]==='1';
  if(!within(timeSeconds,86400)||timeSeconds<0||
   ![x,y,z].every(n=>within(n,1000000))||
   ![a,b,c].every(n=>within(n,360))||
   (index===0&&timeSeconds!==0)||
   (index>0&&timeSeconds<=frames[index-1].timeSeconds)||
   (payload.axisMode==='3AX'&&(a!==0||b!==0||c!==0))||
   (payload.axisMode==='4AX'&&(b!==0||c!==0))||
   (payload.axisMode==='5AX'&&c!==0))
   throw Error('AIG_MOTION_PREVIEW_UNSAFE_FRAME_OR_TIME');
  frames.push({timeSeconds,x,y,z,a,b,c,rapid});
 }
 if(!frames.some(f=>!f.rapid)||
  !frames.slice(1).some((f,i)=>{
   const p=frames[i];return f.x!==p.x||f.y!==p.y||f.z!==p.z;
  }))throw Error('AIG_MOTION_PREVIEW_EMPTY_MOVEMENT_OR_CUT');
 return Object.freeze({
  schema:AIG_MOTION_SCHEMA,sha256:payload.sha256,axisMode:payload.axisMode,
  frames:Object.freeze(frames.map(f=>Object.freeze(f))),
  durationSeconds:frames.at(-1).timeSeconds,previewOnly:true,
  machineExecutionAllowed:false,actualCncKinematicsVerified:false,
  materialRemovalVerified:false,actualHumanAnimation:false
 });
}
export function sampleAigReadOnlyMotionFrame(preview,seconds){
 if(preview?.schema!==AIG_MOTION_SCHEMA||!Array.isArray(preview.frames)||
  !finite(seconds))throw Error('AIG_MOTION_PREVIEW_REQUIRED');
 const frames=preview.frames;
 if(seconds<=0)return {...frames[0]};
 if(seconds>=preview.durationSeconds)return {...frames.at(-1)};
 let lo=1,hi=frames.length-1;
 while(lo<hi){const mid=(lo+hi)>>1;
  if(frames[mid].timeSeconds<seconds)lo=mid+1;else hi=mid;}
 const to=frames[lo],from=frames[lo-1];
 // At an exact sampled waypoint show the exact supplied ABC pose; only
 // intervals between waypoints hold the previous unverified rotary pose.
 if(seconds>=to.timeSeconds)return {...to};
 const alpha=Math.max(0,Math.min(1,
  (seconds-from.timeSeconds)/(to.timeSeconds-from.timeSeconds)));
 const output={timeSeconds:seconds,rapid:to.rapid};
 // Only tool-center XYZ linear interpolation is supported by this protocol.
 // Rotary-axis kinematics/indexing MUST NOT be invented as smooth A/B/C
 // motion; keep the previous sampled pose until the next verified waypoint.
 for(const key of ['x','y','z'])
  output[key]=from[key]+(to[key]-from[key])*alpha;
 for(const key of ['a','b','c'])output[key]=from[key];
 return output;
}
export function drawAigReadOnlyMotionFrame(ctx,preview,seconds=0){
 if(!ctx||preview?.schema!==AIG_MOTION_SCHEMA||!ctx.canvas)
  throw Error('AIG_MOTION_CANVAS_REQUIRED');
 const {canvas}=ctx,w=canvas.width,h=canvas.height;
 const frames=preview.frames,padding=48;
 const projected=frames.map(f=>({x:f.x-f.y*.45,y:f.y*.48-f.z*.68}));
 const x0=Math.min(...projected.map(p=>p.x)),x1=Math.max(...projected.map(p=>p.x));
 const y0=Math.min(...projected.map(p=>p.y)),y1=Math.max(...projected.map(p=>p.y));
 const scale=Math.min((w-padding*2)/Math.max(5,x1-x0),
  (h-padding*2)/Math.max(5,y1-y0));
 const point=f=>({x:w/2+(f.x-f.y*.45-(x0+x1)/2)*scale,
  y:h/2-(f.y*.48-f.z*.68-(y0+y1)/2)*scale});
 ctx.fillStyle='#020407';ctx.fillRect(0,0,w,h);
 ctx.lineWidth=1.5;
 frames.slice(1).forEach((f,i)=>{
  const from=point(frames[i]),to=point(f);
  ctx.strokeStyle=f.rapid?'#ff4da6':'#33f39b';
  ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();
 });
 const tool=sampleAigReadOnlyMotionFrame(preview,seconds),p=point(tool);
 ctx.fillStyle='#27e9ff';ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#f4fbff';ctx.font='13px sans-serif';
 ctx.fillText(preview.axisMode+'｜CNC 刀心動畫預覽（唯讀，非機台驗證）',16,23);
 ctx.fillText('X '+tool.x.toFixed(3)+' Y '+tool.y.toFixed(3)+
  ' Z '+tool.z.toFixed(3)+'  A '+tool.a.toFixed(1)+
  ' B '+tool.b.toFixed(1)+' C '+tool.c.toFixed(1),16,h-14);
 return {timeSeconds:tool.timeSeconds,rapid:tool.rapid,
  actualToolCenterAnimated:true,machineExecutionAllowed:false,
  humanSkeletonAnimation:false,materialRemovalVerified:false};
}
/** Mount real local file → SHA validation → visible Canvas → play/stop.
 * Existing FastModel DOM controls are preserved; no CNC machine API exists.
 */
export function initAigReadOnlyMotionControls(doc,host){
 if(!doc?.createElement||!host?.append)return {ready:false};
 const make=(tag,id,label)=>{const el=doc.createElement(tag);el.id=id;
  if(label)el.textContent=label;return el;};
 const section=make('section','aig-cnc-motion-preview');
 const title=make('h3','aig-cnc-motion-title','CNC 模型／刀路動畫交換（唯讀）');
 const help=make('p','aig-cnc-motion-help',
  '匯入 AIG-II／Studio 輸出的驗證 JSON；只顯示刀心 G0/G1 與 A/B/C 時間軸，不控制機台，也不等於材料移除或人物動畫。');
 const input=make('input','aig-cnc-motion-file');
 input.type='file';input.accept='.json,application/json';
 const load=make('button','aig-cnc-motion-load','匯入並驗證刀路動畫');
 const play=make('button','aig-cnc-motion-play','▶ 播放刀路預覽');
 const stop=make('button','aig-cnc-motion-stop','■ 停止預覽');
 for(const [el,id] of [[load,'FASTM.MODEL.CNC_PREVIEW_IMPORT'],
  [play,'FASTM.MODEL.CNC_PREVIEW_PLAY'],
  [stop,'FASTM.MODEL.CNC_PREVIEW_STOP']]){
  el.type='button';el.dataset.aigButtonId=id;
  el.dataset.aigCommandId=id.replace('FASTM.MODEL.','READONLY.');
  el.dataset.aigPageId='FASTM.MODEL';
 }
 play.disabled=true;stop.disabled=true;
 const status=make('p','aig-cnc-motion-status','尚未匯入；僅本機，不連 CNC。');
 status.setAttribute('role','status');
 const canvas=make('canvas','aig-cnc-motion-canvas');
 canvas.width=640;canvas.height=360;canvas.hidden=true;
 section.append(title,help,input,load,play,stop,status,canvas);
 host.append(section);
 let preview=null,playing=false,frameHandle=null,generation=0,importGeneration=0;
 const ctx=canvas.getContext('2d'),view=doc.defaultView;
 function halt(){
  playing=false;generation++;
  if(frameHandle!==null)view?.cancelAnimationFrame?.(frameHandle);
  frameHandle=null;stop.disabled=true;play.disabled=!preview;
 }
 load.addEventListener('click',async()=>{
  const importTicket=++importGeneration;
  halt();preview=null;play.disabled=true;canvas.hidden=true;
  status.textContent='驗證中｜正在計算來源 SHA-256；不執行 CNC 機台命令。';
  const file=input.files?.[0];
  if(!file){status.textContent='請先選擇 AIG 唯讀動畫 JSON。';return;}
  try{
   if(file.size>700000)throw Error('AIG_MOTION_PREVIEW_FILE_TOO_LARGE');
   const bytes=await file.text();
   if(importTicket!==importGeneration)return;
   const parsed=await parseAigReadOnlyMotionPreview(bytes);
   // An earlier slow file digest must never replace a newer verified input.
   if(importTicket!==importGeneration)return;
   preview=parsed;canvas.hidden=false;play.disabled=false;
   drawAigReadOnlyMotionFrame(ctx,preview,0);
   status.textContent='驗證通過｜'+preview.axisMode+'｜'+preview.frames.length+
    ' 個刀心點｜SHA-256 已核對；僅供預覽，不可驅動機台。';
  }catch(error){
   if(importTicket!==importGeneration)return;
   status.textContent='BLOCKED｜'+error.message;
  }
 });
 play.addEventListener('click',()=>{
  if(!preview||playing||!view?.requestAnimationFrame)return;
  playing=true;play.disabled=true;stop.disabled=false;
  const ticket=++generation;let start=null;
  const draw=now=>{
   if(!playing||ticket!==generation||!preview)return;
   if(start===null)start=now;
   const seconds=Math.min((now-start)/1000,preview.durationSeconds);
   drawAigReadOnlyMotionFrame(ctx,preview,seconds);
   if(seconds>=preview.durationSeconds){halt();
    status.textContent='刀心動畫播放完成｜唯讀，無機台操作。';return;}
   frameHandle=view.requestAnimationFrame(draw);
  };
  frameHandle=view.requestAnimationFrame(draw);
  status.textContent='正在播放真刀心位置時間軸；非真人骨架／非機台操作。';
 });
 stop.addEventListener('click',()=>{
  halt();if(preview){drawAigReadOnlyMotionFrame(ctx,preview,0);
   status.textContent='刀心動畫已停止｜沒有發送任何 CNC 指令。';}
 });
 return {ready:true,load,play,stop,status,canvas,get preview(){return preview;}};
}
