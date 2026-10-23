/**
 * Real3D FastModel 1.1: selected visible indexed human mesh on the EXISTING
 * shared Real3D WebGL renderer. No new renderer, bitmap billboard or face claim.
 * Adult anatomy provenance is the original Stage1 source; youth/elder ratios
 * are clearly approximate adjustable technical prototypes, NOT certified scans.
 */
import {buildAIGStage1AdultAnatomy,auditAIGStage1Anatomy}
 from './aig-real3d-human-anatomy.mjs';
import {createAIG3DScene,createAIG3DMesh,addAIG3DNode,auditAIG3DScene}
 from './aig-real3d-core.mjs';

export const AIG_REAL3D_HUMAN_LIVE_SCHEMA='AIG_REAL3D_HUMAN_AGE_BUILD_FRONT_EXPERIMENT_V1';
const ranges={male:[1780,1680,1200,1740],female:[1680,1580,1160,1640]};
const ageNames=['adult','elder','child','middle'];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const assert=(yes,why)=>{if(!yes)throw Error('AIG_REAL3D_HUMAN_'+why)};
const sat=(x,a,b)=>Math.min(b,Math.max(a,x));
function normalsFromTriangles(positions,indices){
 const normals=new Float64Array(positions.length);
 for(let i=0;i<indices.length;i+=3){
  const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
  const x=positions[b]-positions[a],y=positions[b+1]-positions[a+1],
   z=positions[b+2]-positions[a+2];
  const u=positions[c]-positions[a],v=positions[c+1]-positions[a+1],
   w=positions[c+2]-positions[a+2];
  const nx=y*w-z*v,ny=z*u-x*w,nz=x*v-y*u;
  for(const j of [a,b,c]){
   normals[j]+=nx;normals[j+1]+=ny;normals[j+2]+=nz;
  }
 }
 const out=Array(normals.length);
 for(let i=0;i<out.length;i+=3){
  const len=Math.hypot(normals[i],normals[i+1],normals[i+2]);
  if(len<1e-15){out[i]=0;out[i+1]=1;out[i+2]=0;}
  else{out[i]=normals[i]/len;out[i+1]=normals[i+1]/len;out[i+2]=normals[i+2]/len;}
 }
 return out;
}
export function createAIGReal3DHumanScene({
 gender='male',age='adult',heightMm=null,build=50
}={}){
 assert(['male','female'].includes(gender),'GENDER');
 assert(ageNames.includes(age),'AGE');
 assert(finite(build)&&build>=0&&build<=100,'BODY_BUILD_RANGE');
 const base=buildAIGStage1AdultAnatomy(gender);
 const defaultHeight=ranges[gender][ageNames.indexOf(age)];
 const height=heightMm===null?defaultHeight:heightMm;
 assert(finite(height)&&height>=900&&height<=2200,'HEIGHT_MM');
 const shapeAudit=auditAIGStage1Anatomy(base);
 const H=base.heightMeters;
 const hScale=height/(H*1000);
 const mass=(build-50)/50;
 const child=age==='child',elder=age==='elder',middle=age==='middle';
 const ageShoulders=child?.83:elder?.95:1;
 const ageHead=child?1.19:elder?1.01:1;
 const lateral=(1+mass*.17);
 const depth=(1+mass*.22);
 const scene=createAIG3DScene({id:'aig-real3d-human-'+gender,
  consumer:'FastModel',units:'METERS',
  source:'STAGE1_PROCEDURAL_MALE_FEMALE_BODY_UNAPPROVED_VISUAL_DEMO'});
 let triangleCount=0,sourceVertices=0;
 for(const part of base.parts){
  const xyz=part.geometry.positions,inds=part.geometry.indices;
  const p=Array(xyz.length);
  for(let i=0;i<xyz.length;i+=3){
   const x=xyz[i],y=xyz[i+1],z=xyz[i+2],t=y/H;
   const head=part.id==='head';
   const shoulderZone=t>.69&&t<.85;
   const waistZone=t>.50&&t<.72;
   const legs=/Thigh|Calf|Foot|BriefLeg/.test(part.id);
   const xAge=shoulderZone?ageShoulders:1;
   const xMass=waistZone?lateral*(1+(middle?.045:elder?.025:0)):
    legs?1+mass*.11:1+mass*.045;
   const zMass=waistZone?depth:legs?1+mass*.09:1+mass*.04;
   const ageHeadMul=head?ageHead:1;
   const hipSpread=legs?(part.id.startsWith('left')?-1:1)*Math.max(0,mass)*H*.012:0;
   // Scale around the neck for cranial size, not the ground/body origin.
   const centeredY=head?(.93*H+(y-.93*H)*ageHeadMul):y;
   p[i]=x*xAge*xMass*ageHeadMul+hipSpread;
   p[i+1]=centeredY*hScale;
   p[i+2]=z*zMass*ageHeadMul;
  }
  const indexes=Array.from(inds);
  const geom=createAIG3DMesh({
   positions:p,normals:normalsFromTriangles(p,indexes),indices:indexes,
   provenance:'AIG_STAGE1_REAL_INDEXED_ANATOMY_'+gender+'_'+age
  });
  const garment=part.material==='swim';
  addAIG3DNode(scene,{id:'human_'+part.id,mesh:geom,kind:'character',
   material:{baseColor:garment?
    (gender==='male'?[.09,.26,.46,1]:[.08,.35,.39,1]):
    [ .69,.49,.37,1],metallic:0,roughness:.84,doubleSided:true},
   source:garment?'REAL_STAGE1_FITTED_SWIM_GARMENT_NOT_APPROVED':
    'REAL_STAGE1_PARAMETRIC_ANATOMY_NOT_APPROVED'
  });
  triangleCount+=geom.triangleCount;
  sourceVertices+=geom.vertexCount;
 }
 const inspection=auditAIG3DScene(scene);
 assert(triangleCount>3000,'NOT_A_REAL_INDEXED_HUMAN_BODY');
 const sampledFootMin=Math.min(...scene.nodes.filter(n=>/leftFoot|rightFoot/.test(n.id))
  .map(n=>n.mesh.bounds.min[1]));
 const mmGround=Math.round(sampledFootMin*1000000)/1000;
 const appearance={
  schema:AIG_REAL3D_HUMAN_LIVE_SCHEMA,gender,age,build,heightMm:height,
  origin:'GROUND_Y0',canonicalScale:'SOURCE_MM_0_001',
  originalSourceHeightMm:Math.round(H*1000),
  actualMeshTriangles:triangleCount,actualMeshVertices:sourceVertices,
  bodyParts:scene.nodes.length,sharedRenderer:true,
  geometryNotPhotographicReference:true,
  sourceAnatomyNumericalAuditPASS:shapeAudit.automaticGeometryContractPASS,
  sourceAnatomyErrors:shapeAudit.structuralErrors,
  footGroundMm:mmGround,footContactNumericPASS:Math.abs(mmGround)<=1,
  agePresetIsApproximateTechnicalModel:age!=='adult',
  visuallyNaturalAnatomyApproved:false,
  costumeSkinningAndHumanIdentityVerified:false,
  releasePASS:false
 };
 return {scene,profile:'Human',sourceKind:'ACTUAL_STAGE1_3D_INDEXED_ANATOMY_TECHNICAL',
  appearance,shapeAudit,inspection,readOnly:true,sourceAge:age,
  sourceGender:gender,originalBodySourcePreserved:true};
}
