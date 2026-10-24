/** Explicit local globe-space 6DoF diagnostics; never geolocates the user. */
import {
 createAIGGeoGlobeAnchor,aigLocalMmToECEF,aigECEFToLocalMm,
 aigApplySixDoFLocalMm,aigOrbitSphericalCamera
} from './aig-sixdof-geoglobe-space.mjs';
export function mountAIGSixDoFGlobeSpaceUI({$}={}){
 const run=$('geo-6dof-run'),status=$('geo-6dof-status'),
  evidence=$('geo-6dof-evidence'),canvas=$('geo-6dof-canvas');
 run.addEventListener('click',()=>{
  try{
   const v=id=>Number($(id).value);
   const lat=v('geo-lat'),lon=v('geo-lon'),height=v('geo-height'),
    localMm=[v('geo-x-mm'),v('geo-y-mm'),v('geo-z-mm')],
    angles={yawDeg:v('geo-yaw'),pitchDeg:v('geo-pitch'),
     rollDeg:v('geo-roll')};
   const anchor=createAIGGeoGlobeAnchor({
    latitudeDeg:lat,longitudeDeg:lon,heightMeters:height
   });
   const global=aigLocalMmToECEF(localMm,anchor),
    back=aigECEFToLocalMm(global,anchor),
    applied=aigApplySixDoFLocalMm({
     pointMm:[1000,0,0],positionMm:localMm,angles
    });
   const orbit=aigOrbitSphericalCamera({
    focusMm:localMm,azimuthDeg:angles.yawDeg,
    elevationDeg:Math.max(-89.9,Math.min(89.9,angles.pitchDeg)),
    radiusMm:4000
   });
   const residual=Math.hypot(...localMm.map((x,i)=>back[i]-x));
   if(residual>.002)
    throw Error('全球／局部座標誤差高於 0.002mm：停止精度認證');
   const record={
    schema:'AIG_REAL3D_GLOBE_SIXDOF_WORKSTATION_EVIDENCE_V1',
    globalAnchor:anchor,sourceLocalENUmm:localMm,
    localToGlobalECEFmeters:global,backToLocalENUmm:back,
    localRoundtripErrorMm:residual,
    toolPoseAnglesDegrees:angles,rotatedToolPointLocalMm:applied,
    sphericalOrbitCamera:orbit,
    coordinateMapping:'local X=East,Y=North,Z=Up; CNC machine axis requires calibration',
    cpuPrecision:'double mm; ECEF world doubles then local floating origin',
    actualGlobeTerrainStreaming:false,
    isSixSpatialDimensions:false,technicalCoordinateCorePASS:true,
    CNCProductionIntegrationPASS:false
   };
   evidence.textContent=JSON.stringify(record,null,2);
   status.textContent='6DoF + WGS84 球體空間數值已計算；局部往返誤差 '+
    residual.toFixed(8)+' mm。這是座標核心，尚未接實際地球地形/6AX 控制器。';
   const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
   ctx.clearRect(0,0,w,h);
   const cx=w/2,cy=h/2,r=Math.min(w,h)*.34;
   ctx.strokeStyle='#60cfff';ctx.lineWidth=1.3;
   ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
   for(const frac of [-.7,-.35,0,.35,.7]){
    const yy=cy+frac*r,rad=r*Math.sqrt(1-frac*frac);
    ctx.beginPath();ctx.ellipse(cx,yy,rad,rad*.15,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx,cy,r*Math.abs(frac)+1,r,0,0,Math.PI*2);ctx.stroke();
   }
   const alpha=lon*Math.PI/180,beta=lat*Math.PI/180;
   const px=cx+r*Math.cos(beta)*Math.sin(alpha),
    py=cy-r*Math.sin(beta);
   ctx.fillStyle='#ffda74';ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#b6deff';ctx.font='13px sans-serif';
   ctx.fillText('WGS84 球面定位概念／非真實地球地形',12,h-14);
  }catch(error){
   status.textContent='BLOCK：'+String(error?.message??error);
   evidence.textContent='尚無可信的空間轉換輸出。';
  }
 });
}
