/**
 * V92 deliberately NONHUMAN source-authored engineering QA surface.
 * NOT a human, dog, bird, fish, or reconstructed sports player.
 * Fake test SHA is never treated as independently authenticated capture.
 */
import {createAIG3DMesh,createAIG3DScene,addAIG3DNode}
 from './aig-real3d-core.mjs';
import {AIG_REAL3D_V91_PRESETS}
 from './aig-real3d-sports-ballistics.mjs';
import {AIG_REAL3D_V92_RIG_SCHEMA,createAIGReal3DRigWrap,
 simulateAIGReal3DRigSportContact}
 from './aig-real3d-rig-wrap-contact.mjs';
import {createAIGReal3DRigSportFilm}
 from './aig-real3d-rig-sport-film.mjs';
export function buildAIGReal3DV92NonhumanQA({
 sport='TENNIS',wrapMode='FULL_WRAP'
}={}){
 const preset=AIG_REAL3D_V91_PRESETS[sport];
 if(!preset)throw Error('V92_QA_SPORT_UNKNOWN');
 const r=preset.radiusM,side=48,positions=[],normals=[],indices=[],weights=[];
 for(let y=0;y<side;y++)for(let x=0;x<side;x++){
  const u=x/(side-1),v=y/(side-1),z=.035*Math.sin(Math.PI*2*u)*Math.cos(Math.PI*v);
  const dzdx=.035*2*Math.PI/.52*Math.cos(Math.PI*2*u)*Math.cos(Math.PI*v);
  const dzdy=-.035*Math.PI/1.25*Math.sin(Math.PI*2*u)*Math.sin(Math.PI*v);
  const mag=Math.hypot(dzdx,dzdy,1);
  positions.push((u-.5)*.52, .87+v*1.25,z);
  normals.push(-dzdx/mag,-dzdy/mag,1/mag);
  const w=Math.min(1,Math.max(0,(v-.3)/.5));
  weights.push(w<=1e-8?[{jointId:'root',weight:1}]:
   w>=1-1e-8?[{jointId:'wrist',weight:1}]:
   [{jointId:'root',weight:1-w},{jointId:'wrist',weight:w}]);
 }
 for(let y=0;y<side-1;y++)for(let x=0;x<side-1;x++){
  const a=y*side+x,b=a+1,c=a+side,d=c+1;
  indices.push(a,b,d,a,d,c);
 }
 const mesh=createAIG3DMesh({positions,normals,indices,
  provenance:'NONHUMAN_ARTICULATED_4418_TRIANGLE_QA_NOT_SCAN'});
 const scene=createAIG3DScene({id:'V92SourceSurfaceQA',consumer:'FastModel',
  units:'METERS',source:'TEST_ONLY_AUTHOR_CREATED_NONHUMAN_SURFACE'});
 addAIG3DNode(scene,{id:'sourceLimbSurface',mesh,kind:'object',
  source:'NONHUMAN_ARTICULATED_SOURCE_QA',
  material:{baseColor:[.9,.64,.27,1],roughness:.74,metallic:0,doubleSided:true}});
 const sourceSha256='b'.repeat(64); // QA identifier, not a verified source hash.
 const manifest={schema:AIG_REAL3D_V92_RIG_SCHEMA,
  sourceSha256,nodeRigs:[{nodeId:'sourceLimbSurface',
   joints:[
    {id:'root',parentId:null,bindPivot:[0,1,0],axis:[0,0,1],minDeg:-35,maxDeg:35},
    {id:'wrist',parentId:'root',bindPivot:[-r,1,0],axis:[0,0,1],minDeg:-35,maxDeg:35}
   ],weights}],
  anchors:[{id:'racketImpact',actorId:'demoActor',jointId:'wrist',
   apparatus:sport==='SOCCER'?'FOOT':sport==='BASEBALL'?'BAT':
    sport==='BASKETBALL'?'HAND':sport==='TABLE_TENNIS'?'PADDLE':'RACKET',
   bindPoint:[-r,2,0]}]};
 const keyframes=[
  {timeSec:0,anglesDeg:{root:0,wrist:30}},
  {timeSec:.5,anglesDeg:{root:0,wrist:0}},
  {timeSec:1,anglesDeg:{root:0,wrist:-30}}
 ];
 const rig=createAIGReal3DRigWrap({
  sourceScene:scene,manifest,sourceSha256,keyframes,wrapMode});
 const contact=simulateAIGReal3DRigSportContact({
  rig,anchorId:'racketImpact',sport,impactTimeSec:.5,
  initialPosition:[0,2,0],durationSec:1,airDensity:0,gravity:0,surfaces:[]
 });
 const film=createAIGReal3DRigSportFilm({rig,contact});
 return {scene,mesh,rig,contact,film,sourceSha256,manifest,keyframes,
  independentOriginalSourceSHAValidated:false,
  verifiedHumanOrAnimalSkin:false};
}
