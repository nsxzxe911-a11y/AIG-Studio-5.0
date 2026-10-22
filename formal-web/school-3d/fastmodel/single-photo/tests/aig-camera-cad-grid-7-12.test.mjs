import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG712_SCHEMA,createAIG712CameraCalibration,estimateAIG712CameraPose}
 from '../aig-camera-pose-7-12.mjs';
import {AIG712_CAD_GRID_SCHEMA,createAIG712CADGrid,
 triangulateAIG712CADReference,calibrateAIG712CADGrid,mapAIG712RelativeXYZToCAD}
 from '../aig-cad-grid-scale-7-12.mjs';

const w=640,h=480,fx=620,fy=622,sourceSHA256='sha256:'+'b'.repeat(64);
const yaw=.09,pitch=-.035;
const ry=[[Math.cos(yaw),0,Math.sin(yaw)],[0,1,0],[-Math.sin(yaw),0,Math.cos(yaw)]];
const rx=[[1,0,0],[0,Math.cos(pitch),-Math.sin(pitch)],[0,Math.sin(pitch),Math.cos(pitch)]];
const R=ry.map(row=>[0,1,2].map(j=>row.reduce((s,v,k)=>s+v*rx[k][j],0))),
 t=[-.48,.008,.045],realBaselineMm=Math.hypot(...t)*100;
let seed=3551;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const cam=createAIG712CameraCalibration({
 width:w,height:h,fx,fy,sourceSHA256,
 intrinsicsReviewed:true,distortionCorrectedReviewed:true,staticSceneReviewed:true
});
function project(P){
 const Q=R.map((row,j)=>row.reduce((s,v,k)=>s+v*P[k],0)+t[j]);
 return {
  left:{x:320+fx*P[0]/P[2],y:240+fy*P[1]/P[2]},
  right:{x:320+fx*Q[0]/Q[2],y:240+fy*Q[1]/Q[2]}
 };
}
const matches=[];
for(let i=0;i<110;i++){
 const p=[(rand()-.5)*3,(rand()-.5)*2.7,3.4+rand()*4];
 const obs=project(p);
 if(i%9===0)obs.right={x:90+rand()*450,y:60+rand()*350};
 for(const q of [obs.left,obs.right]){
  q.x+=(rand()-.5)*.16;q.y+=(rand()-.5)*.16;
 }
 if([obs.left,obs.right].some(q=>q.x<0||q.x>=w||q.y<0||q.y>=h))continue;
 matches.push({id:'match'+i,...obs});
}
let cachedPose=null;
const getPose=()=>cachedPose??(cachedPose=estimateAIG712CameraPose(cam,matches,{iterations:200}));
test('7.12 camera calibration fails closed on unreviewed physical source / camera intrinsics',()=>{
 assert.equal(cam.schema,AIG712_SCHEMA);
 assert.equal(cam.absoluteCameraTranslationScale,'UNKNOWN');
 assert.throws(()=>createAIG712CameraCalibration({
  width:w,height:h,fx,fy,sourceSHA256
 }),/VERIFIED_INTRINSICS/);
 assert.throws(()=>createAIG712CameraCalibration({
  width:w,height:h,fx,fy,sourceSHA256:'invalid',intrinsicsReviewed:true,
  distortionCorrectedReviewed:true,staticSceneReviewed:true
 }),/VERIFIED_INTRINSICS/);
});
test('7.12 real RANSAC determines relative XYZ camera rotation/direction and rejects outliers',()=>{
 const p=getPose();
 assert.ok(p.inlierFraction>.75);
 assert.ok(p.inlierCount>=75);
 assert.ok(p.cheiralityAccepted>50);
 assert.ok(p.medianParallaxDegrees>1);
 assert.ok(p.meanNormalizedEpipolarError<.001);
 assert.ok(Math.abs(p.rotationDeterminant-1)<.02);
 const tUnit=t.map(v=>v/Math.hypot(...t));
 const cos=p.translationDirection.reduce((sum,v,i)=>sum+v*tUnit[i],0);
 assert.ok(cos>.97,'translation direction must follow actual video camera baseline');
 assert.ok(Math.abs(p.rotation[0][2]-R[0][2])<.035);
 assert.equal(p.translationAbsoluteMm,null);
 assert.equal(p.absoluteMetricDepthAvailable,false);
 assert.equal(p.authenticReferenceCharacterApproved,false);
});
test('7.12 same-source 3D estimates never guess absolute millimetres',()=>{
 const p=getPose();
 assert.equal(p.calibrationSourceSHA256,sourceSHA256);
 assert.equal(p.perPoint3DScale,'MONOCULAR_RELATIVE_UNITS');
 assert.equal(p.cameraIntrinsicsAutomaticallyCalibrated,false);
 assert.equal(p.realFullBodyOrFaceReconstructionComplete,false);
});
test('7.12 CAD grid cell size must be physically identified, not only drawn on UI',()=>{
 assert.throws(()=>createAIG712CADGrid({cellMm:10}),/PHYSICAL_GRID/);
 assert.throws(()=>createAIG712CADGrid({
  cellMm:0,physicalReferenceReviewed:true,matchedSourceReviewed:true
 }),/PHYSICAL_GRID/);
 const g=createAIG712CADGrid({
  cellMm:35,physicalReferenceReviewed:true,matchedSourceReviewed:true
 });
 assert.equal(g.schema,AIG712_CAD_GRID_SCHEMA);
 assert.equal(g.cellMm,35);assert.equal(g.precisionMm,.001);
 assert.equal(g.virtualOverlayAloneProvidesScale,false);
});
test('7.12 physical CAD-grid X0 Y0 anchors produce millimetre 3D XYZ with measured 35mm cells',()=>{
 const grid=createAIG712CADGrid({
  cellMm:35,physicalReferenceReviewed:true,matchedSourceReviewed:true
 });
 const markers=[[0,0],[1,0],[0,1],[1,1],[2,0],[0,2],[2,2],[1,2]].map(([ix,iy])=>
  ({ix,iy,...project([ix*.35,iy*.35,5.2]),reviewed:true}));
 const pose=getPose(),cal=calibrateAIG712CADGrid(pose,cam,grid,markers);
 assert.ok(cal.markerCount>=8);
 assert.ok(cal.pairCount>=20);
 assert.ok(Math.abs(cal.mmPerRelativeUnit-realBaselineMm)<2.8);
 assert.ok(cal.medianRelativeError<.04);
 assert.ok(cal.maxRelativeError<.12);
 assert.ok(cal.maxPlanarityErrorMm<2);
 assert.equal(cal.realCadCoordinatesEnabled,true);
 const sample=project([.7,.35,5.8]);
 const relative=triangulateAIG712CADReference(pose,cam,sample.left,sample.right);
 const coords=mapAIG712RelativeXYZToCAD(cal,relative.xyzRelative);
 assert.ok(Math.abs(coords.xMm-70)<5);
 assert.ok(Math.abs(coords.yMm-35)<5);
 assert.ok(Math.abs(Math.abs(coords.zMm)-60)<5);
 assert.equal(coords.precisionMm,.001);
 assert.equal(cal.humanBodyGeometryApproved,false);
});
test('7.12 CAD grid connection fails on missing axes, wrong scale, duplicate nodes and wrong video',()=>{
 const base=createAIG712CADGrid({cellMm:35,physicalReferenceReviewed:true,matchedSourceReviewed:true});
 const grid=[[0,0],[1,0],[0,1],[1,1],[2,0],[0,2]].map(([ix,iy])=>
  ({ix,iy,...project([ix*.35,iy*.35,5.2]),reviewed:true}));
 const pose=getPose();
 assert.throws(()=>calibrateAIG712CADGrid(pose,cam,base,grid.slice(0,3)),/MARKERS_REQUIRED/);
 assert.throws(()=>calibrateAIG712CADGrid(pose,cam,base,[...grid,grid[0]]),/DUPLICATE/);
 assert.throws(()=>calibrateAIG712CADGrid(pose,cam,base,
  grid.map((x,i)=>i===1?{...x,reviewed:false}:x)),/REVIEWED_GRID/);
 const error=grid.map(x=>({...x,right:{...x.right}}));
 error[3].right.x+=9;
 assert.throws(()=>calibrateAIG712CADGrid(pose,cam,base,error),/BLOCKED|INCONSISTENT|INVALID/);
 assert.throws(()=>calibrateAIG712CADGrid(pose,{...cam,sourceSHA256:'sha256:'+'0'.repeat(64)},base,grid),/POSE_GRID_AND_MARKERS_REQUIRED/);
 assert.throws(()=>mapAIG712RelativeXYZToCAD({},[0,0,0]),/METRIC_COORDINATE_NOT_VERIFIED/);
});
