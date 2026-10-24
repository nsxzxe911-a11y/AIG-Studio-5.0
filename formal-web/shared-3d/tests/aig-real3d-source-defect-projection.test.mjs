import test from 'node:test';
import assert from 'node:assert/strict';
import {auditAIGNativeOBJLocalSurface} from '../aig-real3d-local-surface-topology.mjs';
import {projectAIGSourceDefectEdges,AIG_NATIVE_DEFECT_PROJECTION_SCHEMA}
 from '../aig-real3d-source-defect-projection.mjs';
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

test('Actual removed source neck triangle projects exact OPEN_BOUNDARY segments for all 4 cameras',()=>{
 const raw=auditAIGNativeOBJLocalSurface(options({hole:true}));
 assert.ok(raw.globallyOpenEdges>0);
 assert.equal(raw.sourceGeometryGatePASS,false);
 for(const angle of ['front','side','back','threeQuarter']){
  const p=projectAIGSourceDefectEdges({localSurface:raw,angle});
  assert.equal(p.schema,AIG_NATIVE_DEFECT_PROJECTION_SCHEMA);
  assert.equal(p.angle,angle);
  assert.equal(p.width,1080);
  assert.equal(p.height,1920);
  assert.equal(p.sourceSha256,sha);
  assert.ok(p.uniqueEvidenceEdges>0);
  assert.ok(p.projectedEdges.some(e=>e.type==='OPEN_BOUNDARY'));
  assert.ok(p.projectedEdges.every(e=>e.startVertexIndex!==e.endVertexIndex&&
   Number.isFinite(e.start.x)&&Number.isFinite(e.end.y)));
  assert.equal(p.originalSourceTopologyIsNotRepaired,true);
  assert.equal(p.releasePASS,false);
 }
});
test('Actual reversed face does not incorrectly become hole, projects WINDING_CONFLICT',()=>{
 const raw=auditAIGNativeOBJLocalSurface(options({reverseFace:true}));
 assert.equal(raw.globallyOpenEdges,0);
 const p=projectAIGSourceDefectEdges({localSurface:raw,angle:'side'});
 assert.ok(p.projectedEdges.some(e=>e.type==='WINDING_CONFLICT'));
 assert.equal(p.naturalHumanAppearancePASS,false);
});
test('Untouched closed source yields no false defect lines but never natural human approval',()=>{
 const p=projectAIGSourceDefectEdges({
  localSurface:auditAIGNativeOBJLocalSurface(options()),
  angle:'threeQuarter'
 });
 assert.equal(p.uniqueEvidenceEdges,0);
 assert.equal(p.evidenceTruncated,false);
 assert.equal(p.releasePASS,false);
});
test('Wrong SHA, source report, size, angle, or fabricated edge flags are blocked',()=>{
 const localSurface=auditAIGNativeOBJLocalSurface(options({hole:true}));
 assert.throws(()=>projectAIGSourceDefectEdges({localSurface:{...localSurface,
  sourceSha256:'not-real'},angle:'front'}),/DEFECT_PROJECTION_NATIVE_SOURCE_REPORT_REQUIRED/);
 assert.throws(()=>projectAIGSourceDefectEdges({localSurface,angle:'perspective'}),
  /DEFECT_PROJECTION_CAMERA_CONTRACT/);
 assert.throws(()=>projectAIGSourceDefectEdges({localSurface,angle:'front',width:0}),
  /DEFECT_PROJECTION_CAMERA_CONTRACT/);
 const invalid={...localSurface,regions:localSurface.regions.map((r,i)=>i? r:{
  ...r,anomalyExactWorldEdges:[{type:'FAKE',startVertexIndex:0,endVertexIndex:1,
   startWorldMeters:[0,0,0],endWorldMeters:[0,1,0]}]
 })};
 assert.throws(()=>projectAIGSourceDefectEdges({localSurface:invalid}),
  /DEFECT_PROJECTION_INVALID_INDEXED_EDGE/);
});
