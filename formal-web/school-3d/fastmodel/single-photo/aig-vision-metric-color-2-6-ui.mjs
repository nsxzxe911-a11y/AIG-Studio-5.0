/** Real3D 2.6 in-place source-measure-colour workbench. No fake 1:1 depth. */
import {AIG26_SCHEMA,calibrateAIG26PlanarReference,
 mapAIG26PixelToMeasuredMM,calibrateAIG26NeutralPatch,
 applyAIG26ColorToRGBA,inspectAIG26SemanticLabels}
 from './aig-vision-metric-color-2-6.mjs';
const $=id=>document.getElementById(id);
const msg=e=>String(e?.message||e);
const value=id=>{
 const text=$(id).value.trim();
 if(!text||!Number.isFinite(Number(text)))throw Error('實際量測數字未填：'+id);
 return Number(text);
};
async function sourceSha(file){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()));
 return 'sha256:'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
}
function decodeRuns(data){
 if(!Number.isInteger(data.width)||!Number.isInteger(data.height)||
  data.width<128||data.height<128||data.width*data.height>2_000_000||
  !Array.isArray(data.runs)||data.runs.length>1_000_000)
  throw Error('語意標籤像素／筆數過大');
 const result=new Uint8Array(data.width*data.height);let n=0;
 for(const pair of data.runs){
  if(!Array.isArray(pair)||pair.length!==2||!Number.isInteger(pair[0])||
   pair[0]<0||pair[0]>255||!Number.isInteger(pair[1])||
   pair[1]<1||n+pair[1]>result.length)throw Error('RLE 遮罩來源錯誤');
  result.fill(pair[0],n,n+pair[1]);n+=pair[1];
 }
 if(n!==result.length)throw Error('RLE 遮罩缺少像素');
 return result;
}
export function installAIG26VisionPanel({getLibrary=()=>null}={}){
 const canvas=$('vision26-canvas'),corrected=$('vision26-color-canvas'),
  ctx=canvas.getContext('2d',{willReadFrequently:true}),
  cg=corrected.getContext('2d');
 if(!ctx||!cg)throw Error('AIG26_CANVAS_REQUIRED');
 const state={sha:null,original:null,width:0,height:0,
  picks:[],neutral:null,neutralPoint:null,metric:null,color:null,
  semantic:null,query:null};
 const status=(text,bad=false)=>{
  $('vision26-status').textContent=(bad?'BLOCKED：':'')+text;
  $('vision26-status').style.color=bad?'#ffca8f':'#afe7df';
 };
 const proof=()=>{
  $('vision26-proof').textContent=JSON.stringify({
   schema:AIG26_SCHEMA,sourceSha256:state.sha,
   metric:state.metric,color:state.color,semantic:state.semantic,
   lastMeasuredSourcePlaneMm:state.query,
   originalPhotoUnchanged:true,full3DOneToOneProven:false,
   monitorICCColourProven:false
  },null,2);
 };
 const draw=()=>{
  if(!state.original)return;
  ctx.putImageData(state.original,0,0);
  ctx.save();ctx.strokeStyle='#00f9ef';ctx.fillStyle='#00f9ef';
  ctx.lineWidth=2.5;
  const p=state.picks;
  if(p.length>=2){
   ctx.beginPath();ctx.moveTo(...p[0]);
   for(let i=1;i<Math.min(p.length,4);i++)ctx.lineTo(...p[i]);
   if(p.length>=4)ctx.closePath();
   ctx.stroke();
  }
  p.forEach(([x,y],i)=>{
   ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();
   ctx.font='bold 13px sans-serif';
   ctx.fillText(['TL','TR','BR','BL','檢查'][i],x+8,y-8);
  });
  ctx.restore();
 };
 $('photo23-source').addEventListener('change',()=>{
  state.sha=null;state.original=null;state.picks=[];state.neutral=null;
  state.metric=null;state.color=null;state.semantic=null;state.query=null;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  cg.clearRect(0,0,corrected.width,corrected.height);
  proof();status('原照片已變更；2.6 舊校正失效，原模型和影片仍保留。');
 });
 $('vision26-load').addEventListener('click',async()=>{
  try{
   const file=$('photo23-source').files?.[0];
   if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||
    file.size<100||file.size>12*1024*1024)
    throw Error('請先在 2.3 選擇真照片，最大 12 MiB');
   const sha=await sourceSha(file),image=await createImageBitmap(file);
   try{
    if(image.width<128||image.height<128||
     image.width>12000||image.height>12000)
     throw Error('來源照片尺寸超界');
    const scale=Math.min(1,960/image.width,960/image.height);
    const w=Math.floor(image.width*scale),h=Math.floor(image.height*scale);
    if(w<64||h<64)throw Error('可分析像素不足');
    canvas.width=corrected.width=w;canvas.height=corrected.height=h;
    ctx.drawImage(image,0,0,w,h);
    state.sha=sha;state.width=w;state.height=h;
    state.original=ctx.getImageData(0,0,w,h);
    state.picks=[];state.metric=null;state.color=null;
    state.semantic=null;state.query=null;state.neutral=null;
    cg.putImageData(state.original,0,0);draw();proof();
    status('來源照片 SHA '+sha.slice(0,22)+
     '…；可分析 '+w+'×'+h+' 像素。尚未宣稱人物真 1:1。');
   }finally{image.close?.()}
  }catch(e){status(msg(e),true)}
 });
 canvas.addEventListener('click',event=>{
  try{
   if(!state.original)throw Error('請先讀取真照片');
   const rect=canvas.getBoundingClientRect();
   const p=[
    Math.min(canvas.width-1,Math.max(0,(event.clientX-rect.left)*canvas.width/rect.width)),
    Math.min(canvas.height-1,Math.max(0,(event.clientY-rect.top)*canvas.height/rect.height))
   ];
   if(p.some(x=>!Number.isFinite(x)))throw Error('標記座標無效');
   const mode=$('vision26-pick').value;
   if(mode==='reference'){
    if(state.picks.length===5)state.picks=[];
    state.picks.push(p);state.metric=null;state.query=null;
    draw();proof();status('已標記 '+state.picks.length+'/5 點；請依 TL、TR、BR、BL、驗證點順序。');
   }else if(mode==='query'){
    if(!state.metric)throw Error('先完成有第五點證據的 1:1 參考平面校正');
    state.query={clickedPixel:p,planeMm:
     mapAIG26PixelToMeasuredMM(state.metric.homographyPxToPlaneMm,p),
     unknownDepthNotInferred:true};
    proof();status('參考平面 mm：'+state.query.planeMm.map(v=>v.toFixed(3)).join('，'));
   }else if(mode==='neutral'){
    const x=Math.round(p[0]),y=Math.round(p[1]),d=state.original.data;
    const rgb=[0,0,0];let n=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){
     const xx=Math.max(0,Math.min(canvas.width-1,x+dx)),
      yy=Math.max(0,Math.min(canvas.height-1,y+dy)),
      at=(yy*canvas.width+xx)*4;
     if(d[at+3]<240)continue;
     for(let k=0;k<3;k++)rgb[k]+=d[at+k];
     n++;
    }
    if(!n)throw Error('灰卡不透明來源像素不足');
    state.neutral=rgb.map(v=>Math.round(v/n));
    state.neutralPoint=p;state.color=null;proof();
    status('原始 RGB：'+state.neutral.join('/')+
     '。必須實際選中已知中性灰卡，不能靠猜測當作真實色彩。');
   }
  }catch(e){status(msg(e),true)}
 });
 $('vision26-calibrate').addEventListener('click',()=>{
  try{
   if(!state.sha||state.picks.length!==5)
    throw Error('缺來源照片或四角＋第五獨立檢查點');
   const report=calibrateAIG26PlanarReference({
    sourceSha256:state.sha,width:state.width,height:state.height,
    referenceId:'real3d26-measured-reference',
    referenceSource:$('vision26-reference-source').value,
    cornersPx:state.picks.slice(0,4),
    checkPointPx:state.picks[4],
    widthMm:value('vision26-width-mm'),
    heightMm:value('vision26-height-mm'),
    checkPointMm:[value('vision26-check-x'),value('vision26-check-y')]
   });
   state.metric=report;proof();
   status('五點毫米校正 PASS，獨立檢查殘差 '+report.independentResidualMm+
    ' mm。僅平面真尺寸，不包含未拍攝的立體深度。');
  }catch(e){state.metric=null;proof();status(msg(e),true)}
 });
 $('vision26-color-run').addEventListener('click',()=>{
  try{
   if(!state.sha||!state.neutral)throw Error('尚未從來源照片選擇實際中性灰卡');
   const target=value('vision26-neutral-target');
   const profile=calibrateAIG26NeutralPatch({
    sourceSha256:state.sha,width:state.width,height:state.height,
    samplePx:state.neutralPoint,sampleRGB:state.neutral,
    knownNeutralRGB:[target,target,target]
   });
   const result=applyAIG26ColorToRGBA(state.original.data,profile);
   cg.putImageData(new ImageData(result.pixels,state.width,state.height),0,0);
   state.color={...profile,clippedChannels:result.clippedChannels};
   proof();status('真來源 sRGB→線性光→sRGB 校正預覽完成；截斷通道 '+
    result.clippedChannels+'。未覆蓋原色或冒稱 ICC 認證。');
  }catch(e){state.color=null;proof();status(msg(e),true)}
 });
 $('vision26-label-import').addEventListener('click',async()=>{
  try{
   if(!state.sha)throw Error('請先讀取原始照片 SHA');
   const file=$('vision26-label-file').files?.[0];
   if(!file||file.size<10||file.size>4*1024*1024||
    !/\.json$/i.test(file.name))throw Error('需 4 MiB 以下來源標籤 JSON');
   const raw=JSON.parse(await file.text());
   if(raw.sourceSha256!==state.sha)throw Error('標籤與目前照片來源 SHA 不同');
   const labels=decodeRuns(raw);
   state.semantic=inspectAIG26SemanticLabels({
    width:raw.width,height:raw.height,sourceSha256:raw.sourceSha256,
    labels,regions:raw.regions,producer:raw.producer,
    modelSha256:raw.modelSha256??null,
    humanReviewed:raw.humanReviewed===true
   });
   proof();status('語意標籤已有來源 SHA／可信度 '+state.semantic.proofStatus+
    '，並未冒充本程式已運作 AI 語意模型。');
  }catch(e){state.semantic=null;proof();status(msg(e),true)}
 });
 $('vision26-save').addEventListener('click',async()=>{
  try{
   if(!state.sha||!state.metric&&!state.color&&!state.semantic)
    throw Error('沒有與來源 SHA 綁定的實測／色彩／語意證據');
   const vault=getLibrary();
   if(!vault?.importBlob)throw Error('本機素材庫未就緒');
   const record={schema:AIG26_SCHEMA,sourceSha256:state.sha,
    metric:state.metric,color:state.color,semantic:state.semantic,
    sourcePhotoPreserved:true,working3DScenePreserved:true,
    unknown3DPhysicalDepthNotMeasured:true};
   const file=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
   const item=await vault.importBlob(file,{
    category:'scene',title:'Real3D 2.6 尺寸／色彩／語意來源',
    tags:['Real3D26','實測','色彩','來源','辨識'],
    source:'GENERATED_DERIVED',modelAccuracy:'NOT_VERIFIED',
    coordinateUnits:state.metric?'MM':'UNKNOWN',derivedFrom:state.sha
   });
   status('2.6 衍生證據已入本機素材庫：'+item.sha256+
    '。沒有修改原圖或 GLB。');
  }catch(e){status('保存未通過：'+msg(e),true)}
 });
 proof();return state;
}
