import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {openAIG716AssetLibrary} from './aig-external-asset-library-7-16.mjs';
import {AIG714_LABELS} from './aig-heroine-scan-7-14.mjs';
import {buildAIG715HeroineCandidate,editAIG715Joint,
 summarizeAIG715Candidate} from './aig-heroine-candidate-7-15.mjs';
const $=id=>document.getElementById(id);
const save=(value,name)=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],
  {type:'application/json'})),link=document.createElement('a');
 link.href=url;link.download=name;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const serializeDepth=d=>{
 const observed=[];
 for(let i=0;i<d.valid.length;i++)if(d.valid[i])
  observed.push([i,Math.round(d.values[i]*1e6)/1e6,
   Math.round(d.confidence[i]*1e4)/1e4]);
 return {source_type:d.source_type,units:d.units,
  validPixels:d.validPixels,valuesAsSparseIndexDepthConfidence:observed};
};
export function mountAIG715CandidateStudio(readState,onPreview){
 if(typeof readState!=='function'||typeof onPreview!=='function')
  throw Error('AIG715_WORKSPACE_SOURCE_BINDING_REQUIRED');
 const build=$('heroine-candidate-build'),jointSelect=$('heroine-joint'),
  xInput=$('heroine-joint-x'),yInput=$('heroine-joint-y'),
  jointSave=$('heroine-joint-save'),status=$('heroine-candidate-status'),
  info=$('heroine-candidate-proof'),saveDepth=$('heroine-depth-save'),
  saveRig=$('heroine-rig-save'),glbButton=$('heroine-candidate-glb');
 let current=null,lastIdentity=null;
 const mark=(msg,success=false)=>{
  status.textContent=msg;status.dataset.ok=String(success);
 };
 const clear=(reason='請先用上方原圖完成人工審核的 RGB 區域分離')=>{
  current=null;lastIdentity=null;saveDepth.disabled=true;
  saveRig.disabled=true;glbButton.disabled=true;jointSave.disabled=true;
  info.textContent=reason;
  // Remove only this derived preview. The original 7.13 3D evidence is
  // untouched and becomes visible again.
  onPreview(null);
 };
 const getJoint=()=>current?.skeletonCandidate.find(j=>j.name===jointSelect.value);
 function refreshJoint(){
  const j=getJoint();jointSave.disabled=!j;
  if(!j)return;
  xInput.value=String(Math.round(j.x*1000)/1000);
  yInput.value=String(Math.round(j.y*1000)/1000);
 }
 jointSelect.addEventListener('change',refreshJoint);
 function show(){
  if(!current)return;
  info.textContent=JSON.stringify(summarizeAIG715Candidate(current),null,2);
  saveDepth.disabled=false;saveRig.disabled=false;glbButton.disabled=false;
  refreshJoint();
 }
 build.addEventListener('click',()=>{
  try{
   const state=readState();
   if(!state?.reviewed||!state.regions||!state.canvas)
    throw Error('SOURCE_AND_REVIEWED_REGIONS_REQUIRED');
   const ctx=state.canvas.getContext('2d',{willReadFrequently:true});
   const image=ctx.getImageData(0,0,state.canvas.width,state.canvas.height);
   const sourceDigest=state.sourceInfo?.singleImageSha256??null;
   const newCandidate=buildAIG715HeroineCandidate(image,state.regions,
    {stereo:state.stereo??null,sourceDigest});
   current=newCandidate;
   lastIdentity=sourceDigest;
   show();onPreview(current);
   mark('已生成女主角可編輯前表面草模：'+
    Object.keys(current.geometryGroups).length+' 個獨立模型部位、'+
    current.skeletonCandidate.length+' 個可編輯關節候選。單照相對深度 '+
    current.depth_estimated.validPixels+' 點；已校正的真毫米深度 '+
    current.depth_measured.validPixels+
    ' 點。兩者不混用，不能認定完整 1:1 人體。',true);
  }catch(e){mark('BLOCKED：'+String(e.message||e)+
   '。原始照片、7.13 實測表面和 7.14 分區均不清空。');}
 });
 jointSave.addEventListener('click',()=>{
  if(!current)return;
  try{
   const x=Number(xInput.value),y=Number(yInput.value);
   if(xInput.value.trim()===''||yInput.value.trim()==='')
    throw Error('JOINT_COORDINATES_REQUIRED');
   current=editAIG715Joint(current,jointSelect.value,{x,y,confirmed:true});
   show();onPreview(current);
   mark('已更新 '+jointSelect.value+' 骨架候選節點；這是編輯過的圖片比例座標，不是完成的 3D 蒙皮權重。',true);
  }catch(e){mark('BLOCKED：'+String(e.message||e));}
 });
 saveDepth.addEventListener('click',()=>{
  if(!current)return;
  save({schema:'AIG715_HEROINE_TWO_DEPTH_LAYERS',
   imageWidth:current.width,imageHeight:current.height,
   sourceDigest:current.sourceDigest,
   depth_estimated:serializeDepth(current.depth_estimated),
   depth_measured:serializeDepth(current.depth_measured),
   measuredDepthNeverReplacedBySinglePhotoGuess:true,
   estimatedHasNoPhysicalMillimetreUnits:true,
   unknownBacksideNotFilled:true
  },'AIG-FastModel-7-15-Heroine-Estimated-vs-Measured-Depth.json');
 });
 saveRig.addEventListener('click',()=>{
  if(!current)return;
  save({...summarizeAIG715Candidate(current),
   sourceDigest:lastIdentity,
   editingDoesNotRigMeshOrInferUnknownLegs:true},
  'AIG-FastModel-7-15-Heroine-Editable-Skeleton-Garments.json');
 });
 glbButton.addEventListener('click',async()=>{
  if(!current)return;
  glbButton.disabled=true;
  const root=new THREE.Group();
  root.name='FastModel_7_15A_Heroine_Editable_ESTIMATED_NO_METRIC_SCALE';
  root.userData={
   sourceDigest:current.sourceDigest,
   estimatedDepthUnits:'NORMALIZED_RELATIVE_NOT_MM',
   calibratedMetricDepthExportedSeparately:true,
   actualPhysicalHeightUnknown:true,
   trueBacksideNeverScanned:true,
   genuineSkinnedRig:false
  };
  try{
   for(const [name,p] of Object.entries(current.geometryGroups)){
    if(p.triangles===0)continue;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(p.positions.slice(),3));
    geometry.setAttribute('uv',new THREE.BufferAttribute(p.uv.slice(),2));
    const rgb=new Float32Array(p.rgb.length);
    for(let i=0;i<rgb.length;i++)rgb[i]=p.rgb[i]/255;
    geometry.setAttribute('color',new THREE.BufferAttribute(rgb,3));
    geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,
     side:THREE.DoubleSide,metalness:0,roughness:1});
    material.name='Reviewed_Source_RGB_'+name;
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name='Editable_'+name+'_ESTIMATED_GEOMETRY';
    mesh.userData={region:name,
     geometryClassification:p.category,
     depthSourceType:'SINGLE_IMAGE_ESTIMATE',
     physicallyVerifiedClothThickness:false};
    root.add(mesh);
   }
   if(!root.children.length)throw Error('EMPTY_EDITABLE_MESH_BLOCKED');
   for(const joint of current.skeletonCandidate){
    const node=new THREE.Object3D();
    node.name='JOINT_CANDIDATE_'+joint.name;
    node.position.set(joint.x-.5,.5-joint.y,0);
    node.userData={parentHint:joint.parent,
     isEditable2DPosition:true,confirmedByUser:joint.confirmed,
     physicalDepthUnknown:true,actualSkinningWeights:false};
    root.add(node);
   }
   const glb=await new GLTFExporter().parseAsync(root,{
    binary:true,onlyVisible:true,trs:true
   });
   if(!(glb instanceof ArrayBuffer)||glb.byteLength<100)
    throw Error('INVALID_DRAFT_GLTF2_BINARY');
   const url=URL.createObjectURL(new Blob([glb],{type:'model/gltf-binary'})),
    a=document.createElement('a');a.href=url;
   a.download='AIG-FastModel-7-15-Heroine-Editable-Candidate-NOT-1TO1.glb';
   a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   // User explicitly requested export. Autosave a SECOND indexed copy in
   // per-origin user data, not under the HTML/JS/app installation path.
   // The original downloaded GLB remains usable even if storage is denied.
   let stored=false,reason='';
   let library=null;
   try{
    library=await openAIG716AssetLibrary();
    await library.importBlob(new Blob([glb],{type:'model/gltf-binary'}),{
     category:'character',title:'女主角 7.15 可編輯相對深度草模',
     tags:['女主角','草模','頭髮','服裝','骨架候選'],
     source:'GENERATED_DERIVED',
     modelAccuracy:'ESTIMATED',coordinateUnits:'RELATIVE',
     derivedFrom:current.sourceDigest
    });
    stored=true;
   }catch(e){reason=String(e.message||e)}
   finally{library?.close()}
   mark(stored?
    '已輸出真正 GLB 草模，並自動保存到主程式外的素材庫。未量測的 Z 仍為相對估計，素材需審核才可推薦重用。':
    '已下載真正 GLB 草模；本機外部素材庫尚未保存（'+reason+
    '），模型本身不受影響。',true);
  }catch(error){
   mark('BLOCKED：草模 GLB 匯出失敗：'+String(error.message||error));
  }finally{
   root.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
   glbButton.disabled=false;
  }
 });
 document.addEventListener('aig713:surface-ready',()=>{
  clear('有新的實測掃描表面，舊草模候選暫停使用。請重新確認分區後再生成。');
 });
 $('heroine-clear').addEventListener('click',()=>clear());
 $('heroine-canvas-wrap').addEventListener('click',()=>clear(
  '原始標記已變更，之前的草模已暫停；請重新審核 RGB 區域後再生成。'));
 $('heroine-reviewed').addEventListener('change',()=>{
  if(!$('heroine-reviewed').checked)clear(
   '已取消分類審核，舊草模不再顯示，但原 7.13 真數值模型仍保留。');
 });
 $('heroine-photo-only').addEventListener('change',()=>clear());
 $('heroine-grow').addEventListener('click',()=>clear('色彩候選區已更新，請完成新的人工審核再建立草模。'));
 const optionNames={
  pelvis:'骨盆',spine:'脊椎',chest:'胸腔',neck:'頸部',head:'頭部',
  shoulderL:'左肩',elbowL:'左肘',wristL:'左腕',
  shoulderR:'右肩',elbowR:'右肘',wristR:'右腕',
  hipL:'左臀',kneeL:'左膝',ankleL:'左踝',
  hipR:'右臀',kneeR:'右膝',ankleR:'右踝'
 };
 for(const [id,name] of Object.entries(optionNames)){
  const o=document.createElement('option');o.value=id;o.textContent=name+' ('+id+')';
  jointSelect.appendChild(o);
 }
 return Object.freeze({getCurrent:()=>current,reset:clear});
}
