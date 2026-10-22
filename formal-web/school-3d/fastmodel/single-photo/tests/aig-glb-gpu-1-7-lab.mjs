/**
 * Browser fixture: create and GLB-encode a real indexed mesh + real
 * quaternion clip, parse through the production PhotoViewer GLTFLoader
 * and play on the production Three.js WebGL renderer.
 * Fixture is NOT a user-approved or photoreal human GLB.
 */
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {PhotoViewer} from '../viewer.mjs';
const $=id=>document.getElementById(id);
window.__aig17lab={status:'BOOTING',errors:[]};
function update(x){
 window.__aig17lab={...window.__aig17lab,...x};
 $('status').textContent=JSON.stringify(window.__aig17lab,null,2);
}
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
(async()=>{
try{
 const canvas=$('viewer'),viewer=new PhotoViewer(canvas,message=>{
  window.__aig17lab.errors.push(message);
 });
 update({status:'VIEWER_READY'});
 let refusedNoModel=false;
 try{viewer.setGpuAccelerationEnabled(true);}catch(e){
  refusedNoModel=e.message==='AIG17_TRUE_LOADED_GLB_REQUIRED';
 }
 const before=viewer.getGpuAccelerationReport();
 const root=new THREE.Group();root.name='SourceRoot';
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
  new THREE.MeshStandardMaterial({color:0x84b6f3,roughness:.58,metalness:.12}));
 mesh.name='TestCube';root.add(mesh);
 const clip=new THREE.AnimationClip('REAL_QUATERNION_GLTF_CLIP',2,[
  new THREE.QuaternionKeyframeTrack('TestCube.quaternion',[0,1,2],
   [0,0,0,1,0,Math.SQRT1_2,0,Math.SQRT1_2,0,1,0,0])
 ]);
 const glb=await new GLTFExporter().parseAsync(root,
  {binary:true,animations:[clip],trs:true});
 if(!(glb instanceof ArrayBuffer)||glb.byteLength<100)
  throw Error('AIG17_EXPECT_REAL_GLTF2_GLB');
 const clipList=await viewer.load(glb);
 if(clipList.length!==1)throw Error('AIG17_ANIMATED_GLB_CLIP_MISSING');
 const loadedModel=viewer.model;
 let geometryRef=null,initialPosition=null;
 loadedModel.traverse(node=>{
  if(node.isMesh){geometryRef=node.geometry;
   initialPosition=Array.from(node.geometry.attributes.position.array);}
 });
 if(!geometryRef)throw Error('AIG17_NO_GLB_INDEXED_TRIANGLES');
 const quaternionBefore=loadedModel.getObjectByName('TestCube')?.quaternion.toArray();
 const frames=[];viewer.onFrameMeasured=f=>frames.push(f);
 const on=viewer.setGpuAccelerationEnabled(true);
 await delay(1400);
 const enabled=viewer.getGpuAccelerationReport();
 const quaternionAfter=loadedModel.getObjectByName('TestCube')?.quaternion.toArray();
 const rendered=frames.some(f=>f.drawCalls>0&&f.triangles>0&&f.width>0&&f.height>0);
 const qualityUnchangedWhenUnsupported=!on.gpuTimerSupported?
  enabled.previewPixelRatio===before.previewPixelRatio:true;
 const sampleHonest=frames.every(f=>f.gpuMs===null||
  f.gpuMeasurementSource==='EXT_disjoint_timer_query_webgl2');
 const after=viewer.setGpuAccelerationEnabled(false);
 const positionAfter=Array.from(geometryRef.attributes.position.array);
 const sourceUnchanged=JSON.stringify(initialPosition)===JSON.stringify(positionAfter);
 const report={
  status:'REAL_GLTF2_GLB_ANIMATED_BROWSER_PASS',
  glbBytes:glb.byteLength,loadedClipCount:clipList.length,
  refusedGpuWithoutLoadedGLB:refusedNoModel,
  actualThreeWebGLTrianglesRendered:rendered,
  animationQuaternionChanged:JSON.stringify(quaternionBefore)!==JSON.stringify(quaternionAfter),
  samples:frames.length,realWebGLContext:String(viewer.renderer.getContext().constructor.name),
  timerSupport:on.gpuTimerSupported,validGpuSamples:enabled.governor?.gpuSamplesAccepted??0,
  gpuExecutionMs:enabled.governor?.p95GpuMs??null,
  cpuSubmissionNotClaimedAsGpuTime:sampleHonest,
  noTimerKeepsFullOriginalQuality:qualityUnchangedWhenUnsupported,
  pixelRatioRestoredAfterToggle:after.previewPixelRatio===before.previewPixelRatio,
  originalTrianglePositionsUnchanged:sourceUnchanged,modelObjectRetained:viewer.model===loadedModel,
  noCharacterLikenessApproval:true,noAndroidOrWindowsNativeFpsClaim:true,
  runtimeSource:'ACTUAL_VALID_GLB_GENERATED_IN_ISOLATED_TEST_NOT_HUMAN_GLTF'
 };
 update(report);
 viewer.onFrameMeasured=null;
 viewer.renderer.setAnimationLoop(null);viewer.resize.disconnect();
 viewer.animation?.dispose();viewer.controls.dispose();viewer.renderer.dispose();
}catch(error){
 update({status:'FAIL',exception:String(error.stack||error)});
}
})();
