/** Read-only hit testing on exact projected OBJ indexed defect edges. */
import {AIG_NATIVE_DEFECT_PROJECTION_SCHEMA} from './aig-real3d-source-defect-projection.mjs';
export const AIG_REAL3D_EDGE_PICK_SCHEMA='AIG_REAL3D_TRUE_SOURCE_EDGE_PICK_V1';
export function pickAIGReal3DDefectEdge({projection,x,y,tolerancePx=24}={}){
 if(projection?.schema!==AIG_NATIVE_DEFECT_PROJECTION_SCHEMA||
 !Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(tolerancePx)||
 tolerancePx<1||tolerancePx>80)
  throw Error('DEFECT_PICK_SOURCE_COORDINATES_REQUIRED');
 let winner=null,min=Infinity;
 for(const edge of projection.projectedEdges){
  const a=edge.start,b=edge.end,dx=b.x-a.x,dy=b.y-a.y,
   denom=dx*dx+dy*dy;
  // Degenerate projected segments are pickable as a POINT in this view.
  const t=denom>1e-8?Math.min(1,Math.max(0,
   ((x-a.x)*dx+(y-a.y)*dy)/denom)):0;
  const px=a.x+t*dx,py=a.y+t*dy;
  const dist=Math.hypot(x-px,y-py);
  if(dist<min){min=dist;winner=edge;}
 }
 if(!winner||min>tolerancePx)return {
  schema:AIG_REAL3D_EDGE_PICK_SCHEMA,selected:false,
  angle:projection.angle,sourceSha256:projection.sourceSha256,
  nearestDistancePx:Number.isFinite(min)?+min.toFixed(3):null,
  noSourceMeshChanges:true
 };
 return {
  schema:AIG_REAL3D_EDGE_PICK_SCHEMA,selected:true,
  angle:projection.angle,sourceSha256:projection.sourceSha256,
  nearestDistancePx:+min.toFixed(3),
  edge:{
   type:winner.type,regionId:winner.regionId,
   startVertexIndex:winner.startVertexIndex,
   endVertexIndex:winner.endVertexIndex,
   startWorldMeters:winner.startWorldMeters,
   endWorldMeters:winner.endWorldMeters,
   startPixel:winner.start,endPixel:winner.end
  },
  rawSourceVertexCoordinatesOnly:true,
  notRealAnatomicalRepair:true,
  noSourceMeshChanges:true
 };
}
/** CSS object-fit:contain inverse (handles letterboxing in mobile figures). */
export function canvasClickToAIGSourcePixel({
 clickX,clickY,rectWidth,rectHeight,
 imageWidth=1080,imageHeight=1920
}={}){
 if(![clickX,clickY,rectWidth,rectHeight,imageWidth,imageHeight].every(Number.isFinite)||
 rectWidth<=0||rectHeight<=0||imageWidth<1||imageHeight<1)
  throw Error('DEFECT_PICK_IMAGE_RECT_INVALID');
 const scale=Math.min(rectWidth/imageWidth,rectHeight/imageHeight);
 const drawnW=imageWidth*scale,drawnH=imageHeight*scale;
 const left=(rectWidth-drawnW)/2,top=(rectHeight-drawnH)/2;
 const x=(clickX-left)/scale,y=(clickY-top)/scale;
 return {
  x,y,inside:x>=0&&x<imageWidth&&y>=0&&y<imageHeight,
  scale,letterboxX:left,letterboxY:top
 };
}
