/** FastModel 1.7 - offline FICTIONAL 3D character face-shape collision alert.
 * Not real-person facial identification. Only explicitly tagged face submeshes.
 * Scene-local roster only; never uploads biometrics.
 */
export function faceShapeSignature(file,sampleVec3Accessor,{maxSamples=1500}={}){
 if(!file?.g?.nodes||!file?.g?.meshes||typeof sampleVec3Accessor!=='function')throw Error('CHARFACE_NO_GLB');
 if(!Number.isInteger(maxSamples)||maxSamples<64||maxSamples>6000)throw RangeError('CHARFACE_SAMPLE_BUDGET');
 const nodes=file.g.nodes.filter(n=>n.mesh!==undefined&&n.extras?.aigAnatomyPart==='face');
 if(!nodes.length)throw Error('CHARFACE_NO_EXPLICIT_FACE_TAG');
 const parts=[];
 for(const node of nodes)for(const p of file.g.meshes[node.mesh]?.primitives||[]){
  const acc=file.g.accessors[p.attributes?.POSITION];
  if(acc?.type==='VEC3'&&acc.count>0)parts.push({id:p.attributes.POSITION,count:acc.count});
 }
 if(!parts.length)throw Error('CHARFACE_NO_POSITION_DATA');
 const total=parts.reduce((n,p)=>n+p.count,0),stride=Math.max(1,Math.ceil(total/maxSamples));
 const pts=[],lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of parts){
  const data=sampleVec3Accessor(file,p.id,stride);
  for(let i=0;i<data.length&&pts.length<maxSamples;i+=3){
   const x=data[i],y=data[i+1],z=data[i+2];
   if(![x,y,z].every(Number.isFinite))continue;
   pts.push([x,y,z]);for(let j=0;j<3;j++){lo[j]=Math.min(lo[j],pts.at(-1)[j]);hi[j]=Math.max(hi[j],pts.at(-1)[j]);}
  }
 }
 if(pts.length<16)throw Error('CHARFACE_INSUFFICIENT_POINTS');
 const range=hi.map((v,j)=>v-lo[j]);
 if(range.some(v=>!(v>1e-6)))throw Error('CHARFACE_DEGENERATE_BOUNDS');
 // Stable shape descriptors across uniform translation/scale; not semantic landmarks.
 // Normalized 3D occupancy histogram + aspect ratios avoid single "color/texture" clones.
 const bins=Array(27).fill(0),centroid=[0,0,0],spread=[0,0,0];
 for(const p of pts){
  const n=p.map((v,j)=>(v-lo[j])/range[j]);
  const cell=n.map(v=>Math.min(2,Math.floor(v*3)));
  bins[cell[0]*9+cell[1]*3+cell[2]]++;
  for(let j=0;j<3;j++)centroid[j]+=n[j];
 }
 for(let j=0;j<3;j++)centroid[j]/=pts.length;
 for(const p of pts)for(let j=0;j<3;j++)spread[j]+=((p[j]-lo[j])/range[j]-centroid[j])**2;
 for(let j=0;j<3;j++)spread[j]=Math.sqrt(spread[j]/pts.length);
 const maxRange=Math.max(...range);
 const descriptor=[...range.map(v=>v/maxRange),...centroid,...spread,...bins.map(n=>n/pts.length)];
 return {method:'TAGGED_FICTIONAL_3D_FACE_GEOMETRY',source:'GLB_FACE_NODE_POSITIONS',
  descriptor,pointCount:pts.length,faceNodeCount:nodes.length,biometricIdentityRecognized:false,
  poseInvariant:false,similarityProof:false};
}
export function compareFaceShapes(a,b){
 if(a?.method!=='TAGGED_FICTIONAL_3D_FACE_GEOMETRY'||b?.method!==a.method||!Array.isArray(a.descriptor)||a.descriptor.length!==b.descriptor?.length)throw Error('CHARFACE_SIGNATURE_MISMATCH');
 let error=0,weight=0;
 for(let i=0;i<a.descriptor.length;i++){
  const d=a.descriptor[i]-b.descriptor[i];
  if(!Number.isFinite(d))throw Error('CHARFACE_NONFINITE');
  const w=i<3?3:i<9?1:0.25;error+=w*d*d;weight+=w;
 }
 const distance=Math.sqrt(error/weight);
 // Heuristic alert only: false positives and false negatives are possible.
 return {distance,score:+Math.max(0,1-distance*2.8).toFixed(4),
  alert:distance<0.055,threshold:0.055,metric:'CUSTOM_SHAPE_HEURISTIC_NOT_BIOMETRIC'};
}
export class CharacterFaceRoster{
 constructor(){this.entries=new Map();}
 add({id,role,signature}){
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(id)||!['lead','classmate','supporting'].includes(role))throw Error('CHARFACE_INVALID_CHARACTER');
  if(signature?.method!=='TAGGED_FICTIONAL_3D_FACE_GEOMETRY')throw Error('CHARFACE_INVALID_SIGNATURE');
  const matches=[];
  for(const prev of this.entries.values()){
   if(prev.id===id)continue;
   matches.push({id:prev.id,role:prev.role,...compareFaceShapes(signature,prev.signature)});
  }
  // Do not overwrite an approved character on duplicate ID.
  if(this.entries.has(id))throw Error('CHARFACE_ID_ALREADY_EXISTS');
  const sorted=matches.sort((a,b)=>a.distance-b.distance);
  this.entries.set(id,{id,role,signature});
  return {id,role,compared:matches.length,closest:sorted[0]||null,warnings:sorted.filter(x=>x.alert),
    savedIn:'CURRENT_BROWSER_SESSION_ONLY',automaticallyChangesFace:false};
 }
 clear(){this.entries.clear();}
}
