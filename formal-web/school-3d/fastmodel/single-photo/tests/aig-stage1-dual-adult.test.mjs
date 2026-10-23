import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAIGStage1AdultAnatomy,auditAIGStage1Anatomy,
 auditAIGStage1BodySurface,
 AIG_STAGE1_SCHEMA,AIG_STAGE1_COORDINATES}
 from '../aig-stage1-dual-adult-anatomy.mjs';
for(const gender of ['male','female']){
 test('Stage1 '+gender+' has actual distinct 3D anatomical structures and both legs',()=>{
  const p=buildAIGStage1AdultAnatomy(gender);
  assert.equal(p.schema,AIG_STAGE1_SCHEMA);
  assert.equal(p.gender,gender);
  assert.ok(p.heightMeters>1.5&&p.heightMeters<1.9);
  assert.ok(p.partCount>=17);
  assert.equal(p.jointCount,21);
  assert.ok(p.actualIndexedTriangles>4800);
  assert.equal(p.noHair,true);
  assert.equal(p.noSchoolUniform,true);
  assert.equal(p.noSkirt,true);
  assert.equal(p.leftRightLegsDistinct,true);
  assert.equal(p.fullySkinnedDeformationVerified,false);
  assert.equal(p.userVisualGatePASS,false);
  const keys=new Set(p.parts.map(x=>x.id));
  for(const side of ['left','right'])
   for(const name of ['UpperArm','Forearm','Hand','Thigh','Calf','Foot'])
    assert.ok(keys.has(side+name),side+name);
  assert.ok(p.joints.leftHip.position[0]<0);
  assert.ok(p.joints.rightHip.position[0]>0);
  assert.ok(p.joints.leftShoulder.position[0]<0);
  assert.ok(p.joints.rightShoulder.position[0]>0);
  assert.equal(p.joints.leftKnee.parent,'leftHip');
  assert.equal(p.joints.rightAnkle.parent,'rightKnee');
  assert.equal(p.joints.head.parent,'neck');
  for(const m of p.parts){
   assert.ok(m.geometry.positions instanceof Float32Array);
   assert.ok(m.geometry.indices instanceof Uint32Array);
   assert.ok(m.geometry.triangleCount>20);
   assert.ok(m.geometry.positions.every(Number.isFinite));
   assert.ok(m.geometry.indices.every(i=>i<m.geometry.positions.length/3));
  }
  const audit=auditAIGStage1Anatomy(p);
  assert.equal(audit.automaticGeometryContractPASS,true);
  assert.equal(audit.visualSnapshotAcceptancePASS,false);
  assert.equal(audit.fullProductionSkinnedRigPASS,false);
  assert.deepEqual(audit.structuralErrors,[]);
  assert.equal(audit.actualTriangleCount,p.actualIndexedTriangles);
  const surface=auditAIGStage1BodySurface(p);
  assert.equal(surface.actualBodySurfaceNumericPASS,true,
   JSON.stringify(surface.actualBodySurfaceErrors));
  assert.ok(surface.upperThighInnerGapMm>20,
   'must be separate genuine leg mesh cross sections');
  assert.ok(surface.actualHeadHeightToWidth>1.18,
   'head cannot be horizontally flattened');
  assert.ok(surface.shoulderTorsoLeftOverlapMm>10);
  assert.ok(surface.shoulderTorsoRightOverlapMm>10);
  assert.equal(surface.footGroundContactMm,0,
   'Feet must sit at real Y0.000 mm, not float above the ground');
  assert.equal(surface.entireHumanSilhouetteVisuallyApproved,false);
  assert.equal(surface.fullContinuousSkinnedMeshVerified,false);
 });
}
test('male briefs are separate thin fitted shell, NEVER skirt/pants/leg-pillar',()=>{
 const p=buildAIGStage1AdultAnatomy('male');
 assert.equal(p.garmentType,'fitted-briefs');
 const swim=p.parts.filter(x=>x.material==='swim');
 assert.deepEqual(swim.map(x=>x.id),[
  'swimBriefs','leftBriefLeg','rightBriefLeg']);
 const body=p.parts.filter(x=>x.role==='distinct-thigh');
 assert.equal(body.length,2);
 const torso=p.parts.find(x=>x.id==='torso');
 const widths=[];
 const x=torso.geometry.positions;
 for(let i=0;i<x.length;i+=84)widths.push(x[i]);
 assert.ok(new Set(widths.map(v=>v.toFixed(3))).size>4);
});
test('female swimwear follows waist/chest, actual anatomical separate legs are still visible',()=>{
 const p=buildAIGStage1AdultAnatomy('female');
 assert.equal(p.garmentType,'fitted-one-piece');
 assert.deepEqual(p.parts.filter(x=>x.material==='swim').map(x=>x.id),[
  'onePieceSwim','leftStrap','rightStrap']);
 const maxSwimY=Math.max(...p.parts.filter(x=>x.material==='swim')
  .flatMap(x=>Array.from(x.geometry.positions).filter((_,i)=>i%3===1)));
 const thighMinY=Math.min(...p.parts.find(x=>x.id==='leftThigh')
  .geometry.positions.filter((_,i)=>i%3===1));
 assert.ok(maxSwimY>p.heightMeters*.80);
 assert.ok(thighMinY<p.heightMeters*.30);
});
test('both models share the SAME physical coordinate system and preserve immutable rig/source geometry',()=>{
 const a=buildAIGStage1AdultAnatomy('male');
 const b=buildAIGStage1AdultAnatomy('female');
 assert.equal(a.originCoordinates,AIG_STAGE1_COORDINATES);
 assert.equal(b.originCoordinates,AIG_STAGE1_COORDINATES);
 assert.equal(a.originCoordinates.units,'meters');
 assert.equal(a.originCoordinates.up,'+Y');
 assert.equal(a.originCoordinates.front,'-Z');
 assert.equal(a.originCoordinates.origin,'GROUND_MID_FEET');
 const before=a.parts[0].geometry.positions.slice();
 const other=buildAIGStage1AdultAnatomy('female');
 assert.equal(other.gender,'female');
 assert.deepEqual(a.parts[0].geometry.positions,before);
 assert.throws(()=>buildAIGStage1AdultAnatomy('child'),/ONLY_ADULT/);
});

test('malformed merged upper-thigh geometry is detected, not approved by having two limb IDs',()=>{
 const model=buildAIGStage1AdultAnatomy('female');
 const left=model.parts.find(x=>x.id==='leftThigh');
 const p=left.geometry.positions;
 // Shift the whole left upper thigh toward body center, retaining two IDs.
 for(let i=0;i<p.length;i+=3)p[i]+=.12;
 const surface=auditAIGStage1BodySurface(model);
 assert.equal(surface.actualBodySurfaceNumericPASS,false);
 assert.ok(surface.actualBodySurfaceErrors.includes('UPPER_THIGHS_MERGED_OR_TOO_FAR'));
 const result=auditAIGStage1Anatomy(model);
 assert.equal(result.automaticGeometryContractPASS,false);
});
test('flat anatomical head is rejected using actual vertex bounding box',()=>{
 const model=buildAIGStage1AdultAnatomy('male');
 const head=model.parts.find(x=>x.id==='head').geometry.positions;
 const yMin=Math.min(...head.filter((_,i)=>i%3===1));
 for(let i=1;i<head.length;i+=3)head[i]=yMin+(head[i]-yMin)*.30;
 const report=auditAIGStage1BodySurface(model);
 assert.equal(report.actualBodySurfaceNumericPASS,false);
 assert.ok(report.actualBodySurfaceErrors.includes('HEAD_ASPECT_FLATTENED'));
});

test('unsupported floating-foot deformation must be detected from actual mesh vertices',()=>{
 const model=buildAIGStage1AdultAnatomy('male');
 for(const side of ['left','right']){
  const a=model.parts.find(p=>p.id===side+'Foot').geometry.positions;
  for(let i=1;i<a.length;i+=3)a[i]+=.035;
 }
 const surface=auditAIGStage1BodySurface(model);
 assert.equal(surface.actualBodySurfaceNumericPASS,false);
 assert.ok(surface.actualBodySurfaceErrors.includes('FEET_NOT_GROUNDED_AT_MM_ZERO'));
});
