import * as THREE from 'three';

/** FastModel skin-glitch QA: source geometry at current pose; no GLB mutation.
 * Coincident/near-identical triangles can cause Z fighting or duplicate skin.
 * Hair/neck AABB overlaps are risks, not proof of triangle penetration.
 */
export const SKIN_AUDIT_VERSION='AIG_SKIN_ANOMALY_2_8_POSE_SAMPLE';
const finite=a=>a.every(Number.isFinite);
function aabbOverlap(a,b){return ['x','y','z'].every(k=>a.min[k]<=b.max[k]&&b.min[k]<=a.max[k]);}
export function inspectSkinPose(root,{maxTriangles=2400,maxVertices=12000,maxIssues=24,epsilonFraction=1e-5}={}){
 if(!root?.isObject3D)throw Error('SKIN_ROOT_REQUIRED');
 if(!Number.isInteger(maxTriangles)||maxTriangles<1||maxTriangles>15000||
    !Number.isInteger(maxVertices)||maxVertices<3||maxVertices>50000||
    !Number.isInteger(maxIssues)||maxIssues<1||maxIssues>200||
    !Number.isFinite(epsilonFraction)||epsilonFraction<=0||epsilonFraction>.001)throw Error('SKIN_AUDIT_BUDGET_INVALID');
 root.updateMatrixWorld(true);
 const meshes=[];root.traverse(x=>{if(x.isMesh&&x.visible)meshes.push(x);});
 const box=new THREE.Box3().setFromObject(root,true);
 const diagonal=box.isEmpty()?1:Math.max(box.getSize(new THREE.Vector3()).length(),1e-6);
 const tol=Math.max(diagonal*epsilonFraction,1e-8);
 const posed=new THREE.Vector3(),tmpA=new THREE.Vector3(),tmpB=new THREE.Vector3();
 const trianglesBySignature=new Map(),issues=[],byRole=new Map();
 let checkedTriangles=0,checkedVertices=0,skinnedMeshes=0,skinningVertexIssues=0,
  degenerateTriangles=0,coincidentTrianglePairs=0,overlappingMeshPairs=0,limited=false,nonfinite=0;
 const record=(type,where,detail)=>{if(issues.length<maxIssues)issues.push({type,where,detail,verifiedCollision:false});};
 for(const mesh of meshes){
  if(checkedTriangles>=maxTriangles||checkedVertices>=maxVertices){limited=true;break;}
  const geometry=mesh.geometry,position=geometry?.getAttribute('position');
  if(!position){record('NO_POSITION',mesh.name||'unnamed','缺少位置資料');continue;}
  if(mesh.isSkinnedMesh)skinnedMeshes++;
  const indexed=geometry.index,triangles=Math.floor((indexed?indexed.count:position.count)/3);
  const first=Math.max(0,Math.floor((geometry.drawRange?.start||0)/3));
  const range=geometry.drawRange?.count===Infinity?triangles*3:Math.max(0,geometry.drawRange?.count??triangles*3);
  const last=Math.min(triangles,Math.floor(((geometry.drawRange?.start||0)+range)/3));
  const memo=new Map(),role=mesh.userData?.aigAnatomyPart;
  const roleBox=['head','neck','face','scalp','hair'].includes(role)?new THREE.Box3().makeEmpty():null;
  const vertex=i=>{
   if(memo.has(i))return memo.get(i);
   if(!Number.isInteger(i)||i<0||i>=position.count)return null;
   if(mesh.getVertexPosition)mesh.getVertexPosition(i,posed);
   else{posed.fromBufferAttribute(position,i);if(mesh.isSkinnedMesh&&mesh.applyBoneTransform)mesh.applyBoneTransform(i,posed);}
   posed.applyMatrix4(mesh.matrixWorld);
   if(!finite([posed.x,posed.y,posed.z])){nonfinite++;return null;}
   const p=posed.clone();if(memo.size<maxVertices)memo.set(i,p);
   roleBox?.expandByPoint(p);return p;
  };
  if(mesh.isSkinnedMesh){
   const w=geometry.getAttribute('skinWeight'),j=geometry.getAttribute('skinIndex'),
     boneCount=mesh.skeleton?.bones?.length??0;
   if(!w||!j||!boneCount){skinningVertexIssues++;record('SKIN_ATTRIBUTES_MISSING',mesh.name||'unnamed','骨架權重或骨頭資料缺失');}
   else{
    const stride=Math.max(1,Math.ceil(position.count/Math.max(1,Math.min(maxVertices,1000))));
    for(let i=0;i<position.count;i+=stride){
     const ws=[w.getX(i),w.getY(i),w.getZ(i),w.getW(i)];
     const js=[j.getX(i),j.getY(i),j.getZ(i),j.getW(i)];
     if(ws.some(n=>!Number.isFinite(n)||n<0)||Math.abs(ws.reduce((a,b)=>a+b,0)-1)>.03||
       js.some((n,k)=>!Number.isInteger(n)||(ws[k]>0&&(n<0||n>=boneCount)))){
      skinningVertexIssues++;record('SKIN_WEIGHTS_INVALID',mesh.name||'unnamed','骨架權重異常，可能造成皮膚拉伸');
      if(skinningVertexIssues>=maxIssues)break;
     }
    }
   }
  }
  for(let t=first;t<last;t++){
   if(checkedTriangles>=maxTriangles||checkedVertices>=maxVertices){limited=true;break;}
   const ia=indexed?indexed.getX(t*3):t*3,ib=indexed?indexed.getX(t*3+1):t*3+1,ic=indexed?indexed.getX(t*3+2):t*3+2;
   const a=vertex(ia),b=vertex(ib),c=vertex(ic);
   if(!a||!b||!c)continue;
   checkedTriangles++;checkedVertices+=3;
   tmpA.subVectors(b,a);tmpB.subVectors(c,a);
   if(tmpA.cross(tmpB).lengthSq()<tol**4){
    degenerateTriangles++;record('COLLAPSED_SURFACE',mesh.name||'unnamed','第 '+t+' 個三角面退化，可能閃爍');continue;
   }
   const sig=[a,b,c].map(p=>[p.x,p.y,p.z].map(n=>Math.round(n/tol)).join(',')).sort().join('|');
   const old=trianglesBySignature.get(sig);
   if(old){
    coincidentTrianglePairs++;
    if(old.uuid!==mesh.uuid)overlappingMeshPairs++;
    record('COINCIDENT_TRIANGLE',mesh.name||'unnamed',
     '與 '+old.name+' 的三角面 '+old.index+' 重疊，可能是雙層皮膚／Z-fighting；也可能是刻意分層');
   }else trianglesBySignature.set(sig,{uuid:mesh.uuid,name:mesh.name||'unnamed',index:t});
  }
  if(roleBox&&!roleBox.isEmpty()){
   if(!byRole.has(role))byRole.set(role,[]);
   byRole.get(role).push(roleBox);
  }
  for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   if(m?.transparent&&m.depthWrite===true)
    record('TRANSPARENT_DEPTH_WRITE',mesh.name||'unnamed','透明髮絲／皮膚寫入深度，可能產生錯誤遮擋');
  }
 }
 const hair=byRole.get('hair')||[],neck=byRole.get('neck')||[];
 const hairNeckBoxOverlap=hair.length&&neck.length?hair.some(h=>neck.some(n=>aabbOverlap(h,n))):null;
 if(hairNeckBoxOverlap)record('HAIR_NECK_BOX_OVERLAP','hair/neck','只有明確標記髮束／脖子的包圍盒重疊，不能判定已穿模');
 return {version:SKIN_AUDIT_VERSION,status:meshes.length?'REVIEW_REQUIRED':'BLOCKED_NO_VISIBLE_MESH',
  checkedMeshCount:meshes.length,skinnedMeshes,checkedTriangles,checkedVertices,coincidentTrianglePairs,
  overlappingMeshPairs,skinningVertexIssues,degenerateTriangles,nonfinitePositions:nonfinite,
  hairNeckBoxOverlap,anatomyTagsAvailable:!!(hair.length&&neck.length),
  issues,issuesTruncated:coincidentTrianglePairs+skinningVertexIssues+degenerateTriangles>issues.length,
  incomplete:limited,originalGLBModified:false,exactMeshPenetrationTested:false,
  animatedPoseProvenClean:false,realGPUZFightPixelsVerified:false,
  note:'檢查的是當前真實模型姿態與幾何抽樣，並非實機 GPU 畫素對照、精確三角面穿透或女主角已驗收。'};
}
export class SkinAnomalyMonitor{
 constructor({frames=16,minIntervalMs=85,onUpdate=()=>{}}={}){
  if(!Number.isInteger(frames)||frames<1||frames>60||!Number.isFinite(minIntervalMs)||minIntervalMs<0)
   throw Error('SKIN_MONITOR_BUDGET_INVALID');
  this.frames=frames;this.minIntervalMs=minIntervalMs;this.onUpdate=onUpdate;
  this.records=[];this.lastMs=-Infinity;this.done=false;
 }
 capture(root,ms,{animationName=null}={}){
  if(this.done||!root||!Number.isFinite(ms)||ms<this.lastMs+this.minIntervalMs)return null;
  this.lastMs=ms;
  const report=inspectSkinPose(root,{maxTriangles:900,maxVertices:3000,maxIssues:8});
  const row={frame:this.records.length,timeMs:Math.round(ms),animationName,
   overlapPairs:report.coincidentTrianglePairs,skinWeightErrors:report.skinningVertexIssues,
   hairNeckBoxOverlap:report.hairNeckBoxOverlap,incomplete:report.incomplete};
  this.records.push(row);if(this.records.length>=this.frames)this.done=true;
  this.firstFrameReport??=report;
  const summary={status:this.done?'SAMPLED_POSES_REVIEW_REQUIRED':'SAMPLING',
   sampledFrames:this.records.length,targetFrames:this.frames,
   possibleOverlapFrames:this.records.filter(x=>x.overlapPairs>0).map(x=>x.frame),
   possibleWeightErrorFrames:this.records.filter(x=>x.skinWeightErrors>0).map(x=>x.frame),
   framesWithHairNeckBoxOverlap:this.records.filter(x=>x.hairNeckBoxOverlap).map(x=>x.frame),
   firstFrameReport:this.firstFrameReport,records:[...this.records],
   actualCollisionFreeProven:false,realHeroineApproved:false};
  this.onUpdate(summary);return summary;
 }
}
