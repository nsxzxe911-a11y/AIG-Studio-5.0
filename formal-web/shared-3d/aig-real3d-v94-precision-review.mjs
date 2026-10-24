/** V94 local original OBJ SHA, topology dimensions and 4 true WebGL views. */
import {loadAIGReal3DOriginalOBJStructure}
 from './aig-real3d-v94-obj-structure-intake.mjs';
import {auditAIGReal3DOriginalStructure}
 from './aig-real3d-v94-source-structure-audit.mjs';
import {evaluateAIGReal3DCinemaGeometryFirst}
 from './aig-real3d-v94-cinema-quality-budget.mjs';
import {buildAIGReal3DMeasuredGeometryWorkingCopy}
 from './aig-real3d-v94-measured-geometry-working-copy.mjs';
import {createAIG3DRenderer}
 from './aig-real3d-webgl.mjs';
const $=id=>document.getElementById(id);
let incoming=null,report=null,cinema=null,corrected=null,renderer=null,
 observations=[],photoURL=null,auditURL=null;
const angles={front:[0,.13],side:[Math.PI/2,.16],
 back:[Math.PI,.13],oblique:[Math.PI/4,.38]};
const preview=$('viewport');
function status(v){$('status').textContent=v;}
const hex=async data=>Array.from(new Uint8Array(
 await crypto.subtle.digest('SHA-256',data)),
 v=>v.toString(16).padStart(2,'0')).join('');
function sceneBounds(scene){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const n of scene.nodes){
  const b=n.mesh.bounds;
  for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],b.min[i]);hi[i]=Math.max(hi[i],b.max[i]);}
 }
 return {focus:lo.map((v,i)=>(v+hi[i])/2),
  orthoSpan:Math.max(0.005,1.4*Math.max(...hi.map((v,i)=>v-lo[i])))};
}
function view(key='oblique'){
 if(!incoming||!renderer)return;
 const [yaw,pitch]=angles[key],bounds=sceneBounds(incoming.scene);
 renderer.setCamera({projection:'orthographic',yaw,pitch,
  distance:Math.max(1,bounds.orthoSpan*2),focus:bounds.focus,
  orthoSpan:bounds.orthoSpan});
 const r=renderer.render(corrected?.workingScene??incoming.scene);
 if(r.status!=='WEBGL_XYZ_TRIANGLES_RENDERED')
  throw Error('必須先通過真 WebGL 原始 indexed XYZ 畫面');
 status('真 3D '+key+'／原始三角面 '+r.triangles+
  '／來源 SHA '+incoming.sourceSha256.slice(0,14)+'…'+
  '。這是幾何審核，非材質電影品質驗收。');
}
function validate(){
 if(!incoming)return;
 report=auditAIGReal3DOriginalStructure({
  scene:incoming.scene,sourceSha256:incoming.sourceSha256,
  parts:incoming.parts,observations,
  creaseAngleDeg:38
 });
 cinema=evaluateAIGReal3DCinemaGeometryFirst({structure:report,
  materialParts:[],shot:{widthPx:1920,heightPx:1080,
   cameraOrthoSpanMeters:2.4,maxProjectedSourceEdgePx:18,
   minTextureTexelsPerScreenPixel:1}});
 $('evidence').textContent=JSON.stringify({
  originalFileSHA:incoming.sourceSha256,
  originalTriangleCount:report.originalTriangleCount,
  originalTrianglesAdded:report.originalTrianglesAdded,
  sourceTopologyGatePASS:report.sourceTopologyGatePASS,
  measuredCorrectionWorkingCopyVertices:corrected?.actualSourceVerticesMoved??0,
  measuredCorrectionRequiresIndependentVerification:true,
  independent1to1AccuracyPASS:report.precision1to1IndependentlyCertified,
  measuredDimensionsAndThicknessPASS:report.measurementsWithinTolerance,
  evidenceUploadedCount:report.observationChecks.length,
  originalUVPresentInOBJ:incoming.sourceFileHasUVTokens,
  originalUVImportedIntoMaterialShader:false,
  materialSourceGatePASS:cinema.declaredMaterialSourcesPASS,
  filmCloseupAndOutputPASS:false,
  partDiagnostics:report.parts.map(p=>({partId:p.partId,
   originalSourceNode:p.sourceNodeId,originalFaces:p.geometry.rawIndexedTriangles,
   openEdges:p.geometry.openSourceIndexedEdges,
   nonmanifoldEdges:p.geometry.nonManifoldSourceEdges,
   hardEdges:p.geometry.sourceHardEdges,
   smoothEdges:p.geometry.sourceSmoothEdges,
   faceOrientationConflicts:p.geometry.adjacentFaceOrientationConflicts,
   sourceConnectedIslands:p.geometry.sourceConnectedFaceIslands,
   sourceDimensionsMeters:p.geometry.dimensionsMeters,
   indexedWatertight:p.geometry.indexedTopologyWatertight,
   sourceTopologyPASS:p.sourceTopologyPASS})),
  observationChecks:report.observationChecks
 },null,2);
}
function componentControls(){
 const container=$('parts');container.replaceChildren();
 for(const part of incoming.parts){
  const row=document.createElement('div');row.className='part';
  const label=document.createElement('strong');
  label.textContent=part.id+'／'+part.nodeId+' ';
  const role=document.createElement('select');
  for(const value of ['OTHER','SHELL','ARMOR','WINDOW','ENGINE',
   'MECHANISM','SKIN','HAIR','GARMENT','FEATHER','FUR','FIN','ENVIRONMENT']){
   const el=document.createElement('option');el.value=value;
   el.textContent=value;role.append(el);
  }
  role.value=part.role;
  role.setAttribute('aria-label',part.id+' 部件功能');
  role.addEventListener('change',()=>{
   part.role=role.value;try{validate();}catch(e){status('BLOCK：'+e.message);}
  });
  const closed=document.createElement('label');
  const cb=document.createElement('input');
  cb.type='checkbox';cb.checked=part.closedSurfaceRequired;
  cb.setAttribute('aria-label',part.id+' 原始閉合面必須存在');
  cb.addEventListener('change',()=>{
   part.closedSurfaceRequired=cb.checked;
   try{validate();}catch(e){status('BLOCK：'+e.message);}
  });
  closed.append(cb,document.createTextNode('必須真閉合'));
  row.append(label,role,closed);container.append(row);
 }
}
async function load(){
 const file=$('obj').files?.[0];
 if(!file)throw Error('請提供真正的原始 OBJ，不能用空的假工程模型代替');
 if(file.size<32||file.size>15000000)
  throw Error('原始 OBJ 檔案須介於 32B～15MB，超出記憶體預算則 BLOCK');
 const data=await file.arrayBuffer(),sourceSha256=await hex(data);
 const text=new TextDecoder('utf-8',{fatal:true}).decode(data);
 incoming=loadAIGReal3DOriginalOBJStructure({
  objText:text,sourceSha256,verifiedFileSha256:sourceSha256,
  sourceUnits:$('units').value
 });
 corrected=null;
 observations=[];
 const evidenceFile=$('measure').files?.[0];
 if(evidenceFile){
  if(evidenceFile.size>500000)throw Error('量測 JSON 超過記憶體限制');
  const raw=JSON.parse(await evidenceFile.text());
  if(raw?.sourceSha256!==sourceSha256||!Array.isArray(raw.observations))
   throw Error('量測資料必須明確綁定原始來源 SHA 和 observations');
  observations=raw.observations;
 }
 if(renderer)renderer.destroy();
 renderer=createAIG3DRenderer(preview,{quality:'balanced',
  maxTriangles:200000,pixelRatio:1,preserveDrawingBuffer:true,
  background:[.012,.030,.065,1]});
 if(renderer.status!=='READY')throw Error('真 WebGL GPU 不可用；禁止假渲染');
 componentControls();validate();view('oblique');
}
$('run').addEventListener('click',async()=>{
 status('正在唯讀解析來源 OBJ 並建立原始三角面品質證據...');
 try{await load();}catch(e){incoming=null;report=null;cinema=null;
  $('evidence').textContent='正式 3D 來源 BLOCK：'+String(e?.message??e);
  status('BLOCK：'+String(e?.message??e));}
});
for(const key of Object.keys(angles))
 $(key).addEventListener('click',()=>{
  try{view(key);}catch(e){status('BLOCK：'+String(e?.message??e));}
 });
$('refine').addEventListener('click',()=>{
 if(!incoming){status('BLOCK：請先上傳原始 OBJ');return;}
 if(incoming.scene.units!=='METERS'){
  status('BLOCK：量測局部 XYZ 工作副本目前只支援來源座標使用 METERS；不可猜測尺寸。');return;
 }
 const list=[];
 for(const o of observations.filter(x=>x.kind==='POINT_3D')){
  const part=incoming.parts.find(p=>p.id===o.partId);
  if(!part||!Array.isArray(o.sourceVertexIds)||o.sourceVertexIds.length!==1||
   !Array.isArray(o.measuredXYZMeters))continue;
  list.push({nodeId:part.nodeId,originalVertexIndex:o.sourceVertexIds[0],
   measuredLocalXYZMeters:o.measuredXYZMeters,evidenceSha256:o.evidenceSha256});
 }
 if(list.length<3){
  status('BLOCK：需要至少三個同源 OBJ 原始頂點的真 POINT_3D 量測，不能憑顏色自動補形狀。');
  return;
 }
 try{
  corrected=buildAIGReal3DMeasuredGeometryWorkingCopy({
   sourceScene:incoming.scene,sourceSha256:incoming.sourceSha256,
   measurements:list,maxDisplacementMm:2});
  validate();view('oblique');
  status('已建立實測點稀疏修正 WORKING COPY：'+
   corrected.actualSourceVerticesMoved+' 點；原始 OBJ 完全不改，未知幾何仍 BLOCK。');
 }catch(e){corrected=null;status('BLOCK：'+String(e?.message??e));}
});
$('download').addEventListener('click',()=>{
 if(!report){status('BLOCK：沒有真原始來源，不能輸出空假報告');return;}
 if(auditURL)URL.revokeObjectURL(auditURL);
 const data=JSON.stringify({intake:{
  schema:incoming.schema,sourceSha256:incoming.sourceSha256,
  groups:incoming.groups,originalTriangleCount:incoming.originalTriangleCount
 },geometry:report,workingCopyCorrection:corrected?{
  schema:corrected.schema,changedVertices:corrected.actualSourceVerticesMoved,
  originalMeshImmutable:corrected.originalSourceMeshesNeverMutated,
  externalSourceMeasurementIndependentlyCertified:false
 }:null,cinematicCandidate:cinema},null,2);
 auditURL=URL.createObjectURL(new Blob([data],{type:'application/json'}));
 const a=document.createElement('a');a.href=auditURL;
 a.download='Real3D-V94-SOURCE-PRECISION-GATES.json';a.click();
});
$('gpu').addEventListener('click',async()=>{
 if(!incoming||!renderer){status('BLOCK：來源 GPU 未建立');return;}
 if(incoming.displayedTriangleCount<2000){
  status('BLOCK：來源只有 '+incoming.displayedTriangleCount+
   ' 個真三角面，未達電影 GPU PNG 的 2,000 面證據門檻。');return;
 }
 try{
  const shot=await renderer.captureNativePNG(corrected?.workingScene??incoming.scene,{
   width:960,height:640});
  if(!shot.genuineGpuReadback)throw Error('真 GPU RGBA 讀回不存在');
  if(photoURL)URL.revokeObjectURL(photoURL);
  photoURL=URL.createObjectURL(shot.blob);
  const a=document.createElement('a');a.href=photoURL;
  a.download='Real3D-V94-ORIGINAL-GEOMETRY-GPU.png';a.click();
  status('真正的 GPU 3D 原始 PNG SHA256 '+shot.sha256+
   '；此圖不是精度／真實材質已認證。');
 }catch(e){status('BLOCK：'+String(e?.message??e));}
});
