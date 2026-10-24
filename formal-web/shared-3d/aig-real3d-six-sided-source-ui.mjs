/**
 * V84 optional box-like source audit panel.
 * Uses existing locally read, SHA-bound original native Indexed OBJ scene.
 * The user's original source cannot be modified; no 2D-to-3D side invention.
 */
import {auditAIGReal3DSixSourceSolid}
 from './aig-real3d-six-sided-source-solid.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
export function mountAIGReal3DSixSourceSolidControls({
 $,isBusy,setBusy,registerURL
}={}){
 if(typeof $!=='function'||typeof isBusy!=='function'||
  typeof setBusy!=='function'||typeof registerURL!=='function')
  throw Error('REAL3D_SIX_SIDES_UI_DEPENDENCIES_REQUIRED');
 const run=$('six-solid-run'),download=$('six-solid-download'),
  status=$('six-solid-status'),evidence=$('six-solid-evidence'),
  gallery=$('six-solid-gallery');
 let source=null,report=null;
 function reset(){
  source=null;report=null;run.disabled=true;download.disabled=true;
  gallery.replaceChildren();
  evidence.textContent='尚未有本機原始 XYZ 與全球索引三角面。';
  status.textContent='BLOCK：先匯入原始 OBJ。上、下、前、後、左、右六面均需來源幾何。';
 }
 function load(v){
  reset();
  if(!v?.dense?.sourceGeometry||!/^[a-f0-9]{64}$/i.test(v.sha256))
   return;
  source=v;run.disabled=false;
  status.textContent='已取得同 SHA 本機原始 OBJ；可檢查六個原始表面。此 Gate 專用於軸對齊方塊，不認證人體。';
 }
 const cameraPlans=[
  {id:'FRONT_POS_Z',label:'前面 +Z',yaw:0,pitch:0},
  {id:'BACK_NEG_Z',label:'後面 -Z',yaw:Math.PI,pitch:0},
  {id:'LEFT_NEG_X',label:'左面 -X',yaw:-Math.PI/2,pitch:0},
  {id:'RIGHT_POS_X',label:'右面 +X',yaw:Math.PI/2,pitch:0},
  {id:'TOP_POS_Y',label:'上面 +Y',yaw:0,pitch:1.43},
  {id:'BOTTOM_NEG_Y',label:'下面 -Y',yaw:0,pitch:-1.43}
 ];
 run.addEventListener('click',async()=>{
  if(isBusy())return;
  if(!source||source.file!==$('model-file').files?.[0]||
   source.upAxis!==$('up-axis').value||
   source.heightMm!==Number($('body-height').value)){
   reset();status.textContent='BLOCK：OBJ 或高度／朝上軸改變，必須重新匯入來源。';
   return;
  }
  setBusy(true);run.disabled=true;download.disabled=true;gallery.replaceChildren();
  let renderer=null;
  try{
   const g=source.dense.sourceGeometry;
   const audit=auditAIGReal3DSixSourceSolid({
    positions:g.positions,indices:g.indices,
    sourceSha256:source.sha256,maxOriginalTriangles:200000
   });
   report={...audit,originalSixFaceGPUViews:[],
    originalGPUMeshNotAltered:true};
   if(!audit.realSixSidedBoxSourceGatePASS){
    evidence.textContent=JSON.stringify(report,null,2);
    download.disabled=false;
    status.textContent='BLOCK：缺少／錯向來源面：'+
     (audit.missingOrIncompleteSides.join('、')||'面片方向或接縫異常')+
     '；開放邊 '+audit.indexedTopology.originalOpenEdges+
     '。不自動虛構其餘四邊。';
    return;
   }
   if(audit.originalTriangleCount<2000)
    throw Error('來源六面實體封閉 PASS，但真 GPU 原生讀回需要至少 2000 片原始三角面；不偽造多面片。');
   const canvas=document.createElement('canvas');
   canvas.width=640;canvas.height=640;
   renderer=createAIG3DRenderer(canvas,{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.04,.06,.08,1]
   });
   if(renderer.status!=='READY')throw Error('真 WebGL 六視角不可用');
   renderer.setInspectionMode('LIT');
   const box=g.positions;
   let minY=Infinity,maxY=-Infinity;
   for(let i=1;i<box.length;i+=3){
    minY=Math.min(minY,box[i]);maxY=Math.max(maxY,box[i]);
   }
   const scene=source.dense.scene;
   const center=[0,(minY+maxY)/2,0];
   const bbox=audit.expectedBoundingBoxVolumeCubicMeters;
   const distance=Math.max(.5,source.heightMm/1000*2.7);
   for(const view of cameraPlans){
    renderer.setCamera({yaw:view.yaw,pitch:view.pitch,
     distance,focus:center});
    const image=await renderer.captureNativePNG(scene,{
     width:640,height:640
    });
    if(!image.genuineGpuReadback||
     image.resampledFromSmallerImage!==false||
     image.width!==640||image.height!==640)
     throw Error('原始六視角不是 native GPU 讀回');
    const href=URL.createObjectURL(image.blob);registerURL(href);
    const figure=document.createElement('figure'),
     img=document.createElement('img'),cap=document.createElement('figcaption'),
     link=document.createElement('a');
    img.src=href;img.alt='來源六面 GPU '+view.label;
    link.href=href;link.download='Real3D-V84-'+view.id+'-SOURCE-GPU.png';
    link.textContent='真 GPU PNG';
    cap.textContent=view.label+' / 原始面 '+audit.sixSides.find(s=>s.id===view.id)
      .originalTriangleCount+' 片';
    cap.append(link);figure.append(img,cap);gallery.append(figure);
    report.originalSixFaceGPUViews.push({
     side:view.id,width:image.width,height:image.height,
     sha256:image.sha256,sourceSha256:source.sha256,
     genuineOriginalGPUReadback:true
    });
   }
   report.originalSixFaceGPUReadbackPASS=true;
   evidence.textContent=JSON.stringify(report,null,2);
   download.disabled=false;
   status.textContent='來源六面封閉立體技術 PASS：上下前後左右六面都有原始面片；'+
    '所有 indexed 接縫封閉，法線朝外，體積非零；6 張真 GPU 圖已產生。'+
    '這不是照片未知側面的自動還原，也不是人體解剖 PASS。';
  }catch(error){
   if(report)report.originalSixFaceGPUReadbackPASS=false;
   evidence.textContent=report?JSON.stringify(report,null,2):
    'BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error);
   download.disabled=!report;
  }finally{
   renderer?.destroy?.();
   setBusy(false);run.disabled=!source;
  }
 });
 download.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));
  registerURL(url);
  const a=document.createElement('a');
  a.href=url;a.download='Real3D-V84-SIX-SOURCE-SIDES-SHA-GATE.json';a.click();
 });
 reset();return {load,reset};
}
