import {buildAIGReal3DGLBStatic} from './aig-real3d-glb-native-mesh.mjs';
import {buildAIGReal3DScanNative} from './aig-real3d-scan-native-mesh.mjs';
import {buildAIGReal3DDenseOBJSource}
 from './aig-real3d-dense-source-obj.mjs';
import {mountAIGReal3DDenseAnatomyControls}
 from './aig-real3d-dense-anatomy-ui.mjs';
import {buildAIGReal3DDenseEvidencePacket}
 from './aig-real3d-dense-source-evidence.mjs';
import {buildAIGReal3DSourceReview,validateAIGReal3DLandmarkSidecar} from './aig-real3d-source-review-gate.mjs';
import {compareAIGReal3DReferencePNGs} from './aig-real3d-reference-silhouette-browser.mjs';
import {evaluateAIGReal3DFourViewComparisons} from './aig-real3d-reference-silhouette.mjs';
import {projectAIGNativeOBJLandmarks,summarizeAIGLandmarkHeightRegions}
 from './aig-real3d-native-anatomy-projection.mjs';
import {createAIGNativeAnatomyAnnotation}
 from './aig-real3d-native-anatomy-annotation.mjs';
import {auditAIGNativeOBJLocalSurface}
 from './aig-real3d-local-surface-topology.mjs';
import {auditAIGReal3DSourceGeometryDetail}
 from './aig-real3d-source-geometry-detail.mjs';
import {projectAIGSourceDefectEdges}
 from './aig-real3d-source-defect-projection.mjs';
import {createAIGSourceDefectOverlay}
 from './aig-real3d-source-defect-overlay.mjs';
import {pickAIGReal3DDefectEdge,canvasClickToAIGSourcePixel}
 from './aig-real3d-defect-edge-picker.mjs';
import {compareAIGNativeSourceDefects}
 from './aig-real3d-immutable-defect-diff.mjs';
import {createAIG3DRenderer} from './aig-real3d-webgl.mjs';
import {reviewAIGReal3DSourceEnvelope,compareAIGReal3DSourceEnvelopes}
 from './aig-real3d-source-envelope-review.mjs';
import {auditAIGReal3DSceneCrossSections}
 from './aig-real3d-native-body-cross-sections.mjs';
import {planAIGReal3DNativeResolution}
 from './aig-real3d-native-resolution.mjs';
import {createAIGReal3DOBJLocalPatchWorkingCopy}
 from './aig-real3d-local-hole-working-copy.mjs';
import {createAIGReal3DCurvedJunctionWorkingCopy}
 from './aig-real3d-curved-junction-working-copy.mjs';
import {
 auditAIG3DSourceSilhouette,validateAIGInspectionCapturePlan,
 AIG_INSPECTION_FRAME_SCHEMA
}from './aig-real3d-render-inspection.mjs';
const $=id=>document.getElementById(id),gallery=$('gallery'),status=$('status');
const urlPool=new Set();
let running=false,report=null,profiles=[],currentNativeReview=null,lastResolutionSource=null;
function showDefectSelection(hit){
 if(!hit?.selected){
  $('defect-selected').textContent='未選到異常邊。請點圖上的異常線段或下面的來源邊編號。';return;
 }
 const e=hit.edge;
 const xyz=p=>p.map(v=>Number(v).toFixed(5)).join(' / ');
 $('defect-selected').textContent=
  '視角：'+hit.angle+' ｜ 異常種類：'+e.type+
  '\n原始 OBJ 頂點：'+e.startVertexIndex+' → '+e.endVertexIndex+
  '\n原始 XYZ 起點（m）：'+xyz(e.startWorldMeters)+
  '\n原始 XYZ 終點（m）：'+xyz(e.endWorldMeters)+
  '\n來源 SHA-256：'+hit.sourceSha256+
  '\n像素選取距離：'+hit.nearestDistancePx+' px'+
  '\n此位置僅供人工檢查，不會修改 OBJ 或判定真人合格。';
}
function makeComparisonTable(diff){
 const root=$('repair-compare-table');root.replaceChildren();
 const table=document.createElement('table');
 const head=document.createElement('thead'),headRow=document.createElement('tr');
 for(const label of ['原始標記區域','修復前開放邊','候選後開放邊',
   '新舊差值','修復前面片方向衝突','候選後方向衝突']){
  const th=document.createElement('th');th.textContent=label;headRow.append(th);
 }
 head.append(headRow);table.append(head);
 const body=document.createElement('tbody');
 for(const region of diff.regionChanges){
  const tr=document.createElement('tr');
  for(const value of [region.label,region.before.openEdges,region.after.openEdges,
   region.openEdgeDelta,region.before.windingConflicts,region.after.windingConflicts]){
   const td=document.createElement('td');td.textContent=String(value);tr.append(td);
  }
  body.append(tr);
 }
 table.append(body);root.append(table);
}
const SETUPS=[
 ['正面黑線輪廓','front','BLACK_CONTOUR'],
 ['正面咖啡色平塗','front','BROWN_FLAT'],
 ['正面體積漸層','front','BROWN_VOLUME'],
 ['正面低高光','front','BROWN_FINISH'],
 ['側面體積陰影','side','BROWN_VOLUME'],
 ['背面體積陰影','back','BROWN_VOLUME'],
 ['45度體積陰影','threeQuarter','BROWN_VOLUME']
];
function setStatus(s,ready=false){status.textContent=s;status.dataset.ready=String(ready);}
function release(){for(const u of urlPool)URL.revokeObjectURL(u);urlPool.clear();}
function renderProfileAngle(){
 const chosen=$('profile-angle').value,
   entry=profiles.find(x=>x.angle===chosen),target=$('profile-table');
 target.replaceChildren();
 if(!entry?.verticalScanlineProfile?.bands?.length){
  const text=document.createElement('p');
  text.textContent='此方向尚無有效透明輪廓參考圖。';
  target.append(text);return;
 }
 const src=entry.verticalScanlineProfile;
 const headline=document.createElement('p');
 headline.textContent='方向 '+chosen+'；差距最大高度段：'+
  (src.worstBandId||'未取得')+
  '，這只是影像像素差，不是人體部位辨識。';
 target.append(headline);
 const table=document.createElement('table'),thead=document.createElement('thead');
 const tr=document.createElement('tr');
 for(const name of ['從頂部高度','參考平均覆蓋 px／列','GPU 平均覆蓋 px／列',
  '差值 px／列','差值 %','水平中心位移 px']){
  const th=document.createElement('th');th.textContent=name;tr.append(th);
 }
 thead.append(tr);table.append(thead);
 const tbody=document.createElement('tbody');
 for(const band of src.bands){
  const row=document.createElement('tr');
  row.dataset.worst=String(src.worstBandId===band.id);
  for(const val of [
   (band.normalizedFromTop*100).toFixed(1)+'–'+
    (band.normalizedToTop*100).toFixed(1)+'%',
   band.referenceMeanCoveragePx.toFixed(1),
   band.modelMeanCoveragePx.toFixed(1),
   band.signedCoverageDeltaPx.toFixed(1),
   band.signedCoverageDeltaPercent===null?'無參考':
    (band.signedCoverageDeltaPercent>0?'+':'')+
      band.signedCoverageDeltaPercent.toFixed(1)+'%',
   band.imageCentroidXDeltaPx===null?'無法計算':
    band.imageCentroidXDeltaPx.toFixed(1)
  ]){
   const td=document.createElement('td');td.textContent=val;row.append(td);
  }
  tbody.append(row);
 }
 table.append(tbody);target.append(table);
}
$('profile-angle').addEventListener('change',renderProfileAngle);
$('inspect').addEventListener('click',async()=>{
 if(running)return;
 const file=$('model-file').files?.[0];
 const inputHeight=$('body-height').value.trim();
 const heightMm=inputHeight===''?NaN:Number(inputHeight);
 if(!file||!/.(glb|obj)$/i.test(file.name)){
  setStatus('BLOCK：請先選擇本機原始 OBJ／GLB 網格來源。');return;
 }
 if(!Number.isInteger(heightMm)||heightMm<900||heightMm>2200){
  setStatus('BLOCK：需輸入 900–2200 mm 的來源實測身高。');return;
 }
 running=true;$('inspect').disabled=true;$('report-download').disabled=true;report=null;
 lastResolutionSource=null;
 $('native-output-render').disabled=true;
 $('native-output-download').hidden=true;
 $('native-output-figure').hidden=true;
 $('native-output-status').textContent='尚無來源驗證圖，解析度輸出 BLOCK。';
 currentNativeReview=null;$('compare-source').disabled=true;
 $('make-local-working-copy').disabled=true;
 $('make-curved-junction-copy').disabled=true;
 $('curved-junction-download').hidden=true;
 $('curved-junction-download').removeAttribute('href');
 $('curved-junction-stats').textContent='尚未載入原始 OBJ；非平面補面僅能新增可溯源的候選曲面。';
 $('local-working-copy-stats').textContent='先匯入原始 OBJ 並執行來源檢查。原檔案不會被修改。';
 $('local-working-copy-download').hidden=true;
 $('local-working-copy-download').removeAttribute('href');
 $('defect-edge-list').replaceChildren();
 $('defect-selected').textContent='尚未選取；匯入來源 OBJ 後可點選真異常邊。';
 $('source-3d-slice-stats').textContent='尚未取得原始三角面截面，不能判定人型。';
 $('source-3d-slice-table').replaceChildren();
 $('shape-envelope-stats').textContent='正面/背面寬幅尚未量測；不允許把合成橢球作人體成品。';
 $('shape-envelope-metrics').replaceChildren();
 $('repair-compare-table').replaceChildren();
 $('repair-compare-gallery').replaceChildren();
 $('repair-compare-stats').textContent='需先完成修復前 OBJ 的來源網格審核。';
 release();gallery.replaceChildren();$('reference-gallery').replaceChildren();
 $('anatomy-gallery').replaceChildren();$('anatomy-region-table').replaceChildren();
 $('surface-table').replaceChildren();
 $('detail-geometry-table').replaceChildren();
 $('detail-geometry-status').textContent='尚無可信來源 OBJ／21 點真網格標記；模型局部幾何精度 BLOCK。';
 $('defect-gallery').replaceChildren();
 $('defect-stats').textContent='來源異常邊尚未確認；診斷限定原始 OBJ。';
 $('surface-stats').textContent='未提供可驗證的原始 OBJ 網格標記，局部接合技術 Gate BLOCK。';
 $('anatomy-stats').textContent='來源標記尚未通過貼合檢查；真人自然外觀 BLOCK。';
 profiles=[];$('profile-angle').disabled=true;
 $('profile-table').replaceChildren();
 $('reference-stats').textContent='尚未比對四方向透明輪廓；自然人體外觀 BLOCK。';
 $('evidence').textContent='讀取 GLB 與實際三角形…';
 let renderer;
 try{
  const bytes=await file.arrayBuffer();
  if(bytes.byteLength>50_000_000||bytes.byteLength<64)
   throw Error('GLB_SIZE_BLOCK');
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  const isOBJ=/.obj$/i.test(file.name);
  const axis=$('up-axis').value;
  if(!isOBJ&&axis!=='Y')throw Error('GLB 格式目前僅支援 Y-Up；Z-Up 必須使用 OBJ 來源');
  const sidecar=$('landmark-file').files?.[0];
  let landmarks=null;
  if(sidecar){
   if(sidecar.size>40000||!sidecar.name.toLowerCase().endsWith('.json'))
    throw Error('解剖標記 JSON 大小／格式不符');
   try{landmarks=JSON.parse(await sidecar.text());}
   catch{throw Error('解剖標記 JSON 無法解析');}
   validateAIGReal3DLandmarkSidecar(landmarks);
  }
  const objText=isOBJ?new TextDecoder('utf-8',{fatal:true}).decode(bytes):null;
  const {scene,evidence}=isOBJ?buildAIGReal3DScanNative({
    objText,
    heightMm,upAxis:axis,landmarks,sourceName:file.name,sourceSha256:hash
  }):buildAIGReal3DGLBStatic({
    bytes,heightMm,sourceName:file.name,sourceSha256:hash
  });
  const audit=auditAIG3DSourceSilhouette(scene);
  const source3DSections=auditAIGReal3DSceneCrossSections({
   scene,sourceSha256:hash,sourceName:file.name,
   sourceFormat:isOBJ?'OBJ':'GLB'
  });
  const sliceFlag=source3DSections.oneClosedLowerMassFlag;
  const split=source3DSections.distinctSideBySideLowerLegSectionsObserved;
  $('source-3d-slice-stats').textContent=sliceFlag?
   'BLOCK：原始三角面在下肢高度僅有一個連續閉合截面，沒有兩條分開的腿；如穿長裙、連身衣或特殊姿態需用真人參考重新審核。':
   split?'來源網格下半部觀察到兩個左右分離的閉合截面；這只是技術量測，不能保證自然人體。':
   '外型需人工審查：下半身 3D 截面不足以驗證左右分腿，不能當作真人人型 PASS。';
  const sectionTable=document.createElement('table'),sectionHead=document.createElement('thead'),
   headRow=document.createElement('tr');
  for(const label of ['原始 3D 截面','高度比例','相連截面數',
    '完整閉合環數','真實相交三角面線段數','各環寬度（mm）']){
   const th=document.createElement('th');th.textContent=label;headRow.append(th);
  }
  sectionHead.append(headRow);sectionTable.append(sectionHead);
  const sectionBody=document.createElement('tbody');
  for(const part of source3DSections.sections){
   const tr=document.createElement('tr');tr.dataset.section=part.id;
   for(const value of [part.id,
    (part.heightFraction*100).toFixed(0)+'%',
    part.significantSections,part.significantClosedLoops,
    part.actualNativeIntersectingSegments,
    part.components.filter(x=>!x.tooSmallForMajorBodyCrossSection)
     .map(x=>x.widthMm.toFixed(1)).join(' / ')||'沒有合格截面']){
    const td=document.createElement('td');td.textContent=String(value);tr.append(td);
   }
   sectionBody.append(tr);
  }
  sectionTable.append(sectionBody);$('source-3d-slice-table').append(sectionTable);
  const shapeEnvelope=reviewAIGReal3DSourceEnvelope({
   geometry:audit,sourceName:file.name,sourceSha256:hash
  });
  const a=shapeEnvelope.boundingMillimeters,q=shapeEnvelope.ratios;
  $('shape-envelope-stats').textContent=
   (shapeEnvelope.fixtureExplicitlySyntheticNonhuman?
    'BLOCK：這是明確標示的非人體合成橢球 QA，不是可驗收的人體模型。':
    shapeEnvelope.wideFrontEnvelopeNeedsPoseAndReferenceReview?
    '外型警示：來源正面外包絡偏寬，請先核對姿勢與原始參考圖；不自動縮身。':
    '已量測來源原始三維 XYZ 包圍盒；仍未驗證真人外型。')+
   ' 資料不能推論胖瘦或真實體重。';
  const dimension=document.createElement('p');
  dimension.textContent='來源真尺寸：高度 '+a.heightY.toFixed(0)+
   ' mm ｜ 正面/背面最大寬度 '+a.frontMaxWidthX.toFixed(0)+
   ' mm ｜ 側面最大厚度 '+a.sideMaxDepthZ.toFixed(0)+
   ' mm ｜ 正面寬幅為側面 '+q.frontMaxWidthToSideDepth.toFixed(2)+' 倍'+
   ' ｜ 正面寬高比 '+(q.frontMaxWidthToHeight*100).toFixed(1)+'%。';
  $('shape-envelope-metrics').append(dimension);
  const detail=document.createElement('p');
  detail.textContent='這是原始頂點的軸向極值（包圍盒），可能包含伸展手臂或裝飾物，' +
    '不等於肩寬、腰圍，也不代表人體重量。陰影不會改變任何原始尺寸。';
  $('shape-envelope-metrics').append(detail);
  const nativeGeometryGatePASS=isOBJ?evidence.geometryPASS:evidence.renderGeometryPASS;
  // A flawed OBJ with REAL indexed source triangles may still be inspected
  // read-only to expose broken seams. It must NEVER be called release-ready.
  if(!nativeGeometryGatePASS){
   if(!isOBJ||!Number.isInteger(evidence.actualTriangles)||
      evidence.actualTriangles<2000)
    throw Error('原始幾何 Gate BLOCK：'+JSON.stringify(evidence.geometricErrors??evidence));
   setStatus('原始 OBJ 幾何 Gate BLOCK：'+evidence.geometricErrors.join('、')+
     '。僅允許唯讀診斷截圖，不是正式可用人體。');
  }
  const canvas=$('native-webgl');
  renderer=createAIG3DRenderer(canvas,{quality:'balanced',
   pixelRatio:1,background:[.769,.745,.702,1]});
  if(renderer.status!=='READY')throw Error('WEBGL_DEVICE_UNAVAILABLE');
  const proofs=[],sourceFrames=new Map();
  for(let i=0;i<SETUPS.length;i++){
   const [label,angle,mode]=SETUPS[i];
   const spec=validateAIGInspectionCapturePlan({
    heightMeters:heightMm/1000,angle,mode:'ALBEDO'
   });
   renderer.setCamera(spec.camera);
   renderer.setInspectionMode(mode);
   const png=await renderer.captureNativePNG(scene,{
    width:1080,height:1920
   });
   if((angle==='front'&&mode==='BROWN_FLAT')||
     (angle!=='front'&&mode==='BROWN_VOLUME')){
    sourceFrames.set(angle,png.blob);
   }
   const href=URL.createObjectURL(png.blob);urlPool.add(href);
   const fig=document.createElement('figure');
   const image=document.createElement('img');
   image.src=href;image.alt=label+' 原生 GPU 不可由炫光改變頂點';
   const caption=document.createElement('figcaption');
   const title=document.createElement('span');title.textContent=label;
   const download=document.createElement('a');
   download.textContent='下載真 PNG';
   download.download='AIG-Real3D-BROWN-'+angle+'-'+mode+'.png';
   download.href=href;
   caption.append(title,download);fig.append(image,caption);
   gallery.append(fig);
   proofs.push({mode,angle,width:1080,height:1920,sha256:png.sha256,
    sourceTriangleCount:evidence.actualTriangles});
   setStatus('真正 GPU 渲染 '+(i+1)+' / '+SETUPS.length+' 頁…');
  }
  const unchanged=auditAIG3DSourceSilhouette(scene);
  if(JSON.stringify(audit)!==JSON.stringify(unchanged))
   throw Error('SOURCE_GEOMETRY_CHANGED_DURING_RENDER');
  const result={
   schema:AIG_INSPECTION_FRAME_SCHEMA,
   rawNativeGeometryGatePASS:nativeGeometryGatePASS,
   diagnosticOnlyWithBadSource:!nativeGeometryGatePASS,
   sourceMeshGeometryErrors:isOBJ?(evidence.geometricErrors??[]):[],
   userSourceName:file.name,sourceSha256:hash,
   measuredHeightMm:heightMm,
   geometry:audit,originalGLB:evidence,sourceShapeEnvelope:shapeEnvelope,
   source3DSections,
   sevenRealBrownGPUPasses:proofs,
   sharedWebGLBloomPresent:false,baseSourceUnchanged:true,
   brownFullBodyColorOverrideApplied:true,
   blackOutlineCreatedInGPUFromSubjectMask:true,
   realHumanAppearanceApproved:false,
   geometricFatnessAttributableToGlow:false,
   noAuthenticHumanSilhouetteReferenceProvided:true,
   humanNaturalAppearanceApproved:false,
   stage1ReleasePASS:false
  };
  const sourceReview=buildAIGReal3DSourceReview({
   sourceName:file.name,sourceSha256:hash,sourceBytes:bytes.byteLength,
   heightMm,upAxis:axis,evidence,
   landmarkSidecar:landmarks,
   declaredOrigin:$('source-origin').value,
   declaredMethod:$('capture-method').value,
   userClaimsAuthorized:$('source-rights').checked,
   captureProofs:proofs.filter(p=>p.mode==='BROWN_VOLUME'||p.mode==='BROWN_FINISH')
  });
  const silhouetteResults=[],silhouetteProblems=[];
  const selected=['front','side','back','threeQuarter'].filter(
   angle=>Boolean($('reference-'+angle).files?.[0]));
  for(const angle of selected){
   try{
    const referenceFile=$('reference-'+angle).files[0];
    if(!/\.png$/i.test(referenceFile.name))
     throw Error('必須選擇透明背景 PNG，不支援 JPG');
    const data=await compareAIGReal3DReferencePNGs({
     sourcePNG:sourceFrames.get(angle),referencePNG:referenceFile,
     angle,sourceSHA:hash
    });
    const href=URL.createObjectURL(data.overlayPNG);urlPool.add(href);
    const fig=document.createElement('figure'),img=document.createElement('img');
    img.src=href;img.alt=angle+'原始 GPU 人體輪廓與去背參考 PNG 差異';
    const cap=document.createElement('figcaption');
    const label=document.createElement('span');
    label.textContent=angle+' 重合 '+(data.diagnostic.intersectionOverUnion*100).toFixed(2)+'%';
    const link=document.createElement('a');
    link.download='AIG-Real3D-Reference-Difference-'+angle+'.png';
    link.href=href;link.textContent='下載輪廓差異圖';
    cap.append(label,link);fig.append(img,cap);
    $('reference-gallery').append(fig);
    silhouetteResults.push(data.diagnostic);
   }catch(e){silhouetteProblems.push({angle,error:e.message});}
  }
  let anatomicalProjection=null,localSurface=null,sourceDefectOverlay=null,sourceGeometryDetail=null;
  const markerGateOK=isOBJ&&evidence.landmarkAudit?.complete===true&&
   landmarks!==null;
  if(markerGateOK){
   // The ORIGINAL indexed triangles are the only geometry input. A GPU
   // view, 2D alpha mask or sidecar label alone cannot repair a seam.
   localSurface=auditAIGNativeOBJLocalSurface({
    objText,landmarks,heightMm,upAxis:axis,sourceSha256:hash
   });
   sourceGeometryDetail=auditAIGReal3DSourceGeometryDetail({
    scene,localSurface,sourceSha256:hash,
    claimedCaptureMethod:$('capture-method').value
   });
   const detailTable=document.createElement('table');
   const header=document.createElement('thead'),headTr=document.createElement('tr');
   for(const title of ['原始 3D 區域','原始三角面數',
    '最長邊 P95 mm','面積 P95 mm²','面片折角 P95°',
    '可疑未焊接邊界點對','缺陷／曲面警示']){
    const th=document.createElement('th');th.textContent=title;headTr.append(th);
   }
   header.append(headTr);detailTable.append(header);
   const data=document.createElement('tbody');
   for(const region of sourceGeometryDetail.regions){
    const tr=document.createElement('tr');tr.dataset.region=region.regionId;
    const values=[region.label,region.actualSourceTrianglesTouchingRadius,
     region.localTriangleMaxEdgeP95Mm??'無',
     region.localSourceTriangleAreaP95Mm2??'無',
     region.adjacentFaceBendP95Degrees??'無',
     region.nearCoincidentDifferentIndexBoundaryPairs,
     region.warningCodes.join('、')||'未發現本類技術異常'];
    for(const value of values){
     const td=document.createElement('td');td.textContent=String(value);tr.append(td);
    }
    data.append(tr);
   }
   detailTable.append(data);$('detail-geometry-table').append(detailTable);
   $('detail-geometry-status').textContent='原始 Indexed XYZ 真曲面已分析五個區域；'+
    sourceGeometryDetail.regionsRequiringReview+
    '/5 區需要技術複核。掃描來源尚未獨立驗真，'+
    '三角面密度不等於真人臉部／手腳完成，4K 不會增加來源幾何。';
   $('surface-stats').textContent='五個來源標記區域的網格拓樸已分析。技術異常：'+
    localSurface.regions.filter(r=>r.anomalyCodes.length).length+'/5；'+
    '這不驗證五指、足趾或臉部自然性。';
   const table=document.createElement('table');
   const head=document.createElement('thead'),titles=document.createElement('tr');
   for(const title of ['真 OBJ 區域','原始邊數','開放邊','非流形邊','面片方向錯誤',
    '標記所屬相連元件','最大標記與表面距離 mm','技術異常']){
    const th=document.createElement('th');th.textContent=title;titles.append(th);
   }
   head.append(titles);table.append(head);
   const body=document.createElement('tbody');
   for(const region of localSurface.regions){
    const tr=document.createElement('tr');tr.dataset.region=region.id;
    for(const value of [region.label,region.neighborhoodEdges,
     region.openEdges,region.nonManifoldEdges,region.inconsistentFaceWindingEdges,
     region.landmarkConnectedComponents,region.largestMarkerSnapErrorMm,
     region.anomalyCodes.join('、')||'未檢測到上述技術異常']){
     const td=document.createElement('td');td.textContent=String(value);tr.append(td);
    }
    body.append(tr);
   }
   table.append(body);$('surface-table').append(table);
   const defectViews=[],defectProjections=new Map();
   for(const angle of ['front','side','back','threeQuarter']){
    const projected=projectAIGSourceDefectEdges({
     localSurface,angle,width:1080,height:1920
    });
    defectProjections.set(angle,projected);
    const frame=sourceFrames.get(angle);
    if(!(frame instanceof Blob))
     throw Error('DEFECT_GPU_ANGLE_SOURCE_MISSING_'+angle);
    const image=await createAIGSourceDefectOverlay({
     sourcePNG:frame,projection:projected
    });
    const href=URL.createObjectURL(image.blob);urlPool.add(href);
    const fig=document.createElement('figure'),img=document.createElement('img');
    img.src=href;
    img.alt=angle+' 真 GPU 咖啡色模型與原始異常三角面邊定位';
    img.dataset.pickable='true';
    img.addEventListener('click',event=>{
     const rect=img.getBoundingClientRect();
     const mapped=canvasClickToAIGSourcePixel({
      clickX:event.clientX-rect.left,clickY:event.clientY-rect.top,
      rectWidth:rect.width,rectHeight:rect.height,
      imageWidth:projected.width,imageHeight:projected.height
     });
     if(!mapped.inside){
      $('defect-selected').textContent='點擊位於圖片留白區，請點選異常線段。';return;
     }
     showDefectSelection(pickAIGReal3DDefectEdge({
      projection:projected,x:mapped.x,y:mapped.y,tolerancePx:32
     }));
    });
    const caption=document.createElement('figcaption');
    const label=document.createElement('span');
    label.textContent=angle+' · 異常來源邊 '+projected.uniqueEvidenceEdges+
     (projected.evidenceTruncated?'（已達證據上限）':'');
    const dl=document.createElement('a');
    dl.href=href;dl.download='AIG-Real3D-SOURCE-EDGE-DEFECT-'+angle+'.png';
    dl.textContent='下載異常邊真 GPU 疊圖';
    caption.append(label,dl);fig.append(img,caption);$('defect-gallery').append(fig);
    defectViews.push({
     ...image,blob:undefined,
     projectedSourceEdgeCount:projected.projectedEdges.length,
     projectedSourceEdges:projected.projectedEdges,
     projectedEvidenceTruncated:projected.evidenceTruncated
    });
   }
   const edgeList=$('defect-edge-list');edgeList.replaceChildren();
   const front=defectProjections.get('front');
   if(front.projectedEdges.length){
    for(const edge of front.projectedEdges.slice(0,32)){
     const button=document.createElement('button');
     button.type='button';
     button.textContent=edge.type+' · '+edge.startVertexIndex+'→'+
      edge.endVertexIndex;
     button.addEventListener('click',()=>{
      const x=(edge.start.x+edge.end.x)/2,
       y=(edge.start.y+edge.end.y)/2;
      showDefectSelection(pickAIGReal3DDefectEdge({
       projection:front,x,y,tolerancePx:5
      }));
     });
     edgeList.append(button);
    }
   }else{
    const no=document.createElement('span');
    no.textContent='所檢五區未找到已分類的異常來源邊。';
    edgeList.append(no);
   }
   sourceDefectOverlay={sourceSha256:hash,
    schema:'AIG_REAL3D_4_VIEW_TRUE_GPU_NATIVE_EDGE_DEFECT_OVERLAY_V1',
    images:defectViews,viewCount:defectViews.length,
    originalVertexMeshNeverModified:true,sourceGeometryGatePASS:nativeGeometryGatePASS,
    naturalHumanAppearancePASS:false,releasePASS:false};
   $('defect-stats').textContent='已輸出 4 張真 GPU 原始邊定位圖；五區異常數：'+
    localSurface.regions.filter(x=>x.anomalyCodes.length).length+
    '。僅為原始網格技術診斷，不是五指／臉部自然度 PASS。';
   const views=[],annotations=[],regions=[];
   for(const angle of ['front','side','back','threeQuarter']){
    const projection=projectAIGNativeOBJLandmarks({
     objText,landmarks,heightMm,upAxis:axis,angle,
     sourceSha256:hash,landmarkAuditComplete:true
    });
    const annotated=await createAIGNativeAnatomyAnnotation({
     sourcePNG:sourceFrames.get(angle),projection
    });
    const href=URL.createObjectURL(annotated.blob);urlPool.add(href);
    const fig=document.createElement('figure'),img=document.createElement('img');
    img.src=href;img.alt=angle+' 原始 OBJ XYZ 標記投影在真正 GPU 咖啡色畫面';
    const cap=document.createElement('figcaption');
    const label=document.createElement('span');
    label.textContent=angle+' · '+annotated.actuallyVisibleLandmarks+' 個畫面內標記';
    const dl=document.createElement('a');dl.href=href;
    dl.download='AIG-Real3D-SOURCE-LANDMARKS-'+angle+'.png';
    dl.textContent='下載標記定位 PNG';
    cap.append(label,dl);fig.append(img,cap);$('anatomy-gallery').append(fig);
    views.push(projection);
    annotations.push({...annotated,blob:undefined});
    const comparison=silhouetteResults.find(x=>x.angle===angle);
    if(comparison?.verticalScanlineProfile)
     regions.push(summarizeAIGLandmarkHeightRegions({
      projection,profile:comparison.verticalScanlineProfile
     }));
   }
   anatomicalProjection={
    schema:'AIG_REAL3D_NATIVE_OBJ_MARKER_4_VIEW_SOURCE_REVIEW_V1',
    sourceSha256:hash,originalObjMarkerMeshAuditComplete:true,
    fourAngleProjectedPoints:views,
    fourSourceGPUAnnotations:annotations,
    localized12BandWeightedErrors:regions,
    regionComparisonCount:regions.length,
    sourceHumanAuthenticityVerified:false,
    naturalHumanAppearancePASS:false,
    automatedFacialOrFingerReconstruction:false,
    noSourceGeometryModified:true,releasePASS:false
   };
   $('anatomy-stats').textContent='OBJ 21 個原始 XYZ 標記已通過貼合檢查；四視角定位已輸出。'+
    ' 有透明參考輪廓的方向：'+regions.length+'/4。真人外觀仍 BLOCK。';
   if(regions.length){
    const table=document.createElement('table'),thead=document.createElement('thead'),
     header=document.createElement('tr');
    for(const label of ['方向','標記高度範圍','影像 Y(px)','平均輪廓差(px/列)','中心偏移(px)']){
     const th=document.createElement('th');th.textContent=label;header.append(th);
    }
    thead.append(header);table.append(thead);
    const tbody=document.createElement('tbody');
    for(const region of regions)for(const segment of region.segments){
     const tr=document.createElement('tr');
     for(const value of [
      region.angle,segment.id,
      segment.topPx+'–'+segment.bottomPx,
      segment.meanSignedCoverageDeltaPxPerRow??'缺少參考',
      segment.meanCentroidXDeltaPx??'缺少參考'
     ]){
      const td=document.createElement('td');td.textContent=String(value);tr.append(td);
     }
     tbody.append(tr);
    }
    table.append(tbody);$('anatomy-region-table').append(table);
   }
  }else{
   $('anatomy-stats').textContent='BLOCK：'+
    (isOBJ?'需提供 21 個通過原始網格貼合審核的標記。':
     'GLB 原始標記局部映射尚未驗證；先用 OBJ 來源。')+
    ' 不能根據橢圓輪廓自動猜測人體部位。';
  }
  const summary=evaluateAIGReal3DFourViewComparisons(silhouetteResults);
  profiles=silhouetteResults;
  $('profile-angle').disabled=profiles.length===0;
  if(profiles.length){
   $('profile-angle').value=profiles.some(x=>x.angle==='front')?
    'front':profiles[0].angle;
  }
  renderProfileAngle();
  $('reference-stats').textContent=selected.length===0?
   '尚未提供透明輪廓參考圖。GPU 渲染已完成，但沒有來源照片外型比對。':
   '已比對 '+summary.count+'/4 視角；平均重合率：'+
   (summary.averageIoU===null?'無法計算':(summary.averageIoU*100).toFixed(2)+'%')+
   '；失敗：'+silhouetteProblems.length+'；這不是人體自然度自動驗收。';
  currentNativeReview=localSurface?{
   localSurface,objText,sourceSha256:hash,heightMm,upAxis:axis,landmarks,
   sourceFrames,sourceName:file.name
  }:null;
  $('compare-source').disabled=!currentNativeReview;
  $('make-local-working-copy').disabled=!currentNativeReview;
  $('make-curved-junction-copy').disabled=!currentNativeReview;
  $('curved-junction-stats').textContent=currentNativeReview?
   '來源已通過原始標記檢查，可嘗試小型非平面四邊以上缺口；無法修復時顯示 BLOCK。':
   '缺少可核對的 OBJ；非平面曲面修補 BLOCK。';
  $('local-working-copy-stats').textContent=currentNativeReview?
   '可建立獨立小型平面破洞修補工作副本：按鈕只新增 OBJ 三角面，絕不覆寫原始來源。':
   '尚無通過原始網格標記審核的 OBJ，修補工作副本 BLOCK。';
  $('repair-compare-stats').textContent=currentNativeReview?
   '修復前來源已鎖定 SHA '+hash.slice(0,16)+
   '…；請選擇第二份 OBJ 並開始差異比較。':
   '缺少經原始 OBJ 網格審核的標記，修復前／後比較 BLOCK。';
  report={...result,sourceReview,anatomicalProjection,localSurfaceTopology:localSurface,
   sourceGeometryDetail,
   sourceDefectOverlay,silhouetteComparison:{
   ...summary,images:silhouetteResults,errors:silhouetteProblems,
   transparentReferencesUploaded:selected.length,
   fourViewSilhouetteComparePASS:summary.allFourAnglesCompared&&
    summary.sourceSHAConsistent&&silhouetteProblems.length===0,
   anatomicalVisualApproval:false,personLikenessVerified:false
  }};
  $('evidence').textContent=JSON.stringify(report,null,2);
  lastResolutionSource={file,sha256:hash,heightMm,upAxis:axis,landmarks,
   format:isOBJ?'OBJ':'GLB',sourceGeometryAudit:audit};
  $('native-output-render').disabled=false;
  $('native-output-status').textContent='來源已完成 1080×1920 固定 QA。另選高解析度真正 GPU 輸出；4K 只做單張，不影響原始 XYZ／正式人體 BLOCK。';
  $('report-download').disabled=false;
  setStatus((sliceFlag?'BLOCK：下半身只有單一 3D 連續截面 ':shapeEnvelope.fixtureExplicitlySyntheticNonhuman?
    'BLOCK：合成非人體 QA 模型 ':nativeGeometryGatePASS?
    '來源 ':'BLOCK：來源 ')+file.name+' 完成 7 張唯讀 GPU 診斷圖；'+
   (!nativeGeometryGatePASS?'【原始幾何 FAIL：禁止正式發布】'+
     (evidence.geometricErrors??[]).join('、')+'。':
    (sourceReview.readyForHumanReferenceReview?
     '已具備人工外觀核對前置資料。':'來源或人體標記仍有 Gate 缺口。'))+
   ' 自然人體／照片一比一始終 BLOCK。',nativeGeometryGatePASS&&!shapeEnvelope.fixtureExplicitlySyntheticNonhuman&&!sliceFlag);
 }catch(e){
  setStatus('BLOCK：'+(e?.message||String(e)));
  $('evidence').textContent='檢查未通過；已顯示的圖片不得作為完整證據。';
 }finally{
  renderer?.destroy?.();running=false;$('inspect').disabled=false;
 }
});
window.addEventListener('pagehide',release);

$('report-download').addEventListener('click',()=>{
 if(!report)return;
 const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=u;a.download='AIG-Real3D-Source-Review-Report.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),15000);
});


$('compare-source').addEventListener('click',async()=>{
 const original=currentNativeReview,previousReport=report;
 const afterFile=$('after-source-file').files?.[0];
 if(running||!original?.localSurface||!previousReport)return;
 if(!afterFile||!/\.obj$/i.test(afterFile.name)){
  $('repair-compare-stats').textContent='BLOCK：請選擇修復後真正 OBJ 原始檔。';return;
 }
 running=true;
 $('inspect').disabled=true;$('compare-source').disabled=true;
 $('repair-compare-stats').textContent='比較原始 SHA 與真實三角面資料中…';
 $('repair-compare-table').replaceChildren();
 $('repair-compare-gallery').replaceChildren();
 let afterRenderer;
 try{
  const bytes=await afterFile.arrayBuffer();
  if(bytes.byteLength>50_000_000||bytes.byteLength<64)
   throw Error('修復後 OBJ 超出來源大小限制');
  const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  if(sha256===original.sourceSha256)
   throw Error('修復前後 SHA 完全相同：不是兩份不同的原始 OBJ');
  const objText=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const after=auditAIGNativeOBJLocalSurface({
   objText,landmarks:original.landmarks,heightMm:original.heightMm,
   upAxis:original.upAxis,sourceSha256:sha256
  });
  const diff=compareAIGNativeSourceDefects({
   before:original.localSurface,after
  });
  const built=buildAIGReal3DScanNative({
   objText,landmarks:original.landmarks,heightMm:original.heightMm,
   upAxis:original.upAxis,sourceSha256:sha256,
   sourceName:afterFile.name
  });
  const beforeSource=original.localSurface,afterSource=after;
  const beforeEnvelope=previousReport.sourceShapeEnvelope;
  if(!beforeEnvelope)throw Error('修復前原始 XYZ 外型尺寸未記錄');
  const afterEnvelope=reviewAIGReal3DSourceEnvelope({
   geometry:auditAIG3DSourceSilhouette(built.scene),
   sourceName:afterFile.name,sourceSha256:sha256
  });
  const shapeDiff=compareAIGReal3DSourceEnvelopes(beforeEnvelope,afterEnvelope);
  if(JSON.stringify(built.evidence.geometryPASS)!==
   JSON.stringify(afterSource.sourceGeometryGatePASS))
   throw Error('修復後 GPU 幾何與原生拓樸 Gate 不一致');
  afterRenderer=createAIG3DRenderer($('native-webgl'),{
   quality:'balanced',pixelRatio:1,background:[.769,.745,.702,1]
  });
  if(afterRenderer.status!=='READY')
   throw Error('修復後真 GPU 來源不可用');
  const pairs=[];
  for(const angle of ['front','side','back','threeQuarter']){
   const camera=validateAIGInspectionCapturePlan({
    heightMeters:original.heightMm/1000,angle,mode:'ALBEDO'
   });
   afterRenderer.setCamera(camera.camera);
   afterRenderer.setInspectionMode(angle==='front'?'BROWN_FLAT':'BROWN_VOLUME');
   const png=await afterRenderer.captureNativePNG(built.scene,{
    width:1080,height:1920
   });
   const rawProj=projectAIGSourceDefectEdges({
    localSurface:afterSource,angle,width:1080,height:1920
   });
   const overlay=await createAIGSourceDefectOverlay({
    sourcePNG:png.blob,projection:rawProj
   });
   const beforeBlob=original.sourceFrames.get(angle);
   if(!(beforeBlob instanceof Blob))
    throw Error('缺少修復前 '+angle+' 真 GPU 影像');
   const oldHref=URL.createObjectURL(beforeBlob),
    newHref=URL.createObjectURL(overlay.blob);
   urlPool.add(oldHref);urlPool.add(newHref);
   const block=document.createElement('div');
   const h=document.createElement('h4');h.textContent=angle+' ｜ 相同正交鏡頭';
   block.append(h);
   const row=document.createElement('div');row.className='compare-pair';
   for(const item of [
    {src:oldHref,label:'修復前原始咖啡色 GPU'},
    {src:newHref,label:'候選後原始咖啡色 GPU + 缺陷線'}
   ]){
    const fig=document.createElement('figure'),img=document.createElement('img');
    img.src=item.src;img.alt=angle+' '+item.label;
    const cap=document.createElement('figcaption');
    cap.textContent=item.label;fig.append(img,cap);row.append(fig);
   }
   block.append(row);
   const link=document.createElement('a');
   link.textContent='下載候選後 '+angle+' 原始異常邊 PNG';
   link.href=newHref;link.download='AIG-Real3D-CANDIDATE-AFTER-'+angle+'.png';
   block.append(link);$('repair-compare-gallery').append(block);
   pairs.push({
    angle,afterBrownGPUsha256:png.sha256,
    afterBrownGPUOverlaySHA256:overlay.sha256,
    sourceBeforeSha256:original.sourceSha256,
    sourceAfterSha256:sha256,
    afterDefectEdgeCount:rawProj.uniqueEvidenceEdges,
    original3DMeshesUnmodified:true
   });
  }
  const record={
   ...diff,afterSourceName:afterFile.name,sourceShapeBeforeAfter:shapeDiff,
   fourPairedRealGPUViews:pairs,
   bothSourceModelsRemainUnmodified:true,
   visualHumanAppearanceApproved:false,
   verifiedAnatomicalRepair:false,releasePASS:false
  };
  report={...previousReport,beforeAfterComparison:record};
  $('evidence').textContent=JSON.stringify(report,null,2);
  makeComparisonTable(diff);
  $('repair-compare-stats').textContent=
   '兩份來源 OBJ 已對照。舊 SHA '+original.sourceSha256.slice(0,16)+
   '… → 新 SHA '+sha256.slice(0,16)+'…。開放邊全域：'+
   diff.globalBefore.openEdges+' → '+diff.globalAfter.openEdges+
   '；消失的局部已知異常邊 '+diff.previousDefectEdgesAbsentInAfter+
   '；寬度 '+shapeDiff.before.frontMaxWidthX+'→'+shapeDiff.after.frontMaxWidthX+
   ' mm；側面厚度 '+shapeDiff.before.sideMaxDepthZ+'→'+shapeDiff.after.sideMaxDepthZ+
   ' mm'+(shapeDiff.sameVisibleBoundingEnvelopeAcrossSources?
     '（外型最大寬厚未改變）':'（包圍盒有變化，還須四視角參考比對）')+
   '。僅代表原始拓樸差異，真人／修復成品 Gate 一律 BLOCK。';
 }catch(err){
  $('repair-compare-stats').textContent='BLOCK：'+(err?.message||String(err));
  $('repair-compare-table').replaceChildren();
  $('repair-compare-gallery').replaceChildren();
  report=previousReport;
  $('evidence').textContent=JSON.stringify(previousReport,null,2);
 }finally{
  afterRenderer?.destroy?.();running=false;
  $('inspect').disabled=false;
  $('compare-source').disabled=!currentNativeReview;
 }
});


$('make-local-working-copy').addEventListener('click',async()=>{
 const original=currentNativeReview;
 if(running||!original?.objText){
  $('local-working-copy-stats').textContent='BLOCK：需要真實原始 OBJ 與來源標記審核。';return;
 }
 running=true;$('make-local-working-copy').disabled=true;
 $('local-working-copy-download').hidden=true;
 try{
  const candidate=createAIGReal3DOBJLocalPatchWorkingCopy({
   objText:original.objText,heightMm:original.heightMm,
   upAxis:original.upAxis,sourceSha256:original.sourceSha256,
   sourceName:original.sourceName,authorizeWorkingCopy:true,
   maximumHoleDiameterMm:100,maximumHoles:2
  });
  const file=new File([candidate.workingCopyCandidateObjText],
   'AIG-Real3D-LOCAL-PATCH-WORKING-COPY.obj',{type:'text/plain'});
  const candidateSha256=[...new Uint8Array(await crypto.subtle.digest(
   'SHA-256',await file.arrayBuffer()))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  if(candidateSha256===original.sourceSha256)
   throw Error('工作副本 SHA 未改變：拒絕假修補');
  const url=URL.createObjectURL(file);urlPool.add(url);
  const link=$('local-working-copy-download');link.href=url;
  link.download=file.name;link.hidden=false;
  // This is a separate real File (unmodified original file remains selected).
  // Enables the existing true before/after GPU comparison without re-upload.
  const transfer=new DataTransfer();transfer.items.add(file);
  $('after-source-file').files=transfer.files;
  if(!report)throw Error('先完成真來源報告');
  const {workingCopyCandidateObjText:omitted,...summary}=candidate;
  report.localPatchWorkingCopy={
   ...summary,workingCopySha256:candidateSha256,
   originalSourceSha256:original.sourceSha256,
   generatedOnlyAfterUserClick:true,
   trueNativeOBJNewFaceGeometry:true,
   sourceAndCandidateSHAIndependent:true,
   actualHumanSurfaceReconstructionComplete:false,
   humanNaturalAppearancePASS:false,releasePASS:false
  };
  $('evidence').textContent=JSON.stringify(report,null,2);
  $('local-working-copy-stats').textContent=
   '已建立獨立 OBJ 工作副本。原始頂點 '+candidate.sourceOriginalVertices+
   ' 個、原始頂點改動 0、新增真三角面 '+candidate.addedFaceCount+
   '、補足邊界 '+candidate.repairedSourceBoundaryEdges+
   ' 條。原 SHA '+original.sourceSha256.slice(0,16)+'…；工作副本 SHA '+
   candidateSha256.slice(0,16)+'…。可下載，也已填入下方修復前／後比較欄。'+
   ' 只證明小破洞的拓樸修補，不代表自然人體完成。';
 }catch(e){
  $('local-working-copy-stats').textContent='BLOCK：'+
   (e?.message||String(e))+
   '。不符合安全補面條件時不產生工作副本，也不會修改原始 OBJ。';
 }finally{
  running=false;$('make-local-working-copy').disabled=!currentNativeReview;
 }
});


$('native-output-render').addEventListener('click',async()=>{
 const source=lastResolutionSource;
 if(running||!source||!report){
  $('native-output-status').textContent='BLOCK：請先完成來源原始網格七視圖檢查。';
  return;
 }
 running=true;$('native-output-render').disabled=true;
 $('native-output-download').hidden=true;
 $('native-output-figure').hidden=true;
 $('native-output-status').textContent='硬體預檢及真正 GPU 像素擷取中…';
 let captureRenderer;
 try{
  captureRenderer=createAIG3DRenderer($('native-webgl'),{
   quality:'balanced',pixelRatio:1,background:[.769,.745,.702,1]
  });
  if(captureRenderer.status!=='READY')throw Error('此裝置沒有可用的 WebGL GPU 畫面');
  const preset=$('native-output-preset').value,
   orientation=$('native-output-orientation').value,
   angle=$('native-output-angle').value;
  const plan=planAIGReal3DNativeResolution({
   preset,orientation,gpuLimit:captureRenderer.getGpuLimit(),
   deviceMemoryGB:Number.isFinite(navigator.deviceMemory)?navigator.deviceMemory:null,
   devicePixelRatio:window.devicePixelRatio||1,
   autoCssWidth:window.innerWidth,autoCssHeight:window.innerHeight
  });
  if(!plan.permitted)throw Error('此裝置不能安全擷取 '+plan.width+
   '×'+plan.height+'：'+plan.limitReasons.join('、')+
   '；請選 1080p 或 2K，沒有以放大小圖冒充高解析度。');
  const bytes=await source.file.arrayBuffer();
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
   x=>x.toString(16).padStart(2,'0')).join('');
  if(sha256!==source.sha256)
   throw Error('來源 OBJ／GLB SHA 與初次檢查不一致');
  const original=source.format==='OBJ'?
   buildAIGReal3DScanNative({
    objText:new TextDecoder('utf-8',{fatal:true}).decode(bytes),
    heightMm:source.heightMm,upAxis:source.upAxis,
    landmarks:source.landmarks,sourceName:source.file.name,sourceSha256:sha256
   }):
   buildAIGReal3DGLBStatic({
    bytes,heightMm:source.heightMm,sourceName:source.file.name,
    sourceSha256:sha256
   });
  const before=auditAIG3DSourceSilhouette(original.scene);
  const camera=validateAIGInspectionCapturePlan({
   heightMeters:source.heightMm/1000,angle,mode:'ALBEDO'
  });
  captureRenderer.setCamera(camera.camera);
  captureRenderer.setInspectionMode('BROWN_VOLUME');
  const result=await captureRenderer.captureNativePNG(original.scene,{
   width:plan.width,height:plan.height
  });
  const after=auditAIG3DSourceSilhouette(original.scene);
  if(JSON.stringify(before)!==JSON.stringify(after))
   throw Error('GPU 高解析度擷取期間來源網格改變：BLOCK');
  if(result.width!==plan.width||result.height!==plan.height||
    result.nativeOutputPixels!==plan.pixels||result.resampledFromSmallerImage!==false)
   throw Error('輸出 PNG 原生尺寸與規劃不一致，禁止偽稱 2K／4K');
  const href=URL.createObjectURL(result.blob);urlPool.add(href);
  const name='AIG-Real3D-NATIVE-'+plan.selectedPreset+'-'+angle+'-'+orientation+'.png';
  $('native-output-download').href=href;
  $('native-output-download').download=name;
  $('native-output-download').hidden=false;
  $('native-output-image').src=href;
  $('native-output-figure').hidden=false;
  $('native-output-caption').textContent=plan.width+'×'+plan.height+
   ' 原生 GPU 像素 '+plan.pixels.toLocaleString()+
   '；此圖不代表增加模型三角面。';
  const evidence={
   schema:'AIG_REAL3D_NATIVE_GPU_RESOLUTION_EXPORT_V1',
   ...plan,angle,sourceSha256:sha256,pngSha256:result.sha256,
   nativePNGWidth:result.width,nativePNGHeight:result.height,
   actualGPUReadback:result.genuineGpuReadback,
   noUpscale:result.resampledFromSmallerImage===false,
   baseGeometryUnchanged:true,sourceTriangles:original.evidence.actualTriangles,
   sourceHumanAppearanceApproved:false,releasePASS:false
  };
  if(!Array.isArray(report.nativeGpuExports))report.nativeGpuExports=[];
  report.nativeGpuExports.push(evidence);
  $('evidence').textContent=JSON.stringify(report,null,2);
  $('native-output-status').textContent=
   '真正 GPU '+plan.selectedPreset+' '+plan.width+'×'+plan.height+
   ' PNG 已產生、可下載；SHA '+result.sha256.slice(0,20)+
   '…；估計峰值記憶體約 '+plan.approximatePeakCaptureMemoryMiB+
   ' MiB。1080p 七視角原始驗收和模型三角面都未改變。真人外觀仍 BLOCK。';
 }catch(e){
  $('native-output-download').hidden=true;
  $('native-output-figure').hidden=true;
  $('native-output-status').textContent='BLOCK：'+(e?.message||String(e))+
   '。硬體支援不足不得冒稱已輸出原生高解析度。';
 }finally{
  captureRenderer?.destroy?.();
  running=false;
  $('native-output-render').disabled=!lastResolutionSource;
 }
});


$('make-curved-junction-copy').addEventListener('click',async()=>{
 const original=currentNativeReview;
 if(running||!original?.objText){
  $('curved-junction-stats').textContent='BLOCK：僅接受通過來源檢查的真 OBJ。';return;
 }
 running=true;
 $('make-curved-junction-copy').disabled=true;
 $('curved-junction-download').hidden=true;
 try{
  const copy=createAIGReal3DCurvedJunctionWorkingCopy({
   objText:original.objText,sourceName:original.sourceName,
   sourceSha256:original.sourceSha256,
   heightMm:original.heightMm,upAxis:original.upAxis,
   authorizeWorkingCopy:true,
   maxHoleDiameterMm:90,maxNonplanarityMm:3,maxFaceBendDegrees:55
  });
  const file=new File([copy.workingCopyCandidateObjText],
   'AIG-Real3D-CURVED-JUNCTION-WORKING-COPY.obj',
   {type:'text/plain'});
  const bytes=await file.arrayBuffer();
  const sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
   .map(x=>x.toString(16).padStart(2,'0')).join('');
  if(sha===original.sourceSha256)
   throw Error('工作副本 SHA 與來源完全相同，禁止假成功');
  const url=URL.createObjectURL(file);urlPool.add(url);
  const link=$('curved-junction-download');
  link.href=url;link.download=file.name;link.hidden=false;
  // Load into existing independent four-camera OBJ comparison tool.
  const dt=new DataTransfer();dt.items.add(file);
  $('after-source-file').files=dt.files;
  if(!report)throw Error('原始來源報告不存在');
  const {workingCopyCandidateObjText:ignore,...evidence}=copy;
  report.curvedJunctionWorkingCopy={
   ...evidence,workingCopySha256:sha,
   actualSourceXYZPreserved:true,
   generatedOnlyByRealUserCallback:true,
   noAutomaticAnatomicalAcceptance:true
  };
  $('evidence').textContent=JSON.stringify(report,null,2);
  $('curved-junction-stats').textContent=
   '已產生獨立非平面候選 OBJ（不覆寫來源）。原始頂點 '+copy.sourceVertices+
   ' 個；新頂點 '+copy.addedSourceVertices+'、新三角面 '+
   copy.addedSourceTriangles+'；邊界非平面偏差 '+
   copy.boundaryNonplanarityMm+' mm、中心校正 '+
   copy.centerNormalCorrectionMm+' mm；最大新舊曲面折角 '+
   copy.worstAddedToOriginalFaceBendDegrees+
   '°。可下載，並已放入下方真 GPU 前後比較欄。'+
   ' 此為近似插值，不代表真人頭頸、手部或腳趾已修復。';
 }catch(err){
  $('curved-junction-download').hidden=true;
  $('curved-junction-stats').textContent='BLOCK：'+(err?.message||String(err))+
   '。原始 OBJ 不會被更改；不以假模型取代失敗的真實曲面。';
 }finally{
  running=false;
  $('make-curved-junction-copy').disabled=!currentNativeReview;
 }
});


let latestDenseSourceEvidence=null;
$('dense-source-run').addEventListener('click',async()=>{
 if(running){$('dense-source-status').textContent='BLOCK：另一項 GPU 工作尚未完成。';return;}
 const f=$('model-file').files?.[0],
  heightMm=Number($('body-height').value),upAxis=$('up-axis').value;
 if(!f||!/\.obj$/i.test(f.name)||!Number.isInteger(heightMm)||
 heightMm<900||heightMm>2200){
  $('dense-source-status').textContent='BLOCK：須先選擇真正本機 OBJ 與校正身高 mm。';return;
 }
 running=true;
 $('dense-source-run').disabled=true;
 $('inspect').disabled=true;
 $('dense-source-download').hidden=true;
 $('dense-evidence-download').disabled=true;
 $('dense-source-figure').hidden=true;
 $('dense-source-evidence').textContent='GPU 工作進行中；尚未確認來源。';
 denseAnatomyUI.reset();
 $('dense-source-status').textContent='解析原始高密度三角面、分塊並檢查真 GPU 輸出中…';
 let gpu=null;
 try{
  if(f.size>50_000_000)throw Error('OBJ 檔案大於單次 50MB 安全上限');
  const bytes=await f.arrayBuffer();
  const sourceSha256=Array.from(
   new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),
   v=>v.toString(16).padStart(2,'0')).join('');
  const objText=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  const dense=buildAIGReal3DDenseOBJSource({
   objText,sourceSha256,sourceName:f.name,heightMm,upAxis
  });
  gpu=createAIG3DRenderer($('native-webgl'),{
   quality:'balanced',pixelRatio:1,maxTriangles:700000,
   background:[.769,.745,.702,1]
  });
  if(gpu.status!=='READY')throw Error('本地 GPU 尚未啟用，無法產生真實圖片');
  if(gpu.getGpuLimit()<1920)throw Error('GPU 尺寸不足 1080×1920 原生來源畫面');
  const camera=validateAIGInspectionCapturePlan({
   heightMeters:heightMm/1000,angle:'front',mode:'ALBEDO'
  });
  gpu.setCamera(camera.camera);
  gpu.setInspectionMode('BROWN_VOLUME');
  const frame=await gpu.captureNativePNG(dense.scene,{
   width:1080,height:1920
  });
  if(!frame.genuineGpuReadback||frame.width!==1080||frame.height!==1920||
   frame.resampledFromSmallerImage!==false)
   throw Error('高密度來源圖片不是原生 GPU 讀回 PNG');
  const references=[];
  for(const angle of ['front','side','back','threeQuarter']){
   const file=$('reference-'+angle).files?.[0];
   if(!file)continue;
   if(file.size<100||file.size>35_000_000||!/\.png$/i.test(file.name))
    throw Error(angle+' 參考圖必須是本機有效 PNG');
   const raw=await file.arrayBuffer(),sig=new Uint8Array(raw,0,8);
   if(sig.join(',')!=='137,80,78,71,13,10,26,10')
    throw Error(angle+' 參考圖的真 PNG 標頭錯誤');
   const bitmap=await createImageBitmap(file);
   const width=bitmap.width,height=bitmap.height;bitmap.close();
   references.push({
    angle,name:file.name,width,height,
    sha256:Array.from(
     new Uint8Array(await crypto.subtle.digest('SHA-256',raw)),
     v=>v.toString(16).padStart(2,'0')).join('')
   });
  }
  const packet=buildAIGReal3DDenseEvidencePacket({
   sourceEvidence:dense.evidence,sourceSha256,referenceImages:references,
   sourceOrigin:$('source-origin').value,
   claimedMethod:$('capture-method').value,
   authorizedByClaimant:$('source-rights').checked
  });
  denseAnatomyUI.load({dense,file:f,sha256:sourceSha256,heightMm,upAxis});
  latestDenseSourceEvidence={
   ...packet,
   realGPUFront:{width:1080,height:1920,sha256:frame.sha256,
    trueHardwarePixelsReadBack:true},
   originalMeshUnmodified:true,
   previewPassOnlyNotHumanAcceptance:true
  };
  const href=URL.createObjectURL(frame.blob);urlPool.add(href);
  $('dense-source-download').href=href;
  $('dense-source-download').download='AIG-Real3D-DENSE-RAW-FRONT-GPU.png';
  $('dense-source-download').hidden=false;
  $('dense-source-figure').hidden=false;
  $('dense-source-image').src=href;
  $('dense-source-caption').textContent=
   '原始 '+dense.evidence.originalVertexCount+' 頂點／'+
   dense.evidence.originalTriangleCount+' 真三角面；'+
   dense.evidence.gpuChunkCount+' 個 GPU 分塊；正面 1080×1920 真 GPU。';
  $('dense-source-evidence').textContent=
   JSON.stringify(latestDenseSourceEvidence,null,2);
  $('dense-evidence-download').disabled=false;
  $('dense-source-status').textContent=
   '高密度來源原生 GPU PASS（不代表真人人體）：原始頂點 '+
   dense.evidence.originalVertexCount+'、三角面 '+
   dense.evidence.originalTriangleCount+
   '，分塊後三角面 '+dense.evidence.renderedTriangleCount+
   '（減面 0）；GPU 圖與來源 SHA 已記錄。'+
   (packet.completeFourViewReferenceSet?
    '四個來源 PNG SHA 已完整鎖定，但照片真實性／同一人物仍未驗證。':
    '四視角原始參考 PNG 尚未齊全，真人外觀驗收 BLOCK。');
 }catch(error){
  latestDenseSourceEvidence=null;
  denseAnatomyUI.reset();
  $('dense-source-evidence').textContent='BLOCK：'+(error?.message||String(error));
  $('dense-source-status').textContent='BLOCK：'+(error?.message||String(error))+
   '。來源沒有通過驗證時不能宣稱高密度 GPU 匯入成功。';
  $('dense-source-download').hidden=true;
  $('dense-evidence-download').disabled=true;
  $('dense-source-figure').hidden=true;
 }finally{
  gpu?.destroy?.();
  running=false;
  $('dense-source-run').disabled=false;
  $('inspect').disabled=false;
 }
});
$('dense-evidence-download').addEventListener('click',()=>{
 if(!latestDenseSourceEvidence)return;
 const blob=new Blob([JSON.stringify(latestDenseSourceEvidence,null,2)],
  {type:'application/json'});
 const url=URL.createObjectURL(blob);
 urlPool.add(url);
 const a=document.createElement('a');
 a.href=url;a.download='AIG-Real3D-DENSE-SOURCE-SHA-REFERENCES.json';
 a.click();
});

const denseAnatomyUI=mountAIGReal3DDenseAnatomyControls({
 $,
 isBusy:()=>running,
 setBusy:v=>{running=v;},
 registerURL:u=>urlPool.add(u)
});
