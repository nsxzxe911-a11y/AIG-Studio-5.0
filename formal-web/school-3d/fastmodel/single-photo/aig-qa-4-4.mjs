/** FastModel 4.4: self-authored conservative SDF head/neck and hair proxy QA.
 * This is NOT triangle/strand cloth or skin collision verification.
 * All user-facing clearance quantities use normalized preview units, not mm.
 */
import {sdEllipsoidApprox,fieldAt} from './aig-sdf-4-1.mjs';
export const AIG44_SCHEMA='AIG_FASTMODEL_4_4_HAIR_NECK_MATERIAL_QA_DRAFT';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bound=(n,min,max)=>finite(n)&&n>=min&&n<=max;
export const AIG44_PALETTES=Object.freeze({
 natural:Object.freeze({skin:Object.freeze([.80,.63,.61]),dress:Object.freeze([.55,.68,.79]),hair:Object.freeze([.29,.18,.13])}),
 warm:Object.freeze({skin:Object.freeze([.85,.64,.59]),dress:Object.freeze([.79,.56,.65]),hair:Object.freeze([.33,.20,.15])}),
 night:Object.freeze({skin:Object.freeze([.72,.56,.55]),dress:Object.freeze([.30,.39,.57]),hair:Object.freeze([.24,.16,.15])})
});
const copyColor=c=>[...c];
export function appearanceFor(palette='natural',hairBackOffset=.05){
 const raw=AIG44_PALETTES[palette];
 if(!raw||!bound(hairBackOffset,0,.08))throw Error('AIG44_APPEARANCE_INVALID');
 return {schema:AIG44_SCHEMA,palette,hairBackOffset,
  skinColor:copyColor(raw.skin),dressColor:copyColor(raw.dress),hairColor:copyColor(raw.hair),
  materialIsPreviewColorOnly:true,verifiedTextureUV:false,
  realHairStrandsVerified:false,creditsSpent:0,releaseAllowed:false};
}
export function auditHairNeck(scene,{hairBackOffset=.05,neckSafety=.008}={}){
 const p=scene?.parameters;
 if(!p||scene.sourceSHA256===undefined||!bound(hairBackOffset,0,.08)||
  !bound(neckSafety,.001,.03))throw Error('AIG44_SOURCE_OR_OFFSETS_INVALID');
 const checks=['headRadius','neckRadius','hairRadius'].every(k=>bound(p[k],.001,.5));
 if(!checks)throw Error('AIG44_GEOMETRY_INVALID');
 const hairCenter=[0,.25,-.075-hairBackOffset],hairAxes=[p.hairRadius,.235,.072];
 let narrowest=Infinity;const measured=[];
 // Probe the *rear exterior* of the neck proxy at multiple x/y.
 // Head/neck union naturally overlaps: neither a real mesh seam nor hair strands.
 for(const y of [.265,.29,.315,.335]){
  for(const x of [-.4,0,.4]){
   const px=x*p.neckRadius,py=y,pz=-p.neckRadius*Math.sqrt(Math.max(0,1-x*x));
   const point=[px,py,pz];
   const signed=sdEllipsoidApprox(point,hairCenter,hairAxes);
   measured.push({x:px,y:py,z:pz,signedDistance:signed});
   narrowest=Math.min(narrowest,signed);
  }
 }
 const neckSamples=[.305,.32,.335].map(y=>fieldAt([0,y,0],scene));
 const neckConnected=neckSamples.every(v=>finite(v)&&v<0);
 // Source photo does not resolve the occluded neck; this cannot certify mesh collision.
 const overlap=narrowest<0;
 return {schema:AIG44_SCHEMA,sourceSHA256:scene.sourceSHA256,
  hairBackOffset,neckSafety,
  sampledNeckCenterSdf:neckSamples,technicalNeckSdfContinuous:neckConnected,
  minHairNeckSignedDistance:narrowest,
  overlappingProxyVolumes:overlap,
  proxyClearanceWithinSafetyMargin:narrowest<neckSafety,
  status:!neckConnected?'BLOCKED_NECK_SDF_DISCONTINUITY':
    narrowest<neckSafety?'REVIEW_HAIR_NECK_PROXY_INTERSECTION':'PROXY_CLEARANCE_ONLY_NOT_MESH_VERIFIED',
  samples:measured.length,
  actualStrandTriangleCollisionVerified:false,realSkinSeamVerified:false,
  userApprovedVisualMatch:false,sourcePhotoOccluded:true,formalReleaseAllowed:false,
  noCreditsSpent:true};
}
const quantile=(sorted,p)=>sorted[Math.max(0,Math.ceil(p*sorted.length)-1)];
export class Aig44TimingEvidence {
 constructor({capacity=240}={}){
  if(!Number.isInteger(capacity)||capacity<16||capacity>1000)
   throw Error('AIG44_CAPACITY_INVALID');
  this.capacity=capacity;this.cpu=[];this.gpu=[];this.invalidGpu=0;
 }
 record({jsSubmitMs,gpuSample}={}){
  if(bound(jsSubmitMs,0,100000)){
   this.cpu.push(jsSubmitMs);if(this.cpu.length>this.capacity)this.cpu.shift();
  }
  if(gpuSample!==undefined&&gpuSample!==null){
   if(gpuSample.source==='EXT_disjoint_timer_query_webgl2'&&gpuSample.disjoint===false&&
      bound(gpuSample.gpuMs,0,100000)){
    this.gpu.push(gpuSample.gpuMs);if(this.gpu.length>this.capacity)this.gpu.shift();
   }else this.invalidGpu++;
  }
 }
 summary(){
  const metrics=a=>{
   if(!a.length)return {count:0,p50Ms:null,p95Ms:null,maxMs:null};
   const s=[...a].sort((x,y)=>x-y);
   return {count:s.length,p50Ms:quantile(s,.5),p95Ms:quantile(s,.95),maxMs:s.at(-1)};
  };
  return {schema:AIG44_SCHEMA,jsSubmission:metrics(this.cpu),gpuQueries:metrics(this.gpu),
   invalidGpuSamples:this.invalidGpu,gpuTimingReal:this.gpu.length>0,
   presentationFpsVerified:false,androidHardwareTested:false,
   windowsHardwareTested:false,skinAndHairMeshPassed:false,releaseAllowed:false};
 }
 reset(){this.cpu=[];this.gpu=[];this.invalidGpu=0;}
}
