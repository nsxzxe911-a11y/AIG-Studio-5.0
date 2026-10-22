/**
 * AIG Real3D 1.1 | numerical VOLUMETRIC stock removal, local and deterministic.
 *
 * Discrete 3D voxel occupancy, analytic swept CYLINDRICAL cutter center test,
 * physical mm cell-volume accounting and actual boundary mesh regeneration.
 * G0 traverses do not cut; G1 feed intersects swept tool. No G2/G3 cutter
 * support; no arbitrary spindle/holder collision or machine-kinematics proof.
 *
 * A cell is removed iff its CENTER is covered by tool volume along a G1
 * segment. This is a voxel approximation; exact surface finish and tool force
 * are not proven, and 0.001 mm geometric resolution is NOT inferred.
 */
import {createAIG3DMesh} from './aig-real3d-core.mjs';
export const AIG_STOCK_SCHEMA='AIG_REAL3D_NUMERICAL_STOCK_REMOVAL_V1_1';
const finite=Number.isFinite;
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(finite);
const nn=(x,lo,hi)=>finite(x)&&x>=lo&&x<=hi;
const idx=(s,x,y,z)=>x+s.nx*(y+s.ny*z);
export function createAIGVoxelStock({originMm=[0,0,0],sizeMm=[12,6,8],
 voxelMm=.5,maxCells=150000}={}){
 if(!vec(originMm)||!vec(sizeMm)||sizeMm.some(x=>x<=0||x>1000)||
 !nn(voxelMm,.05,25)||!Number.isInteger(maxCells)||maxCells<1||maxCells>250000)
  throw Error('AIG_STOCK_DIMENSIONS_OR_MM_INVALID');
 const ns=sizeMm.map(x=>x/voxelMm);
 if(ns.some(n=>Math.abs(n-Math.round(n))>1e-8||n<1||n>250))
  throw Error('AIG_STOCK_SIZE_MUST_BE_INTEGER_VOXEL_CELLS');
 const [nx,ny,nz]=ns.map(Math.round),n=nx*ny*nz;
 if(n>maxCells)throw Error('AIG_STOCK_VOXEL_MEMORY_BUDGET_BLOCKED');
 return {
  schema:AIG_STOCK_SCHEMA,originMm:[...originMm],sizeMm:[...sizeMm],
  voxelMm,nx,ny,nz,totalCells:n,
  occupancy:new Uint8Array(n).fill(1),
  removedCells:0,materialRemovedMm3:0,revision:0,history:[],
  sampleAccuracy:'VOXEL_CENTER_NOT_ANALYTIC_CONTINUOUS_MATERIAL',
  trueMmMachinePrecisionVerified:false,
  physicalFeedAndSpindleValidated:false
 };
}
export function createAIGCylindricalCutter({diameterMm,fluteLengthMm}={}){
 if(!nn(diameterMm,.05,1000)||!nn(fluteLengthMm,.05,1000))
  throw Error('AIG_TOOL_GEOMETRY_INVALID');
 return Object.freeze({diameterMm,fluteLengthMm,radiusMm:diameterMm/2,
  toolAxis:'POSITIVE_Z',sweepMethod:'ANALYTIC_CENTER_IN_CYLINDER'});
}
function cylinderSweptCenter(c,ax,ay,az,bx,by,bz,x,y,z){
 const dx=bx-ax,dy=by-ay,dz=bz-az,r2=c.radiusMm*c.radiusMm;
 // radial interval in parameter t in [0,1] where center is inside tool disc.
 const ux=ax-x,uy=ay-y,A=dx*dx+dy*dy,
 B=2*(ux*dx+uy*dy),C=ux*ux+uy*uy-r2;
 let lo=0,hi=1;
 if(A<1e-16){if(C>1e-10)return false;}
 else{
  const disc=B*B-4*A*C;
  if(disc<0)return false;
  const root=Math.sqrt(Math.max(0,disc));
  lo=Math.max(lo,(-B-root)/(2*A));hi=Math.min(hi,(-B+root)/(2*A));
  if(lo>hi)return false;
 }
 // Axial interval: cutter tip(t) <= z <= tip(t) + fluteLength.
 if(Math.abs(dz)<1e-13){
  if(z<az-1e-9||z>az+c.fluteLengthMm+1e-9)return false;
 }else{
  const t1=(z-c.fluteLengthMm-az)/dz,
   t2=(z-az)/dz;
  lo=Math.max(lo,Math.min(t1,t2));
  hi=Math.min(hi,Math.max(t1,t2));
 }
 return lo<=hi+1e-12;
}
function axisRange(stock,a,b,r,origin,n){
 let min=Math.max(0,Math.floor((Math.min(a,b)-r-origin)/stock.voxelMm)),
 max=Math.min(n-1,Math.ceil((Math.max(a,b)+r-origin)/stock.voxelMm)-1);
 return [min,max];
}
export function applyAIGFeedCut(stock,cutter,{
 from,to,motion='G1',source='LOCAL_VERIFIED_INPUT',record=true
}={}){
 if(stock?.schema!==AIG_STOCK_SCHEMA||!cutter||!nn(cutter.radiusMm,.025,500)||
 !nn(cutter.fluteLengthMm,.05,1000)||!vec(from)||!vec(to)||
 !['G0','G1'].includes(motion)||typeof source!=='string'||source.length<3||
 stock.history.length>10000)
  throw Error('AIG_STOCK_CUT_COMMAND_INVALID');
 if(motion==='G0')return {schema:AIG_STOCK_SCHEMA,motion,
  removedCells:0,removedMm3:0,remainingMm3:(stock.totalCells-stock.removedCells)*stock.voxelMm**3,
  revision:stock.revision,safeRapidDoesNotRemoveStock:true};
 const [ax,ay,az]=from,[bx,by,bz]=to;
 const [x0,x1]=axisRange(stock,ax,bx,cutter.radiusMm,stock.originMm[0],stock.nx),
 [y0,y1]=axisRange(stock,ay,by,cutter.radiusMm,stock.originMm[1],stock.ny),
 [z0,z1]=axisRange(stock,az,bz,cutter.fluteLengthMm,stock.originMm[2],stock.nz);
 let removed=0,alreadyVacant=0,checked=0;
 if(x0<=x1&&y0<=y1&&z0<=z1){
  for(let z=z0;z<=z1;z++)for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const off=idx(stock,x,y,z);
   const cx=stock.originMm[0]+(x+.5)*stock.voxelMm,
    cy=stock.originMm[1]+(y+.5)*stock.voxelMm,
    cz=stock.originMm[2]+(z+.5)*stock.voxelMm;
   checked++;
   if(!cylinderSweptCenter(cutter,ax,ay,az,bx,by,bz,cx,cy,cz))continue;
   if(stock.occupancy[off]){
    stock.occupancy[off]=0;removed++;
   }else alreadyVacant++;
  }
 }
 stock.removedCells+=removed;stock.materialRemovedMm3=stock.removedCells*stock.voxelMm**3;
 stock.revision++;
 const ev={motion,source,from:[...from],to:[...to],removedCells:removed,
  removedMm3:removed*stock.voxelMm**3,voxelMm:stock.voxelMm,alreadyVacant,
  checkedCells:checked,revision:stock.revision};
 if(record)stock.history.push(ev);
 return {...ev,remainingMm3:(stock.totalCells-stock.removedCells)*stock.voxelMm**3,
  true3DOccupancyChanged:removed>0};
}
export function auditAIGVoxelStock(stock){
 if(stock?.schema!==AIG_STOCK_SCHEMA||!(stock.occupancy instanceof Uint8Array)||
 stock.occupancy.length!==stock.totalCells)throw Error('AIG_STOCK_AUDIT_INVALID');
 const remaining=stock.occupancy.reduce((sum,x)=>sum+(x===1?1:0),0),
 removed=stock.totalCells-remaining;
 if(stock.removedCells!==removed||Math.abs(stock.materialRemovedMm3-removed*stock.voxelMm**3)>1e-7)
  throw Error('AIG_STOCK_REMOVED_VOLUME_DIGEST_INVALID');
 return {
  schema:AIG_STOCK_SCHEMA,totalCells:stock.totalCells,remainingCells:remaining,
  removedCells:removed,originalMm3:stock.totalCells*stock.voxelMm**3,
  remainingMm3:remaining*stock.voxelMm**3,
  removedMm3:removed*stock.voxelMm**3,
  voxelMm:stock.voxelMm,revision:stock.revision,
  actual3DOccupancyData:stock.occupancy.length===stock.totalCells,
  materialRemovalByFeedNumericallyVerified:removed>0,
  dimensionsMm:[...stock.sizeMm],
  continuousPhysicalSurfacePrecisionVerified:false,
  actualMachineAndPostSafetyVerified:false
 };
}
export function meshAIGVoxelStock(stock,{maxFaces=45000}={}){
 auditAIGVoxelStock(stock);
 if(!Number.isInteger(maxFaces)||maxFaces<6||maxFaces>160000)
  throw Error('AIG_STOCK_SURFACE_MESH_LIMIT_INVALID');
 const positions=[],normals=[],indices=[],d=stock.voxelMm,
  origin=stock.originMm,[nx,ny,nz]=[stock.nx,stock.ny,stock.nz];
 const inStock=(x,y,z)=>x>=0&&y>=0&&z>=0&&x<nx&&y<ny&&z<nz&&
  stock.occupancy[idx(stock,x,y,z)]===1;
 let quadCount=0;
 // For each occupied cell, emit ONLY exposed faces. Each triangle references
 // actual XYZ coordinates; removed voxels are absent in regenerated topology.
 const faces=[
  {axis:0,sign:1,n:[1,0,0],corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},
  {axis:0,sign:-1,n:[-1,0,0],corners:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},
  {axis:1,sign:1,n:[0,1,0],corners:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},
  {axis:1,sign:-1,n:[0,-1,0],corners:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},
  {axis:2,sign:1,n:[0,0,1],corners:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},
  {axis:2,sign:-1,n:[0,0,-1],corners:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}
 ];
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  if(!inStock(x,y,z))continue;
  for(const f of faces){
   const neighbour=[x,y,z];neighbour[f.axis]+=f.sign;
   if(inStock(...neighbour))continue;
   if(++quadCount>maxFaces)throw Error('AIG_STOCK_SURFACE_TRIANGLE_BUDGET_BLOCKED');
   const offset=positions.length/3;
   for(const p of f.corners){
    positions.push(origin[0]+(x+p[0])*d,
     origin[1]+(y+p[1])*d,origin[2]+(z+p[2])*d);
    normals.push(...f.n);
   }
   indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }
 }
 if(!quadCount)return {mesh:null,empty:true,quadCount:0,triangleCount:0};
 // Consistent outward winding is checked in regression against normals.
 return {mesh:createAIG3DMesh({positions,normals,indices,
  provenance:'CALCULATED_3D_VOXEL_STOCK_NUMERIC_NOT_PHYSICAL_CNC'}),
  empty:false,quadCount,triangleCount:quadCount*2};
}
