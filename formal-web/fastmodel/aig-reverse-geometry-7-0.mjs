/** FastModel 7.0: real observed 2D reverse drawing and constrained elastic simulation.
 * Not photo-to-3D, not true volume, not inferred anatomical skin or verified material parameters.
 * Pixel source remains caller-owned; no network, no third-party model. */
export const AIG70_SCHEMA="AIG_FASTMODEL_7_0_REVERSE_2D_NUMERICAL_SIM";
export function reversePhotoMask(image,options={}){
 const {width:w,height:h,data}=image||{};
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<16||h<16||w*h>1600000||!data||data.length!==w*h*4)throw Error("AIG70_IMAGE_DIMENSION_OR_RGBA_INVALID");
 const method=options.method||"alpha",threshold=options.threshold??35;
 if(!["alpha","background"].includes(method)||!Number.isFinite(threshold)||threshold<0||threshold>255)throw Error("AIG70_METHOD_OR_THRESHOLD_INVALID");
 const mask=new Uint8Array(w*h),pixel=(i)=>i*4;
 if(method==="alpha"){
  let transparent=0,opaque=0;
  for(let i=0;i<w*h;i++){const a=data[pixel(i)+3];if(a<16)transparent++;if(a>239)opaque++;mask[i]=a>=128?1:0;}
  if(transparent===0)throw Error("AIG70_ALPHA_MISSING_USE_BACKGROUND_SAMPLE");
 }else{
  const px=options.backgroundPoint||[0,0];
  if(!Array.isArray(px)||px.length!==2||!px.every(Number.isInteger)||px[0]<0||px[0]>=w||px[1]<0||px[1]>=h)throw Error("AIG70_BACKGROUND_POINT_INVALID");
  const k=pixel(px[1]*w+px[0]),r=data[k],g=data[k+1],b=data[k+2],t2=threshold*threshold*3,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let front=0,back=0;
  const push=(j)=>{
   if(j<0||j>=w*h||seen[j])return;
   const at=pixel(j),dr=data[at]-r,dg=data[at+1]-g,db=data[at+2]-b;
   if(dr*dr+dg*dg+db*db>t2)return;
   seen[j]=1;queue[back++]=j;
  };
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(front<back){const i=queue[front++],x=i%w,y=(i-x)/w;
   if(x>0)push(i-1);if(x<w-1)push(i+1);if(y>0)push(i-w);if(y<h-1)push(i+w);
  }
  if(back===0)throw Error("AIG70_NO_BOUNDARY_BACKGROUND");
  for(let i=0;i<w*h;i++)mask[i]=seen[i]?0:1;
 }
 let count=0,top=h,left=w,bottom=-1,right=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[y*w+x]){count++;top=Math.min(top,y);left=Math.min(left,x);bottom=Math.max(bottom,y);right=Math.max(right,x);}
 const ratio=count/(w*h);
 if(count<16||ratio<0.005||ratio>0.94)throw Error("AIG70_MASK_AMBIGUOUS_REQUIRE_REVIEW");
 return {schema:"AIG_FASTMODEL_7_0_OBSERVED_2D_MASK",width:w,height:h,mask,method,foregroundPixels:count,coverage:ratio,bounds:{x:left,y:top,width:right-left+1,height:bottom-top+1},confidence:"USER_REVIEW_REQUIRED",hiddenSurfacesInferred:false};
}

export function traceMaskContours(source,{minArea=12,maxEdges=250000}={}){
 const {mask,width:w,height:h}=source||{};
 if(!(mask instanceof Uint8Array)||!w||!h||mask.length!==w*h)throw Error("AIG70_VERIFIED_MASK_REQUIRED");
 const branches=new Map();let edgeCount=0;
 const add=(ax,ay,bx,by)=>{
  if(++edgeCount>maxEdges)throw Error("AIG70_COMPLEX_BOUNDARY_LIMIT");
  const key=ax+","+ay;let list=branches.get(key);if(!list){list=[];branches.set(key,list);}list.push([bx,by]);
 };
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(!mask[y*w+x])continue;
  if(y===0||!mask[(y-1)*w+x])add(x,y,x+1,y);
  if(x===w-1||!mask[y*w+x+1])add(x+1,y,x+1,y+1);
  if(y===h-1||!mask[(y+1)*w+x])add(x+1,y+1,x,y+1);
  if(x===0||!mask[y*w+x-1])add(x,y+1,x,y);
 }
 // Four-connected pixel silhouettes can meet diagonally at one vertex. Reject
 // that topological ambiguity rather than silently stitch two separate bodies.
 if([...branches.values()].some(exits=>exits.length!==1))throw Error('AIG70_AMBIGUOUS_DIAGONAL_TOUCH_REFINE_MASK');
 const rings=[],area=points=>points.reduce((acc,p,i)=>{const q=points[(i+1)%points.length];return acc+(p[0]*q[1]-q[0]*p[1]);},0)/2;
 while(branches.size){
  const first=branches.keys().next().value,[a,b]=first.split(",").map(Number),points=[[a,b]];
  let here=first,remaining=0;
  do{
   const exits=branches.get(here);if(!exits?.length)throw Error("AIG70_BOUNDARY_OPEN_OR_AMBIGUOUS");
   const next=exits.pop();if(!exits.length)branches.delete(here);
   here=next[0]+","+next[1];
   if(here!==first)points.push(next);
   if(++remaining>edgeCount)throw Error("AIG70_NONCLOSING_BOUNDARY");
  }while(here!==first);
  // Remove collinear boundary pixels without inventing unsampled geometry.
  const reduced=points.filter((p,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];return (p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0]);});
  const signedArea=area(reduced);
  if(reduced.length>=3&&Math.abs(signedArea)>=minArea)rings.push({points:reduced,signedArea,hole:signedArea<0});
 }
 rings.sort((a,b)=>Math.abs(b.signedArea)-Math.abs(a.signedArea));
 if(!rings.some(r=>!r.hole))throw Error("AIG70_NO_VALID_OUTER_CONTOUR");
 return {schema:"AIG_FASTMODEL_7_0_PIXEL_BOUNDARY_REVERSE",width:w,height:h,edgeCount,rings,observed:"2D_IMAGE_MASK_ONLY",editable:true,threeDVerified:false};
}

export function resampleClosedContour(points,n=96){
 if(!Array.isArray(points)||points.length<3||!Number.isInteger(n)||n<12||n>512)throw Error("AIG70_CONTOUR_SAMPLE_INVALID");
 const edges=[],sum=[];let total=0;
 for(let i=0;i<points.length;i++){
  const p=points[i],q=points[(i+1)%points.length],d=Math.hypot(q[0]-p[0],q[1]-p[1]);
  if(!Number.isFinite(d)||d<0)throw Error("AIG70_CONTOUR_NONFINITE");edges.push(d);total+=d;sum.push(total);
 }
 if(total<1)throw Error("AIG70_CONTOUR_DEGENERATE");
 const out=[];let k=0,from=0;
 for(let j=0;j<n;j++){
  const distance=total*j/n;
  while(k<edges.length-1&&sum[k]<distance){from=sum[k++];}
  const t=edges[k]===0?0:(distance-from)/edges[k],p=points[k],q=points[(k+1)%points.length];
  out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);
 }
 return out;
}

export function createElasticContour(points,{pin=true,gravity=120,damping=0.985,floor=null}={}){
 if(!Array.isArray(points)||points.length<12||points.length>512||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||!Number.isFinite(gravity)||Math.abs(gravity)>2000||!Number.isFinite(damping)||damping<0||damping>1||floor!==null&&!Number.isFinite(floor))throw Error("AIG70_SIM_INPUT_INVALID");
 const origin=points.map(p=>[...p]),live=points.map(p=>[...p]),old=points.map(p=>[...p]);const n=points.length;
 let top=0;for(let i=1;i<n;i++)if(points[i][1]<points[top][1])top=i;
 const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const links=[];for(let i=0;i<n;i++)for(const stride of [1,2,Math.max(3,Math.round(n/6))]){
  const j=(i+stride)%n;if(i===j)continue;
  links.push([i,j,dist(origin[i],origin[j]),stride===1?0.9:stride===2?0.55:0.1]);
 }
 return {schema:"AIG_FASTMODEL_7_0_NUMERICAL_ELASTIC_CONTOUR",origin,live,old,pins:pin?[top]:[],gravity,damping,floor,links,steps:0,simulation:"2D_POSITION_BASED_ELASTIC_OUTLINE_NOT_SKIN_MATERIAL"};
}

export function stepElasticContour(state,dt=1/60,{iterations=6,dragPoint=null}={}){
 if(!state||state.schema!=="AIG_FASTMODEL_7_0_NUMERICAL_ELASTIC_CONTOUR"||!Number.isFinite(dt)||dt<=0||dt>1/30||!Number.isInteger(iterations)||iterations<1||iterations>25)throw Error("AIG70_SIM_STEP_INVALID");
 const n=state.live.length,pin=new Set(state.pins);
 const fixed=new Set(pin);if(dragPoint&&Number.isInteger(dragPoint.index)&&dragPoint.index>=0&&dragPoint.index<n&&Array.isArray(dragPoint.xy)&&dragPoint.xy.length===2&&dragPoint.xy.every(Number.isFinite))fixed.add(dragPoint.index);
 for(let i=0;i<n;i++){
  if(fixed.has(i))continue;
  const p=state.live[i],old=state.old[i],x=p[0],y=p[1],vx=(x-old[0])*state.damping,vy=(y-old[1])*state.damping;
  old[0]=x;old[1]=y;p[0]=x+vx;p[1]=y+vy+state.gravity*dt*dt;
 }
 const applyPins=()=>{
  for(const i of state.pins){state.live[i][0]=state.origin[i][0];state.live[i][1]=state.origin[i][1];state.old[i][0]=state.origin[i][0];state.old[i][1]=state.origin[i][1];}
  if(dragPoint&&fixed.has(dragPoint.index)&&dragPoint.xy.every(Number.isFinite)){const i=dragPoint.index;state.live[i][0]=dragPoint.xy[0];state.live[i][1]=dragPoint.xy[1];state.old[i][0]=dragPoint.xy[0];state.old[i][1]=dragPoint.xy[1];}
 };
 for(let iter=0;iter<iterations;iter++){
  for(const [a,b,rest,k] of state.links){
   const p=state.live[a],q=state.live[b],dx=q[0]-p[0],dy=q[1]-p[1],d=Math.hypot(dx,dy);
   if(d<1e-9)continue;
   const wa=fixed.has(a)?0:1,wb=fixed.has(b)?0:1,den=wa+wb;if(!den)continue;
   const adjust=(d-rest)*k/(d*den);
   p[0]+=dx*adjust*wa;p[1]+=dy*adjust*wa;
   q[0]-=dx*adjust*wb;q[1]-=dy*adjust*wb;
  }
  if(state.floor!==null)for(let i=0;i<n;i++)if(!fixed.has(i)&&state.live[i][1]>state.floor){state.live[i][1]=state.floor;}
  applyPins();
 }
 if(!state.live.every(p=>p.every(Number.isFinite)))throw Error("AIG70_SIM_NONFINITE");
 state.steps++;
 return auditElasticContour(state);
}

export function auditElasticContour(state){
 if(!state||!Array.isArray(state.live)||!Array.isArray(state.origin))throw Error("AIG70_SIM_EVIDENCE_INVALID");
 let maxDisplacement=0,mean=0,springError=0,contactCount=0;
 for(let i=0;i<state.live.length;i++){
  const p=state.live[i],q=state.origin[i],d=Math.hypot(p[0]-q[0],p[1]-q[1]);
  maxDisplacement=Math.max(maxDisplacement,d);mean+=d;
  if(state.floor!==null&&Math.abs(p[1]-state.floor)<.001)contactCount++;
 }
 for(const [i,j,rest] of state.links){springError+=Math.abs(Math.hypot(state.live[i][0]-state.live[j][0],state.live[i][1]-state.live[j][1])-rest);}
 const r={schema:"AIG_FASTMODEL_7_0_PHYSICS_EVIDENCE",steps:state.steps,vertexCount:state.live.length,maxDisplacement,meanDisplacement:mean/state.live.length,meanConstraintError:springError/state.links.length,floorContacts:contactCount,claim:"NUMERICAL_2D_SILHOUETTE_ONLY",realThreeDSkinVerified:false};
 if(!Object.values(r).filter(x=>typeof x==="number").every(Number.isFinite))throw Error("AIG70_SIM_AUDIT_NONFINITE");
 return r;
}

export function exportObservedSvg(result,{sourceSHA256=null}={}){
 const rings=result?.rings;
 if(!Array.isArray(rings)||!rings.length||!Number.isInteger(result.width)||!Number.isInteger(result.height))throw Error("AIG70_SVG_REQUIRES_OBSERVED_CONTOUR");
 if(sourceSHA256!==null&&(!/^[a-f0-9]{64}$/i.test(sourceSHA256)))throw Error("AIG70_SVG_SHA_INVALID");
 const paths=rings.map(r=>"M "+r.points.map(p=>p.map(v=>Number(v.toFixed(3))).join(" ")).join(" L ")+" Z").join(" ");
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${result.width} ${result.height}" data-aig-observation="2d-only" data-source-sha256="${sourceSHA256||'unverified'}"><path d="${paths}" fill="none" stroke="#1bbde8" stroke-width="1" fill-rule="evenodd"/></svg>`;
}
