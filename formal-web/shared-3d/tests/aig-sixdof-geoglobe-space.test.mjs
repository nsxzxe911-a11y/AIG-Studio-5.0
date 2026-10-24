import test from 'node:test';
import assert from 'node:assert/strict';
import {AIG_SIXDOF_GLOBE_SCHEMA,geodeticAIGtoECEF,ecefAIGtoGeodetic,
 createAIGGeoGlobeAnchor,aigLocalMmToECEF,aigECEFToLocalMm,
 aigSixDoFQuaternion,aigRotate6DoFVector,aigApplySixDoFLocalMm,
 aigOrbitSphericalCamera} from '../aig-sixdof-geoglobe-space.mjs';
const near=(a,b,tol)=>assert.ok(Math.abs(a-b)<=tol,
 'Expected '+a+' within '+tol+' of '+b);
test('WGS84 absolute globe anchors are double-precision Earth-centered ECEF, not six spatial dimensions',()=>{
 const equator=geodeticAIGtoECEF({latitudeDeg:0,longitudeDeg:0});
 near(equator[0],6378137,1e-8);near(equator[1],0,1e-8);
 const point={latitudeDeg:24.2,longitudeDeg:120.56,heightMeters:42.25},
  anchor=createAIGGeoGlobeAnchor(point),back=ecefAIGtoGeodetic(anchor.ecefMeters);
 assert.equal(anchor.schema,AIG_SIXDOF_GLOBE_SCHEMA);
 near(back.latitudeDeg,point.latitudeDeg,1e-9);
 near(back.longitudeDeg,point.longitudeDeg,1e-9);
 near(back.heightMeters,point.heightMeters,1e-6);
 assert.equal(anchor.highPrecisionEarthECEFFloat64,true);
});
test('WGS84 local East-North-Up millimetre origin preserves 0.001 mm machine-scale steps',()=>{
 const anchor=createAIGGeoGlobeAnchor({latitudeDeg:25,longitudeDeg:121,heightMeters:100});
 const p=[1234.001,-2000.017,321.999],
  ecef=aigLocalMmToECEF(p,anchor),
  roundtrip=aigECEFToLocalMm(ecef,anchor);
 p.forEach((x,i)=>near(roundtrip[i],x,.000003));
 const mm=aigECEFToLocalMm(aigLocalMmToECEF([.001,0,0],anchor),anchor);
 near(mm[0],.001,.000003);
 assert.equal(anchor.machineAxisCalibrationRequired,true);
});
test('3 translations + three rotations: yaw 90° turns X to Y, without altering the 3D geometry',()=>{
 const q=aigSixDoFQuaternion({yawDeg:90,pitchDeg:0,rollDeg:0});
 near(Math.hypot(...q),1,1e-12);
 const v=aigRotate6DoFVector([1,0,0],{yawDeg:90});
 near(v[0],0,1e-12);near(v[1],1,1e-12);near(v[2],0,1e-12);
 const moved=aigApplySixDoFLocalMm({
  pointMm:[1000,0,0],positionMm:[10,-15,3],
  angles:{yawDeg:90,pitchDeg:0,rollDeg:0}
 });
 near(moved[0],10,1e-8);near(moved[1],985,1e-8);near(moved[2],3,1e-8);
 const orbit=aigOrbitSphericalCamera({
  focusMm:[100,200,0],azimuthDeg:90,elevationDeg:0,radiusMm:1000
 });
 near(orbit.eyeLocalENUmm[0],100,1e-8);
 near(orbit.eyeLocalENUmm[1],1200,1e-8);
 assert.equal(orbit.virtualGlobeOrbitNoSixPhysicalSpatialDimensions,true);
});
test('Reject bogus GPS, missing source frame and invalid 6DoF angles',()=>{
 assert.throws(()=>geodeticAIGtoECEF({latitudeDeg:100,longitudeDeg:120}),
  /AIG_GLOBE_INVALID_WGS84_GEODETIC/);
 assert.throws(()=>aigLocalMmToECEF([0,0,0],{}),
  /AIG_GLOBE_ORIGIN_ANCHOR_REQUIRED/);
 assert.throws(()=>aigSixDoFQuaternion({rollDeg:Infinity}),
  /AIG_GLOBE_INVALID_SIXDOF_ROTATION/);
 assert.throws(()=>aigOrbitSphericalCamera({radiusMm:0}),
  /AIG_GLOBE_INVALID_GLOBE_ORBIT/);
});
