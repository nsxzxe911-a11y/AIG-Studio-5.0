/**
 * 3AX approved MOBILE RGB region reverse mapping and planar CAD calibration.
 *
 * Mapping pixels -> DOM responsive hit zones does NOT make pixels into buttons.
 * A 2D projective solve can map user supplied coplanar pixel control points
 * into CAD X/Y only after calibration. It NEVER infers depth, stock volume,
 * spindle offset, tool geometry or validates a CNC command.
 */
export const AIG3AX_MOBILE_REVERSE_SCHEMA='AIG_MOBILE_3AX_REVERSE_REGION_V1';
export const MOBILE_SOURCE_SHA256='4f46a4c1f1ed7c71165108ed13f4809201794c16ebc397987d06d1be1f773e28';
const sourceWidth=864,sourceHeight=1536;
const known=['CAM_ISO','CAM_TOP','CAM_FRONT','CAM_LEFT','CAM_RIGHT',
 'CAM_RESET','CAM_FIT','CAM_ZOOM_IN','CAM_ZOOM_OUT','NC_PREV','NC_NEXT',
 'NC_LAST','NC_PAUSE','EMERGENCY_STOP','JOG','NAV_3AX'];
const finiteNumber=n=>typeof n==='number'&&Number.isFinite(n);
const isPair=v=>Array.isArray(v)&&v.length===2&&v.every(finiteNumber);
function assertRange(rect){
 if(!Array.isArray(rect)||rect.length!==4||!rect.every(finiteNumber))
  throw Error('AIG_3AX_INVALID_SOURCE_RECT');
 const [x,y,w,h]=rect;
 if(x<0||y<0||w<1||h<1||x+w>sourceWidth+0.01||y+h>sourceHeight+0.01)
  throw Error('AIG_3AX_SOURCE_RECT_OUT_OF_BOUNDS');
}
export function validateAIG3AXMobileMap(manifest){
 if(manifest?.schema!==AIG3AX_MOBILE_REVERSE_SCHEMA||
  manifest.source?.sha256!==MOBILE_SOURCE_SHA256||
  manifest.source?.width!==sourceWidth||
  manifest.source?.height!==sourceHeight||
  manifest.source?.native4k!==false||
  manifest.source?.actualEncoding!=='image/jpeg'||
  manifest.safety?.pixelMapIsOnlyReference!==true||
  manifest.safety?.cncMachineOutputEnabled!==false||
  manifest.safety?.noPhysicalXYZDerivedFromPixels!==true||
  manifest.safety?.real3DModelAssetsVerified!==false)
  throw Error('AIG_3AX_UNAPPROVED_MOBILE_SOURCE_MAP');
 if(!Array.isArray(manifest.regions)||manifest.regions.length<40||
  manifest.regions.length>100)throw Error('AIG_3AX_INCOMPLETE_REGION_MANIFEST');
 assertRange(manifest.viewport?.sourcePixels);
 const ids=new Set();
 for(const region of manifest.regions){
  if(!/^[A-Z][A-Z0-9_]+$/.test(region.id)||ids.has(region.id)||
   typeof region.commandId!=='string'||typeof region.enabled!=='boolean')
   throw Error('AIG_3AX_REGION_OR_COMMAND_INVALID');
  ids.add(region.id);assertRange(region.sourcePixels);
  const n=region.normalized,ref=region.sourcePixels;
  if(!Array.isArray(n)||n.length!==4||n.some((x,i)=>
   !finiteNumber(x)||Math.abs(x-ref[i]/(i%2===0?sourceWidth:sourceHeight))>1e-5))
   throw Error('AIG_3AX_NORMALIZED_REGION_MISMATCH');
  if(region.role.startsWith('DISABLED')||region.role==='DANGEROUS_DISABLED'){
   if(region.enabled!==false||!region.commandId.startsWith('BLOCK.'))
    throw Error('AIG_3AX_DANGEROUS_OR_FAKE_BUTTON_NOT_BLOCKED');
  }
 }
 if(known.some(id=>!ids.has(id)))throw Error('AIG_3AX_STABLE_COMMAND_REGION_MISSING');
 const emergency=manifest.regions.find(x=>x.id==='EMERGENCY_STOP');
 if(emergency.commandId!=='NC.REPLAY.PAUSE'||emergency.role!=='SAFE_REPLAY_STOP')
  throw Error('AIG_3AX_MACHINE_STOP_MISREPRESENTED');
 return Object.freeze({ok:true,regionCount:ids.size,
  sourceSha256:MOBILE_SOURCE_SHA256,
  sourceIdentityOnly:true,real3DMachineCertified:false,
  geometryFromImageNotVerified:true,machineWriteAllowed:false});
}
export function sourceRegionToNormalized(rect){
 assertRange(rect);
 return Object.freeze(rect.map((v,i)=>v/(i%2===0?sourceWidth:sourceHeight)));
}
export function mapPointerIntoSourceViewport({clientX,clientY,left,top,width,height},
 manifest){
 const rect=manifest?.viewport?.sourcePixels;
 assertRange(rect);
 if(![clientX,clientY,left,top,width,height].every(finiteNumber)||
  width<1||height<1)throw Error('AIG_3AX_INVALID_DISPLAY_BOUNDS');
 const u=(clientX-left)/width,v=(clientY-top)/height;
 if(u<0||u>1||v<0||v>1)return null;
 return Object.freeze({imagePixel:[rect[0]+u*rect[2],rect[1]+v*rect[3]],
  normalizedViewport:[u,v],physicalXyzVerified:false,derivedMachineCoords:null});
}
// Dense 8x8 solve by Gaussian elimination with partial pivoting.
function solveLinear(A,b){
 const n=b.length,M=A.map((row,i)=>[...row,b[i]]);
 for(let k=0;k<n;k++){
  let pivot=k;
  for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[pivot][k]))pivot=i;
  if(Math.abs(M[pivot][k])<1e-10)throw Error('AIG_3AX_CAD_CALIBRATION_DEGENERATE');
  [M[k],M[pivot]]=[M[pivot],M[k]];
  let diag=M[k][k];
  for(let j=k;j<=n;j++)M[k][j]/=diag;
  for(let i=0;i<n;i++){
   if(i===k)continue;
   const c=M[i][k];
   for(let j=k;j<=n;j++)M[i][j]-=c*M[k][j];
  }
 }
 return M.map(row=>row[n]);
}
export function buildAIG3AXCADPlaneCalibration(anchors){
 if(!Array.isArray(anchors)||anchors.length<4||anchors.length>16)
  throw Error('AIG_3AX_MINIMUM_4_REAL_WORLD_PLANE_ANCHORS_REQUIRED');
 const points=anchors.map(p=>{
  if(!isPair(p?.imagePixel)||!isPair(p?.cadMm)||
   p.imagePixel[0]<0||p.imagePixel[0]>sourceWidth||
   p.imagePixel[1]<0||p.imagePixel[1]>sourceHeight||
   p.cadMm.some(n=>Math.abs(n)>1e6))
   throw Error('AIG_3AX_ANCHOR_COORDINATES_INVALID');
  return {u:p.imagePixel[0]/sourceWidth,v:p.imagePixel[1]/sourceHeight,
   x:p.cadMm[0],y:p.cadMm[1]};
 });
 const ix=points.map(x=>x.u),iy=points.map(x=>x.v);
 const px=Math.max(...ix)-Math.min(...ix),
  py=Math.max(...iy)-Math.min(...iy);
 if(px<30/sourceWidth||py<30/sourceHeight)
  throw Error('AIG_3AX_NOT_ENOUGH_2D_ANCHOR_SPREAD');
 const rows=[],target=[];
 for(const p of points){
  rows.push([p.u,p.v,1,0,0,0,-p.x*p.u,-p.x*p.v]);target.push(p.x);
  rows.push([0,0,0,p.u,p.v,1,-p.y*p.u,-p.y*p.v]);target.push(p.y);
 }
 const ata=Array.from({length:8},()=>Array(8).fill(0)),atb=Array(8).fill(0);
 rows.forEach((row,i)=>{
  for(let a=0;a<8;a++){
   atb[a]+=row[a]*target[i];
   for(let b=0;b<8;b++)ata[a][b]+=row[a]*row[b];
  }
 });
 const h=solveLinear(ata,atb);
 const forward=p=>{
  const [u,v]=p;
  const z=h[6]*u+h[7]*v+1;
  if(Math.abs(z)<1e-8)throw Error('AIG_3AX_CAD_PLANE_AT_INFINITY');
  return [(h[0]*u+h[1]*v+h[2])/z,
   (h[3]*u+h[4]*v+h[5])/z];
 };
 const errors=points.map(p=>Math.hypot(...forward([p.u,p.v]).map(
  (val,i)=>val-(i===0?p.x:p.y))));
 const rms=Math.sqrt(errors.reduce((v,e)=>v+e*e,0)/errors.length);
 if(!Number.isFinite(rms)||rms>1)
  throw Error('AIG_3AX_CAD_PLANE_FIT_OVER_1MM_REJECTED');
 return Object.freeze({schema:'AIG_3AX_CALIBRATED_COPLANAR_XY_V1',
  homography:h,calibrationAnchors:points.length,
  rmsReprojectionMm:rms,depthAndZNeverInferred:true,
  independentDimensionsRequired:true,sourceImageToPhysicalMachineUncertified:true,
  useForCNCPostOrToolpath:false});
}
export function projectAIG3AXPixelToCADXY(cal,imagePixel){
 if(cal?.schema!=='AIG_3AX_CALIBRATED_COPLANAR_XY_V1'||
  !isPair(imagePixel)||imagePixel[0]<0||imagePixel[0]>sourceWidth||
  imagePixel[1]<0||imagePixel[1]>sourceHeight)
  throw Error('AIG_3AX_PLANAR_PROJECTION_NOT_CALIBRATED');
 const u=imagePixel[0]/sourceWidth,v=imagePixel[1]/sourceHeight;
 const h=cal.homography,z=h[6]*u+h[7]*v+1;
 if(!Number.isFinite(z)||Math.abs(z)<1e-8)
  throw Error('AIG_3AX_PLANE_PROJECTION_OUT_OF_BOUNDS');
 return Object.freeze({xMm:(h[0]*u+h[1]*v+h[2])/z,
  yMm:(h[3]*u+h[4]*v+h[5])/z,
  zMm:null,zDepthVerified:false,sourcePlaneOnly:true,
  noCNCWrite:true});
}
