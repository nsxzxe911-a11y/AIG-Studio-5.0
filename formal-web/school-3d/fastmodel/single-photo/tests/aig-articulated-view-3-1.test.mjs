import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIG29ContinuousSurface} from '../aig-continuous-surface-scan-2-9.mjs';
import {buildAIG30FusedSDF} from '../aig-fused-manifold-surface-3-0.mjs';
import {makeAIG31HeadBodyRig,poseAIG31FusedMesh,
 cameraAIG31Orbit,AIG31_JOINT_LIMITS}
 from '../aig-articulated-view-3-1.mjs';
const SHA='sha256:'+'a'.repeat(64);
function source(){
 const width=256,height=384,pixels=new Uint8ClampedArray(width*height*4),
  labels=new Uint8Array(width*height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  let c=0;
  if(y>9&&y<85&&Math.abs(x-128)<26)c=2;
  else if(y>=85&&y<112&&Math.abs(x-128)<12)c=4;
  else if(y>=112&&y<239&&Math.abs(x-128)<(y<190?53:37))c=14;
  else if(y>=239&&y<376&&Math.abs(x-108)<15)c=10;
  else if(y>=239&&y<376&&Math.abs(x-148)<15)c=11;
  else if(y>=126&&y<225&&Math.abs(x-61)<11)c=6;
  else if(y>=126&&y<225&&Math.abs(x-195)<11)c=7;
  const i=y*width+x;labels[i]=c;
  pixels.set(c?[171,124,103,255]:[15,22,31,255],i*4);
 }
 return {width,height,labels,pixels,sourceSha256:SHA};
}
const make=()=>{
 const shell=buildAIG29ContinuousSurface({...source(),
  radialSegments:32,sliceStep:6});
 return buildAIG30FusedSDF(shell,{resolution:84,blend:.075});
};
test('3.1 camera rotates 180 around the actual head/sole without ever twisting biological neck 180',()=>{
 const front=cameraAIG31Orbit({target:[0,1,0],azimuthDegrees:0});
 const back=cameraAIG31Orbit({target:[0,1,0],azimuthDegrees:180});
 assert.ok(Math.abs(front.position[2]-1.25)<1e-8);
 assert.ok(Math.abs(back.position[2]+1.25)<1e-8);
 assert.ok(Math.abs(front.position[0])<1e-8);
 const left=cameraAIG31Orbit({azimuthDegrees:-90});
 const right=cameraAIG31Orbit({azimuthDegrees:90});
 assert.ok(left.position[0]<0&&right.position[0]>0);
 const top=cameraAIG31Orbit({elevationDegrees:89});
 const bottom=cameraAIG31Orbit({elevationDegrees:-89});
 assert.ok(top.position[1]>1);
 assert.ok(bottom.position[1]<1,'bottom camera must look up from BELOW its target, not below global -1');
 assert.equal(back.headOrBodyWasPhysicallyTwisted,false);
 assert.equal(back.cameraHeadTopAndFootUndersideSupported,true);
 assert.throws(()=>cameraAIG31Orbit({azimuthDegrees:181}),
  /CAMERA_ORBIT_ANGLE_BOUNDS_INVALID/);
 assert.throws(()=>cameraAIG31Orbit({elevationDegrees:100}),
  /CAMERA_ORBIT_ANGLE_BOUNDS_INVALID/);
});
test('3.1 real fused single indexed body head and neck deform separately, preserve original source and rest normals',()=>{
 const fused=make(),original=new Float32Array(
  fused.fusedOnePieceMesh.positions),indices=new Uint32Array(
  fused.fusedOnePieceMesh.indices);
 const rig=makeAIG31HeadBodyRig(fused);
 assert.equal(rig.jointCount,16);
 assert.equal(rig.fullNeck180DegreeRotationNotPermitted,true);
 assert.equal(rig.realHeadNeckSeparateRegions,true);
 assert.ok(rig.affectedVertices.headYaw>50);
 assert.ok(rig.affectedVertices.neckYaw>50);
 const headOnly=poseAIG31FusedMesh(rig,{headYaw:25});
 assert.ok(headOnly.headActualMovedVertices>80);
 assert.ok(headOnly.neckActualMovedVertices>0);
 assert.equal(headOnly.torsoActualMovedVertices,0,
  'head is independent from chest and not a whole-model rotation');
 const neckOnly=poseAIG31FusedMesh(rig,{neckYaw:25});
 assert.ok(neckOnly.headActualMovedVertices>80);
 assert.ok(neckOnly.neckActualMovedVertices>20);
 assert.equal(neckOnly.torsoActualMovedVertices,0);
 const bent=poseAIG31FusedMesh(rig,{
  neckYaw:20,headYaw:25,leftShoulder:35,leftElbow:65,
  rightShoulder:-25,leftHip:20,leftKnee:55
 });
 assert.ok(bent.actualMovedVertexCount>2500);
 assert.ok(bent.armActualMovedVertices>50);
 assert.ok(bent.actualMaxVertexDisplacement>.01);
 assert.deepEqual(fused.fusedOnePieceMesh.positions,original,
  'model source verified SDF typed positions must remain immutable');
 assert.deepEqual(fused.fusedOnePieceMesh.indices,indices,
  'rest manifold triangle topology preserved');
 assert.equal(bent.selfIntersectionAndCollisionGate,'NOT_YET_MEASURED');
 assert.equal(bent.humanLikenessCertified,undefined);
 assert.equal(bent.releaseAllowed,false);
 const reset=poseAIG31FusedMesh(rig,{});
 assert.deepEqual(reset.positions,original);
});
test('3.1 body has independent neck, shoulder elbow, hip knee/ankle action and cannot twist neck 180',()=>{
 const rig=makeAIG31HeadBodyRig(make());
 const left=poseAIG31FusedMesh(rig,{leftShoulder:30});
 assert.ok(left.armActualMovedVertices>50);
 assert.equal(left.headActualMovedVertices,0);
 assert.equal(left.neckActualMovedVertices,0);
 const elbow=poseAIG31FusedMesh(rig,{leftElbow:40});
 assert.ok(elbow.actualMovedVertexCount>0);
 assert.notDeepEqual(elbow.positions,left.positions);
 const hip=poseAIG31FusedMesh(rig,{rightHip:30});
 const knee=poseAIG31FusedMesh(rig,{rightKnee:50});
 assert.ok(hip.actualMovedVertexCount>0);
 assert.ok(knee.actualMovedVertexCount>0);
 assert.notDeepEqual(hip.positions,knee.positions);
 assert.equal(AIG31_JOINT_LIMITS.neckYaw.max,30);
 assert.throws(()=>poseAIG31FusedMesh(rig,{neckYaw:180}),
  /JOINT_RANGE_LIMIT_OR_UNKNOWN_JOINT_neckYaw/);
 assert.throws(()=>poseAIG31FusedMesh(rig,{headYaw:180}),
  /JOINT_RANGE_LIMIT_OR_UNKNOWN_JOINT_headYaw/);
 assert.throws(()=>poseAIG31FusedMesh(rig,{pelvisTeleport:40}),
  /JOINT_RANGE_LIMIT_OR_UNKNOWN_JOINT_pelvisTeleport/);
});
test('3.1 partial portrait uses only observed head neck torso, never fabricates unseen leg bones',()=>{
 const shape=make(),mesh=shape.fusedOnePieceMesh;
 mesh.vertexSourceLabelIds=new Uint8Array(mesh.vertexSourceLabelIds);
 for(let i=0;i<mesh.vertexSourceLabelIds.length;i++)
  if([6,7,8,9,10,11,12,13].includes(mesh.vertexSourceLabelIds[i]))
   mesh.vertexSourceLabelIds[i]=14;
 const rig=makeAIG31HeadBodyRig(shape);
 assert.ok(rig.affectedVertices.headYaw>50);
 assert.equal(rig.affectedVertices.leftKnee,0);
 assert.equal(rig.anchorMetadata.pivots.leftKnee,undefined);
 const moved=poseAIG31FusedMesh(rig,{headYaw:20,neckYaw:10});
 assert.ok(moved.headActualMovedVertices>0);
 assert.throws(()=>poseAIG31FusedMesh(rig,{leftKnee:30}),
  /JOINT_UNAVAILABLE_IN_SOURCE_LABELS_leftKnee/);
});
