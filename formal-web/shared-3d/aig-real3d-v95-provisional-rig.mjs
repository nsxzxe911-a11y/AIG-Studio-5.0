/**
 * V95 fully visible ORIGINAL-CANDIDATE indexed 3D generated from incomplete
 * shoulder-up observation. Geometry is INFERRED and disclosed, NEVER genuine
 * human scan, 1:1 verified face, or final photo identity preservation.
 * Source identity SHA remains a separate locked authority contract.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
import {createAIGReal3DRigWrap,AIG_REAL3D_V92_RIG_SCHEMA}
 from './aig-real3d-rig-wrap-contact.mjs';
import {AIG_REAL3D_V95_VISION_SCHEMA}
 from './aig-real3d-v95-photo-vision.mjs';
export const AIG_REAL3D_V95_BODY_SCHEMA='AIG_REAL3D_V95_AUTO_INFERRED_RIG_CANDIDATE_V1';
const fail=x=>{throw Error('REAL3D_V95_BODY_'+x);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
export function buildAIGReal3DProvisionalBody({
 vision,approvedIdentitySha256,sourceImageSha256,
 approvedIdentitySourcePresent=false,wrapMode='FULL_WRAP'
}={}){
 if(vision?.schema!==AIG_REAL3D_V95_VISION_SCHEMA||
  vision.result!=='INFERRED_MODEL_CANDIDATE_ONLY'||
  !sha(approvedIdentitySha256)||!sha(sourceImageSha256)||
  vision.imageSha256!==sourceImageSha256||
  !['FULL_WRAP','HALF_WRAP'].includes(wrapMode))
  fail('OBSERVED_PORTRAIT_AND_AUTHORITY_REQUIRED');
 const evidenceLocked=sourceImageSha256===approvedIdentitySha256&&
  approvedIdentitySourcePresent===true;
 const P=vision.candidateProportions;
 if(!P||![P.headCenterXNormalized,P.faceWidthImageFraction,
  P.headHeightImageFraction].every(Number.isFinite))
  fail('AUTOMATIC_PROPORTIONS_MISSING');
 // Size is a PROVISIONAL anthropometric prior, not a measured body.
 const height=P.estimatedHeightMeters,headUnits=P.estimatedFullBodyHeadUnits,
  headHeight=height/headUnits;
 const headWidth=Math.max(.16,Math.min(.235,
  .20*P.faceWidthImageFraction/.30));
 const shoulderWidth=Math.max(.34,Math.min(.52,
  headWidth*2.05));
 const positions=[],normals=[],indices=[],weights=[],sections=[];
 function vertex(x,y,z,n,joint){
  positions.push(x,y,z);normals.push(...n);weights.push([{jointId:joint,weight:1}]);
  return weights.length-1;
 }
 function ellipsoid(name,center,radii,joint,steps=28,rows=14){
  const start=indices.length,base=weights.length,rx=radii[0],ry=radii[1],rz=radii[2];
  const top=vertex(center[0],center[1]+ry,center[2],[0,1,0],joint);
  for(let i=1;i<rows;i++){
   const theta=i*Math.PI/rows,s=Math.sin(theta),c=Math.cos(theta);
   for(let k=0;k<steps;k++){
    const a=2*Math.PI*k/steps,ca=Math.cos(a),sa=Math.sin(a);
    const x=rx*s*ca,y=ry*c,z=rz*s*sa;
    const n=[x/(rx*rx),y/(ry*ry),z/(rz*rz)],size=Math.hypot(...n);
    vertex(center[0]+x,center[1]+y,center[2]+z,n.map(t=>t/size),joint);
   }
  }
  const bottom=vertex(center[0],center[1]-ry,center[2],[0,-1,0],joint);
  for(let k=0;k<steps;k++){
   const a=base+1+k,b=base+1+(k+1)%steps;
   indices.push(top,a,b);
  }
  for(let i=0;i<rows-2;i++)for(let k=0;k<steps;k++){
   const a=base+1+i*steps+k,b=base+1+i*steps+(k+1)%steps,
    c=a+steps,d=b+steps;
   indices.push(a,c,b,b,c,d);
  }
  const off=base+1+(rows-2)*steps;
  for(let k=0;k<steps;k++){
   const a=off+k,b=off+(k+1)%steps;indices.push(bottom,b,a);
  }
  sections.push({name,firstTriangle:start/3,triangleCount:(indices.length-start)/3,
   geometryObservedFromImage:false,sourceType:'ESTIMATED'});
 }
 function limb(name,startY,endY,x0,x1,radius,joint,steps=20,layers=9){
  const begin=indices.length,beginV=weights.length,dy=endY-startY,dx=x1-x0;
  const angle=Math.atan2(dx,dy),angleCorrection=Math.cos(angle);
  for(let i=0;i<=layers;i++){
   const v=i/layers,cx=x0+(x1-x0)*v,cy=startY+dy*v,
    r=radius*(1-.13*v);
   for(let k=0;k<steps;k++){
    const t=2*Math.PI*k/steps,n=[Math.cos(t),0,Math.sin(t)];
    vertex(cx+r*n[0],cy,r*n[2],n,joint);
   }
  }
  for(let i=0;i<layers;i++)for(let k=0;k<steps;k++){
   const a=beginV+i*steps+k,b=beginV+i*steps+(k+1)%steps,
    c=a+steps,d=b+steps;
   // Real polygonal 3D surfaces and topology, no sprite.
   indices.push(a,b,c,b,d,c);
  }
  const aTop=vertex(x0,startY,0,[0,1,0],joint);
  const aBot=vertex(x1,endY,0,[0,-1,0],joint);
  for(let k=0;k<steps;k++){
   indices.push(aTop,beginV+(k+1)%steps,beginV+k);
   const last=beginV+layers*steps;
   indices.push(aBot,last+k,last+(k+1)%steps);
  }
  sections.push({name,firstTriangle:begin/3,triangleCount:(indices.length-begin)/3,
   geometryObservedFromImage:false,sourceType:'ESTIMATED'});
 }
 // These are disclosed volumetric proxy parts, not anatomical sculpting.
 ellipsoid('HEAD_ESTIMATED',[0,1.515,0],[headWidth/2,headHeight*.53,.098],'neck');
 ellipsoid('TORSO_ESTIMATED',[0,1.18,0],[shoulderWidth*.49,.30,.13],'pelvis');
 ellipsoid('PELVIS_ESTIMATED',[0,.93,0],[.195,.13,.123],'pelvis');
 limb('LEFT_ARM_ESTIMATED',1.36,.70,-shoulderWidth*.52,-.32,.067,'shoulderL');
 limb('RIGHT_ARM_ESTIMATED',1.36,.70,shoulderWidth*.52,.32,.067,'shoulderR');
 limb('LEFT_LEG_ESTIMATED',.90,.08,-.098,-.105,.090,'hipL');
 limb('RIGHT_LEG_ESTIMATED',.90,.08,.098,.105,.090,'hipR');
 // No generated anatomical claims beyond this minimal rig.
 const mesh=createAIG3DMesh({positions,normals,indices,
  provenance:'V95_AUTO_ESTIMATED_FROM_SHOULDER_PORTRAIT_PROXY_NOT_SCANNED'});
 const scene=createAIG3DScene({id:'real3dV95Candidate',
  consumer:'FastModel',units:'METERS',
  source:'INFERRED_SOURCE_CONSTRAINED_NON_VERIFIED_SHOULDER_PORTRAIT'});
 addAIG3DNode(scene,{id:'bodyCandidate',mesh,kind:'character',
  source:'UNVERIFIED_INFERRED_CHARACTER_GEOMETRY_NOT_APPROVED_HEROINE_FACE',
  material:{baseColor:[.43,.58,.8,1],metallic:.16,roughness:.62}});
 const manifest={schema:AIG_REAL3D_V92_RIG_SCHEMA,sourceSha256:sourceImageSha256,
  nodeRigs:[{nodeId:'bodyCandidate',joints:[
   {id:'pelvis',parentId:null,bindPivot:[0,1.0,0],axis:[0,0,1],minDeg:-14,maxDeg:14},
   {id:'neck',parentId:'pelvis',bindPivot:[0,1.42,0],axis:[0,1,0],minDeg:-25,maxDeg:25},
   {id:'shoulderL',parentId:'pelvis',bindPivot:[-shoulderWidth*.5,1.36,0],axis:[0,0,1],minDeg:-45,maxDeg:45},
   {id:'shoulderR',parentId:'pelvis',bindPivot:[shoulderWidth*.5,1.36,0],axis:[0,0,1],minDeg:-45,maxDeg:45},
   {id:'hipL',parentId:'pelvis',bindPivot:[-.098,.9,0],axis:[1,0,0],minDeg:-35,maxDeg:35},
   {id:'hipR',parentId:'pelvis',bindPivot:[.098,.9,0],axis:[1,0,0],minDeg:-35,maxDeg:35}
  ],weights}],
  anchors:[{id:'rightHand',jointId:'shoulderR',actorId:'pilot',
   apparatus:'HAND',bindPoint:[.32,.70,0]}]};
 const keyframes=[
  {timeSec:0,anglesDeg:{pelvis:0,neck:0,shoulderL:0,shoulderR:0,hipL:0,hipR:0}},
  {timeSec:.5,anglesDeg:{pelvis:3,neck:8,shoulderL:22,shoulderR:-22,hipL:14,hipR:-14}},
  {timeSec:1,anglesDeg:{pelvis:-2,neck:-8,shoulderL:-18,shoulderR:18,hipL:-14,hipR:14}},
  {timeSec:1.5,anglesDeg:{pelvis:0,neck:0,shoulderL:0,shoulderR:0,hipL:0,hipR:0}}
 ];
 const rig=createAIGReal3DRigWrap({
  sourceScene:scene,manifest,sourceSha256:sourceImageSha256,
  keyframes,wrapMode
 });
 return {schema:AIG_REAL3D_V95_BODY_SCHEMA,scene,rig,mesh,
  originalSourceImageSha256:sourceImageSha256,
  approvedHeroineReferenceSha256:approvedIdentitySha256,
  authorityImageIsExactlySameBytes:evidenceLocked,
  identityVisualSimilarityConfirmed:false,
  status:evidenceLocked?'INFERRED_CANDIDATE_REFERENCE_BYTES_MATCHED':'INFERRED_CANDIDATE_NEEDS_HEROINE_IDENTITY_REVIEW',
  inferredHeadUnits:headUnits,inferredHeightMeters:height,
  sourceMeasuredFullBodyHeightMeters:null,
  originalSourcePhotoFaceNotAltered:true,
  generatedProxyNotRealPhotoFacialReconstruction:true,
  sourcePartCount:sections.length,sectionProvenance:sections,
  realIndexed3DTriangles:mesh.triangleCount,
  realSkinnedJoints:rig.boneCount,
  fullBodyFilmCertified:false,releasePASS:false};
}
