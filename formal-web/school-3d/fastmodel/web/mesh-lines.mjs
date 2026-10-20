/** AIG self-developed bounded topology line extractor.
 * No canvas redraw and no re-triangulation; use existing skinned mesh vertices.
 * Boundary = open topology edges, not a camera-accurate visual silhouette.
 */
export const WIRE_MODES=Object.freeze(['off','boundary','edit','full']);
export const WIRE_DENSITIES=Object.freeze(['eco','balanced','detail']);
const CAPS=Object.freeze({eco:{boundary:900,edit:600,full:1600},balanced:{boundary:2200,edit:1200,full:4000},detail:{boundary:4400,edit:2400,full:8000}});
export function wireCap(mode,density='balanced'){
 if(!WIRE_MODES.includes(mode)||!WIRE_DENSITIES.includes(density))throw Error('Invalid wireframe option');
 return mode==='off'?0:CAPS[density][mode];
}
/** Work is bounded by both the requested result and triangle-scan limit. */
export function buildEdgeIndex(indices,{mode='boundary',maxLines=1200,editVertices=256,maxTriangles=26000}={}){
 if(!['boundary','edit','full'].includes(mode))throw Error('Unsupported topology mode');
 if(!(indices instanceof Uint32Array)||indices.length%3)throw Error('Triangle indices required');
 if(!Number.isInteger(maxLines)||maxLines<0||maxLines>15000)throw Error('Unsafe line budget');
 if(!Number.isInteger(editVertices)||editVertices<1)throw Error('Invalid selected vertices');
 if(!Number.isInteger(maxTriangles)||maxTriangles<1||maxTriangles>100000)throw Error('Invalid topology scan limit');
 if(!maxLines)return {indices:new Uint32Array(0),segments:0,sampled:false};
 const triangles=indices.length/3,step=Math.max(1,Math.ceil(triangles/maxTriangles));
 // Local/full builds stop once sufficient unique edges have been selected;
 // "boundary" must count all sampled edge occurrences for classification.
 const map=new Map();let visited=0;
 const append=(a,b)=>{
   if(a===b)return;
   const x=Math.min(a,b),y=Math.max(a,b),key=x<2097152?x*4294967296+y:`${x}:${y}`;
   const prev=map.get(key);
   if(prev)prev.count++;else map.set(key,{a:x,b:y,count:1});
 };
 for(let t=0;t<triangles;t+=step){const off=t*3,a=indices[off],b=indices[off+1],c=indices[off+2];
   if(mode==='edit'&&a>=editVertices&&b>=editVertices&&c>=editVertices)continue;
   visited++;append(a,b);append(b,c);append(c,a);
   if(mode!=='boundary'&&map.size>=maxLines*3)break;
 }
 const list=[];for(const e of map.values()){
   if(mode==='boundary'&&e.count!==1)continue;
   list.push(e.a,e.b);if(list.length>=maxLines*2)break;
 }
 return {indices:Uint32Array.from(list),segments:list.length/2,sampled:step>1,visitedTriangles:visited,totalTriangles:triangles};
}
export function adaptiveWireStep(state,p95){
 const x={suppressed:!!state?.suppressed,hot:state?.hot||0,cool:state?.cool||0};
 if(!Number.isFinite(p95)||p95<=0)return x;
 if(p95>27){x.hot++;x.cool=0;if(x.hot>=2)x.suppressed=true;}
 else if(p95<19){x.cool++;x.hot=0;if(x.cool>=4)x.suppressed=false;}
 else {x.hot=0;x.cool=0;}
 return x;
}