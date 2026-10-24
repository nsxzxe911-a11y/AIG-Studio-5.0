/**
 * Source-indexed triangle diagnostics. Each tuple stores original and posed
 * 3 XYZ corners: 18 Float32 values. Pure, deterministic, no GPU or inferred skin.
 */
export const QUAD_STRAIN_SCHEMA='AIG_REAL3D_QUAD_CPU_STRAIN_V1';
const d=(x,y,z,a,b,c)=>Math.hypot(x-a,y-b,z-c);
const normal=(v,o)=>{
 const ax=v[o+3]-v[o],ay=v[o+4]-v[o+1],az=v[o+5]-v[o+2];
 const bx=v[o+6]-v[o],by=v[o+7]-v[o+1],bz=v[o+8]-v[o+2];
 return [ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
};
const len=v=>Math.hypot(v[0],v[1],v[2]);
export function inspectAIGQuadStrainPacket(packed){
 if(!(packed instanceof Float32Array)||packed.length%18)throw Error('QUAD_INVALID_PACKED_TRIANGLES');
 const res={inspectedOriginalTriangles:packed.length/18,changedSourceTriangles:0,
  maxSourceEdgeStretchPercent:0,maxSourceEdgeCompressionPercent:0,
  invertedSourceTriangles:0,nearlyCollapsedSourceTriangles:0};
 for(let k=0;k<packed.length;k+=18){
  let changed=false;
  for(let j=0;j<9;j++)if(packed[k+j]!==packed[k+9+j]){changed=true;break;}
  if(!changed)continue;
  res.changedSourceTriangles++;
  for(const [a,b] of [[0,3],[3,6],[6,0]]){
   const old=d(packed[k+a],packed[k+a+1],packed[k+a+2],
    packed[k+b],packed[k+b+1],packed[k+b+2]);
   if(old<1e-9)continue;
   const fresh=d(packed[k+9+a],packed[k+10+a],packed[k+11+a],
    packed[k+9+b],packed[k+10+b],packed[k+11+b]);
   res.maxSourceEdgeStretchPercent=Math.max(res.maxSourceEdgeStretchPercent,
    (fresh/old-1)*100);
   res.maxSourceEdgeCompressionPercent=Math.max(res.maxSourceEdgeCompressionPercent,
    (1-fresh/old)*100);
  }
  const a=normal(packed,k),b=normal(packed,k+9),n=len(a),m=len(b);
  if(m<1e-11||m/Math.max(n,1e-20)<.01)res.nearlyCollapsedSourceTriangles++;
  if(a[0]*b[0]+a[1]*b[1]+a[2]*b[2]<-1e-12)res.invertedSourceTriangles++;
 }
 return res;
}
export function mergeAIGQuadStrainResults(partials){
 if(!Array.isArray(partials)||partials.some(x=>!x||
  !Number.isInteger(x.inspectedOriginalTriangles)))throw Error('QUAD_MERGE_INVALID');
 const result={inspectedOriginalTriangles:0,changedSourceTriangles:0,
  maxSourceEdgeStretchPercent:0,maxSourceEdgeCompressionPercent:0,
  invertedSourceTriangles:0,nearlyCollapsedSourceTriangles:0};
 for(const p of partials){
  for(const key of ['inspectedOriginalTriangles','changedSourceTriangles',
   'invertedSourceTriangles','nearlyCollapsedSourceTriangles'])
   result[key]+=p[key];
  for(const key of ['maxSourceEdgeStretchPercent','maxSourceEdgeCompressionPercent'])
   result[key]=Math.max(result[key],p[key]);
 }
 const round=x=>{const r=Math.round(x*1000)/1000;return Object.is(r,-0)?0:r;};
 result.maxSourceEdgeStretchPercent=round(result.maxSourceEdgeStretchPercent);
 result.maxSourceEdgeCompressionPercent=round(result.maxSourceEdgeCompressionPercent);
 return result;
}
