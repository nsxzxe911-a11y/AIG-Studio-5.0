/** V85 curved source six-direction depth/occlusion + native GPU inspection.
 * No auto-restoration of any sides absent from the supplied real source OBJ.
 */
import {auditAIGReal3DCurvedSixDirections}
 from './aig-real3d-curved-six-direction-depth.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
export function mountAIGReal3DCurvedSixDirectionControls({
 $,isBusy,setBusy,registerURL
}={}){
 if(typeof $!=='function'||typeof isBusy!=='function'||
  typeof setBusy!=='function'||typeof registerURL!=='function')
  throw Error('REAL3D_V85_UI_REQUIRED');
 const run=$('curved-six-run'),download=$('curved-six-download'),
  status=$('curved-six-status'),evidence=$('curved-six-evidence'),
  gallery=$('curved-six-gallery'),manifestInput=$('curved-six-scan-evidence');
 let source=null,report=null;
 function reset(){
  source=null;report=null;run.disabled=true;download.disabled=true;
  gallery.replaceChildren();
  evidence.textContent='缺少原始曲面三角面、來源 SHA 或方向觀測資料。';
  status.textContent='BLOCK：請先匯入本機原始 OBJ；看不見的四側不能猜測。';
 }
 function load(ctx){
  reset();
  if(!ctx?.dense?.sourceGeometry||
   !/^[0-9a-f]{64}$/i.test(ctx.sha256))return;
  source=ctx;run.disabled=false;
  status.textContent='來源原始 Indexed XYZ 已接入，六向曲面深度仍未驗證。掃描覆蓋 JSON 可選，聲明不等於來源認證。';
 }
 const views=[
  {id:'FRONT_POS_Z',yaw:0,pitch:0},
  {id:'BACK_NEG_Z',yaw:Math.PI,pitch:0},
  {id:'LEFT_NEG_X',yaw:-Math.PI/2,pitch:0},
  {id:'RIGHT_POS_X',yaw:Math.PI/2,pitch:0},
  {id:'TOP_POS_Y',yaw:0,pitch:1.43},
  {id:'BOTTOM_NEG_Y',yaw:0,pitch:-1.43}
 ];
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  const f=$('model-file').files?.[0];
  if(!source||source.file!==f||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   reset();status.textContent='BLOCK：原 OBJ、高度或朝上軸已變，需重新匯入。';return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;
  gallery.replaceChildren();let renderer=null;
  try{
   let manifest=null;
   const file=manifestInput.files?.[0];
   if(file){
    if(file.size>2_000_000)throw Error('方向掃描覆蓋檔案超過 2MB');
    manifest=JSON.parse(await file.text());
   }
   const g=source.dense.sourceGeometry;
   const r=auditAIGReal3DCurvedSixDirections({
    positions:g.positions,indices:g.indices,
    sourceSha256:source.sha256,gridSize:32,
    maxOriginalTriangles:300000,scanEvidence:manifest
   });
   report={...r,nativeOriginalGPUSixViews:[],
    nativeSixGPUReadbackPASS:false,
    originalSurfaceUnchanged:true,
    sixIndependentScanSourcesAuthenticated:false};
   evidence.textContent=JSON.stringify(report,null,2);
   download.disabled=false;
   if(!r.realClosedCurvedSourceSurfaceGatePASS){
    status.textContent='BLOCK：非封閉原始曲面或來源方向不足。缺幾何方向：'+
     (r.missingOriginalGeometricDirections.join('、')||'方向可能存在但接縫／法線／體積異常')+
     '；開放邊 '+r.originalSourceTopology.openEdges+
     '。不補造隱藏側面。';
    return;
   }
   if(r.originalTriangleCount<2000){
    status.textContent='原始曲面六方向來源拓樸 PASS；真 GPU 來源面片少於 2000，無法完成既有 native 讀回 Gate，保持 GPU BLOCK。';
    return;
   }
   const canvas=document.createElement('canvas');
   canvas.width=512;canvas.height=512;
   renderer=createAIG3DRenderer(canvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.035,.06,.09,1]
   });
   if(renderer.status!=='READY')throw Error('真 WebGL 工作區不可用');
   renderer.setInspectionMode('NORMALS');
   const b=r.sourceBounds,focus=b.min.map((x,i)=>(x+b.max[i])/2),
    span=Math.max(...b.min.map((x,i)=>b.max[i]-x));
   for(const v of views){
    renderer.setCamera({
     projection:'orthographic',yaw:v.yaw,pitch:v.pitch,
     orthoSpan:span*1.4,distance:Math.max(.5,span*2.7),
     focus
    });
    const gpu=await renderer.captureNativePNG(source.dense.scene,{
     width:512,height:512
    });
    if(gpu.genuineGpuReadback!==true||
     gpu.width!==512||gpu.height!==512||
     !/^[a-f0-9]{64}$/i.test(gpu.sha256))
     throw Error('GPU 六方向圖片未通過原始讀回 SHA 驗證');
    const href=URL.createObjectURL(gpu.blob);
    registerURL(href);
    const figure=document.createElement('figure'),
     img=document.createElement('img'),caption=document.createElement('figcaption'),
     a=document.createElement('a');
    img.src=href;img.alt='來源曲面 '+v.id+' 真 GPU 原始表面';
    a.href=href;a.download='Real3D-V85-'+v.id+'-CURVED-SOURCE.png';
    a.textContent='真 GPU PNG';
    caption.textContent=v.id+'｜真來源曲面';
    caption.append(a);figure.append(img,caption);gallery.append(figure);
    report.nativeOriginalGPUSixViews.push({
     direction:v.id,sourceSha256:source.sha256,
     sha256:gpu.sha256,width:512,height:512,
     originalMeshReadback:true,
     separatelyAuthenticatedScanView:false
    });
   }
   report.nativeSixGPUReadbackPASS=true;
   evidence.textContent=JSON.stringify(report,null,2);
   status.textContent='原始曲面六向幾何＋真 GPU 技術 PASS：'+
    report.nativeOriginalGPUSixViews.length+' 個來源網格視角，深度及遮蔽已量測。'+
    '未提供獨立認證掃描的方向仍是未知，不可當成人體 1:1。';
  }catch(error){
   if(report)report.nativeSixGPUReadbackPASS=false;
   status.textContent='BLOCK：'+String(error?.message||error);
   evidence.textContent=report?JSON.stringify(report,null,2):
    'BLOCK：'+String(error?.message||error);
   download.disabled=!report;
  }finally{
   renderer?.destroy?.();setBusy(false);run.disabled=!source;
  }
 });
 download.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));
  registerURL(url);const a=document.createElement('a');
  a.href=url;a.download='Real3D-V85-CURVED-SIX-DEPTH-ORIGINAL-SHA.json';a.click();
 });
 reset();return {load,reset};
}
