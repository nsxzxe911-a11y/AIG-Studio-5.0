#!/usr/bin/env node
/**
 * V100 actual TripoSR -> original-source AIG V99 -> V98 2D/3D handoff.
 * Rejects structurally incompatible GLB instead of treating any GLB header
 * as a successful film-ready native engine import.
 */
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {sha256AIGReal3DBytes,ingestAIGReal3DNativeGeneratedGLB}
 from '../formal-web/shared-3d/aig-real3d-v99-native-model-ingest.mjs';
import {connectAIGReal3DImportedGeometryToUnified4K}
 from '../formal-web/shared-3d/aig-real3d-v99-ai-inference-adapter.mjs';

export const V100_HANDOFF_SCHEMA='AIG_REAL3D_V100_ACTUAL_GLTF_SOURCE_ENGINE_HANDOFF_V1';
export async function validateV100Handoff({
 imageBytes,glbBytes,domain='PERSON',assetId='V100ImportedAsset'
}={}){
 const imageSHA=await sha256AIGReal3DBytes(imageBytes);
 const glbSHA=await sha256AIGReal3DBytes(glbBytes);
 const imported=await ingestAIGReal3DNativeGeneratedGLB({
  glbBytes,referenceImageBytes:imageBytes,
  declaredImageSha256:imageSHA,declaredGLBSha256:glbSHA,
  domain,assetId,outputOrigin:'LOCAL_MODEL_OUTPUT',sourceUnits:'METERS'
 });
 const bridge=connectAIGReal3DImportedGeometryToUnified4K({imported});
 if(bridge.shared.record.sourceGeometrySha256!==glbSHA||
  bridge.shared.record.originalImageSha256!==imageSHA)
  throw Error('V100_ORIGINAL_SOURCE_AND_V98_SHA_MISMATCH');
 return {schema:V100_HANDOFF_SCHEMA,
  status:'V99_NATIVE_INDEXED_GEOMETRY_AND_V98_SHARED_SOURCE_PASS',
  originalImageSHA256:imageSHA,originalSourceGLBSHA256:glbSHA,
  originalIndexedTriangles:imported.sourceTriangles,
  sourceNodes:imported.nodeCount,
  originalFaceTopologyPreserved:imported.perMesh.every(x=>x.originalFaceIndicesRetained),
  inferredBackNeverCertified:true,
  noV95FallbackOrProceduralBody:true,
  AIGEngineGLBImporterActuallyRan:true,
  sourceAssetSharedWithV98:true,
  mlInferenceActuallyExecutedByThisValidator:false,
  originalFaceIdentityApproved:false,
  sourceAppearance4KFilmCertified:false,releasePASS:false};
}
async function main(args){
 if(args.length!==4||args[0]!=='--image'||args[2]!=='--glb')
  throw Error('USAGE: --image /path/input.png --glb /path/real-3d.glb');
 const [image,glb]=await Promise.all([
  readFile(resolve(args[1])),readFile(resolve(args[3]))]);
 return validateV100Handoff({imageBytes:new Uint8Array(image),
  glbBytes:new Uint8Array(glb)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main(process.argv.slice(2)).then(x=>console.log(JSON.stringify(x,null,2))).catch(e=>{
  console.error(JSON.stringify({schema:V100_HANDOFF_SCHEMA,status:'BLOCK',
   reason:String(e.message??e),actualEngineImportPASS:false,releasePASS:false}));
  process.exitCode=2;
 });
}
