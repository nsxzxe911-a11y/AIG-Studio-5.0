/** AIG Real3D Phase 1: strictly READ-ONLY bridge previews for three projects.
 * Render runtime-provided geometry and source-owned CNC line segments.
 * Does NOT dispatch commands, imply Fanuc acceptance, or mutate stock.
 */
import {createAIG3DScene,createAIG3DBox,createAIG3DCylinder,
 addAIG3DNode,addAIG3DToolpathOverlay,auditAIG3DScene}
 from './aig-real3d-core.mjs';
const finite=Number.isFinite;
const axes={'3AX':['X','Y','Z'],'4AX':['X','Y','Z','A'],
 '5AX':['X','Y','Z','A','B'],'6AX':['X','Y','Z','A','B','C']};
function vec(v){
 if(!Array.isArray(v)||v.length!==3||!v.every(x=>finite(x)&&Math.abs(x)<1e7))
  throw Error('AIG3D_ADAPTER_VECTOR_INVALID');
 return [...v];
}
const hex=s=>typeof s==='string'&&/^[a-fA-F0-9]{64}$/.test(s);
export function createAIG3DCNCReadOnlyScene({
 axisPage,consumer='AIG-II',sourceKind='DEMO_PROCEDURAL',
 snapshotDigest=null,revision=null,solids=[],toolpath=[],axisValues={},
 units='MM'
}={}){
 if(!axes[axisPage]||!['AIG-II','AIG-Studio-5.0'].includes(consumer)||units!=='MM'||!['DEMO_PROCEDURAL','RUNTIME_SNAPSHOT'].includes(sourceKind)||
 (sourceKind==='RUNTIME_SNAPSHOT'&&(!hex(snapshotDigest)||
  !Number.isInteger(revision)||revision<1))||
 !Array.isArray(solids)||solids.length>180||!Array.isArray(toolpath)||
 toolpath.length>25000||!axisValues||typeof axisValues!=='object')
  throw Error('AIG3D_CNC_READONLY_PROVENANCE_REQUIRED');
 const axisState={};
 for(const axis of axes[axisPage]){
  const raw=axisValues[axis]??0;
  if(!finite(raw)||Math.abs(raw)>1e6)throw Error('AIG3D_AXIS_VALUE_INVALID');
  axisState[axis]=raw;
 }
 const scene=createAIG3DScene({id:'cnc-'+axisPage.toLowerCase(),
  consumer,units:'MM',source:sourceKind==='DEMO_PROCEDURAL'?
   'DEMO_NOT_MACHINE_RUNTIME':'UNVERIFIED_RUNTIME_SNAPSHOT_SHA256_'+snapshotDigest});
 let rootCount=0;
 for(const item of solids){
  if(!item||!['box','cylinder'].includes(item.geometry)||
  typeof item.id!=='string'||!item.id.match(/^[a-zA-Z][a-zA-Z0-9:_-]{0,95}$/)||
  !['stock','fixture','tool','machine','object'].includes(item.kind)||
  !Array.isArray(item.position)||!Array.isArray(item.size)||
  !Array.isArray(item.color)||item.color.length!==4||
  !item.color.every(x=>finite(x)&&x>=0&&x<=1))
   throw Error('AIG3D_CNC_SOLID_INVALID');
  const mesh=item.geometry==='box'?createAIG3DBox(vec(item.size),
    'CNC_SOURCE_'+sourceKind):
   createAIG3DCylinder({radius:item.size[0]/2,height:item.size[1],
    segments:24,provenance:'CNC_SOURCE_'+sourceKind});
  addAIG3DNode(scene,{id:item.id,kind:item.kind,mesh,
   transform:{position:vec(item.position),rotationDeg:item.rotationDeg||[0,0,0]},
   material:{baseColor:item.color,metallic:item.kind==='stock'?0.45:0.3,roughness:.42},
   source:sourceKind});rootCount++;
 }
 if(toolpath.length){
  addAIG3DToolpathOverlay(scene,{id:'source_toolpath',
   segments:toolpath,source:sourceKind==='DEMO_PROCEDURAL'?
    'DEMO_TOOLPATH_VISUAL_NO_NC_PROOF':'PROVIDED_RUNTIME_TOOLPATH_UNVERIFIED',
   units:'MM'});
 }
 return {scene,axisPage,axes:[...axes[axisPage]],axisState,
  sourceKind,revision,readOnly:true,actualCNCCommandsSent:0,
  machineKinematicsVerified:false,materialRemovalVerified:false,
  realHardwareCollisionCheckCompleted:false,
  adapterStatus:auditAIG3DScene(scene)};
}
export function createAIG3DFastModelReadOnlyScene({
 items=[],units='RELATIVE',source='FASTM_MODEL_SOURCE_UNVERIFIED'
}={}){
 if(!['RELATIVE','METERS','MM'].includes(units)||!Array.isArray(items)||items.length>180||
 typeof source!=='string'||source.length<3)throw Error('AIG3D_FASTMODEL_SOURCE_INVALID');
 const scene=createAIG3DScene({id:'fastmodel-scene',
  consumer:'FastModel',units,source});
 for(const i of items){
  if(!i||!['box','cylinder'].includes(i.geometry)||
   !['object','environment','character'].includes(i.kind))
   throw Error('AIG3D_FASTMODEL_ITEM_INVALID');
  const mesh=i.geometry==='box'?createAIG3DBox(vec(i.size),
    'FASTM_GEOMETRY_'+source):createAIG3DCylinder({
     radius:i.size[0]/2,height:i.size[1],provenance:'FASTM_GEOMETRY_'+source});
  addAIG3DNode(scene,{id:i.id,mesh,kind:i.kind,
   transform:{position:vec(i.position),rotationDeg:i.rotationDeg??[0,0,0]},
   material:{baseColor:i.color??[.46,.59,.73,1],metallic:0,roughness:.65},
   source:'VIEW_ONLY_SOURCE_'+source});
 }
 return {scene,readOnly:true,sourceVerified:false,
  animatedRigVerified:false,world3DMmInferred:false};
}
export function demoAIG3DScene(profile='3AX'){
 if(!['3AX','5AX','FastModel'].includes(profile))throw Error('AIG3D_DEMO_PROFILE_INVALID');
 if(profile==='FastModel'){
  return createAIG3DFastModelReadOnlyScene({source:'EXPLICIT_PROCEDURAL_DEMO_NO_PHOTO',
   items:[
    {id:'ground',geometry:'box',kind:'environment',position:[0,-1.4,0],size:[9,.25,8],color:[.15,.29,.21,1]},
    {id:'building',geometry:'box',kind:'environment',position:[-2,.45,-1],size:[2.5,3.5,2.3],color:[.32,.48,.61,1]},
    {id:'treeTrunk',geometry:'cylinder',kind:'environment',position:[2,-.1,.8],size:[.45,2.3,.45],color:[.39,.25,.13,1]},
    {id:'treeCrown',geometry:'cylinder',kind:'environment',position:[2,1.35,.8],size:[2.1,1.9,2.1],color:[.1,.48,.22,1]}
   ]});
 }
 const cradle=profile==='5AX';
 return createAIG3DCNCReadOnlyScene({axisPage:profile,
  consumer:profile==='5AX'?'AIG-Studio-5.0':'AIG-II',
  consumer:cradle?'AIG-Studio-5.0':'AIG-II',
  solids:[
   {id:'bed',kind:'machine',geometry:'box',position:[0,-1.75,0],size:[8,.45,6],color:[.09,.2,.24,1]},
   {id:'table',kind:'machine',geometry:'box',position:[0,-1.3,0],size:[5.7,.27,4.3],color:[.18,.35,.39,1]},
   {id:'viseL',kind:'fixture',geometry:'box',position:[-1.4,-.9,0],size:[.45,.65,2.2],color:[.36,.4,.44,1]},
   {id:'viseR',kind:'fixture',geometry:'box',position:[1.4,-.9,0],size:[.45,.65,2.2],color:[.36,.4,.44,1]},
   {id:'stock',kind:'stock',geometry:'box',position:[0,-.74,0],size:[2.3,.9,1.95],color:[.67,.51,.29,1]},
   {id:'spindle',kind:'machine',geometry:'cylinder',position:[0,2.2,0],size:[1.1,1.9,1.1],color:[.37,.49,.55,1]},
   {id:'endmill',kind:'tool',geometry:'cylinder',position:[0,.9,0],size:[.19,1.1,.19],color:[.76,.84,.88,1]},
   ...(cradle?[{id:'trunnion',kind:'machine',geometry:'box',
    position:[0,-1.09,0],size:[4.3,.3,3.1],color:[.23,.34,.39,1]}]:[])
  ],
  toolpath:[
   {from:[-1,-.18,-.82],to:[-1,-.18,.82],motion:'G1'},
   {from:[-1,-.18,.82],to:[-.65,.2,.82],motion:'G0'},
   {from:[-.65,.2,.82],to:[-.65,-.18,.75],motion:'G1'},
   {from:[-.65,-.18,.75],to:[.78,-.18,.75],motion:'G1'}
  ],axisValues:{X:0,Y:0,Z:0,A:0,B:0,C:0}});
}
