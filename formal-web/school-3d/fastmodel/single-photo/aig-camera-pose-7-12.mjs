/**
 * FastModel 7.12 — calibrated, unrectified video relative camera pose.
 *
 * Robust essential matrix (8-point + deterministic RANSAC), numerical
 * rank-2 decomposition, four pose hypotheses, positive-depth cheirality and
 * actual triangulated geometric reprojection. No third-party engine.
 *
 * The returned translation is UNIT DIRECTION and 3D depths are arbitrary
 * relative units. Monocular video cannot yield absolute scale in mm without
 * a measured baseline/target or externally calibrated motion. NOT a dense
 * human face, learned identity model, full avatar or physical camera tracker.
 */
export const AIG712_SCHEMA='AIG_FASTMODEL_7_12_VERIFIED_RELATIVE_VIDEO_CAMERA_POSE';
const validNum=Number.isFinite;
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=(x)=>Math.hypot(...x);
const unit=a=>a.map(v=>v/(norm(a)||1));
const transpose=a=>a[0].map((_,j)=>a.map(row=>row[j]));
const mm=(a,b)=>a.map(row=>b[0].map((_,j)=>row.reduce((s,v,k)=>s+v*b[k][j],0)));
const mv=(a,b)=>a.map(row=>dot(row,b));
const eye=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
const det3=m=>dot(m[0],cross(m[1],m[2]));
const col=(m,i)=>m.map(row=>row[i]);
const makeCols=(...vectors)=>vectors[0].map((_,i)=>vectors.map(v=>v[i]));
function smallestEigen(A){
 const n=A.length,a=A.map(row=>[...row]),v=eye(n);
 for(let k=0;k<140*n*n;k++){
  let p=0,q=1,mag=0;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)
   if(Math.abs(a[i][j])>mag){mag=Math.abs(a[i][j]);p=i;q=j;}
  if(mag<1e-12)break;
  const tau=(a[q][q]-a[p][p])/(2*a[p][q]),
   t=(tau>=0?1:-1)/(Math.abs(tau)+Math.sqrt(1+tau*tau)),
   c=1/Math.sqrt(1+t*t),s=t*c,
   app=a[p][p],aqq=a[q][q],apq=a[p][q];
  a[p][p]=app-t*apq;a[q][q]=aqq+t*apq;a[p][q]=0;a[q][p]=0;
  for(let i=0;i<n;i++){
   if(i!==p&&i!==q){
    const aip=a[i][p],aiq=a[i][q];
    a[i][p]=c*aip-s*aiq;a[p][i]=a[i][p];
    a[i][q]=s*aip+c*aiq;a[q][i]=a[i][q];
   }
   const vip=v[i][p],viq=v[i][q];
   v[i][p]=c*vip-s*viq;v[i][q]=s*vip+c*viq;
  }
 }
 const tuples=Array.from({length:n},(_,i)=>({
  eigenvalue:a[i][i],vector:unit(col(v,i))
 })).sort((x,y)=>x.eigenvalue-y.eigenvalue);
 return tuples;
}
function fitEssential(points){
 if(points.length<8)throw Error('AIG712_EIGHT_OR_MORE_MATCHES_REQUIRED');
 const A=Array.from({length:9},()=>Array(9).fill(0));
 for(const p of points){
  const [x,y]=p.a,[u,v]=p.b,
   row=[u*x,u*y,u,v*x,v*y,v,x,y,1];
  for(let i=0;i<9;i++)for(let j=0;j<9;j++)A[i][j]+=row[i]*row[j];
 }
 const eigen=smallestEigen(A),v=eigen[0].vector;
 if(eigen[1].eigenvalue<1e-9)throw Error('AIG712_DEGENERATE_OR_LOW_PARALLAX_MATCHES');
 const E=[[v[0],v[1],v[2]],[v[3],v[4],v[5]],[v[6],v[7],v[8]]];
 const size=Math.sqrt(E.flat().reduce((a,x)=>a+x*x,0));
 if(!validNum(size)||size<1e-12)throw Error('AIG712_ESSENTIAL_UNSTABLE');
 return E.map(row=>row.map(x=>x/size));
}
function sampson(E,p){
 const x=[...p.a,1],y=[...p.b,1],ex=mv(E,x),ety=mv(transpose(E),y);
 const denominator=ex[0]**2+ex[1]**2+ety[0]**2+ety[1]**2;
 if(denominator<1e-15)return Infinity;
 return Math.abs(dot(y,ex))/Math.sqrt(denominator);
}
function decompose(E){
 const EtE=mm(transpose(E),E),right=smallestEigen(EtE).reverse();
 let v0=unit(right[0].vector),v1=unit(right[1].vector);
 v1=unit(v1.map((x,i)=>x-dot(v0,v1)*v0[i]));
 let v2=unit(cross(v0,v1)),V=makeCols(v0,v1,v2);
 if(det3(V)<0){v2=v2.map(x=>-x);V=makeCols(v0,v1,v2);}
 let u0=unit(mv(E,v0)),u1=mv(E,v1);
 u1=unit(u1.map((x,i)=>x-dot(u0,u1)*u0[i]));
 if(norm(u1)<.3)throw Error('AIG712_ESSENTIAL_SVD_FAILED');
 let u2=unit(cross(u0,u1)),U=makeCols(u0,u1,u2);
 if(det3(U)<0){u2=u2.map(x=>-x);U=makeCols(u0,u1,u2);}
 const W=[[0,-1,0],[1,0,0],[0,0,1]],
  Wt=transpose(W),Vt=transpose(V),
  rotations=[mm(mm(U,W),Vt),mm(mm(U,Wt),Vt)].map(R=>{
   if(det3(R)<0)R=R.map(row=>row.map(x=>-x));
   return R;
  });
 return rotations.flatMap(R=>[
  {rotation:R,translationDirection:[...u2]},
  {rotation:R,translationDirection:u2.map(x=>-x)}
 ]);
}
function triangulate(pose,p){
 const a=[...p.a,1],b=[...p.b,1],r1=mv(pose.rotation,a),r2=b;
 // s1 * R*r1 - s2*r2 = -t, least squares.
 const d11=dot(r1,r1),d12=-dot(r1,r2),d22=dot(r2,r2),
  rhs1=-dot(r1,pose.translationDirection),rhs2=dot(r2,pose.translationDirection),
  det=d11*d22-d12*d12;
 if(det<1e-9)return null;
 const s1=(rhs1*d22-rhs2*d12)/det,s2=(d11*rhs2-d12*rhs1)/det;
 const P=a.map(x=>x*s1),Q=mv(pose.rotation,P).map((x,i)=>x+pose.translationDirection[i]);
 if(s1<=0||s2<=0||P[2]<=0||Q[2]<=0)return null;
 const errorPx=Math.hypot(P[0]/P[2]-p.a[0],P[1]/P[2]-p.a[1],
  Q[0]/Q[2]-p.b[0],Q[1]/Q[2]-p.b[1]);
 const angle=Math.acos(Math.min(1,Math.max(-1,dot(unit(mv(pose.rotation,a)),unit(b)))));
 return {xyzRelative:P,depthA:s1,depthB:s2,
  normalizedReprojectionError:errorPx,parallaxAngleRad:angle};
}
function selectPose(E,points){
 let best=null;
 for(const hypothesis of decompose(E)){
  const samples=points.slice(0,Math.min(75,points.length));
  const tested=samples.map(p=>triangulate(hypothesis,p)).filter(Boolean);
  const useful=tested.filter(x=>x.normalizedReprojectionError<.018&&x.parallaxAngleRad>.002);
  const med=useful.map(x=>x.parallaxAngleRad).sort((a,b)=>a-b);
  const score=useful.length;
  if(!best||score>best.score)best={
   ...hypothesis,score,positiveDepthCount:tested.length,
   acceptedDepthCount:useful.length,medianParallaxRad:med.length?med[Math.floor(med.length/2)]:0,
   triangulated:useful
  };
 }
 return best;
}
function pseudoRandom(seed){
 let state=seed>>>0;
 return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
function bounds(points,axis){
 const vals=points.map(p=>p[axis][0]),ys=points.map(p=>p[axis][1]);
 return {x:Math.max(...vals)-Math.min(...vals),y:Math.max(...ys)-Math.min(...ys)};
}
export function createAIG712CameraCalibration({
 width,height,fx,fy,cx=width/2,cy=height/2,
 sourceSHA256,intrinsicsReviewed=false,
 distortionCorrectedReviewed=false,staticSceneReviewed=false
}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<48||height<48||
 width*height>2500000||![fx,fy,cx,cy].every(validNum)||
 fx<20||fy<20||fx>30000||fy>30000||
 cx<0||cx>width||cy<0||cy>height||
 !/^sha256:[a-f0-9]{64}$/.test(sourceSHA256||'')||
 !intrinsicsReviewed||!distortionCorrectedReviewed||!staticSceneReviewed)
  throw Error('AIG712_VERIFIED_INTRINSICS_DISTORTION_STATIC_SCENE_REQUIRED');
 return Object.freeze({
  schema:AIG712_SCHEMA,width,height,fx,fy,cx,cy,sourceSHA256,
  intrinsicsReviewed:true,distortionCorrectedReviewed:true,staticSceneReviewed:true,
  sourceVideoStayedLocal:true,absoluteCameraTranslationScale:'UNKNOWN'
 });
}
function matchedPoints(matches,c){
 if(!Array.isArray(matches)||matches.length<12||matches.length>512)
  throw Error('AIG712_MATCH_COUNT_INVALID');
 const unique=new Set();
 return matches.map((m,i)=>{
  if(!m||!m.left||!m.right||
   ![m.left.x,m.left.y,m.right.x,m.right.y].every(validNum)||
   m.left.x<0||m.left.x>=c.width||m.left.y<0||m.left.y>=c.height||
   m.right.x<0||m.right.x>=c.width||m.right.y<0||m.right.y>=c.height)
   throw Error('AIG712_SOURCE_PIXEL_INVALID');
  const key=[m.left.x,m.left.y,m.right.x,m.right.y].map(x=>x.toFixed(2)).join('|');
  if(unique.has(key))throw Error('AIG712_DUPLICATE_IMAGE_MATCH_BLOCKED');
  unique.add(key);
  return {index:i,id:typeof m.id==='string'?m.id:'feature-'+i,
   a:[(m.left.x-c.cx)/c.fx,(m.left.y-c.cy)/c.fy],
   b:[(m.right.x-c.cx)/c.fx,(m.right.y-c.cy)/c.fy],
   source:{left:{...m.left},right:{...m.right}}};
 });
}
export function estimateAIG712CameraPose(calibration,matches,{
 iterations=180,maxSampsonError=0.003,minInliers=12,minFraction=.60
}={}){
 if(calibration?.schema!==AIG712_SCHEMA||!calibration.intrinsicsReviewed||
 !Number.isInteger(iterations)||iterations<30||iterations>500||
 !validNum(maxSampsonError)||maxSampsonError<.0003||maxSampsonError>.02||
 !Number.isInteger(minInliers)||minInliers<10||minInliers>200||
 !validNum(minFraction)||minFraction<.5||minFraction>.95)
  throw Error('AIG712_POSE_CONFIG_OR_CALIBRATION_INVALID');
 const points=matchedPoints(matches,calibration),spreadA=bounds(points,'a'),spreadB=bounds(points,'b');
 if(Math.min(spreadA.x,spreadA.y,spreadB.x,spreadB.y)<.09)
  throw Error('AIG712_DEGENERATE_FEATURE_DISTRIBUTION');
 const rng=pseudoRandom(points.length*104729+Math.floor(points[0].a[0]*100000));
 let best=null,failed=0;
 for(let i=0;i<iterations;i++){
  const ids=new Set();while(ids.size<8)ids.add(Math.floor(rng()*points.length));
  let E;try{E=fitEssential([...ids].map(j=>points[j]));}
  catch{failed++;continue;}
  const inliers=points.filter(x=>sampson(E,x)<=maxSampsonError);
  const residual=inliers.reduce((s,p)=>s+sampson(E,p),0)/(inliers.length||1);
  if(!best||inliers.length>best.inliers.length||
   inliers.length===best.inliers.length&&residual<best.residual)
   best={E,inliers,residual};
 }
 if(!best||best.inliers.length<Math.max(12,minInliers)||
  best.inliers.length/points.length<minFraction)
  throw Error('AIG712_INLIER_FRACTION_OR_EPIPOLAR_GEOMETRY_BLOCKED');
 let refined;
 try{refined=fitEssential(best.inliers);}catch{refined=best.E;}
 const inliers=points.filter(p=>sampson(refined,p)<=maxSampsonError);
 if(inliers.length<Math.max(12,minInliers)||inliers.length/points.length<minFraction)
  throw Error('AIG712_REFINED_EPIPOLAR_GEOMETRY_BLOCKED');
 const pose=selectPose(refined,inliers);
 if(!pose||pose.acceptedDepthCount<Math.max(10,Math.ceil(inliers.length*.55))||
  pose.medianParallaxRad<.006)
  throw Error('AIG712_CHEIRALITY_OR_PARALLAX_BLOCKED');
 const meanError=inliers.reduce((s,p)=>s+sampson(refined,p),0)/inliers.length;
 const trust=meanError<=maxSampsonError*.65&&pose.acceptedDepthCount/inliers.length>=.55;
 if(!trust)throw Error('AIG712_POSE_REPROJECTION_QUALITY_BLOCKED');
 return {
  schema:AIG712_SCHEMA,calibrationSourceSHA256:calibration.sourceSHA256,
  normalizedEssential:refined,rotation:pose.rotation,
  translationDirection:unit(pose.translationDirection),
  translationAbsoluteMm:null,
  rotationDeterminant:det3(pose.rotation),
  matchedCount:points.length,inlierCount:inliers.length,
  outlierCount:points.length-inliers.length,inlierFraction:inliers.length/points.length,
  meanNormalizedEpipolarError:meanError,
  positiveDepthCount:pose.positiveDepthCount,
  cheiralityAccepted:pose.acceptedDepthCount,
  medianParallaxDegrees:pose.medianParallaxRad*180/Math.PI,
  inlierIds:inliers.map(p=>p.id),
  featureSpreads:{sourceA:spreadA,sourceB:spreadB},
  RANSACIterations:iterations,failedMinimalSolves:failed,
  poseDirectionAndRotationEstimated:true,
  cameraIntrinsicsAutomaticallyCalibrated:false,
  sceneStaticAssumedReviewed:true,
  absoluteMetricDepthAvailable:false,perPoint3DScale:'MONOCULAR_RELATIVE_UNITS',
  realFullBodyOrFaceReconstructionComplete:false,
  authenticReferenceCharacterApproved:false
 };
}
