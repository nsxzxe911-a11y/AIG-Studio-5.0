/**
 * AIG shared 6-DoF spatial foundation + Earth-like WGS84 global scene frame.
 * 6DoF = position XYZ + orientation yaw/pitch/roll in physical THREE-space,
 * NOT an implementation of six spatial dimensions.
 *
 * CPU geometry stays local DOUBLE precision millimetres (0.001 mm supported).
 * Global WGS84/ECEF metres DOUBLE is for anchoring; never cast 6.3e6 ECEF to
 * Float32 before subtracting the anchor/floating origin.
 * ENU axes local X=East, Y=North, Z=Up, explicit only: CNC axis mapping needs
 * a separate calibrated machine-frame adapter; nothing changes G-code.
 */
export const AIG_SIXDOF_GLOBE_SCHEMA='AIG_6DOF_WGS84_ECEF_LOCAL_ENU_MM_V1';
const A=6378137,INV_F=298.257223563,F=1/INV_F,E2=F*(2-F);
const DEG=Math.PI/180,RAD=180/Math.PI;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const triple=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const fail=name=>{throw Error('AIG_GLOBE_'+name);};
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const length=a=>Math.hypot(...a);
const clean=a=>a.map(x=>Object.is(x,-0)?0:x);
function basis(latitudeDeg,longitudeDeg){
 const lat=latitudeDeg*DEG,lon=longitudeDeg*DEG;
 const sl=Math.sin(lat),cl=Math.cos(lat),so=Math.sin(lon),co=Math.cos(lon);
 return {east:[-so,co,0],north:[-sl*co,-sl*so,cl],up:[cl*co,cl*so,sl]};
}
export function geodeticAIGtoECEF({
 latitudeDeg,longitudeDeg,heightMeters=0
}={}){
 if(!finite(latitudeDeg)||Math.abs(latitudeDeg)>90||
  !finite(longitudeDeg)||longitudeDeg< -180||longitudeDeg>180||
  !finite(heightMeters)||Math.abs(heightMeters)>1e8)
  fail('INVALID_WGS84_GEODETIC');
 const lat=latitudeDeg*DEG,lon=longitudeDeg*DEG,
  s=Math.sin(lat),c=Math.cos(lat),
  n=A/Math.sqrt(1-E2*s*s);
 return [(n+heightMeters)*c*Math.cos(lon),
  (n+heightMeters)*c*Math.sin(lon),
  (n*(1-E2)+heightMeters)*s];
}
export function ecefAIGtoGeodetic(ecef){
 if(!triple(ecef)||length(ecef)<1e3)fail('INVALID_ECEF_POINT');
 const [x,y,z]=ecef,lon=Math.atan2(y,x),p=Math.hypot(x,y);
 if(p<1e-8)return {latitudeDeg:z<0?-90:90,
  longitudeDeg:0,heightMeters:Math.abs(z)-A*(1-F)};
 let lat=Math.atan2(z,p*(1-E2)),h=0;
 for(let i=0;i<12;i++){
  const sin=Math.sin(lat),n=A/Math.sqrt(1-E2*sin*sin);
  h=p/Math.cos(lat)-n;
  const next=Math.atan2(z,p*(1-E2*n/(n+h)));
  if(Math.abs(next-lat)<1e-14){lat=next;break;}lat=next;
 }
 const n=A/Math.sqrt(1-E2*Math.sin(lat)**2);
 h=p/Math.cos(lat)-n;
 return {latitudeDeg:lat*RAD,longitudeDeg:lon*RAD,heightMeters:h};
}
export function createAIGGeoGlobeAnchor(geodetic){
 const ecef=geodeticAIGtoECEF(geodetic);
 const {east,north,up}=basis(geodetic.latitudeDeg,geodetic.longitudeDeg);
 return {schema:AIG_SIXDOF_GLOBE_SCHEMA,
  geodetic:{...geodetic,heightMeters:geodetic.heightMeters??0},
  ecefMeters:ecef,axesENU:{east,north,up},
  highPrecisionEarthECEFFloat64:true,
  localEngineeringGeometryMillimeters:true,
  noGlobalECEFFloat32BeforeFloatingOrigin:true,
  machineAxisCalibrationRequired:true};
}
function validateAnchor(anchor){
 if(anchor?.schema!==AIG_SIXDOF_GLOBE_SCHEMA||
  !triple(anchor.ecefMeters)||!anchor.axesENU||
  !['east','north','up'].every(x=>triple(anchor.axesENU[x])))
  fail('ORIGIN_ANCHOR_REQUIRED');
}
export function aigLocalMmToECEF(localENUmm,anchor){
 validateAnchor(anchor);
 if(!triple(localENUmm)||localENUmm.some(x=>Math.abs(x)>1e9))
  fail('LOCAL_ENU_MM_INVALID');
 const {east,north,up}=anchor.axesENU;
 return clean(anchor.ecefMeters.map((x,i)=>x+
  (east[i]*localENUmm[0]+north[i]*localENUmm[1]+up[i]*localENUmm[2])/1000));
}
export function aigECEFToLocalMm(ecefMeters,anchor){
 validateAnchor(anchor);
 if(!triple(ecefMeters))fail('LOCAL_ECEF_INVALID');
 const delta=sub(ecefMeters,anchor.ecefMeters),
  {east,north,up}=anchor.axesENU;
 return clean([dot(delta,east)*1000,dot(delta,north)*1000,
  dot(delta,up)*1000]);
}
function quaternionMultiply(a,b){
 const [w,x,y,z]=a,[v,u,t,s]=b;
 return [w*v-x*u-y*t-z*s,w*u+x*v+y*s-z*t,w*t-x*s+y*v+z*u,w*s+x*t-y*u+z*v];
}
export function aigSixDoFQuaternion({yawDeg=0,pitchDeg=0,rollDeg=0}={}){
 if(![yawDeg,pitchDeg,rollDeg].every(x=>finite(x)&&Math.abs(x)<=360000))
  fail('INVALID_SIXDOF_ROTATION');
 const half=v=>v*DEG/2,[z,y,x]=[yawDeg,pitchDeg,rollDeg].map(half);
 const qz=[Math.cos(z),0,0,Math.sin(z)],
  qy=[Math.cos(y),0,Math.sin(y),0],
  qx=[Math.cos(x),Math.sin(x),0,0];
 return quaternionMultiply(quaternionMultiply(qz,qy),qx);
}
export function aigRotate6DoFVector(vector,angles={}){
 if(!triple(vector))fail('VECTOR_REQUIRED');
 const [w,x,y,z]=aigSixDoFQuaternion(angles);
 const [a,b,c]=vector;
 return [
  (1-2*(y*y+z*z))*a+2*(x*y-z*w)*b+2*(x*z+y*w)*c,
  2*(x*y+z*w)*a+(1-2*(x*x+z*z))*b+2*(y*z-x*w)*c,
  2*(x*z-y*w)*a+2*(y*z+x*w)*b+(1-2*(x*x+y*y))*c
 ];
}
export function aigApplySixDoFLocalMm({
 pointMm,positionMm,angles
}={}){
 if(!triple(pointMm)||!triple(positionMm))fail('SIXDOF_POSITION_REQUIRED');
 return clean(add(positionMm,aigRotate6DoFVector(pointMm,angles)));
}
/** Physical spherical orbit camera in LOCAL ENU; globe is a positioning idea,
 * not a sixth spatial axis. Elevation ranges above/below the horizon. */
export function aigOrbitSphericalCamera({
 focusMm=[0,0,0],azimuthDeg=0,elevationDeg=25,radiusMm=1500
}={}){
 if(!triple(focusMm)||![azimuthDeg,elevationDeg,radiusMm].every(finite)||
  elevationDeg< -89.999||elevationDeg>89.999||radiusMm<=0)
  fail('INVALID_GLOBE_ORBIT');
 const a=azimuthDeg*DEG,e=elevationDeg*DEG;
 const offset=[radiusMm*Math.cos(e)*Math.cos(a),
  radiusMm*Math.cos(e)*Math.sin(a),radiusMm*Math.sin(e)];
 const eye=add(focusMm,offset);
 return {eyeLocalENUmm:eye,focusLocalENUmm:focusMm,
  viewDirection:offset.map(x=>-x/radiusMm),
  coordinateSpace:'LOCAL_3D_ENU_WITH_6DOF_POSE',
  virtualGlobeOrbitNoSixPhysicalSpatialDimensions:true};
}
