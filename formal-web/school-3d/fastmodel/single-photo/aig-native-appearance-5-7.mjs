/** AIG FastModel 5.7: procedural school-uniform silhouette, technical 3D face
 * and moving strand bundle grafted as REAL glTF SkinnedMeshes onto the unchanged
 * 5.6 connected-manifold articulated human. Zero network / generative services.
 * This does NOT reproduce a real individual's facial identity, exact textiles,
 * recovered hidden views, physical hair, or an approved character.
 */
import {generateAIG56NativeHumanoid,AIG56_BONES} from './aig-native-body-5-6.mjs';

export const AIG57_SCHEMA='AIG_FASTMODEL_5_7_SELF_AUTHORED_3D_APPEARANCE_TECHNICAL_DRAFT';
export const AIG57_PARTS=Object.freeze([
 'AIG57_FACE_FEATURES','AIG57_SCHOOL_UNIFORM_JACKET',
 'AIG57_WHITE_SHIRT','AIG57_PLEATED_SKIRT',
 'AIG57_PLAID_BOW','AIG57_BACKPACK','GirlPonytail_AIG57_STRANDS'
]);
const align4=n=>(n+3)&~3;
const finite=Number.isFinite;
const rgba={
 skin:[.73,.55,.44,1],eyeWhite:[.90,.90,.89,1],iris:[.23,.16,.12,1],
 pupils:[.06,.04,.035,1],lip:[.54,.26,.27,1],brow:[.23,.13,.10,1],
 blazer:[.18,.21,.26,1],blazerTrim:[.34,.38,.47,1],
 shirt:[.94,.93,.88,1],skirt:[.27,.29,.35,1],pleat:[.38,.39,.46,1],
 bow:[.54,.19,.23,1],bowStripe:[.65,.67,.72,1],
 backpack:[.25,.25,.31,1],backpackTrim:[.43,.43,.50,1],
 hair:[.27,.12,.075,1],hairHighlight:[.42,.23,.16,1]
};
function meshBuilder(){
 const positions=[],colors=[],skinIndex=[],skinWeight=[],indices=[];
 function vertex(point,color,weights){
  if(point.length!==3||!point.every(finite)||!color||color.length!==4||
     !color.every(v=>finite(v)&&v>=0&&v<=1))throw Error('AIG57_VERTEX_INVALID');
  const usable=weights.filter(([joint,w])=>Number.isInteger(joint)&&joint>=0&&joint<17&&
   finite(w)&&w>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const sum=usable.reduce((a,b)=>a+b[1],0);
  if(sum<=0)throw Error('AIG57_INVALID_WEIGHTS');
  const i=positions.length/3;positions.push(...point);colors.push(...color);
  while(usable.length<4)usable.push([0,0]);
  skinIndex.push(...usable.map(([j])=>j));
  skinWeight.push(...usable.map(([,w])=>w/sum));
  return i;
 }
 function triangle(a,b,c){
  if(a===b||b===c||a===c)throw Error('AIG57_DEGENERATE_TRIANGLE');
  indices.push(a,b,c);
 }
 function join(a,b){
  if(a.length!==b.length)throw Error('AIG57_RING_LENGTH_MISMATCH');
  for(let k=0;k<a.length-1;k++){
   triangle(a[k],a[k+1],b[k]);
   triangle(a[k+1],b[k+1],b[k]);
  }
 }
 return {positions,colors,skinIndex,skinWeight,indices,vertex,triangle,join};
}
function normalize(v){const n=Math.hypot(...v)||1;return v.map(x=>x/n);}
function area3(a,b,c){
 const x=b.map((v,i)=>v-a[i]),y=c.map((v,i)=>v-a[i]);
 return .5*Math.hypot(x[1]*y[2]-x[2]*y[1],
  x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]);
}
function ellipsoid(out,center,radii,joint,color,{longitude=12,latitude=7}={}){
 if(radii.some(v=>v<=0))throw Error('AIG57_ELLIPSOID_RADII');
 const loops=[],weights=[[joint,1]];
 for(let r=1;r<latitude;r++){
  const theta=Math.PI*r/latitude,row=[];
  for(let i=0;i<longitude;i++){
   const phi=i*Math.PI*2/longitude;
   row.push(out.vertex([
    center[0]+radii[0]*Math.sin(theta)*Math.cos(phi),
    center[1]+radii[1]*Math.cos(theta),
    center[2]+radii[2]*Math.sin(theta)*Math.sin(phi)
   ],color,weights));
  }
  loops.push(row);
 }
 const top=out.vertex([center[0],center[1]+radii[1],center[2]],color,weights);
 const bottom=out.vertex([center[0],center[1]-radii[1],center[2]],color,weights);
 for(let i=0;i<longitude;i++){
  const next=(i+1)%longitude;
  out.triangle(top,loops[0][i],loops[0][next]);
  for(let r=0;r<loops.length-1;r++){
   out.triangle(loops[r][i],loops[r+1][i],loops[r][next]);
   out.triangle(loops[r][next],loops[r+1][i],loops[r+1][next]);
  }
  const last=loops[loops.length-1];
  out.triangle(last[i],bottom,last[next]);
 }
}
function taperedTube(out,centers,radii,joints,colors,{radial=10}={}){
 if(centers.length<2||centers.length!==radii.length||
    centers.length!==joints.length)throw Error('AIG57_TUBE_PROFILE_INVALID');
 let previous=null;
 for(let s=0;s<centers.length;s++){
  const before=centers[Math.max(0,s-1)],after=centers[Math.min(centers.length-1,s+1)];
  const tangent=normalize(after.map((v,i)=>v-before[i]));
  let ref=Math.abs(tangent[2])>.85?[0,1,0]:[0,0,1];
  const a=normalize([tangent[1]*ref[2]-tangent[2]*ref[1],
   tangent[2]*ref[0]-tangent[0]*ref[2],tangent[0]*ref[1]-tangent[1]*ref[0]]);
  const b=normalize([tangent[1]*a[2]-tangent[2]*a[1],
   tangent[2]*a[0]-tangent[0]*a[2],tangent[0]*a[1]-tangent[1]*a[0]]);
  const row=[];
  for(let k=0;k<=radial;k++){
   const theta=k*Math.PI*2/radial;
   const point=centers[s].map((v,i)=>v+radii[s]*
    (a[i]*Math.cos(theta)+b[i]*Math.sin(theta)));
   row.push(out.vertex(point,colors[s%colors.length],joints[s]));
  }
  if(previous)out.join(previous,row);
  previous=row;
 }
}
function makeFace(){
 const out=meshBuilder();
 // These are independently skinned volumetric primitives, not an image
 // texture; photo likeness and facial landmarks remain unverified.
 ellipsoid(out,[0,1.916,-.178],[.027,.040,.065],4,rgba.skin);
 for(const side of [-1,1]){
  ellipsoid(out,[side*.067,1.960,-.154],[.031,.015,.019],4,rgba.eyeWhite);
  ellipsoid(out,[side*.066,1.959,-.170],[.013,.013,.009],4,rgba.iris);
  ellipsoid(out,[side*.066,1.960,-.178],[.007,.007,.006],4,rgba.pupils);
  ellipsoid(out,[side*.068,1.997,-.155],[.038,.008,.012],4,rgba.brow);
  ellipsoid(out,[side*.170,1.887,-.012],[.027,.045,.028],4,rgba.skin);
 }
 ellipsoid(out,[0,1.832,-.149],[.057,.010,.015],4,rgba.lip);
 return out;
}
function makeCoat(width){
 const out=meshBuilder(),angles=24,rows=[1.12,1.20,1.37,1.49,1.57];
 const radii=[.235,.237,.267,.287,.16].map(n=>n*width);
 const depths=[.127,.140,.153,.152,.103];
 let previous=null;
 for(let r=0;r<rows.length;r++){
  const next=[];
  for(let k=0;k<=angles;k++){
   // Leave a visible opening at the front (negative Z); two real
   // jacket flaps, not a closed shell hiding the shirt.
   const angle=-Math.PI/2+.42+(Math.PI*2-.84)*k/angles;
   const color=(k<2||k>angles-2)?rgba.blazerTrim:rgba.blazer;
   next.push(out.vertex([radii[r]*Math.cos(angle),rows[r],
    depths[r]*Math.sin(angle)],color,
    rows[r]>=1.47?[[2,1]]:rows[r]<=1.18?[[1,.7],[0,.3]]:[[1,.45],[2,.55]]));
  }
  if(previous)out.join(previous,next);
  previous=next;
 }
 return out;
}
function makeShirt(){
 const out=meshBuilder();
 const rows=[1.20,1.32,1.45,1.58,1.625];
 let prev=null;
 for(const [r,y] of rows.entries()){
  const next=[];
  for(let k=0;k<=12;k++){
   const u=k/12*2-1;
   const extent=.135*(r===4?.65:1);
   next.push(out.vertex([u*extent,y,-.139-(1-u*u)*.022],
    rgba.shirt,[[r>=3?2:1,1]]));
  }
  if(prev)out.join(prev,next);
  prev=next;
 }
 return out;
}
function makeSkirt(width){
 const out=meshBuilder(),segments=48,rings=[
  [1.115,.245,.124],[1.08,.255,.139],[1.0,.300,.167],
  [.90,.352,.185],[.79,.405,.205]
 ],all=[];
 for(const [r,[y,wide,deep]] of rings.entries()){
  const ring=[];
  for(let k=0;k<=segments;k++){
   const th=k/segments*Math.PI*2,pleat=Math.cos(th*16)*(.006+r*.004);
   const material=(Math.floor(k/3)%2)?rgba.pleat:rgba.skirt;
   ring.push(out.vertex([(wide*width+pleat)*Math.cos(th),y,
     (deep+pleat*.72)*Math.sin(th)],material,
    [[0,r<2?.65:.98],[1,r<2?.35:.02]]));
  }
  if(all.length)out.join(all[all.length-1],ring);
  all.push(ring);
 }
 return out;
}
function makeBow(){
 const out=meshBuilder();
 for(const side of [-1,1]){
  ellipsoid(out,[side*.060,1.558,-.182],[.059,.029,.013],
   2,rgba.bow);
  for(let stripe=0;stripe<3;stripe++){
   const x=side*(.037+stripe*.017);
   ellipsoid(out,[x,1.559,-.198],[.005,.030,.004],2,rgba.bowStripe,
    {longitude:8,latitude:5});
  }
  ellipsoid(out,[side*.027,1.512,-.179],[.020,.044,.012],2,rgba.bow);
 }
 ellipsoid(out,[0,1.552,-.204],[.020,.019,.018],2,rgba.bowStripe);
 return out;
}
function makeBackpack(){
 const out=meshBuilder();
 ellipsoid(out,[0,1.335,.220],[.175,.230,.110],2,rgba.backpack,
  {longitude:18,latitude:9});
 for(const sign of [-1,1]){
  taperedTube(out,[[sign*.120,1.565,.175],[sign*.205,1.470,.160],
   [sign*.220,1.300,.168],[sign*.170,1.165,.172]],
   [.020,.019,.017,.014],[[[2,1]],[[2,1]],[[1,.45],[2,.55]],[[1,1]]],
   [rgba.backpackTrim],{radial:8});
 }
 return out;
}
function makePonytailStrands(){
 const out=meshBuilder();
 // Strand paths are volumetric with real skin weights and react to the
 // existing 5.6 15/16 ponytail joints. They are not simulated hair physics.
 for(const [i,x] of [-.055,-.035,.035,.055].entries()){
  const zshift=i%2*.026;
  const points=[[x*.42,1.96,.33],[x*.9,1.90,.41+zshift],
   [x,1.81,.51+zshift],[x*1.2,1.67,.575+zshift],
   [x*1.3,1.585,.595+zshift]];
  taperedTube(out,points,[.017,.018,.015,.010,.004],
   [[[15,1]],[[15,.8],[16,.2]],[[15,.30],[16,.70]],
    [[16,1]],[[16,1]]],
   [i%2?rgba.hairHighlight:rgba.hair],{radial:8});
 }
 return out;
}
const GENERATORS=[
 makeFace,makeCoat,makeShirt,makeSkirt,makeBow,makeBackpack,makePonytailStrands
];
function decodeGLB(bytes){
 const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(data.byteLength<40||data.byteLength>4*1024*1024)throw Error('AIG57_BASE_GLB_BUDGET');
 const dv=new DataView(data.buffer,data.byteOffset,data.byteLength);
 if(dv.getUint32(0,true)!==0x46546c67||
    dv.getUint32(4,true)!==2||dv.getUint32(8,true)!==data.byteLength||
    dv.getUint32(16,true)!==0x4e4f534a)
  throw Error('AIG57_BASE_GLB_HEADER');
 const jsonLen=dv.getUint32(12,true),binHeader=20+jsonLen;
 if(jsonLen<100||binHeader+8>data.length||
    dv.getUint32(binHeader+4,true)!==0x004e4942)
  throw Error('AIG57_BASE_GLB_CHUNKS');
 const json=JSON.parse(new TextDecoder().decode(data.subarray(20,20+jsonLen)));
 const binLen=dv.getUint32(binHeader,true);
 if(binHeader+8+binLen!==data.length||json.buffers?.length!==1||
   !json.skins?.length||json.animations?.length!==4||
   json.skins[0].joints.length!==17)
  throw Error('AIG57_BASE_GLB_SKIN_OR_CLIPS_INVALID');
 return {json,bin:data.slice(binHeader+8)};
}
function encodeGLB(json,bin){
 json.buffers=[{byteLength:bin.length}];
 const enc=new TextEncoder().encode(JSON.stringify(json));
 const padded=align4(enc.length);
 const out=new Uint8Array(12+8+padded+8+bin.length);
 const dv=new DataView(out.buffer);
 dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);
 dv.setUint32(8,out.length,true);dv.setUint32(12,padded,true);
 dv.setUint32(16,0x4e4f534a,true);
 out.set(enc,20);out.fill(32,20+enc.length,20+padded);
 const start=20+padded;
 dv.setUint32(start,bin.length,true);
 dv.setUint32(start+4,0x004e4942,true);
 out.set(bin,start+8);
 return out;
}
export function generateAIG57SchoolHeroineTechnical(scaffold){
 const original=generateAIG56NativeHumanoid(scaffold);
 const {json,bin}=decodeGLB(original.bytes);
 const originalCounts={meshes:json.meshes.length,clips:json.animations.length,
  bones:json.skins[0].joints.length};
 if(json.asset?.generator!=='AIG FastModel 5.6 fully self-authored local technical skeletal prototype')
  throw Error('AIG57_NONNATIVE_BASE_REJECTED');
 const width=Math.max(.34,Math.min(.72,scaffold.proportions.widthHeightRatio))/.48;
 const pieces=GENERATORS.map((make,i)=>make(width,i));
 const positions=[],parts=[];
 for(let partIndex=0;partIndex<pieces.length;partIndex++){
  const part=pieces[partIndex];
  if(!part.indices.length||part.positions.length<36||
   part.positions.length/3>12000||part.indices.length/3>24000)
   throw Error('AIG57_ACCESSORY_BUDGET');
  const normals=new Float32Array(part.positions.length);
  for(let i=0;i<part.indices.length;i+=3){
   const ids=part.indices.slice(i,i+3),
    points=ids.map(j=>part.positions.slice(j*3,j*3+3));
   if(ids.some(k=>k<0||k>=part.positions.length/3||!Number.isInteger(k))||
      new Set(ids).size!==3||area3(...points)<1e-10)
    throw Error('AIG57_DEGENERATE_GEOMETRY_'+AIG57_PARTS[partIndex]);
   const [a,b,c]=points,v=b.map((x,k)=>x-a[k]),w=c.map((x,k)=>x-a[k]);
   const cross=[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
   for(const id of ids)for(let k=0;k<3;k++)normals[id*3+k]+=cross[k];
  }
  for(let k=0;k<normals.length;k+=3)normals.set(
   normalize([normals[k],normals[k+1],normals[k+2]]),k);
  parts.push({part,normals});
  positions.push(...part.positions);
 }
 const paddedBase=align4(bin.length),chunks=[],accessors=json.accessors,
  bufferViews=json.bufferViews;let offset=paddedBase;
 function append(values,componentType,type,target,limits=null){
  offset=align4(offset);
  const typed=values;
  const data=new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength);
  chunks.push({start:offset,data});const bufferView=bufferViews.length;
  bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.byteLength,...(target?{target}:{})});
  offset+=data.byteLength;
  const accessor=accessors.length;
  accessors.push({bufferView,componentType,type,count:values.length/
   ({SCALAR:1,VEC3:3,VEC4:4}[type]),...(limits||{})});
  return accessor;
 }
 for(let i=0;i<parts.length;i++){
  const {part,normals}=parts[i],verts=part.positions.length/3;
  const limits={min:[0,1,2].map(k=>Math.min(...part.positions.filter((_,n)=>n%3===k))),
   max:[0,1,2].map(k=>Math.max(...part.positions.filter((_,n)=>n%3===k)))};
  const attributes={
   POSITION:append(new Float32Array(part.positions),5126,'VEC3',34962,limits),
   NORMAL:append(normals,5126,'VEC3',34962),
   COLOR_0:append(new Float32Array(part.colors),5126,'VEC4',34962),
   JOINTS_0:append(new Uint16Array(part.skinIndex),5123,'VEC4',34962),
   WEIGHTS_0:append(new Float32Array(part.skinWeight),5126,'VEC4',34962)
  };
  const index=append(new Uint32Array(part.indices),5125,'SCALAR',34963);
  const meshId=json.meshes.length,nodeId=json.nodes.length;
  json.meshes.push({name:AIG57_PARTS[i],primitives:[{attributes,indices:index,
   mode:4,material:json.materials.length}]});
  json.nodes.push({name:AIG57_PARTS[i],skin:0,mesh:meshId});
  json.scenes[json.scene].nodes.push(nodeId);
  json.materials.push({name:'AIG57_'+AIG57_PARTS[i]+'_TECHNICAL_PBR',
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.9},
   doubleSided:true});
 }
 // An authored follow-through animation, not a physical simulation. Bone
 // indices 4=head,15=ponytailRoot,16=ponytailTip in the 17-joint base rig.
 const times=append(new Float32Array([0,.375,.75,1.125,1.5]),5126,'SCALAR',null);
 function rot(nodeIndex,axis,deg){
  const quats=new Float32Array(deg.flatMap(d=>{
   const angle=d*Math.PI/360,v=Math.sin(angle),w=Math.cos(angle);
   return axis==='y'?[0,v,0,w]:[v,0,0,w];
  }));
  return {input:times,output:append(quats,5126,'VEC4',null),node:nodeIndex};
 }
 const joints=json.skins[0].joints;
 const tracks=[
  rot(joints[4],'y',[0,10,16,-12,0]),
  rot(joints[15],'y',[0,-2,-8,6,0]),
  rot(joints[16],'y',[0,-6,-19,14,0]),
  rot(joints[16],'x',[0,8,17,-9,0])
 ];
 // glTF must have no two animations channels for the same node/path.
 // Use one combined quaternion per bone for ponytailTip.
 tracks.pop();
 const clip={
  name:'AIG57_HEAD_TURN_PONYTAIL_FOLLOW_THROUGH',
  samplers:tracks.map(t=>({input:t.input,output:t.output,interpolation:'LINEAR'})),
  channels:tracks.map((t,k)=>({sampler:k,target:{node:t.node,path:'rotation'}}))
 };
 json.animations.push(clip);
 json.asset.generator='AIG FastModel 5.7 self-authored 3D school uniform and face technical prototype';
 json.extras={...json.extras,schema:AIG57_SCHEMA,
  originalNative56Schema:original.schema,sourceImageSHA256:original.sourceImageSHA256,
  originalNative56BodyMeshUnchanged:true,
  originalNative56AnimationClipsPreserved:4,
  additions:AIG57_PARTS,
  userReferenceSakuraCampusStyleOnly:true,
  actualOriginalImageFacialLandmarksObserved:false,
  individualLikenessVerified:false,
  fullBodyClothingSelfCollisionResolved:false,
  ponytailDynamicsAreKeyframedNotPhysics:true,
  plaidIsProceduralColorsNotRecoveredClothTexture:true,
  sideAndBackPhotoReconstructed:false,
  full3dFormalCharacterApproval:false,releaseAllowed:false};
 const data=new Uint8Array(align4(offset));data.set(bin,0);
 chunks.forEach(({start,data:bytes})=>data.set(bytes,start));
 const bytes=encodeGLB(json,data);
 if(bytes.byteLength>7*1024*1024)throw Error('AIG57_OUTPUT_BUDGET');
 return {schema:AIG57_SCHEMA,bytes,sourceImageSHA256:original.sourceImageSHA256,
  native56BaseByteLength:original.bytes.byteLength,skinnedMeshCount:json.meshes.length,
  bodyMeshPreserved:true,extraParts:[...AIG57_PARTS],totalAnimationClips:json.animations.length,
  actualFaceSurfaceMesh:true,actualUniformSurfaceMesh:true,actualPleatedSkirtMesh:true,
  ponytailActualWeightedStrands:true,originalPhotoFaceMatched:false,
  visualApprovalCompleted:false,nativeAndroidWindows60FpsVerified:false,
  releaseAllowed:false};
}
