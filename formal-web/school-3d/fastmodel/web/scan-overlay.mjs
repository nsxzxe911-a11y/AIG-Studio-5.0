/** FastModel 2.1 — source-derived scan overlay, no fictional skeleton or full wireframe.
 * Solid lines = glTF skin joint parent edges from current pose.
 * Faint dashed strokes = source triangle boundary / projected silhouette candidates.
 * This is NOT true depth-tested hidden-line removal or collision verification.
 */
export const SCAN_MODES=Object.freeze(['off','bones','bones-outline','head-neck','hair']);
export const SCAN_DENSITIES=Object.freeze(['eco','balanced','detail']);
export function scanBudget(density='balanced'){
 if(!SCAN_DENSITIES.includes(density))throw Error('SCAN_DENSITY_INVALID');
 return {eco:{triangles:1600,segments:180,pixels:1.3},balanced:{triangles:3600,segments:420,pixels:1.65},detail:{triangles:6500,segments:850,pixels:2}}[density];
}
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const jointPoint=mat=>[mat[12],mat[13],mat[14]];
const point=(m,p)=>[
 m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
 m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
 m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]
];
function parentsFor(nodes){
 const parents=new Int32Array(nodes.length).fill(-1);
 for(let i=0;i<nodes.length;i++)for(const c of nodes[i].children||[]){
  if(!Number.isInteger(c)||c<0||c>=nodes.length||c===i||parents[c]!==-1)throw Error('SCAN_INVALID_JOINT_GRAPH');
  parents[c]=i;
 }
 return parents;
}
function roleAllowed(role,mode){
 if(mode==='head-neck')return ['head','neck','scalp','face','head-neck'].includes(role);
 if(mode==='hair')return role==='hair';
 return true;
}
function matrixProduct(a,b){
 const out=new Float32Array(16);
 for(let c=0;c<4;c++)for(let r=0;r<4;r++){
  let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];
  out[c*4+r]=v;
 }return out;
}
/** A draw-ready snapshot created from actual GLB before frames start.
 * Large/unrigged primitives are omitted, not approximated using invented edges.
 */
export function buildScanOverlay(file,readAccessor,{density='balanced'}={}){
 if(!file?.g?.nodes||!file.g.skins?.length||typeof readAccessor!=='function')return {status:'BLOCKED_NO_SKIN',bones:[],surfaces:[],realSource:false};
 const g=file.g,b=scanBudget(density),parents=parentsFor(g.nodes),bones=[],surfaces=[],inverse=[];
 if(g.skins.length>32)return {status:'BLOCKED_SKIN_LIMIT',bones:[],surfaces:[],realSource:false};
 for(let si=0;si<g.skins.length;si++){
  const skin=g.skins[si],joints=skin.joints;
  if(!Array.isArray(joints)||joints.length<1||joints.length>256)throw Error('SCAN_JOINT_BUDGET');
  const inv=skin.inverseBindMatrices===undefined?null:readAccessor(file,skin.inverseBindMatrices);
  if(inv&&inv.length!==joints.length*16)throw Error('SCAN_INV_BIND_LENGTH');
  inverse.push(joints.map((_,j)=>inv?Float32Array.from(inv.subarray(j*16,j*16+16)):Float32Array.from(identity())));
  const lookup=new Set(joints);
  for(const child of joints){
   if(!Number.isInteger(child)||child<0||child>=g.nodes.length)throw Error('SCAN_JOINT_INDEX');
   const parent=parents[child];
   if(parent>=0&&lookup.has(parent))bones.push({parent,child,role:g.nodes[child].extras?.aigSkeletonRegion||g.nodes[child].extras?.aigAnatomyPart||null});
  }
 }
 let totalTriangles=0,omitted=0;
 for(const n of g.nodes){
  if(n.mesh===undefined)continue;
  const role=n.extras?.aigAnatomyPart||null,skin=n.skin;
  if(!Number.isInteger(skin)||!g.skins[skin]||n.matrix||n.translation||n.rotation||n.scale){omitted++;continue;}
  const mesh=g.meshes[n.mesh];
  if(!mesh?.primitives){omitted++;continue;}
  for(const prim of mesh.primitives){
   if((prim.mode??4)!==4||prim.indices===undefined||prim.attributes?.JOINTS_0===undefined||prim.attributes?.WEIGHTS_0===undefined||prim.attributes?.POSITION===undefined||prim.targets?.length){omitted++;continue;}
   const idx=readAccessor(file,prim.indices),triangles=idx.length/3;
   if(!Number.isInteger(triangles)||triangles<1||triangles>2500||totalTriangles+triangles>b.triangles){omitted++;continue;}
   const pos=readAccessor(file,prim.attributes.POSITION),j=readAccessor(file,prim.attributes.JOINTS_0),w=readAccessor(file,prim.attributes.WEIGHTS_0);
   const count=pos.length/3;
   if(!Number.isInteger(count)||count<3||count>10000||j.length!==count*4||w.length!==count*4){omitted++;continue;}
   const jointCount=g.skins[skin].joints.length;
   if([...idx].some(v=>!Number.isInteger(v)||v<0||v>=count)||[...pos,...w].some(v=>!Number.isFinite(v))||
      [...j].some(v=>!Number.isInteger(v)||v<0||v>=jointCount)){omitted++;continue;}
   let bad=false;
   for(let i=0;i<count;i++){let sum=0;for(let k=0;k<4;k++)sum+=w[i*4+k];if(Math.abs(sum-1)>0.03){bad=true;break;}}
   if(bad){omitted++;continue;}
   const edges=new Map();
   for(let t=0;t<idx.length;t+=3){
    const ids=[idx[t],idx[t+1],idx[t+2]];
    for(const [a,c] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){
     const key=Math.min(a,c)+':'+Math.max(a,c);
     if(!edges.has(key))edges.set(key,{a,c,faces:[]});
     const e=edges.get(key);if(e.faces.length<3)e.faces.push(t/3);
    }
   }
   const candidates=[...edges.values()].filter(e=>e.faces.length<=2);
   if(!candidates.length){omitted++;continue;}
   surfaces.push({skin,role,positions:pos,joints:j,weights:w,indices:idx,edges:candidates,triangleCount:triangles});
   totalTriangles+=triangles;
  }
 }
 return {status:bones.length||surfaces.length?'SOURCE_READY':'BLOCKED_NO_DRAWABLE_TOPOLOGY',bones,surfaces,inverse,
   triangles:totalTriangles,omitted,realSource:true,density};
}
export function scanProject(p,view,width,height){
 if(!view||!(width>0&&height>0))throw Error('SCAN_VIEWPORT_INVALID');
 const angle=view.angle||0,cs=Math.cos(angle),sn=Math.sin(angle),cen=view.center||[0,0,0],zoom=view.zoom*view.zoomFactor,aspect=view.width/view.height;
 const x=p[0]-cen[0],z=p[2]-cen[2];
 return [(1+(cs*x+sn*z)*zoom/aspect)*width/2,(1-(p[1]-cen[1])*zoom)*height/2];
}
function skinned(v,surface,matrices){
 const sk=matrices[surface.skin],o=[0,0,0],i=v*3,j=v*4,p=[surface.positions[i],surface.positions[i+1],surface.positions[i+2]];
 for(let k=0;k<4;k++){
  const weight=surface.weights[j+k];if(weight<=0)continue;
  const m=sk[surface.joints[j+k]],q=point(m,p);
  for(let axis=0;axis<3;axis++)o[axis]+=weight*q[axis];
 }
 return o;
}
/** Can be called by the same draw frame that evaluated the renderer skeleton.
 * Do not use model name, color or skin 1 as an anatomical guess.
 */
export function paintScanOverlay(canvas,view,topology,world,{mode='bones-outline',density='balanced'}={}){
 if(!SCAN_MODES.includes(mode))throw Error('SCAN_MODE_INVALID');
 const b=scanBudget(density);
 if(!canvas||!view||!topology||mode==='off'||!Array.isArray(world)){
  if(canvas?.getContext){const c=canvas.getContext('2d');c?.clearRect(0,0,canvas.width,canvas.height);}
  return {status:'SCAN_OFF',bonesDrawn:0,dashedSegments:0,trueDepthHiddenVerified:false};
 }
 const cssW=canvas.clientWidth,cssH=canvas.clientHeight;
 if(!(cssW>0&&cssH>0))return {status:'SCAN_NO_VIEWPORT',bonesDrawn:0,dashedSegments:0};
 const dpr=Math.min(2,Math.max(1,typeof devicePixelRatio==='number'?devicePixelRatio:1));
 const cw=Math.round(cssW*dpr),ch=Math.round(cssH*dpr);
 if(canvas.width!==cw)canvas.width=cw;if(canvas.height!==ch)canvas.height=ch;
 const ctx=canvas.getContext('2d');if(!ctx)return {status:'SCAN_NO_CANVAS',bonesDrawn:0,dashedSegments:0};
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);
 const project=p=>scanProject(p,view,cssW,cssH),g=topology.bones||[];
 let bonesDrawn=0,dashedSegments=0;
 ctx.save();ctx.lineWidth=b.pixels;ctx.strokeStyle='#8df4ff';ctx.setLineDash([]);ctx.beginPath();
 for(const bone of g){
  if(!roleAllowed(bone.role,mode))continue;
  const from=world[bone.parent],to=world[bone.child];if(!from||!to)continue;
  const p=project(jointPoint(from)),q=project(jointPoint(to));
  if(![...p,...q].every(Number.isFinite))continue;
  ctx.moveTo(...p);ctx.lineTo(...q);bonesDrawn++;
 }
 ctx.stroke();ctx.restore();
 if(mode!=='bones'){
  ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(171,201,222,.43)';ctx.setLineDash([5,6]);ctx.beginPath();
  const jointMatrices=(topology.inverse||[]).map((set,si)=>set.map((ib,j)=>matrixProduct(world[view.file.g.skins[si].joints[j]],ib)));
  for(const surface of topology.surfaces||[]){
   if(dashedSegments>=b.segments)break;
   if(!roleAllowed(surface.role,mode))continue;
   const cache=new Map(),projected=i=>{
    if(!cache.has(i))cache.set(i,project(skinned(i,surface,jointMatrices)));
    return cache.get(i);
   };
   const facing=new Map();
   function direction(face){
    if(facing.has(face))return facing.get(face);
    const at=face*3,idx=surface.indices;
    const a=projected(idx[at]),bb=projected(idx[at+1]),c=projected(idx[at+2]);
    const turn=cross([bb[0]-a[0],bb[1]-a[1]],[c[0]-a[0],c[1]-a[1]]);
    const v=Math.abs(turn)<1e-6?0:Math.sign(turn);
    facing.set(face,v);return v;
   }
   for(const edge of surface.edges){
    if(dashedSegments>=b.segments)break;
    // Open boundaries or projected silhouette of adjacent faces, no triangulated full-grid pass.
    const visibleEdge=edge.faces.length===1||(edge.faces.length===2&&direction(edge.faces[0])*direction(edge.faces[1])<0);
    if(!visibleEdge)continue;
    const p=projected(edge.a),q=projected(edge.c);
    if(![...p,...q].every(Number.isFinite))continue;
    ctx.moveTo(...p);ctx.lineTo(...q);dashedSegments++;
   }
  }
  ctx.stroke();ctx.restore();
 }
 return {status:topology.status,bonesDrawn,dashedSegments,
  sourceBones:true,sourceSurfaceEdges:true,meshTrianglesDrawn:0,
  trueDepthHiddenVerified:false,occlusionGuessOnly:true,
  dottedSegmentsCapped:b.segments,scanLayersSeparate:true};
}
