/** FastModel 2.3 bounded CPU depth sampling.
 * Matches renderer orthographic x/z rotation and depth z direction.
 * A *source-geometry sampled* occlusion hint, NOT exact GPU Z-buffer,
 * transparency, full triangle collision or watertight mesh evidence.
 */
export const SCAN_DEPTH_MODES=Object.freeze(['off','sampled']);
export function scanDepthBudget(density='balanced'){
 const modes={
  eco:{columns:44,rows:28,maxTriangles:360,maxCellTests:13000,samplesPerSegment:1},
  balanced:{columns:72,rows:44,maxTriangles:1000,maxCellTests:35000,samplesPerSegment:2},
  detail:{columns:96,rows:56,maxTriangles:2100,maxCellTests:68000,samplesPerSegment:3}
 };
 if(!Object.prototype.hasOwnProperty.call(modes,density))throw Error('SCAN_DEPTH_DENSITY_INVALID');
 return {...modes[density]};
}
export function scanDepthCoordinate(p,view){
 const a=view?.angle||0,si=Math.sin(a),co=Math.cos(a),cen=view?.center||[0,0,0];
 const x=p[0]-cen[0],z=p[2]-cen[2];
 // Shader gl_Position.z = clamp(rotated_z*.1, -.95, .95)
 return Math.max(-.95,Math.min(.95,(-si*x+co*z)*.1));
}
function projectedBounds(tri,w,h){
 return [
  Math.max(0,Math.floor(Math.min(...tri.map(v=>v.x))*w)),
  Math.min(w-1,Math.ceil(Math.max(...tri.map(v=>v.x))*w)),
  Math.max(0,Math.floor(Math.min(...tri.map(v=>v.y))*h)),
  Math.min(h-1,Math.ceil(Math.max(...tri.map(v=>v.y))*h))
 ];
}
/** Return a small per-frame depth grid sampled from actual posed source triangle vertices.
 * Input fetch(surface,vertexId)=>{x:number,y:number,z:number}; x/y normalized 0..1.
 * Two-sided as current WebGL renderer uses gl.disable(CULL_FACE).
 */
export function sampleSourceDepth(surfaces,fetch,{density='balanced'}={}){
 if(!Array.isArray(surfaces)||typeof fetch!=='function')throw Error('SCAN_DEPTH_INPUT');
 const b=scanDepthBudget(density),zbuf=new Float32Array(b.columns*b.rows);zbuf.fill(Infinity);
 let triangles=0,cellTests=0,skipped=0,incomplete=false;
 outer:for(const surface of surfaces){
  const indices=surface.indices||[];
  for(let t=0;t+2<indices.length;t+=3){
   if(triangles>=b.maxTriangles||cellTests>=b.maxCellTests){incomplete=true;break outer;}
   const v0=fetch(surface,indices[t]),v1=fetch(surface,indices[t+1]),v2=fetch(surface,indices[t+2]);
   const tri=[v0,v1,v2];
   if(tri.some(v=>!v||![v.x,v.y,v.z].every(Number.isFinite))){skipped++;continue;}
   const [x0,x1,y0,y1]=projectedBounds(tri,b.columns,b.rows);
   const area=(v1.x-v0.x)*(v2.y-v0.y)-(v1.y-v0.y)*(v2.x-v0.x);
   if(Math.abs(area)<1e-12||x0>x1||y0>y1){skipped++;continue;}
   const inv=1/area;
   triangles++;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    if(cellTests>=b.maxCellTests){incomplete=true;break outer;}
    cellTests++;
    const px=(x+.5)/b.columns,py=(y+.5)/b.rows;
    const b1=((px-v0.x)*(v2.y-v0.y)-(py-v0.y)*(v2.x-v0.x))*inv;
    const b2=((v1.x-v0.x)*(py-v0.y)-(v1.y-v0.y)*(px-v0.x))*inv;
    const b0=1-b1-b2;
    if(b0<-.0001||b1<-.0001||b2<-.0001)continue;
    const d=b0*v0.z+b1*v1.z+b2*v2.z,i=y*b.columns+x;
    if(d<zbuf[i])zbuf[i]=d;
   }
  }
 }
 return {status:triangles?'SAMPLED_SOURCE_TRIANGLE_DEPTH':'NO_RASTERIZABLE_SOURCE_TRIANGLE',
  grid:zbuf,width:b.columns,height:b.rows,triangles,cellTests,skipped,incomplete,
  actualGpuDepthTest:false,fullyRenderedSceneDepth:false,
  sourceSamplingOnly:true};
}
export function classifySourceOcclusion(depth,a,b,{epsilon=.006,density='balanced'}={}){
 if(!depth||!a||!b||!Number.isFinite(epsilon)||epsilon<0)throw Error('SCAN_DEPTH_CLASSIFY_INPUT');
 const samples=scanDepthBudget(density).samplesPerSegment;
 if(depth.status!=='SAMPLED_SOURCE_TRIANGLE_DEPTH')return 'unknown';
 let hidden=0,compared=0;
 for(let i=0;i<samples;i++){
  const f=(i+1)/(samples+1),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,d=a.z+(b.z-a.z)*f;
  if(x<0||x>=1||y<0||y>=1)continue;
  const ix=Math.floor(x*depth.width),iy=Math.floor(y*depth.height);
  const closest=depth.grid[iy*depth.width+ix];
  if(!Number.isFinite(closest))continue;
  compared++;
  if(d>closest+epsilon)hidden++;
 }
 if(!compared)return 'unknown';
 return hidden*2>=compared?'behind-sampled-surface':'not-behind-sampled-surface';
}
