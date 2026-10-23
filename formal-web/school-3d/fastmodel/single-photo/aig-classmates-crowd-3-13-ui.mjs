/**
 * Real3D 3.13 — visually honest crowd STRESS TEST in existing PhotoViewer.
 * Duplicated technical geometry exists ONLY for capacity measurement.
 * Independently named classmates require their own imported source GLBs.
 * Never mount a second WebGLRenderer or replace the active source humanoid.
 */
import * as THREE from 'three';
import {AIG313_COUNTS,createAIG313ClassmateRoster,
 evaluateAIG313FrameSamples,summariseAIG313CrowdEvidence,
 planAIG313CrowdWork} from './aig-classmate-crowd-3-13.mjs';
const $=id=>document.getElementById(id);
const out=e=>String(e?.message||e);
export function installAIG313ClassroomCapacity({
 getFusedScan,getViewer,getCharacterSourceAssets,
 getLoadedWorldCharacterCount=()=>0
}={}){
 if(typeof getFusedScan!=='function'||typeof getViewer!=='function'||
  typeof getCharacterSourceAssets!=='function'||
  !$('scan313-show'))throw Error('AIG313_REAL_VIEWER_AND_ROSTER_UI_REQUIRED');
 const roster=createAIG313ClassmateRoster();
 let group=null,sharedGeometry=null,material=null,viewer=null,
  benchBusy=false,benchGeneration=0,rows=[],last=null,
  measuredTimeSequence=0,sourceSha=null,priorCamera=null;
 const record=()=>{
  const sourceObjects=Number(getLoadedWorldCharacterCount())||0;
  const state={
   schema:'AIG_REAL3D_3_13_SOURCED_CLASSMATES_AND_CROWD_BENCH',
   originalActive3DSourceSHA:sourceSha,
   sourceRoster:roster.snapshot(),
   actuallyLoadedSourcedCharacterNodes:sourceObjects,
   sceneWorldExistingGLBObjectCap:12,
   crowdTechnicalPreviewClones:group?.userData?.cloneCount??0,
   crowdRealIndividualIdentitiesShown:sourceObjects,
   oneSharedWebGLContext:!!viewer,
   technicalClonesDoNotCountAsIndependentClassmates:true,
   technicalCloneIndependentBoneAnimation:false,
   technicalClonesHaveRealSourceVertices:!!sharedGeometry,
   measuredBenchmarkRows:rows,
   latestBenchmark:last,
   result:summariseAIG313CrowdEvidence(rows),
   actualDeviceGPUVRAMMeasured:false,
   nativeAndroidWindowsFpsCertified:false
  };
  $('scan313-proof').textContent=JSON.stringify(state,null,2);
  return state;
 };
 const status=(s,bad=false)=>{
  $('scan313-status').textContent=(bad?'BLOCKED：':'')+s;
  $('scan313-status').style.color=bad?'#ffd198':'#a3e8d9';
 };
 const clear=()=>{
  benchGeneration++;
  benchBusy=false;
  if(group){
   group.parent?.remove(group);
   // Source manifold geometry is SHARED. Never call geometry.dispose().
   material?.dispose?.();
   group=null;material=null;sharedGeometry=null;
  }
  if(priorCamera&&viewer?.camera){
   viewer.camera.position.copy(priorCamera.position);
   viewer.controls.target.copy(priorCamera.target);
   viewer.controls.update();
  }
  priorCamera=null;sourceSha=null;viewer=null;
  $('scan313-bench').disabled=false;
  record();
 };
 const preview=(count)=>{
  if(!AIG313_COUNTS.includes(count))throw Error('AIG313_UNSUPPORTED_STRESS_COUNT');
  const s=getFusedScan();
  if(!s?.report?.manifoldAudit?.closedManifold||
   !s.mesh?.geometry||!s.mesh.parent||
   !s.activeSourceSha256||!s.viewer?.scene||
   s.viewer.movieMode||s.viewer.reviewBusy)
   throw Error('請先建立來源真 3D 人體，錄影／驗收時不可插入壓測替身');
  if(benchBusy)throw Error('目前正在執行效能測量');
  // Changing the 3D source cancels the old stress scene first.
  if(group&&sourceSha!==s.activeSourceSha256)clear();
  if(group){group.parent?.remove(group);material?.dispose?.()}
  viewer=s.viewer;sourceSha=s.activeSourceSha256;
  const box=new THREE.Box3().setFromBufferAttribute(
   s.mesh.geometry.attributes.position);
  const size=box.getSize(new THREE.Vector3()),center=box.getCenter(
   new THREE.Vector3());
  if(size.y<=.001||!Number.isFinite(size.y))throw Error('人體原始立體幾何高度無效');
  const geometry=s.mesh.geometry;sharedGeometry=geometry;
  material=s.mesh.material.clone();
  const mesh=new THREE.InstancedMesh(geometry,material,count);
  mesh.name='AIG313_TECHNICAL_SHARED_SOURCE_BODY_STRESS_ONLY';
  mesh.frustumCulled=false;
  const rowWidth=Math.min(8,Math.ceil(Math.sqrt(count)));
  const rowsNeeded=Math.ceil(count/rowWidth);
  const spacingX=Math.max(size.x*1.15,size.y*.5),
   spacingZ=Math.max(size.z*1.3,size.y*.48);
  const dummy=new THREE.Object3D();
  const palette=[0x74c0e3,0xeaa0b6,0xadd59f,0xe4d1a3,
   0xbea5e6,0x99ded1,0xefb07a,0x96aacc];
  for(let i=0;i<count;i++){
   const column=i%rowWidth,row=Math.floor(i/rowWidth);
   const x=(column-(rowWidth-1)/2)*spacingX;
   const z=(row-(rowsNeeded-1)/2)*spacingZ;
   const scale=.90+(i%5)*.025;
   dummy.position.set(x,
    box.min.y*(1-scale),z);
   dummy.rotation.set(0,(i%7-3)*.055,0);
   dummy.scale.set(scale,scale,scale);dummy.updateMatrix();
   mesh.setMatrixAt(i,dummy.matrix);
   mesh.setColorAt(i,new THREE.Color(palette[i%palette.length]));
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  group=new THREE.Group();
  group.name='AIG313_TEST_DUPLICATES_NOT_INDEPENDENT_CLASSMATES';
  group.userData={cloneCount:count,originalHeroineUntouched:true,
   sourceSha,realIndependentPersonCountAdded:0,
   singleSharedBufferGeometry:true,animationNotIndividuallyRigged:true};
  group.add(mesh);
  viewer.scene.add(group);
  if(!priorCamera){
   priorCamera={position:viewer.camera.position.clone(),
    target:viewer.controls.target.clone()};
  }
  // Camera frames the technical grid but does not mutate the heroine mesh.
  const spreadW=rowWidth*spacingX,spreadD=rowsNeeded*spacingZ;
  const range=Math.max(size.y*1.7,spreadW*1.3,spreadD*1.8);
  viewer.controls.target.set(center.x,center.y,center.z);
  viewer.camera.position.set(center.x+range*.13,
   center.y+size.y*.42,center.z+range);
  viewer.camera.lookAt(viewer.controls.target);
  viewer.controls.update();
  status('同一個既有 WebGL：'+count+' 個共用來源幾何的 3D 壓力測試替身，'+
   '仍不是 '+count+' 位不同同學。請使用量測鍵查看真實畫面負荷。');
  record();return {count,geometryShared:true};
 };
 const refreshSources=async()=>{
  const entries=await getCharacterSourceAssets();
  if(!Array.isArray(entries))throw Error('AIG313_SOURCE_LIBRARY_LIST_REQUIRED');
  // A fresh roster is shown through the returned data; permanent persona
  // metadata cannot claim genuine identity or visual likeness automatically.
  const known=new Set(roster.all().map(x=>x.characterId));
  for(const a of entries){
   const characterId='actor_'+String(a.id??'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,68);
   if(known.has(characterId)||roster.count()>=64)continue;
   if(a.category!=='character'||a.mime!=='model/gltf-binary')continue;
   try{
    roster.register({characterId,displayName:a.title||characterId,
     assetId:a.id,sourceSha256:a.sha256});
    known.add(characterId);
   }catch{/* malformed external assets are not counted as classmates */}
  }
  const snap=roster.snapshot();
  $('scan313-roster').textContent='已索引 '+snap.sourcedCount+
   ' 個不同來源 GLB（未自動核准外觀）；'+snap.pendingCount+
   ' 個尚無真正來源。正式場景由 Real3D 2.0 多來源世界載入，'+
   '目前最多 12 個 GLB 物件（含建築），不是實測效能上限。';
  record();return snap;
 };
 const measure=async({frames=48}={})=>{
  if(benchBusy)throw Error('AIG313_BENCHMARK_ALREADY_RUNNING');
  if(!group?.parent||!viewer||!sourceSha)throw Error('AIG313_NO_REAL_TECHNICAL_SCENE');
  if(viewer.movieMode||viewer.reviewBusy)throw Error('AIG313_RECORDING_OR_QA_LOCK');
  if(!Number.isInteger(frames)||frames<25||frames>120)
   throw Error('AIG313_INVALID_SAMPLE_FRAME_COUNT');
  const gen=++benchGeneration;
  benchBusy=true;$('scan313-bench').disabled=true;
  status('正在量測同一個真 WebGL 場景的影格間隔、CPU 提交、Draw calls…');
  const measurementViewer=viewer;
  const savedHook=measurementViewer.onFrameMeasured,framesCollected=[];
  try{
   const actualRenderer=(()=>{
    const gl=viewer.renderer.getContext();
    const ext=gl.getExtension('WEBGL_debug_renderer_info');
    return ext?String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)):'WEBGL_RENDERER_NOT_DISCLOSED';
   })();
   const environment=/swiftshader|software|llvmpipe/i.test(actualRenderer)?
    'HEADLESS_SOFTWARE_WEBGL_SWIFTSHADER':
    'CLIENT_WEBGL_RENDERER_UNVERIFIED_'+actualRenderer.slice(0,100);
   const sampled=await new Promise((resolve,reject)=>{
    let finished=false;
    const timeout=setTimeout(()=>finish(Error('FRAME_SAMPLING_TIMEOUT')),18000);
    const finish=(err)=>{
     if(finished)return;finished=true;clearTimeout(timeout);
     if(measurementViewer.onFrameMeasured===hook)
      measurementViewer.onFrameMeasured=savedHook;
     err?reject(err):resolve([...framesCollected]);
    };
    const hook=(frame)=>{
     try{savedHook?.(frame)}catch{}
     if(gen!==benchGeneration||!group?.parent||
      !viewer?.renderer)return finish(Error('CROWD_SAMPLE_CANCELLED'));
     if(frame.visibility==='hidden')return;
     framesCollected.push(frame);
     if(framesCollected.length>=frames)finish();
    };
    measurementViewer.onFrameMeasured=hook;
   });
   if(gen!==benchGeneration||!group?.parent)throw Error('CROWD_SAMPLE_CANCELLED');
   const obj=group.children[0],personCount=group.userData.cloneCount;
   const tri=Math.floor((obj.geometry.getIndex()?.count||
    obj.geometry.attributes.position.count)/3)*personCount;
   const row=evaluateAIG313FrameSamples({
    timestampsMs:sampled.map(x=>x.timeMs),
    submitMs:sampled.map(x=>x.renderCpuMs),
    drawCalls:sampled.map(x=>x.drawCalls),
    visiblePeople:personCount,geometryTriangles:tri,
    environment,targetFps:30
   });
   rows=rows.filter(x=>x.visiblePeople!==personCount).concat(row)
    .sort((a,b)=>a.visiblePeople-b.visiblePeople);
   last=row;measuredTimeSequence++;
   $('scan313-status').textContent='本瀏覽器 '+personCount+
    ' 個壓測替身，實測中位 '+row.medianObservedFps.toFixed(1)+
    ' FPS／P95 '+row.p95FrameIntervalMs.toFixed(1)+
    ' ms，Draw calls 中位 '+row.medianDrawCalls+
    '。不能推論 '+personCount+' 個獨立帶骨架同學也能同速。';
   return record();
  }finally{
   benchBusy=false;$('scan313-bench').disabled=false;
  }
 };
 $('photo23-source')?.addEventListener('change',()=>{
  if(group)clear();
 });
 $('scan29-hide')?.addEventListener('click',()=>{
  if(group)clear();
 });
 $('scene-unload')?.addEventListener('click',()=>{
  if(group)clear();
 });
 $('world-preview')?.addEventListener('click',()=>{
  if(group)clear();
 });
 $('scan313-show').addEventListener('click',()=>{
  try{preview(Number($('scan313-count').value))}
  catch(e){status(out(e),true);record()}
 });
 $('scan313-clear').addEventListener('click',()=>{
  clear();status('已移除全部壓測替身，原始人物與世界場景保持不變。');
 });
 $('scan313-bench').addEventListener('click',()=>{
  measure().catch(e=>{status(out(e),true);record()});
 });
 $('scan313-refresh').addEventListener('click',()=>{
  refreshSources().catch(e=>status(out(e),true));
 });
 // Read-only load of source library inventory; creates NO fake GLB.
 refreshSources().catch(e=>status(out(e),true));
 record();
 return Object.freeze({preview,measure,clear,refreshSources,
  get proof(){return record()},
  get lastMeasurement(){return last},
  get measuredRows(){return [...rows]},
  get technicalStressGroup(){return group}});
}
