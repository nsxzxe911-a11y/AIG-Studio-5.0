/** FastModel 1.7 - offline FICTIONAL 3D character face-shape collision alert.
 * Not real-person facial identification. Only explicitly tagged face submeshes.
 * Scene-local roster only; never uploads biometrics.
 */
export function faceShapeSignature(file,sampleVec3Accessor,{maxSamples=1500,characterId=null}={}){
 if(characterId!==null&&(typeof characterId!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(characterId)))throw Error('CHARFACE_CHARACTER_TAG_INVALID');
 if(!file?.g?.nodes||!file?.g?.meshes||typeof sampleVec3Accessor!=='function')throw Error('CHARFACE_NO_GLB');
 if(!Number.isInteger(maxSamples)||maxSamples<64||maxSamples>6000)throw RangeError('CHARFACE_SAMPLE_BUDGET');
 const allFaces=file.g.nodes.filter(n=>n.mesh!==undefined&&n.extras?.aigAnatomyPart==='face');
 const owners=new Set(allFaces.map(n=>n.extras?.aigCharacterId).filter(x=>x!==undefined));
 if(owners.size>1&&!characterId)throw Error('CHARFACE_MULTIPLE_CHARACTERS_REQUIRE_ID');
 if(owners.size>0&&allFaces.some(n=>n.extras?.aigCharacterId===undefined))throw Error('CHARFACE_OWNER_UNCLEAR');
 if(owners.size===1&&characterId!==null&&!owners.has(characterId))throw Error('CHARFACE_CHARACTER_TAG_MISMATCH');
 const nodes=characterId===null?allFaces:allFaces.filter(n=>owners.size===0||n.extras?.aigCharacterId===characterId);
 if(characterId!==null&&owners.size>0&&!nodes.some(n=>n.extras?.aigCharacterId===characterId))throw Error('CHARFACE_CHARACTER_NOT_FOUND');
 if(!nodes.length)throw Error('CHARFACE_NO_EXPLICIT_FACE_TAG');
 if(nodes.some(n=>n.extras?.aigCharacterId!==undefined&&typeof n.extras.aigCharacterId!=='string'))throw Error('CHARFACE_OWNER_UNCLEAR');
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
  poseInvariant:false,similarityProof:false,characterTag:owners.size===1?[...owners][0]:null,explicitFaceNodesRequired:true};
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
  alert:distance<0.055,threshold:0.055,level:distance<1e-6?'EXACT_DESCRIPTOR_DUPLICATE':distance<0.055?'SIMILAR_REVIEW':'NO_FLAG',metric:'CUSTOM_SHAPE_HEURISTIC_NOT_BIOMETRIC'};
}
export class CharacterFaceRoster{
 constructor({maxCharacters=120}={}){if(!Number.isInteger(maxCharacters)||maxCharacters<2||maxCharacters>200)throw Error('CHARFACE_ROSTER_LIMIT');this.entries=new Map();this.maxCharacters=maxCharacters;}
 add({id,role,signature,replace=false}){
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,48}$/.test(id)||!['lead','classmate','supporting'].includes(role))throw Error('CHARFACE_INVALID_CHARACTER');
  if(signature?.method!=='TAGGED_FICTIONAL_3D_FACE_GEOMETRY'||!Array.isArray(signature.descriptor)||signature.descriptor.some(n=>!Number.isFinite(n)))throw Error('CHARFACE_INVALID_SIGNATURE');
  if(replace!==true&&this.entries.has(id))throw Error('CHARFACE_ID_ALREADY_EXISTS');
  if(replace&&!this.entries.has(id))throw Error('CHARFACE_REPLACE_NOT_FOUND');
  if(replace&&this.entries.get(id).role!==role)throw Error('CHARFACE_ROLE_CHANGE_BLOCKED');
  if(!replace&&this.entries.size>=this.maxCharacters)throw Error('CHARFACE_ROSTER_FULL');
  if(role==='lead'&&[...this.entries.values()].some(prev=>prev.role==='lead'&&prev.id!==id))throw Error('CHARFACE_LEAD_ALREADY_LOCKED');
  if(signature.characterTag&&signature.characterTag!==id)throw Error('CHARFACE_CHARACTER_TAG_MISMATCH');
  const matches=[];
  for(const prev of this.entries.values()){
   if(prev.id===id)continue;
   matches.push({id:prev.id,role:prev.role,...compareFaceShapes(signature,prev.signature)});
  }
  const sorted=matches.sort((a,b)=>a.distance-b.distance);
  this.entries.set(id,{id,role,signature});
  return {id,role,compared:matches.length,closest:sorted[0]||null,warnings:sorted.filter(x=>x.alert),
    leadId:[...this.entries.values()].find(e=>e.role==='lead')?.id??null,
    revision:replace?'RESCANNED_EXISTING_CHARACTER':'NEW_CHARACTER',
    savedIn:'CURRENT_BROWSER_SESSION_ONLY',automaticallyChangesFace:false,realPersonRecognized:false};
 }
 clear(){this.entries.clear();}
}
