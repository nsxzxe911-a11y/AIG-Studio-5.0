/** Standalone browser adapter. Invoked by real, source-bound workstation button. */
import {auditAIGReal3DDenseAnatomy,reviewAIGReal3DDenseFourView}
 from './aig-real3d-dense-anatomy-review.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {validateAIGInspectionCapturePlan}
 from './aig-real3d-render-inspection.mjs';
import {compareAIGReal3DReferencePNGs}
 from './aig-real3d-reference-silhouette-browser.mjs';
const ANGLES=['front','side','back','threeQuarter'];
export function mountAIGReal3DDenseAnatomyControls({
 $,isBusy,setBusy,registerURL
}={}){
 let source=null,report=null;
 const button=$('dense-anatomy-run'),download=$('dense-anatomy-download'),
  status=$('dense-anatomy-status'),evidence=$('dense-anatomy-evidence'),
  gallery=$('dense-anatomy-gallery'),table=$('dense-anatomy-table');
 const reset=()=>{
  source=null;report=null;button.disabled=true;download.disabled=true;
  gallery.replaceChildren();table.replaceChildren();
  status.textContent='尚未載入本輪高密度來源；自然人體外觀 BLOCK。';
  evidence.textContent='尚未完成原始索引與四視角驗證。';
 };
 const load=value=>{
  reset();source=value;button.disabled=false;
  status.textContent='已接上原始全域 OBJ 索引。請按五區與四視角真 GPU 檢查。';
 };
 button.addEventListener('click',async()=>{
  if(isBusy()){
   status.textContent='BLOCK：其他 GPU 作業正在使用工作區。';return;
  }
  if(!source||source.file!==$('model-file').files?.[0]||
   source.heightMm!==Number($('body-height').value)||
   source.upAxis!==$('up-axis').value){
   status.textContent='BLOCK：高密度來源或尺寸參數變更，必須重新匯入。';
   return;
  }
  setBusy(true);button.disabled=true;download.disabled=true;report=null;
  gallery.replaceChildren();table.replaceChildren();
  status.textContent='使用真正來源 Indexed 3D 三角面檢查五區並產生四個 GPU 畫面…';
  let gpu;
  try{
   let landmarks=null;
   const input=$('landmark-file').files?.[0];
   if(input){
    if(input.size>40000||!input.name.toLowerCase().endsWith('.json'))
     throw Error('解剖標記需要 40KB 以下的本機 JSON');
    landmarks=JSON.parse(await input.text());
   }
   const anatomy=auditAIGReal3DDenseAnatomy({
    sourceGeometry:source.dense.sourceGeometry,
    sourceEvidence:source.dense.evidence,
    sourceSha256:source.sha256,landmarks
   });
   const heading=['原始 3D 區域','來源三角面','開放邊','非流形邊',
    '最大邊 P95 mm','三維 XYZ 延展 mm','來源診斷'];
   const tab=document.createElement('table'),head=document.createElement('tr');
   for(const name of heading){
    const th=document.createElement('th');th.textContent=name;head.append(th);
   }
   tab.append(head);
   for(const zone of anatomy.regions){
    const tr=document.createElement('tr');
    for(const entry of [
     zone.label,zone.originalTrianglesTouchingRadius,zone.openEdges,
     zone.nonManifoldEdges,zone.localLongestTriangleEdgeP95Mm??'無',
     zone.localXYZExtentsMm?.join(' / ')??'無',
     zone.warnings.join('、')||'技術檢查完成，尚非真人認證'
    ]){
     const td=document.createElement('td');td.textContent=String(entry);tr.append(td);
    }
    tab.append(tr);
   }
   table.append(tab);
   gpu=createAIG3DRenderer($('native-webgl'),{
    quality:'balanced',pixelRatio:1,maxTriangles:700000,
    background:[.769,.745,.702,1]
   });
   if(gpu.status!=='READY'||gpu.getGpuLimit()<1920)
    throw Error('GPU 不支援原生 1080×1920');
   const viewRecords=[];
   for(const angle of ANGLES){
    const spec=validateAIGInspectionCapturePlan({
     heightMeters:source.heightMm/1000,angle,mode:'ALBEDO'
    });
    gpu.setCamera(spec.camera);gpu.setInspectionMode('BROWN_VOLUME');
    const frame=await gpu.captureNativePNG(source.dense.scene,{
     width:1080,height:1920
    });
    if(!frame.genuineGpuReadback||
     frame.resampledFromSmallerImage!==false||
     frame.width!==1080||frame.height!==1920)
     throw Error('非真實原生 GPU 擷取：'+angle);
    let referenceSha256=null,iou=null,comparisonError=null;
    const reference=$('reference-'+angle).files?.[0];
    if(reference){
     try{
      if(reference.size<100||reference.size>35000000||
       !/\.png$/i.test(reference.name))
       throw Error('來源需為有效透明 PNG');
      const bytes=await reference.arrayBuffer();
      referenceSha256=Array.from(
       new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
       v=>v.toString(16).padStart(2,'0')).join('');
      const result=await compareAIGReal3DReferencePNGs({
       sourcePNG:frame.blob,referencePNG:reference,
       angle,sourceSHA:source.sha256
      });
      iou=result.diagnostic.intersectionOverUnion;
     }catch(error){comparisonError=String(error?.message||error);}
    }else comparisonError='REFERENCE_MISSING';
    viewRecords.push({
     angle,width:frame.width,height:frame.height,
     gpuSha256:frame.sha256,referenceSha256,iou,comparisonError
    });
    const url=URL.createObjectURL(frame.blob);registerURL(url);
    const fig=document.createElement('figure'),img=document.createElement('img'),
     caption=document.createElement('figcaption'),label=document.createElement('span'),
     a=document.createElement('a');
    img.src=url;img.alt=angle+' 高密度真 OBJ 原生 GPU';
    label.textContent=angle+' · '+(iou===null?'比對 BLOCK':
     '輪廓重合 '+(iou*100).toFixed(2)+'%（非真人認證）');
    a.href=url;a.download='AIG-Real3D-DENSE-'+angle+'-GPU.png';
    a.textContent='下載真 GPU PNG';
    caption.append(label,a);fig.append(img,caption);
    gallery.append(fig);
   }
   const fourView=reviewAIGReal3DDenseFourView({
    sourceSha256:source.sha256,anatomy,viewRecords
   });
   report={
    schema:'AIG_REAL3D_DENSE_ORIGINAL_ANATOMY_FOURVIEW_REPORT_V1',
    sourceSha256:source.sha256,
    sourceOriginalTriangles:source.dense.evidence.originalTriangleCount,
    sourceGpuRenderedTriangles:source.dense.evidence.renderedTriangleCount,
    anatomy,fourView,verifiedTrueHumanSource:false,
    naturalHumanAppearancePASS:false,releasePASS:false
   };
   evidence.textContent=JSON.stringify(report,null,2);
   download.disabled=false;
   status.textContent='原始五區＋四視角 GPU 已分析；需複核 '+
    anatomy.regionsRequiringReview+'/5 區，缺少來源標記 '+
    anatomy.missingRequiredMarkers.length+' 點、缺可比對 PNG '+
    fourView.missingValidatedReferenceComparisons.length+
    ' 視角。真人來源與自然外觀維持 BLOCK。';
  }catch(error){
   report=null;download.disabled=true;
   evidence.textContent='BLOCK：'+String(error?.message||error);
   status.textContent='BLOCK：'+String(error?.message||error)+
    '；未完成原始幾何與 GPU 認證，不得發布。';
  }finally{
   gpu?.destroy?.();setBusy(false);button.disabled=false;
  }
 });
 download.addEventListener('click',()=>{
  if(!report)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{
   type:'application/json'
  }));registerURL(url);
  const link=document.createElement('a');
  link.href=url;link.download='AIG-Real3D-DENSE-ANATOMY-FOURVIEW.json';
  link.click();
 });
 return {reset,load};
}
