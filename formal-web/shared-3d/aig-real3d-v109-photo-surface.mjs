/**
 * V109 FastModel photo -> real indexed front-surface geometry (not invented
 * backside). Source PNG alpha/UV are retained in a textured GLB; optional
 * separately supplied calibrated depth is user-declared, not certified.
 * NO model weights, SDF, Metaball, subdivision, template morph or fake body.
 */
export const AIG_REAL3D_V109_SCHEMA='AIG_REAL3D_V109_OBSERVED_FRONT_SURFACE_TO_5AX_GLB_V1';
const fail=x=>{throw Error('REAL3D_V109_'+x);};
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/i.test(x);
const finite=Number.isFinite;
const pngSignature=[137,80,78,71,13,10,26,10];
const validPNG=src=>src instanceof Uint8Array&&src.length>=64&&
 pngSignature.every((v,i)=>src[i]===v);
const isRGBA=a=>a instanceof Uint8Array||a instanceof Uint8ClampedArray;
const pad4=n=>(n+3)&~3;
const bytesOf=x=>new Uint8Array(x.buffer,x.byteOffset,x.byteLength);
function packGLB(gltf,payload){
 const json=new TextEncoder().encode(JSON.stringify(gltf));
 const jsonLen=pad4(json.length),binLen=pad4(payload.length);
 const result=new Uint8Array(12+8+jsonLen+8+binLen),
  dv=new DataView(result.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,result.length,true);
 dv.setUint32(12,jsonLen,true);dv.setUint32(16,0x4e4f534a,true);
 result.fill(32,20,20+jsonLen);result.set(json,20);
 const b=20+jsonLen;
 dv.setUint32(b,binLen,true);dv.setUint32(b+4,0x004e4942,true);
 result.set(payload,b+8);
 return result;
}
/**
 * For one transparent PNG the known geometry is a front-facing sampled
 * surface at Z=0: it is only 2.5D. A separate measured depth PNG can move
 * observed vertices in Z but cannot recover an unobserved backside.
 */
export function buildAIGReal3DV109PhotoSurfaceGLB({
 rgba,width,height,originalPNGBytes,imageSha256,
 sourceWidthMM=100,widthPhysicallyMeasured=false,
 depthValuesMM=null,depthSourceSha256=null,
 depthMeasurementDeclared=false,
 stride=null,alphaThreshold=16
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||
  width<16||height<16||width>1024||height>1024||
  !isRGBA(rgba)||rgba.length!==width*height*4||
  !validPNG(originalPNGBytes)||originalPNGBytes.length>12_000_000||
  !sha(imageSha256)||!finite(sourceWidthMM)||sourceWidthMM<1||sourceWidthMM>20000||
  !Number.isInteger(alphaThreshold)||alphaThreshold<0||alphaThreshold>220)
  fail('SOURCE_PNG_RGBA_SHA_AND_IMAGE_DIMENSIONS_REQUIRED');
 const hasDepth=depthValuesMM!==null;
 if(hasDepth&&(!(depthValuesMM instanceof Float32Array)||
  depthValuesMM.length!==width*height||!depthValuesMM.every(x=>finite(x)&&Math.abs(x)<=50000)||
  !sha(depthSourceSha256)||depthSourceSha256===imageSha256||
  depthMeasurementDeclared!==true))
  fail('SEPARATE_CALIBRATED_DEPTH_SOURCE_AND_SHA_REQUIRED');
 if(!hasDepth&&(depthSourceSha256!==null||depthMeasurementDeclared))
  fail('DEPTH_EVIDENCE_INCOMPLETE');
 if(stride!==null&&(!Number.isInteger(stride)||stride<1||stride>32))
  fail('INVALID_SAMPLE_STRIDE');
 const step=stride??Math.max(1,Math.ceil(Math.max(width,height)/96));
 const samplesX=[...Array(Math.floor((width-1)/step)+1)].map((_,i)=>i*step),
  samplesY=[...Array(Math.floor((height-1)/step)+1)].map((_,i)=>i*step);
 if(samplesX.at(-1)!==width-1)samplesX.push(width-1);
 if(samplesY.at(-1)!==height-1)samplesY.push(height-1);
 // Preserve original grid coordinates instead of inventing a smoothed outline.
 const sampleIds=new Map(),positions=[],uvs=[],indices=[];
 const key=(x,y)=>y*width+x;
 const opaque=(x,y)=>rgba[key(x,y)*4+3]>alphaThreshold;
 let visibleSourcePixels=0,borderPixels=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(!opaque(x,y))continue;
  visibleSourcePixels++;
  if(x===0||y===0||x===width-1||y===height-1)borderPixels++;
 }
 if(visibleSourcePixels<64||visibleSourcePixels>width*height*.97||borderPixels)
  fail('ALPHA_FOREGROUND_MISSING_OPAQUE_OR_CROPPED');
 const mmPerPixel=sourceWidthMM/(width-1);
 const positionFor=(x,y)=>[
  (x-(width-1)/2)*mmPerPixel/1000,
  ((height-1)/2-y)*mmPerPixel/1000,
  (hasDepth?depthValuesMM[key(x,y)]:0)/1000
 ];
 const id=(x,y)=>{
  const k=key(x,y);
  if(sampleIds.has(k))return sampleIds.get(k);
  const n=positions.length/3;
  sampleIds.set(k,n);
  positions.push(...positionFor(x,y));
  uvs.push(x/(width-1),1-y/(height-1));
  return n;
 };
 const presentCells=new Uint8Array((samplesX.length-1)*(samplesY.length-1));
 for(let iy=0;iy<samplesY.length-1;iy++)for(let ix=0;ix<samplesX.length-1;ix++){
  const x0=samplesX[ix],x1=samplesX[ix+1],
   y0=samplesY[iy],y1=samplesY[iy+1];
  // Every corner must be observed; never bridge foreground gaps or holes.
  if(![opaque(x0,y0),opaque(x1,y0),opaque(x0,y1),opaque(x1,y1)].every(Boolean))
   continue;
  const k=iy*(samplesX.length-1)+ix;
  presentCells[k]=1;
  const tl=id(x0,y0),tr=id(x1,y0),bl=id(x0,y1),br=id(x1,y1);
  indices.push(tl,bl,tr,tr,bl,br); // real +Z front orientation
 }
 if(indices.length<36||indices.length/3>200000||positions.length/3>120000)
  fail('OBSERVED_SURFACE_INSUFFICIENT_OR_TRIANGLE_BUDGET');
 // Approximate exact source-alpha reprojection via grid-cell coverage.
 let truePositive=0,falsePositive=0,falseNegative=0;
 const sampledMask=new Uint8Array(width*height);
 for(let iy=0;iy<samplesY.length-1;iy++)for(let ix=0;ix<samplesX.length-1;ix++){
  if(!presentCells[iy*(samplesX.length-1)+ix])continue;
  for(let y=samplesY[iy];y<=samplesY[iy+1];y++)
   for(let x=samplesX[ix];x<=samplesX[ix+1];x++)
    sampledMask[key(x,y)]=1;
 }
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=opaque(x,y),s=sampledMask[key(x,y)]===1;
  if(t&&s)truePositive++;else if(s)falsePositive++;else if(t)falseNegative++;
 }
 const coverageIoU=truePositive/(truePositive+falsePositive+falseNegative);
 // Vertex normals accumulated directly from the new source-bound triangles.
 const normal=new Float32Array(positions.length);
 for(let k=0;k<indices.length;k+=3){
  const [a,b,c]=indices.slice(k,k+3).map(i=>i*3);
  const u=[0,1,2].map(i=>positions[b+i]-positions[a+i]),
   v=[0,1,2].map(i=>positions[c+i]-positions[a+i]);
  const n=[u[1]*v[2]-u[2]*v[1],
   u[2]*v[0]-u[0]*v[2],
   u[0]*v[1]-u[1]*v[0]];
  if(Math.hypot(...n)<1e-16)fail('DEGENERATE_MEASURED_DEPTH_TRIANGLE');
  for(const pos of [a,b,c])for(let i=0;i<3;i++)normal[pos+i]+=n[i];
 }
 for(let k=0;k<normal.length;k+=3){
  const n=Math.hypot(normal[k],normal[k+1],normal[k+2]);
  if(n<1e-16)fail('INVALID_SOURCE_NORMAL');
  for(let i=0;i<3;i++)normal[k+i]/=n;
 }
 const dataParts=[bytesOf(new Float32Array(positions)),bytesOf(normal),
  bytesOf(new Float32Array(uvs)),bytesOf(new Uint32Array(indices)),
  originalPNGBytes];
 const payloadLength=dataParts.reduce((total,p)=>pad4(total)+p.length,0);
 if(payloadLength>34_000_000)fail('GLB_BYTE_BUDGET');
 const payload=new Uint8Array(pad4(payloadLength)),views=[];
 let offset=0;
 for(const part of dataParts){
  offset=pad4(offset);
  payload.set(part,offset);
  views.push({buffer:0,byteOffset:offset,byteLength:part.length});
  offset+=part.length;
 }
 const vertexCount=positions.length/3,triangleCount=indices.length/3;
 const xmin=Math.min(...positions.filter((_,i)=>i%3===0)),
  xmax=Math.max(...positions.filter((_,i)=>i%3===0)),
  ymin=Math.min(...positions.filter((_,i)=>i%3===1)),
  ymax=Math.max(...positions.filter((_,i)=>i%3===1)),
  zmin=Math.min(...positions.filter((_,i)=>i%3===2)),
  zmax=Math.max(...positions.filter((_,i)=>i%3===2));
 const gltf={
  asset:{version:'2.0',generator:'AIG Real3D V109 transparent-photo observed-front surface'},
  buffers:[{byteLength:payloadLength}],bufferViews:views,
  accessors:[
   {bufferView:0,componentType:5126,count:vertexCount,type:'VEC3',min:[xmin,ymin,zmin],max:[xmax,ymax,zmax]},
   {bufferView:1,componentType:5126,count:vertexCount,type:'VEC3'},
   {bufferView:2,componentType:5126,count:vertexCount,type:'VEC2'},
   {bufferView:3,componentType:5125,count:indices.length,type:'SCALAR'}],
  images:[{bufferView:4,mimeType:'image/png'}],
  samplers:[{magFilter:9729,minFilter:9729,wrapS:33071,wrapT:33071}],
  textures:[{sampler:0,source:0}],
  materials:[{doubleSided:true,pbrMetallicRoughness:{
   baseColorFactor:[1,1,1,1],baseColorTexture:{index:0,texCoord:0},
   metallicFactor:0,roughnessFactor:.8}}],
  meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},
   indices:3,material:0,mode:4}]}],
  nodes:[{mesh:0,name:'ObservedFrontOnly'}],scenes:[{nodes:[0]}],scene:0
 };
 const glbBytes=packGLB(gltf,payload);
 if(glbBytes.length>35_000_000)fail('GLB_OUTPUT_TOO_LARGE');
 const receipt={
  schema:AIG_REAL3D_V109_SCHEMA,imageSha256,
  originalPNGBytesPreserved:true,
  depthSourceSha256:hasDepth?depthSourceSha256:null,
  sourceDimensionsPx:[width,height],sourceWidthMM,widthPhysicallyMeasured,
  sourcePhysicalScale:'USER_INPUT_NOT_INDEPENDENTLY_CERTIFIED',
  mode:hasDepth?'USER_DECLARED_CALIBRATED_FRONT_DEPTH':'ALPHA_ONLY_FLAT_FRONT_2_5D',
  observedGeometry:'VISIBLE_FRONT_ONLY',
  inferredBackside:false,volumeCertified:false,
  measuredDepthIndependentVerificationPassed:false,
  hardwareDepthSensorCalled:false,neuralModelWeightsExecuted:false,
  surfaceTriangles:triangleCount,sourceUVVertices:vertexCount,
  sourcePixelForeground:visibleSourcePixels,
  foregroundReprojectionIoU:coverageIoU,
  foregroundIoUIsNot3DLikeness:true,
  originalPhotoIdentityOrNaturalAnatomyCertified:false,
  multiView1to1Gate:'BLOCK_INDEPENDENT_BACK_SIDE_AND_DEPTH_NOT_VERIFIED',
  geometryGenerationGate:coverageIoU>=.8?'FRONT_SURFACE_CREATED':'BLOCK_SOURCE_SILHOUETTE_COVERAGE',
  releasePASS:false
 };
 return {glbBytes,receipt};
}
