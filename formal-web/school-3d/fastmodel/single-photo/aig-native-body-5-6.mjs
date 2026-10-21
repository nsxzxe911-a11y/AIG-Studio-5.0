/** FastModel 5.6 — self-authored, zero-credit, photo-ratio-CONSTRAINED humanoid.
 * This is an ARTICULATED TECHNICAL PROTOTYPE from estimated anatomy, NOT
 * reconstruction of unseen body, likeness, clothing, or physical hair.
 * Generates true indexed SkinnedMesh glTF/GLB with actual joint animations.
 */
export const AIG56_SCHEMA='AIG_FASTMODEL_5_5_NATIVE_HUMANOID_SKIN_TECHNICAL_DRAFT';
export const AIG56_BONES=Object.freeze([
 'hips','spine','chest','neck','head',
 'leftUpperArm','leftForeArm','rightUpperArm','rightForeArm',
 'leftUpperLeg','leftLowerLeg','leftFoot',
 'rightUpperLeg','rightLowerLeg','rightFoot','ponytailRoot','ponytailTip'
]);
const PARENTS=[-1,0,1,2,3,2,5,2,7,0,9,10,0,12,13,4,15];
const align4=n=>(n+3)&~3;
const finite=Number.isFinite;
const qaxis=(axis,degrees)=>{const a=degrees*Math.PI/360;
 return axis==='x'?[Math.sin(a),0,0,Math.cos(a)]:
  axis==='y'?[0,Math.sin(a),0,Math.cos(a)]:
  [0,0,Math.sin(a),Math.cos(a)];};
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
const mix=(a,b,t)=>a.map((v,k)=>v*(1-t)+b[k]*t);
function checkScaffold(scaffold){
 if(scaffold?.meshType!=='CLOSED_ELLIPTICAL_SECTION_VOLUME'||
   !/^[a-f0-9]{64}$/i.test(scaffold.sourceSHA256||'')||
   scaffold.autoRiggingAvailable!==false||scaffold.releaseAllowed!==false||
   scaffold.unseenSurfacesInferred!==true)
  throw Error('AIG56_VERIFIED_NATIVE4_TECHNICAL_SCAFFOLD_REQUIRED');
 const p=scaffold.proportions;
 if(!p||!finite(p.widthHeightRatio)||p.widthHeightRatio<=0||
   !Array.isArray(p.ratiosByImageHeight)||p.ratiosByImageHeight.length!==11)
  throw Error('AIG56_SOURCE_RATIOS_MISSING');
 const ratio=Math.max(.34,Math.min(.72,p.widthHeightRatio));
 return {sourceImageSHA256:scaffold.sourceSHA256.toLowerCase(),
  modelWidthRatio:ratio,sidePhotoObserved:!!scaffold.sideSourceSHA256,
  sourceSilhouetteRows:p.ratiosByImageHeight.length,
  sourceUsedOnlyAsOverallSilhouetteConstraint:true};
}
function buildBones(scalar){
 const w=scalar;
 return [
  [0,.90,0],[0,1.20,0],[0,1.49,0],[0,1.68,0],[0,1.88,0],
  [-.33*w,1.49,0],[-.67*w,1.22,0],
  [.33*w,1.49,0],[.67*w,1.22,0],
  [-.18*w,.82,0],[-.19*w,.47,0],[-.19*w,.12,.11],
  [.18*w,.82,0],[.19*w,.47,0],[.19*w,.12,.11],
  [0,1.97,.29],[0,1.75,.51]
 ];
}
function collector(){
 const v=[],j=[],w=[],c=[],indices=[];
 function vertex(pt,weights,color){
  const i=v.length/3;v.push(...pt);
  const sorted=weights.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const total=sorted.reduce((sum,x)=>sum+x[1],0);
  while(sorted.length<4)sorted.push([0,0]);
  j.push(...sorted.map(x=>x[0]));
  w.push(...sorted.map(x=>total?x[1]/total:0));
  c.push(...color);return i;
 }
 const face=(a,b,d)=>{if(a===b||b===d||a===d)throw Error('AIG56_COLLAPSED_TOPOLOGY_INDEX');
  indices.push(a,b,d);};
 const connect=(a,b)=>{if(a.length!==b.length)throw Error('AIG56_RING_MISMATCH');
  for(let k=0;k<a.length;k++){const nxt=(k+1)%a.length;
   face(a[k],a[nxt],b[k]);face(a[nxt],b[nxt],b[k]);}};
 return {v,j,w,c,indices,vertex,face,connect};
}
function makeTube(out,centers,radii,roles,color,{radial=12,closeStart=false}={}){
 const rings=[];
 for(let k=0;k<centers.length;k++){
  const before=centers[Math.max(0,k-1)],after=centers[Math.min(centers.length-1,k+1)];
  const axis=norm(sub(after,before));
  const side=norm(cross(axis,Math.abs(axis[2])<.85?[0,0,1]:[0,1,0]));
  const up=norm(cross(axis,side));
  const next=[];
  for(let i=0;i<radial;i++){
   const theta=i*Math.PI*2/radial;
   const point=add(centers[k],add(side.map(a=>a*radii[k]*Math.cos(theta)),
    up.map(a=>a*radii[k]*Math.sin(theta))));
   next.push(out.vertex(point,roles[k],color));
  }
  if(rings.length)out.connect(rings[rings.length-1],next);
  rings.push(next);
 }
 if(closeStart){
  const p=out.vertex(centers[0],roles[0],color);
  for(let k=0;k<radial;k++)out.face(p,rings[0][(k+1)%radial],rings[0][k]);
 }
 const end=out.vertex(centers[centers.length-1],roles[roles.length-1],color);
 const last=rings[rings.length-1];
 for(let k=0;k<radial;k++)out.face(end,last[k],last[(k+1)%radial]);
 return rings;
}
function buildSurface(width){
 const body=collector(),hair=collector(),skin=[.46,.55,.64,1],cloth=[.16,.20,.25,1],
  sleeve=[.20,.24,.33,1],trouser=[.28,.32,.42,1],hairColor=[.26,.12,.09,1];
 const bw=width;
 const torso=[
  {y:.81,x:.0,rx:.225*bw,rz:.105,role:0},
  {y:.95,x:.0,rx:.235*bw,rz:.125,role:0},
  {y:1.16,x:.0,rx:.210*bw,rz:.115,role:1},
  {y:1.38,x:.0,rx:.263*bw,rz:.135,role:2},
  {y:1.49,x:.0,rx:.282*bw,rz:.132,role:2},
  {y:1.60,x:.0,rx:.162*bw,rz:.090,role:2},
  {y:1.65,x:.0,rx:.079*bw,rz:.068,role:3},
  {y:1.71,x:.0,rx:.086*bw,rz:.068,role:3},
  {y:1.77,x:.0,rx:.132*bw,rz:.100,role:4},
  {y:1.88,x:.0,rx:.177*bw,rz:.155,role:4},
  {y:2.015,x:.0,rx:.149*bw,rz:.139,role:4},
  {y:2.095,x:.0,rx:.055*bw,rz:.052,role:4}
 ];
 const rings=[];
 for(const [i,t] of torso.entries()){
  const row=[];
  for(let a=0;a<16;a++){
   const angle=a*Math.PI/8;
   const role=t.role,weights=(i===6||i===7)?[[3,.65],[2,.35]]:
    i===8?[[4,.65],[3,.35]]:i===5?[[2,.70],[3,.30]]:
    [[role,1]];
   row.push(body.vertex([t.x+t.rx*Math.cos(angle),t.y,t.rz*Math.sin(angle)],
    weights,i>=6?skin:cloth));
  }
  
  if(rings.length){
   const band=rings.length-1,prior=rings[band];
   for(let k=0;k<16;k++){
    const patchAngle=[0,8].some(center=>[center-2,center-1,center,center+1]
     .some(v=>(v+16)%16===k));
    if((band===0||band===1||band===3||band===4)&&patchAngle)continue;
    const next=(k+1)%16;
    body.face(prior[k],prior[next],row[k]);
    body.face(prior[next],row[next],row[k]);
   }
  }
  rings.push(row);
 }

 // Open 2x4 quad patches in torso, each giving an exact 12-edge loop.
 // Stitch the matching limb ring without overlapping closed torso surfaces.
 function patchBoundary(startRow,center){
  const mod=n=>(n+16)%16,start=center-2,loop=[];
  for(let k=0;k<=4;k++)loop.push(rings[startRow][mod(start+k)]);
  for(let rr=1;rr<=2;rr++)loop.push(rings[startRow+rr][mod(start+4)]);
  for(let k=3;k>=0;k--)loop.push(rings[startRow+2][mod(start+k)]);
  loop.push(rings[startRow+1][mod(start)]);
  if(loop.length!==12||new Set(loop).size!==12)throw Error('AIG56_PATCH_LOOP_INVALID');
  return loop;
 }
 function bridge(out,perimeter,limb){
  if(limb.length!==12||perimeter.length!==12)throw Error('AIG56_BRIDGE_RING_MISMATCH');
  for(let k=0;k<12;k++){
   const next=(k+1)%12;
   out.face(perimeter[k],perimeter[next],limb[k]);
   out.face(perimeter[next],limb[next],limb[k]);
  }
 }
 const bottom=body.vertex([0,torso[0].y,0],[[0,1]],cloth);
 const top=body.vertex([0,torso[torso.length-1].y,0],[[4,1]],skin);
 for(let k=0;k<16;k++){
  const next=(k+1)%16,last=rings[rings.length-1];
  body.face(bottom,rings[0][next],rings[0][k]);
  body.face(last[k],last[next],top);
 }
 for(const sign of [-1,1]){
  const isLeft=sign===-1,arm=isLeft?[5,6]:[7,8],leg=isLeft?[9,10,11]:[12,13,14];
  
 const cs=[
   [sign*.269*bw,1.495,0],[sign*.46*bw,1.37,0],
   [sign*.68*bw,1.20,0],[sign*.83*bw,1.04,0],
   [sign*.89*bw,.99,0],[sign*.955*bw,.958,.018],
   [sign*1.005*bw,.937,.028]
  ];
  const rr=[.076,.070,.061,.047,.041,.046,.025];
  const rig=[[[2,.60],[arm[0],.40]],[[arm[0],1]],
   [[arm[0],.55],[arm[1],.45]],[[arm[1],1]],
   [[arm[1],1]],[[arm[1],1]],[[arm[1],1]]];
  const ar=makeTube(body,cs,rr,rig,sleeve);
  bridge(body,patchBoundary(3,isLeft?8:0),ar[0]);
  const lc=[
   [sign*.16*bw,.82,0],[sign*.17*bw,.68,0],
   [sign*.19*bw,.47,0],[sign*.19*bw,.21,.015],
   [sign*.19*bw,.12,.115],[sign*.19*bw,.095,.24]
  ];
  const lr=[.09,.092,.080,.058,.047,.044];
  const lw=[[[0,.55],[leg[0],.45]],[[leg[0],1]],
   [[leg[0],.55],[leg[1],.45]],[[leg[1],1]],
   [[leg[1],.45],[leg[2],.55]],[[leg[2],1]]];
  const ll=makeTube(body,lc,lr,lw,trouser);
  bridge(body,patchBoundary(0,isLeft?8:0),ll[0]);
 }
 const pony=[
  [0,1.97,.29],[.018,1.88,.36],[.025,1.76,.47],[.030,1.63,.54]
 ];
 const ponyWeights=[[[15,1]],[[15,.85],[16,.15]],
  [[15,.3],[16,.7]],[[16,1]]];
 makeTube(hair,pony,[.058,.071,.060,.025],ponyWeights,hairColor,{closeStart:true});
 
 const manifold=verifyClosedIndexManifold(body.indices,body.v.length/3);
 return {body,hair,explicitShoulderAndHipIndexStitch:true,
  watertightMultiLimbJunctionsVerified:manifold.closedIndexedTwoManifold,
  bodyManifoldEdges:manifold.uniqueEdges,bodyTriangleCount:body.indices.length/3,
  meshSelfIntersectionFreeProven:false,actualSkinTextureKnown:false};
}

export function verifyClosedIndexManifold(indices,vertexCount){
 if(!Number.isInteger(vertexCount)||vertexCount<30||
  !Array.isArray(indices)||indices.length%3!==0||indices.length<120)
  throw Error('AIG56_INDEX_INPUT_INVALID');
 const edges=new Map();
 for(let i=0;i<indices.length;i+=3){
  const t=indices.slice(i,i+3);
  if(new Set(t).size!==3||t.some(v=>!Number.isInteger(v)||v<0||v>=vertexCount))
   throw Error('AIG56_DEGENERATE_FACE');
  for(let k=0;k<3;k++){
   const a=t[k],b=t[(k+1)%3],key=a<b?a+':'+b:b+':'+a;
   const sign=a<b?1:-1,x=edges.get(key)||{count:0,sum:0};
   x.count++;x.sum+=sign;edges.set(key,x);
  }
 }
 let open=0,winding=0;
 for(const x of edges.values()){if(x.count!==2)open++;else if(x.sum!==0)winding++;}
 if(open||winding)throw Error('AIG56_INDEX_NOT_CLOSED_OR_ORIENTED_'+open+'_'+winding);
 return {closedIndexedTwoManifold:true,uniqueEdges:edges.size,
  openBoundaryEdges:0,incorrectWindingEdges:0,
  actualSurfaceSelfIntersectionTested:false};
}

function packGLB(surface,points,source){
 let binaryLength=0;const chunks=[],views=[],accessors=[];
 function accessor(values,component,type,count,target=null,ext={}){
  const typed=ArrayBuffer.isView(values)?values:
   component===5125?new Uint32Array(values):component===5123?new Uint16Array(values):
   new Float32Array(values);
  const bytes=new Uint8Array(typed.buffer,typed.byteOffset,typed.byteLength);
  binaryLength=align4(binaryLength);
  const offset=binaryLength;
  chunks.push({offset,data:bytes});binaryLength+=bytes.byteLength;
  const view=views.length;views.push({buffer:0,byteOffset:offset,byteLength:bytes.byteLength,...(target?{target}:{})});
  const acc=accessors.length;accessors.push({bufferView:view,componentType:component,count,type,...ext});
  return acc;
 }
 const meshes=[],nodes=[],materials=[
  {name:'AIG56_REFERENCE_INFERRED_TECHNICAL_MATERIAL',
   pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:0,roughnessFactor:.9},doubleSided:true}
 ];
 for(const [i,item] of [surface.body,surface.hair].entries()){
  const pos=new Float32Array(item.v),normals=new Float32Array(item.v.length);
  const ix=new Uint32Array(item.indices);
  for(let n=0;n<ix.length;n+=3){
   const a=ix[n]*3,b=ix[n+1]*3,c=ix[n+2]*3;
   const p=[pos[a],pos[a+1],pos[a+2]],q=[pos[b],pos[b+1],pos[b+2]],
    t=[pos[c],pos[c+1],pos[c+2]];
   const nrm=cross(sub(q,p),sub(t,p));
   for(const k of [a,b,c])for(let m=0;m<3;m++)normals[k+m]+=nrm[m];
  }
  for(let v=0;v<normals.length;v+=3){
   const nrm=norm([normals[v],normals[v+1],normals[v+2]]);
   normals.set(nrm,v);
  }
  const attr={
   POSITION:accessor(pos,5126,'VEC3',pos.length/3,34962,{
    min:[0,1,2].map(k=>Math.min(...item.v.filter((_,ix)=>ix%3===k))),
    max:[0,1,2].map(k=>Math.max(...item.v.filter((_,ix)=>ix%3===k)))}),
   NORMAL:accessor(normals,5126,'VEC3',pos.length/3,34962),
   COLOR_0:accessor(new Float32Array(item.c),5126,'VEC4',pos.length/3,34962),
   JOINTS_0:accessor(new Uint16Array(item.j),5123,'VEC4',pos.length/3,34962),
   WEIGHTS_0:accessor(new Float32Array(item.w),5126,'VEC4',pos.length/3,34962)
  };
  const name=i?'GirlPonytail_AIG56_TECHNICAL':'AIG56_NATIVE_FULLBODY_TECHNICAL_SKIN';
  meshes.push({name,primitives:[{attributes:attr,
   indices:accessor(ix,5125,'SCALAR',ix.length,34963),material:0,mode:4}]});
  nodes.push({name,mesh:i,skin:0});
 }
 const bindMatrices=new Float32Array(points.length*16);
 for(let i=0;i<points.length;i++){
  const k=i*16;
  bindMatrices[k]=1;bindMatrices[k+5]=1;bindMatrices[k+10]=1;bindMatrices[k+15]=1;
  for(let axis=0;axis<3;axis++)bindMatrices[k+12+axis]=-points[i][axis];
 }
 const ibm=accessor(bindMatrices,5126,'MAT4',points.length);
 const base=nodes.length;
 for(let i=0;i<points.length;i++){
  const parent=PARENTS[i],offset=parent<0?points[i]:sub(points[i],points[parent]);
  nodes.push({name:AIG56_BONES[i],translation:offset,children:[]});
 }
 PARENTS.forEach((parent,index)=>{if(parent>=0)nodes[base+parent].children.push(base+index);});
 for(const n of nodes)if(!n.children?.length)delete n.children;
 const times=new Float32Array([0,.5,1,1.5,2]);
 const time=accessor(times,5126,'SCALAR',times.length);
 const rotation=(bone,axis,degrees)=>({
  target:{node:base+bone,path:'rotation'},
  output:accessor(new Float32Array(degrees.flatMap(d=>qaxis(axis,d))),
   5126,'VEC4',times.length)
 });
 const CLIPS=[
  {name:'AIG56_TURN_HEAD',tracks:[rotation(3,'y',[0,5,6,-5,0]),rotation(4,'y',[0,12,13,-12,0])]},
  {name:'AIG56_NOD_HEAD',tracks:[rotation(4,'x',[0,-13,-9,8,0])]},
  {name:'AIG56_WAVE_LEFT_ARM',tracks:[rotation(5,'z',[0,-15,-11,11,0]),rotation(6,'z',[0,16,9,-8,0])]},
  {name:'AIG56_PONYTAIL_SWING',tracks:[rotation(15,'y',[0,5,6,-5,0]),rotation(16,'x',[0,16,11,-13,0])]}
 ];
 const animations=CLIPS.map(clip=>({
  name:clip.name,
  samplers:clip.tracks.map(t=>({input:time,output:t.output,interpolation:'LINEAR'})),
  channels:clip.tracks.map((t,i)=>({sampler:i,target:t.target}))
 }));
 const gltf={
  asset:{version:'2.0',generator:'AIG FastModel 5.6 fully self-authored local technical skeletal prototype'},
  scene:0,scenes:[{nodes:[0,1,base]}],nodes,meshes,materials,
  skins:[{name:'AIG56_NATIVE_17_JOINTS',joints:points.map((_,i)=>base+i),
   skeleton:base,inverseBindMatrices:ibm}],
  animations,accessors,bufferViews:views,buffers:[{byteLength:align4(binaryLength)}],
  extras:{schema:AIG56_SCHEMA,sourceImageSHA256:source.sourceImageSHA256,
   sourceUsedOnlyAsOverallSilhouetteConstraint:true,observedAndInferredUnseparated:false,
   sidePhotoObserved:source.sidePhotoObserved,
   anatomicalTopologyJunctionsAreWatertight:true,
   closedIndexedTwoManifoldVerified:true,
   surfaceSelfIntersectionsExcluded:false,
   rigBones:AIG56_BONES.length,actualSkinnedMeshes:2,actualAnimationClips:4,
   source3DDepthMeasured:false,photorealFemaleFaceReconstructed:false,
   actualUserHeroineCharacterApproved:false,garmentTextureReconstructed:false,
   ponytailHairPhysicsValidated:false,androidWindows60FPSVerified:false,
   formalReleaseAllowed:false,releaseAllowed:false}
 };
 const bytes=new Uint8Array(align4(binaryLength));
 chunks.forEach(c=>bytes.set(c.data,c.offset));
 const json=new TextEncoder().encode(JSON.stringify(gltf)),jsonLen=align4(json.length);
 const file=new Uint8Array(12+8+jsonLen+8+bytes.length);
 const h=new DataView(file.buffer);
 h.setUint32(0,0x46546c67,true);h.setUint32(4,2,true);h.setUint32(8,file.length,true);
 h.setUint32(12,jsonLen,true);h.setUint32(16,0x4e4f534a,true);
 file.set(json,20);file.fill(32,20+json.length,20+jsonLen);
 const bin=20+jsonLen;h.setUint32(bin,bytes.length,true);
 h.setUint32(bin+4,0x004e4942,true);file.set(bytes,bin+8);
 return {bytes:file,clips:CLIPS.map(x=>x.name),schema:AIG56_SCHEMA};
}
export function generateAIG56NativeHumanoid(scaffold){
 const source=checkScaffold(scaffold);
 const width=source.modelWidthRatio/.48;
 const points=buildBones(width),surface=buildSurface(width),exported=packGLB(surface,points,source);
 if(exported.bytes.byteLength>4*1024*1024)throw Error('AIG56_OUTPUT_SIZE_BUDGET');
 return {schema:AIG56_SCHEMA,sourceImageSHA256:source.sourceImageSHA256,
  bytes:exported.bytes,skinnedMeshCount:2,boneCount:points.length,
  bodyManifoldEdges:surface.bodyManifoldEdges,bodyTriangleCount:surface.bodyTriangleCount,
  animationClipNames:exported.clips,
  anthropomorphicBodyPartsGenerated:['torso','head','neck','leftArm','rightArm',
   'leftLeg','rightLeg','leftFoot','rightFoot','ponytail'],
  ratioConstraintFromRealSource:true,anatomicalPartDimensionsEstimated:true,
  originalHeroineFaceTexturePresent:false,fullyWatertightJunctionsVerified:true,
  indexedSurfaceClosureVerified:true,surfaceSelfIntersectionsExcluded:false,
  photoReconstructedTrue3d:false,nativeAndroidWindows60FpsVerified:false,
  formalHeroineApproved:false,releaseAllowed:false};
}
