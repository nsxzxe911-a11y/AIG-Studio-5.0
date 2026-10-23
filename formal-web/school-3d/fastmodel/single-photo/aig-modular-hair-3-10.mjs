/**
 * Real3D 3.10 — source-anchored SEPARATE 3D technical hairstyle prototypes.
 * Style meshes are real geometry, never source photo planes or painted face.
 * Hair strands are not groom-quality, physical simulation or heroine-approved.
 */
export const AIG310_HAIR_SCHEMA='AIG_REAL3D_3_10_REMOVABLE_SOURCE_ANCHORED_HAIR';
export const AIG310_HAIR_STYLES=Object.freeze(['none','short','long','ponytail','twintails']);
const fail=s=>{throw Error('AIG310_HAIR_'+s)};
function headFeatures(shell){
 const pos=shell?.positions,ids=shell?.vertexSourceLabelIds;
 if(!(pos instanceof Float32Array)||pos.length%3||
  !(ids instanceof Uint8Array)||ids.length*3!==pos.length)
  fail('REQUIRES_REAL_SOURCE_LABELED_BODY');
 const head=[];
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,
  minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<ids.length;i++){
  if(ids[i]!==2&&ids[i]!==3)continue;
  const x=pos[i*3],y=pos[i*3+1],z=pos[i*3+2];
  if(![x,y,z].every(Number.isFinite))fail('NONFINITE_SOURCE_GEOMETRY');
  head.push(i);
  minX=Math.min(x,minX);maxX=Math.max(x,maxX);
  minY=Math.min(y,minY);maxY=Math.max(y,maxY);
  minZ=Math.min(z,minZ);maxZ=Math.max(z,maxZ);
 }
 if(head.length<24||maxY-minY<.03||maxX-minX<.02)
  fail('NOT_ENOUGH_VISIBLE_HEAD_GEOMETRY');
 const x=(minX+maxX)/2,z=(minZ+maxZ)/2,
  width=maxX-minX,height=maxY-minY,depth=Math.max((maxZ-minZ),width*.60);
 const nearest=(px,py,pz)=>{
  let best=head[0],d=Infinity;
  for(const i of head){
   const a=pos[i*3]-px,b=pos[i*3+1]-py,c=pos[i*3+2]-pz;
   const test=a*a+b*b+c*c;
   if(test<d){d=test;best=i}
  }
  return best;
 };
 return {x,z,minY,maxY,width,height,depth,nearest,
  realHeadSourceVertexCount:head.length};
}
export function buildAIG310ModularHair(shell,{
 style='short',colour=0x503827
}={}){
 if(!AIG310_HAIR_STYLES.includes(style)||!Number.isInteger(colour)||
  colour<0||colour>0xffffff)
  fail('INVALID_HAIR_STYLE_OR_COLOUR');
 if(style==='none')return Object.freeze({
  schema:AIG310_HAIR_SCHEMA,style,segments:[],
  realIndependentHairMeshes:0,sourceHeadVerticesUsed:0,
  sourceBodyUntouched:true,tailMotionPhysicsCertified:false
 });
 const head=headFeatures(shell);
 const pieces=[],R=32;
 const radiusX=Math.max(head.width*.54,.01),
  radiusZ=Math.max(head.depth*.54,.01);
 function add(name,build){
  const positions=[],indices=[],sourceVertexIndices=[];
  const point=(x,y,z,anchor=null)=>{
   positions.push(x,y,z);
   sourceVertexIndices.push(anchor??head.nearest(x,y,z));
  };
  const face=(a,b,c)=>indices.push(a,b,c);
  build({point,face,positions});
  if(!indices.length||positions.length%3)
   fail('EMPTY_HAIR_GEOMETRY');
  pieces.push({name,sourceVertexIndices:new Uint32Array(sourceVertexIndices),
   positions:new Float32Array(positions),indices:new Uint32Array(indices),
   colour,actualIndependent3DTriangles:indices.length/3,
   sourceHeadAnchored:true});
 }
 add('SHORT_CAP',(o)=>{
  const rows=7;
  for(let r=0;r<rows;r++){
   const theta=(r/(rows-1))*(Math.PI*.62);
   const y=head.maxY-head.height*.50*(1-Math.cos(theta));
   const scale=Math.max(.045,Math.sin(theta));
   for(let k=0;k<R;k++){
    const a=2*Math.PI*k/R;
    o.point(head.x+Math.cos(a)*radiusX*scale,y,
     head.z+Math.sin(a)*radiusZ*scale);
   }
  }
  for(let r=0;r<rows-1;r++)for(let k=0;k<R;k++){
   const a=r*R+k,b=r*R+(k+1)%R,
    c=(r+1)*R+k,d=(r+1)*R+(k+1)%R;
   o.face(a,b,c);o.face(b,d,c);
  }
 });
 const tails=style==='long'?8:style==='ponytail'?1:
  style==='twintails'?2:0;
 if(tails){
  add('HAIR_FOLLOW_TAILS',o=>{
   const segments=10,ribbon=5;
   const seed=head.nearest(head.x,head.maxY-head.height*.36,
    head.z-radiusZ);
   for(let strand=0;strand<tails;strand++){
    const edge=tails===1?0:(strand/(tails-1))*2-1;
    const baseX=head.x+edge*radiusX*.77;
    const baseY=head.maxY-head.height*(style==='long'?.48:.34);
    const baseZ=head.z-radiusZ*.97;
    const fall=head.height*(style==='long'?1.2:style==='ponytail'?1.45:1.05);
    for(let r=0;r<segments;r++){
     const t=r/(segments-1);
     const x=baseX+head.width*(style==='long'?.04*edge:.28*edge)*t*t;
     const y=baseY-fall*t;
     const z=baseZ-head.depth*.22*Math.sin(t*Math.PI);
     const halfWidth=head.width*(style==='long'?.05:.105)*(1-.60*t);
     for(let k=0;k<ribbon;k++){
      const az=(k/(ribbon-1)-.5)*Math.PI;
      const xx=x+Math.sin(az)*halfWidth;
      const zz=z-Math.cos(az)*halfWidth*.50;
      o.point(xx,y,zz,seed);
     }
    }
    const start=strand*segments*ribbon;
    for(let r=0;r<segments-1;r++)for(let k=0;k<ribbon-1;k++){
     const a=start+r*ribbon+k,b=a+1,
      c=a+ribbon,d=c+1;
     o.face(a,b,c);o.face(b,d,c);
    }
   }
  });
 }
 return Object.freeze({
  schema:AIG310_HAIR_SCHEMA,style,
  segments:pieces,
  realIndependentHairMeshes:pieces.length,
  realIndependent3DTriangles:pieces.reduce((n,p)=>
   n+p.actualIndependent3DTriangles,0),
  sourceHeadVerticesUsed:head.realHeadSourceVertexCount,
  inferredStyleGeometryNotMatchingRealPhoto:true,
  sourceBodyUntouched:true,headPoseAnchorsIncluded:true,
  tailMotionPhysicsCertified:false,
  actualApprovedHeroineHairGroom:false
 });
}
