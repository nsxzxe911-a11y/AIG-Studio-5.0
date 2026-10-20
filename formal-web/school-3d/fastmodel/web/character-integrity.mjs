/** FastModel 1.8 — on-demand GLB geometry inspection. Not automated mesh repair.
 * Character anatomy MUST be explicit; never infer head/neck/hair from skin index.
 * Geometric boundary distance is a diagnostic, NOT proof of welded normals/skin/UV.
 */
export const INSPECTION_VIEWS=Object.freeze(['front','side','back']);
const fail=(reason)=>({status:'UNVERIFIED',reason,measured:false,actualSeamFixed:false,actualOcclusionApproved:false});
function pointsForRole(file,readAccessor,role,{maxVertices=15000}={}){
 const g=file?.g;if(!g?.nodes||!g?.meshes||!g?.accessors)throw Error('NO_GLB_GEOMETRY');
 const nodes=g.nodes.filter(n=>n.mesh!==undefined&&n.extras?.aigAnatomyPart===role);
 if(!nodes.length)return {nodes:0,points:[],boundaries:[],skippedReason:'NO_'+role.toUpperCase()+'_TAG'};
 const points=[],boundaries=[];
 for(const node of nodes){
  // No fake world-space seam from transformed and skinned meshes.
  if(node.matrix||node.translation||node.rotation||node.scale)return {nodes:nodes.length,points:[],boundaries:[],skippedReason:'NODE_TRANSFORM_UNSUPPORTED'};
  const mesh=g.meshes[node.mesh];if(!mesh?.primitives)throw Error('MISSING_ROLE_MESH');
  for(const primitive of mesh.primitives){
   if((primitive.mode??4)!==4)return {nodes:nodes.length,points:[],boundaries:[],skippedReason:'NON_TRIANGLE_PRIMITIVE'};
   if(primitive.attributes?.POSITION===undefined||primitive.indices===undefined)throw Error('ROLE_ACCESSOR_MISSING');
   const pos=readAccessor(file,primitive.attributes.POSITION),indices=readAccessor(file,primitive.indices);
   if(!pos?.length||pos.length%3||indices.length%3)throw Error('ROLE_MESH_INVALID');
   const verts=pos.length/3;
   if(points.length+verts>maxVertices)return {nodes:nodes.length,points:[],boundaries:[],skippedReason:'SCAN_BUDGET_EXCEEDED'};
   for(let i=0;i<verts;i++){
    const p=[pos[i*3],pos[i*3+1],pos[i*3+2]];
    if(p.some(n=>!Number.isFinite(n)))throw Error('NONFINITE_GEOMETRY');
    points.push(p);
   }
   const counts=new Map();
   for(let i=0;i<indices.length;i+=3){
    const tri=[indices[i],indices[i+1],indices[i+2]];
    if(tri.some(n=>!Number.isInteger(n)||n<0||n>=verts))throw Error('BAD_TRIANGLE_INDEX');
    for(const [a,b] of [[tri[0],tri[1]],[tri[1],tri[2]],[tri[2],tri[0]]]){
     const key=a<b?a+':'+b:b+':'+a;
     const v=counts.get(key)||{n:0,a,b};
     v.n++;counts.set(key,v);
    }
   }
   for(const edge of counts.values())if(edge.n===1){
    if(boundaries.length>=maxVertices*3)return {nodes:nodes.length,points:[],boundaries:[],skippedReason:'EDGE_BUDGET_EXCEEDED'};
    const p1=[pos[edge.a*3],pos[edge.a*3+1],pos[edge.a*3+2]],p2=[pos[edge.b*3],pos[edge.b*3+1],pos[edge.b*3+2]];
    boundaries.push(p1,p2);
   }
 }
 }
 return {nodes:nodes.length,points,boundaries,skippedReason:null};
}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
function bounds(points){
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(const p of points)for(let i=0;i<3;i++){lo[i]=Math.min(lo[i],p[i]);hi[i]=Math.max(hi[i],p[i]);}
 return {lo,hi};
}
export function inspectHeadNeckGeometry(file,readAccessor,{maxVertices=15000,maxComparisons=1000000}={}){
 if(typeof readAccessor!=='function')throw Error('MISSING_ACCESSOR_READER');
 if(!Number.isInteger(maxVertices)||maxVertices<8||maxVertices>30000)throw Error('BAD_VERTEX_BUDGET');
 if(!Number.isInteger(maxComparisons)||maxComparisons<1||maxComparisons>2000000)throw Error('BAD_DISTANCE_BUDGET');
 const head=pointsForRole(file,readAccessor,'head',{maxVertices});
 const neck=pointsForRole(file,readAccessor,'neck',{maxVertices});
 if(head.skippedReason||neck.skippedReason)return {...fail(head.skippedReason||neck.skippedReason),headNodes:head.nodes,neckNodes:neck.nodes};
 if(!head.boundaries.length||!neck.boundaries.length)return {...fail('MISSING_OPEN_BOUNDARIES_OR_CLOSED_SEPARATE_MESHES'),headBoundaryVertices:head.boundaries.length,neckBoundaryVertices:neck.boundaries.length};
 const checked=Math.min(maxComparisons,head.boundaries.length*neck.boundaries.length);
 let nearest=Infinity,comparisons=0;
 const step=Math.max(1,Math.ceil(head.boundaries.length*neck.boundaries.length/maxComparisons));
 for(let i=0;i<head.boundaries.length;i++)for(let j=0;j<neck.boundaries.length;j++){
  const linear=i*neck.boundaries.length+j;
  if(linear%step!==0)continue;
  const d=distance(head.boundaries[i],neck.boundaries[j]);
  nearest=Math.min(nearest,d);comparisons++;
 }
 return {status:'MEASURED_NOT_WELD_VERIFIED',reason:'CLOSEST_OPEN_BOUNDARY_DISTANCE_IN_RAW_LOCAL_COORDINATES',
  measured:true,headBoundaryVertices:head.boundaries.length,neckBoundaryVertices:neck.boundaries.length,
  sampledComparisons:comparisons,approxClosestBoundaryDistance:nearest,units:'GLB_LOCAL_UNITS',
  sampled:step>1,actualSeamFixed:false,watertightVerified:false,skinContinuityVerified:false,
  uvNormalContinuityVerified:false,animatedPoseVerified:false};
}
export function inspectHairNeckOcclusion(file,readAccessor,{maxVertices=15000}={}){
 if(typeof readAccessor!=='function')throw Error('MISSING_ACCESSOR_READER');
 const neck=pointsForRole(file,readAccessor,'neck',{maxVertices});
 const hair=pointsForRole(file,readAccessor,'hair',{maxVertices});
 if(neck.skippedReason||hair.skippedReason)return {...fail(neck.skippedReason||hair.skippedReason),neckNodes:neck.nodes,hairNodes:hair.nodes};
 const n=bounds(neck.points),h=bounds(hair.points);
 // Bounding-box overlap of orthographic front/side projections, not actual renderer visibility or collision.
 function overlap(a,b,axis){
  const overlap=Math.max(0,Math.min(a.hi[axis],b.hi[axis])-Math.max(a.lo[axis],b.lo[axis]));
  const breadth=Math.max(1e-9,a.hi[axis]-a.lo[axis]);
  return Math.min(1,overlap/breadth);
 }
 const frontal=overlap(n,h,0)*overlap(n,h,1);
 const lateral=overlap(n,h,2)*overlap(n,h,1);
 return {status:'PROJECTION_RISK_ONLY',measured:true,frontProxy:+frontal.toFixed(4),
  sideProxy:+lateral.toFixed(4),potentialOcclusion:frontal>0||lateral>0,
  actualVisibilityVerified:false,actualOcclusionApproved:false,hairCollisionVerified:false,
  animatedPoseVerified:false,requiresViews:['front','side','back','moving-animation'],
  note:'Local unskinned AABB overlap is only a conservative potential occlusion proxy; it cannot establish screen-space depth or hair/neck intersection.'};
}
export const REQUIRED_HARDWARE_PLATFORMS=Object.freeze(['Windows','Android']);
export function assessAnimationDeviceEvidence(evidence=[]){
 const missing=[],accepted=[];
 for(const platform of REQUIRED_HARDWARE_PLATFORMS){
  const p=evidence.find(e=>e.platform===platform);
  // Native/hardware verification requires outside-CI provenance; never use synthetic numbers or the 60FPS UI target.
  if(!p||p.source!=='REAL_DEVICE_CAPTURE'||p.nativeProcessVerified!==true||
    !Number.isFinite(p.measuredFps)||!Number.isFinite(p.p95FrameMs)||
    !Number.isFinite(p.thermalC)||!Number.isFinite(p.actualWidth)||!Number.isFinite(p.actualHeight)||
    p.sampleCount<120||p.measuredFps<=0||p.p95FrameMs<=0||
    p.actualWidth<1280||p.actualHeight<720){
   missing.push(platform);continue;
  }
  accepted.push({platform,measuredFps:p.measuredFps,p95FrameMs:p.p95FrameMs,
    thermalC:p.thermalC,actual:[p.actualWidth,p.actualHeight],pass1080p60:
      p.measuredFps>=60&&p.p95FrameMs<=1000/60&&p.actualWidth>=1920&&p.actualHeight>=1080});
 }
 return {status:missing.length?'BLOCKED_MISSING_REAL_DEVICE_EVIDENCE':
   accepted.every(x=>x.pass1080p60)?'EVIDENCE_SUFFICIENT_REVIEW_REQUIRED':'BELOW_TARGET',
   missing,accepted,ciPassDoesNotCount:true};
}
