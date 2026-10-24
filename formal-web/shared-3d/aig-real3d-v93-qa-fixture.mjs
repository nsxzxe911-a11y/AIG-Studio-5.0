/** V93 QA ONLY: explicit nonhuman engineering geometry, NOT a source scan.
 * Creates distinct attached indexed XYZ surface patches for all four species.
 */
import {buildAIGReal3DV92NonhumanQA}
 from './aig-real3d-v92-qa-fixture.mjs';
import {createAIG3DMesh} from './aig-real3d-core.mjs';
import {AIG_REAL3D_V93_SCHEMA,createAIGReal3DBiomechanicalAttachments}
 from './aig-real3d-biomechanical-attachments.mjs';
const CONFIG={
 HUMAN:{kind:'GARMENT',color:[.26,.57,.85,1],length:.26},
 QUADRUPED:{kind:'FUR',color:[.81,.60,.30,1],length:.15},
 BIRD:{kind:'FEATHER',color:[.24,.65,.84,1],length:.31},
 FISH:{kind:'FIN',color:[.95,.42,.25,1],length:.24}
};
function makeReal3DPatch(type){
 const cfg=CONFIG[type],positions=[],normals=[],indices=[],weights=[];
 const width=.20,layers=12,columns=12,x0=-.0335,y0=1.55,z0=.085;
 for(let v=0;v<=layers;v++)for(let u=0;u<=columns;u++){
  const U=u/columns,V=v/layers;
  const pos=[x0+(U-.5)*width,y0+V*cfg.length,
   z0+Math.sin(U*Math.PI)*Math.sin(V*Math.PI)*.027];
  // Geometric surface in three dimensions, with independently authored
  // smooth normals, no generated anatomy or 2D billboard animation.
  positions.push(...pos);
  const dx=.027*Math.PI/width*Math.cos(U*Math.PI)*Math.sin(V*Math.PI),
   dy=.027*Math.PI/cfg.length*Math.sin(U*Math.PI)*Math.cos(V*Math.PI),
   n=Math.hypot(dx,dy,1);
  normals.push(-dx/n,-dy/n,1/n);
  weights.push(V);
 }
 for(let v=0;v<layers;v++)for(let u=0;u<columns;u++){
  const a=v*(columns+1)+u,b=a+1,c=a+columns+1,d=c+1;
  indices.push(a,b,d,a,d,c);
 }
 const mesh=createAIG3DMesh({positions,normals,indices,
  provenance:'V93_NONHUMAN_SOURCE_AUTHORED_'+cfg.kind+'_QA_NOT_SCAN'});
 return {mesh,weights,bindPivot:positions.slice(0,3),
  pinnedVertices:Array.from({length:columns+1},(_,i)=>i)};
}
export function buildAIGReal3DV93FourSpeciesQA({
 species='BIRD',wrapMode='FULL_WRAP',flowSpeed=1.1
}={}){
 if(!CONFIG[species]||!['FULL_WRAP','HALF_WRAP'].includes(wrapMode))
  throw Error('V93_QA_SPECIES_OR_WRAP_INVALID');
 const prior=buildAIGReal3DV92NonhumanQA({sport:'TENNIS',wrapMode});
 const patch=makeReal3DPatch(species),cfg=CONFIG[species];
 const item={id:'testAttachment',kind:cfg.kind,jointId:'wrist',
  mesh:patch.mesh,
  flexWeights:patch.weights,pinnedVertices:patch.pinnedVertices,
  bindPivot:patch.bindPivot,hingeAxis:[0,0,1],flexDirection:[0,1,0],
  inertia:1,stiffness:32,damping:6,
  flowCoupling:7,accelerationCoupling:.015,
  maxDeflectionDeg:35,
  material:{baseColor:cfg.color,roughness:.68,metallic:0,doubleSided:true}};
 const manifest={schema:AIG_REAL3D_V93_SCHEMA,
  species,sourceSha256:prior.sourceSha256,items:[item]};
 const flowSamples=[
  {timeSec:0,velocityMps:[flowSpeed,0,0]},
  {timeSec:prior.rig.lastTimeSec,velocityMps:[flowSpeed,0,0]}];
 const engine=createAIGReal3DBiomechanicalAttachments({
  rig:prior.rig,manifest,flowSamples
 });
 return {prior,engine,manifest,attachmentSource:patch.mesh,
  explicitlyNONHUMAN_QA:true,realScanProvenanceVerified:false,
  externalFlowCalibrated:false};
}
