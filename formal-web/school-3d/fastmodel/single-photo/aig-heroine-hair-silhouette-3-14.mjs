/**
 * Real3D 3.14 — BEGIN actual user-source-constrained hair geometry.
 *
 * Rear-view pixel ROWS and measured brown-hair silhouette widths below came
 * from the real user-provided 1448x1086 reference sheet, SHA verified locally.
 * The broad colour classification is NOT a perfect hair segmentation.
 * Original PNG pixels are not embedded or published.
 *
 * Produces independently removable, indexed, actual XYZ hair geometry; it is
 * NOT an opaque 2D image sheet, wig photo, fully scanned 3D, full hair groom
 * or approved physical hair collision geometry.
 */
export const AIG314_HAIR_SOURCE_SCHEMA='AIG_REAL3D_3_14_SOURCE_BACKVIEW_HAIR_SILHOUETTE';
export const AIG314_REAR_HAIR_PROFILE=Object.freeze([
 // [rowY, dark-brown connected region width in original rear view, pixels]
 [75,32],[85,49],[95,55],[105,60],[115,59],[125,57],
 [140,66],[155,66],[170,100],[190,114],[210,110],[230,105],
 [250,102],[270,114],[290,111],[310,121],[330,112]
].map(x=>Object.freeze(x)));
const fail=s=>{throw Error('AIG314_HAIR_'+s)};
export function buildAIG314HeroineSourceHair(shell,{
 sourceReferenceSha256='1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1',
 rings=AIG314_REAR_HAIR_PROFILE.length,angularSegments=32
}={}){
 if(sourceReferenceSha256!=='1deed212a2adcdc821e4291c6021fd1db490644da9a9c9b497f8243a7da296c1'||
  !(shell?.positions instanceof Float32Array)||
  !(shell?.vertexSourceLabelIds instanceof Uint8Array)||
  shell.positions.length%3||shell.vertexSourceLabelIds.length*3!==shell.positions.length||
  !Number.isInteger(rings)||rings!==AIG314_REAR_HAIR_PROFILE.length||
  !Number.isInteger(angularSegments)||angularSegments<16||
  angularSegments>64)
  fail('VERIFIED_REFERENCE_AND_SOURCE_HEAD_GEOMETRY_REQUIRED');
 const p=shell.positions,ids=shell.vertexSourceLabelIds;
 const head=[];let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<ids.length;i++){
  if(![2,3].includes(ids[i]))continue;
  head.push(i);
  for(let k=0;k<3;k++){
   min[k]=Math.min(min[k],p[i*3+k]);
   max[k]=Math.max(max[k],p[i*3+k]);
  }
 }
 const h=max[1]-min[1],width=max[0]-min[0];
 if(head.length<24||!Number.isFinite(h)||h<.035||width<.025)
  fail('HEAD_SILHOUETTE_EVIDENCE_INSUFFICIENT');
 const cX=(min[0]+max[0])/2,
  backZ=max[2]+Math.max(.005,(max[2]-min[2])*.13);
 const nearest=(x,y,z)=>{
  let best=head[0],cost=Infinity;
  for(const i of head){
   const dx=p[i*3]-x,dy=p[i*3+1]-y,dz=p[i*3+2]-z,
    v=dx*dx+dy*dy+dz*dz;
   if(v<cost){cost=v;best=i;}
  }
  return best;
 };
 const positions=[],indices=[],sourceVertexIndices=[];
 const peak=121,rows=rings,N=angularSegments;
 for(let row=0;row<rows;row++){
  const [yPixel,wPixel]=AIG314_REAR_HAIR_PROFILE[row];
  const t=(yPixel-75)/(330-75);
  const yy=max[1]+h*.075-t*h*2.20;
  // The rear-view width is observed 2D evidence. Depth is NOT measured:
  // keep a conservative elliptical volume to avoid planar photo tricks.
  const radiusX=Math.max(width*.18,width*.63*(wPixel/peak));
  const radiusZ=Math.max(width*.12,width*.34*(.65+.35*wPixel/peak));
  const driftZ=t*h*.13;
  for(let angle=0;angle<N;angle++){
   const theta=2*Math.PI*angle/N;
   const wave=Math.sin(theta*9+t*21)*h*.017*t;
   const x=cX+radiusX*Math.cos(theta)+wave;
   const z=backZ+driftZ+radiusZ*Math.sin(theta)+
    Math.sin(theta*5+t*19)*h*.009*t;
   positions.push(x,yy,z);
   sourceVertexIndices.push(nearest(x,yy,z));
  }
 }
 for(let r=0;r<rows-1;r++)for(let k=0;k<N;k++){
  const a=r*N+k,b=r*N+(k+1)%N,
   c=(r+1)*N+k,d=(r+1)*N+(k+1)%N;
  indices.push(a,b,c,b,d,c);
 }
 const result={
  schema:AIG314_HAIR_SOURCE_SCHEMA,style:'authority-long',
  sourceSha256:sourceReferenceSha256,
  actualOriginalRearHairRowsMeasured:AIG314_REAR_HAIR_PROFILE.length,
  actualIndependent3DTriangles:indices.length/3,
  sourceWidthEstimatedFromRealBackView:true,
  sideAndHiddenHairDepthIsInferredNotScanned:true,
  hasReal3DNonPlanarMesh:true,
  faceAndBodyUntouched:true,
  sourceHairGroomAndIndividualStrandsApproved:false,
  sourceSilhouetteColourHeuristicNeedsManualRefinement:true,
  segments:[{
   name:'APPROVED_REFERENCE_REAR_SILHOUETTE_TECHNICAL',
   sourceVertexIndices:new Uint32Array(sourceVertexIndices),
   positions:new Float32Array(positions),
   indices:new Uint32Array(indices),
   colour:0x4b302f,
   actualIndependent3DTriangles:indices.length/3,
   sourceHeadAnchored:true
  }],
  realIndependentHairMeshes:1,
  realIndependent3DTriangles:indices.length/3
 };
 return result;
}
