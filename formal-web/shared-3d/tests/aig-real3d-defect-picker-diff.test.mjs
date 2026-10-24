import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditAIGNativeOBJLocalSurface} from '../aig-real3d-local-surface-topology.mjs';
import {projectAIGSourceDefectEdges} from '../aig-real3d-source-defect-projection.mjs';
import {pickAIGReal3DDefectEdge,canvasClickToAIGSourcePixel}
 from '../aig-real3d-defect-edge-picker.mjs';
import {compareAIGNativeSourceDefects,AIG_REAL3D_DEFECT_SOURCE_DIFF_SCHEMA}
 from '../aig-real3d-immutable-defect-diff.mjs';
const sha='c'.repeat(64);
function fixture({hole=false,reverseFace=false}={}){
 const rings=42,segments=44,v=[],faces=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   v.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+
    t.toFixed(8)+' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  const first=[a,b,d],second=[a,d,c];
  if(reverseFace&&j===34&&k===4)first.reverse();
  if(!(hole&&j===34&&k===4))faces.push('f '+first.join(' '));
  faces.push('f '+second.join(' '));
 }
 v.push('v 0 0 0','v 0 1 0');
 const top=rings*segments+1,bottom=top+1;
 for(let k=0;k<segments;k++){
  const next=(k+1)%segments;
  faces.push('f '+top+' '+(next+1)+' '+(k+1));
  faces.push('f '+bottom+' '+((rings-1)*segments+k+1)+' '+
   ((rings-1)*segments+next+1));
 }
 const p=(j,k)=>{
  const t=j/(rings-1),r=Math.max(.008,Math.sin(Math.PI*t)),
   a=2*Math.PI*k/segments;
  return [Number((.25*r*Math.cos(a)).toFixed(8)),
   Number(t.toFixed(8)),Number((.15*r*Math.sin(a)).toFixed(8))];
 };
 const left=j=>p(j,22),right=j=>p(j,0);
 const landmarks={
  headTop:[0,1,0],chin:p(38,0),noseTip:p(37,11),neckBase:p(34,0),
  leftShoulder:left(30),rightShoulder:right(30),
  leftElbow:left(25),rightElbow:right(25),
  leftWrist:left(20),rightWrist:right(20),
  leftThumbTip:left(16),rightThumbTip:right(16),
  leftIndexTip:left(15),rightIndexTip:right(15),
  pelvis:p(21,0),leftKnee:left(10),rightKnee:right(10),
  leftHeel:left(2),rightHeel:right(2),
  leftToe:left(1),rightToe:right(1)
 };
 return {objText:v.concat(faces).join('\n'),landmarks};
}
const options=(o={})=>({...fixture(o),heightMm:1680,sourceSha256:sha});

const real=o=>{
 const v=options(o),sourceSha256=createHash('sha256').update(v.objText).digest('hex');
 return auditAIGNativeOBJLocalSurface({...v,sourceSha256});
};
test('real original source 3D defect midpoint is selectable with correct vertex ids and XYZ',()=>{
 const p=projectAIGSourceDefectEdges({localSurface:real({hole:true}),angle:'front'});
 assert.ok(p.projectedEdges.length>0);
 const e=p.projectedEdges[0],x=(e.start.x+e.end.x)/2,y=(e.start.y+e.end.y)/2;
 const hit=pickAIGReal3DDefectEdge({projection:p,x,y,tolerancePx:18});
 assert.equal(hit.selected,true);
 assert.equal(hit.angle,'front');
 assert.equal(hit.edge.type,'OPEN_BOUNDARY');
 assert.equal(hit.edge.startVertexIndex,e.startVertexIndex);
 assert.deepEqual(hit.edge.startWorldMeters,e.startWorldMeters);
 assert.equal(hit.edge.startWorldMeters.length,3);
 assert.equal(hit.edge.endWorldMeters.length,3);
 assert.ok(hit.edge.startWorldMeters.every(Number.isFinite));
 assert.ok(hit.edge.endWorldMeters.every(Number.isFinite));
 assert.equal(hit.noSourceMeshChanges,true);
 assert.equal(pickAIGReal3DDefectEdge({projection:p,x:-9000,y:-9000}).selected,false);
});
test('mobile object-fit contain letterbox maps source pixels without offset',()=>{
 const map=canvasClickToAIGSourcePixel({
  clickX:150,clickY:200,rectWidth:300,rectHeight:400
 });
 assert.equal(map.inside,true);
 assert.ok(Math.abs(map.x-540)<.001);
 assert.ok(Math.abs(map.y-960)<.001);
 assert.equal(canvasClickToAIGSourcePixel({
  clickX:0,clickY:0,rectWidth:300,rectHeight:400
 }).inside,false);
 assert.throws(()=>canvasClickToAIGSourcePixel({
  clickX:0,clickY:0,rectWidth:0,rectHeight:400
 }),/DEFECT_PICK_IMAGE_RECT_INVALID/);
});
test('before broken -> after geometrically intact are independent SHA snapshots not repair PASS',()=>{
 const before=real({hole:true}),after=real();
 const original=JSON.stringify(before);
 const diff=compareAIGNativeSourceDefects({before,after});
 assert.equal(diff.schema,AIG_REAL3D_DEFECT_SOURCE_DIFF_SCHEMA);
 assert.notEqual(diff.beforeSha256,diff.afterSha256);
 assert.ok(diff.globalBefore.openEdges>0);
 assert.equal(diff.globalAfter.openEdges,0);
 assert.ok(diff.previousDefectEdgesAbsentInAfter>0);
 assert.equal(diff.newDefectEdgesNotPresentInBefore,0);
 assert.equal(diff.beforeSourceGeometryPASS,false);
 assert.equal(diff.afterSourceGeometryPASS,true);
 assert.equal(diff.allCheckedGlobalCountsNonIncreasing,true);
 assert.equal(diff.releasePASS,false);
 assert.equal(diff.naturalHumanAppearancePASS,false);
 assert.equal(diff.originalGeometryAutoModified,false);
 assert.equal(JSON.stringify(before),original);
});
test('before intact -> after broken counts increase, newly introduced defects reported',()=>{
 const diff=compareAIGNativeSourceDefects({before:real(),after:real({hole:true})});
 assert.equal(diff.totalDistinctOldDefects,0);
 assert.ok(diff.newDefectEdgesNotPresentInBefore>0);
 assert.equal(diff.allCheckedGlobalCountsNonIncreasing,false);
 assert.equal(diff.releasePASS,false);
});
test('different orientation or same SHA cannot be called a comparative repair review',()=>{
 const before=real({hole:true}),after=real();
 assert.throws(()=>compareAIGNativeSourceDefects({
  before,after:{...after,sourceSha256:before.sourceSha256}
 }),/DEFECT_DIFF_REQUIRES_DIFFERENT_SOURCE_SHA/);
 assert.throws(()=>compareAIGNativeSourceDefects({
  before,after:{...after,upAxis:'Z'}
 }),/DEFECT_DIFF_SCALE_UP_AXIS_MISMATCH/);
 const bogus={...before,regions:before.regions.map((r,i)=>i? r:{
  ...r,anomalyEdgeEvidenceTruncated:true
 })};
 assert.throws(()=>compareAIGNativeSourceDefects({before:bogus,after}),
 /DEFECT_DIFF_TRUNCATED_SOURCE_EVIDENCE_BLOCK/);
});
