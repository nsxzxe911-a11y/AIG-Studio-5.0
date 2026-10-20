/** FastModel 1.7 - local face REGION detection reference only.
 * FaceDetector browser API when available; manual rectangle when unavailable.
 * NO identity recognition, face templates, network, biometrics, or 3D reconstruction.
 */
export const MAX_FACE_IMAGE_BYTES=15*1024*1024;
export const MAX_FACE_PIXELS=16*1024*1024;
export const FACE_SOURCE=Object.freeze(['BROWSER_FACE_DETECTOR','USER_MANUAL_RECTANGLE']);
export function preflightFaceImage(file,{maxBytes=MAX_FACE_IMAGE_BYTES}={}){
 if(!file||typeof file.size!=='number'||!Number.isFinite(file.size)||file.size<=0||file.size>maxBytes)
  return {allowed:false,reason:'FACE_FILE_SIZE'};
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))
  return {allowed:false,reason:'FACE_FILE_FORMAT'};
 return {allowed:true,reason:'OK'};
}
export function preflightFaceDimensions(width,height){
 return Number.isInteger(width)&&Number.isInteger(height)&&width>=32&&height>=32&&
    width*height<=MAX_FACE_PIXELS;
}
export function clampFaceRect(rect,width,height){
 if(!rect||!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)
  throw Error('FACE_INVALID_FRAME');
 const vals=[rect.x,rect.y,rect.width,rect.height];
 if(!vals.every(Number.isFinite)||rect.width<=0||rect.height<=0)throw Error('FACE_INVALID_BOUNDS');
 const x=Math.max(0,Math.min(width,rect.x)),y=Math.max(0,Math.min(height,rect.y));
 const right=Math.max(x,Math.min(width,rect.x+rect.width));
 const bottom=Math.max(y,Math.min(height,rect.y+rect.height));
 if(right-x<2||bottom-y<2)throw Error('FACE_TOO_SMALL');
 return {x,y,width:right-x,height:bottom-y};
}
export function faceNormalizedBox(rect,width,height){
 const b=clampFaceRect(rect,width,height);
 return {x:b.x/width,y:b.y/height,width:b.width/width,height:b.height/height};
}
export function manualFaceRectangle(start,end,width,height){
 if(!start||!end||![start.x,start.y,end.x,end.y].every(Number.isFinite))throw Error('FACE_INVALID_DRAG');
 return clampFaceRect({x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),
  width:Math.abs(end.x-start.x),height:Math.abs(end.y-start.y)},width,height);
}
export function normalizeNativeFaces(faces,width,height){
 if(!Array.isArray(faces))throw Error('FACE_DETECTOR_BAD_RESULT');
 return faces.slice(0,8).flatMap(face=>{
  try{
   const b=clampFaceRect(face.boundingBox,width,height);
   const landmarks=[];
   for(const entry of face.landmarks||[]){
    const type=typeof entry.type==='string'?entry.type:'unspecified';
    if(!Array.isArray(entry.locations))continue;
    for(const point of entry.locations){
     if(Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.y>=0&&point.x<=width&&point.y<=height)
      landmarks.push({type,x:point.x,y:point.y});
    }
   }
   return [{bbox:b,box:faceNormalizedBox(b,width,height),landmarks:landmarks.slice(0,40),
    source:'BROWSER_FACE_DETECTOR',identityRecognized:false,geometryReconstructed:false}];
  }catch{return [];}
 });
}
export function isNativeFaceDetectorAvailable(runtime=globalThis){
 return typeof runtime?.FaceDetector==='function';
}
export async function detectNativeFaces(bitmap,{runtime=globalThis,maxFaces=4}={}){
 if(!isNativeFaceDetectorAvailable(runtime))return {available:false,reason:'FACE_DETECTOR_UNAVAILABLE',faces:[]};
 if(!Number.isInteger(maxFaces)||maxFaces<1||maxFaces>8)throw Error('FACE_BAD_LIMIT');
 const instance=new runtime.FaceDetector({fastMode:true,maxDetectedFaces:maxFaces});
 const hits=await instance.detect(bitmap);
 return {available:true,reason:'OK',faces:normalizeNativeFaces(hits,bitmap.width,bitmap.height)};
}
export function getReferenceFacePoint(face){
 if(!face?.bbox)throw Error('FACE_NOT_SELECTED');
 // 2D face crop center. No invented pupils/nose/3D landmarks.
 return {x:face.bbox.x+face.bbox.width/2,y:face.bbox.y+face.bbox.height/2,
  source:face.source,identityRecognized:false,spatialDepthKnown:false};
}
