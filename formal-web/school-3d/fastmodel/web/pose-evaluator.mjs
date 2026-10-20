/** FastModel 1.6 - allocation-bounded glTF joint pose evaluator.
 * Matches existing LINEAR quaternion tracks. No changes to source model.
 * Does not invent IK or retargeting. Exact output must be tested against fixtures.
 */
export function createPoseEvaluator(nodes,tracks=[]) {
 if(!Array.isArray(nodes)||nodes.length===0)throw Error('POSE_NODES_INVALID');
 const count=nodes.length,parents=new Int32Array(count).fill(-1);
 nodes.forEach((node,i)=>{
  for(const child of node.children||[]){
   if(!Number.isInteger(child)||child<0||child>=count||child===i||parents[child]!==-1)throw Error('POSE_PARENT_INVALID');
   parents[child]=i;
  }
 });
 const marks=new Uint8Array(count),order=[];
 function visit(i){
  if(marks[i]===1)throw Error('POSE_CYCLE');
  if(marks[i]===2)return;
  marks[i]=1;
  if(parents[i]>=0)visit(parents[i]);
  marks[i]=2;order.push(i);
 }
 for(let i=0;i<count;i++)visit(i);
 const locals=nodes.map(()=>new Float32Array(16));
 const world=nodes.map(()=>new Float32Array(16));
 const rotations=nodes.map(()=>new Float32Array(4));
 const hasRotation=new Uint8Array(count);
 const compiled=tracks.map(track=>{
  const {node,times,values}=track;
  if(!Number.isInteger(node)||node<0||node>=count)throw Error('POSE_TRACK_NODE');
  if(!times||!values||times.length<2||values.length!==times.length*4)throw Error('POSE_TRACK_KEYS');
  for(let i=0;i<times.length;i++){
   if(!Number.isFinite(times[i])||(i&&times[i]<=times[i-1]))throw Error('POSE_TRACK_TIME');
   for(let j=0;j<4;j++)if(!Number.isFinite(values[i*4+j]))throw Error('POSE_TRACK_QUAT');
  }
  return {node,times,values,cursor:0};
 });
 function mixInto(a,b,output){
  let dot=0;
  for(let i=0;i<4;i++)dot+=a[i]*b[i];
  let sign=dot<0?-1:1,mag=0;
  for(let i=0;i<4;i++){const v=a[i]*(1-output.f)+sign*b[i]*output.f;output.quat[i]=v;mag+=v*v;}
  const inv=mag>1e-20?1/Math.sqrt(mag):1;
  for(let i=0;i<4;i++)output.quat[i]*=inv;
 }
 // No 4-element Array.from/slice or parent-map rebuild each frame.
 function trs(out,node,q){
  const t=node.translation||[0,0,0],s=node.scale||[1,1,1];
  const x=q[0],y=q[1],z=q[2],w=q[3];
  out[0]=(1-2*y*y-2*z*z)*s[0];out[1]=(2*x*y+2*z*w)*s[0];out[2]=(2*x*z-2*y*w)*s[0];out[3]=0;
  out[4]=(2*x*y-2*z*w)*s[1];out[5]=(1-2*x*x-2*z*z)*s[1];out[6]=(2*y*z+2*x*w)*s[1];out[7]=0;
  out[8]=(2*x*z+2*y*w)*s[2];out[9]=(2*y*z-2*x*w)*s[2];out[10]=(1-2*x*x-2*y*y)*s[2];out[11]=0;
  out[12]=t[0];out[13]=t[1];out[14]=t[2];out[15]=1;
 }
 function multiply(out,a,b){
  for(let col=0;col<4;col++)for(let row=0;row<4;row++){
   let v=0;for(let k=0;k<4;k++)v+=a[k*4+row]*b[col*4+k];
   out[col*4+row]=v;
  }
 }
 const interpolate={quat:new Float32Array(4),f:0};
 function evaluate(seconds=0,animated=true){
  if(!Number.isFinite(seconds))throw Error('POSE_TIME_INVALID');
  hasRotation.fill(0);
  if(animated)for(const tr of compiled){
   const {times,values,node}=tr;
   const duration=times[times.length-1]||1;
   const t=((seconds%duration)+duration)%duration;
   let k=tr.cursor;
   if(k<0||k>=times.length-1||t<times[k]||t>=times[k+1]){
    let lo=0,hi=times.length-1;
    while(lo+1<hi){const mid=(lo+hi)>>1;if(times[mid]<=t)lo=mid;else hi=mid;}
    k=Math.min(lo,times.length-2);
   }
   tr.cursor=k;
   const span=Math.max(1e-9,times[k+1]-times[k]);
   interpolate.f=Math.min(1,Math.max(0,(t-times[k])/span));
   let dot=0;for(let i=0;i<4;i++)dot+=values[k*4+i]*values[(k+1)*4+i];
   const sign=dot<0?-1:1;let mag=0;
   for(let i=0;i<4;i++){const v=values[k*4+i]*(1-interpolate.f)+sign*values[(k+1)*4+i]*interpolate.f;interpolate.quat[i]=v;mag+=v*v;}
   const inv=mag>1e-20?1/Math.sqrt(mag):1;
   for(let i=0;i<4;i++)rotations[node][i]=interpolate.quat[i]*inv;
   hasRotation[node]=1;
  }
  for(const i of order){
   const n=nodes[i],local=locals[i];
   if(n.matrix) {
    if(n.matrix.length!==16)throw Error('POSE_MATRIX_INVALID');
    local.set(n.matrix);
   } else {
    trs(local,n,hasRotation[i]?rotations[i]:(n.rotation||[0,0,0,1]));
   }
   if(parents[i]>=0)multiply(world[i],world[parents[i]],local);
   else world[i].set(local);
  }
  return world;
 }
 return {evaluate,nodeCount:count,trackCount:compiled.length,topologyCached:true,sourcePreserved:true};
}
