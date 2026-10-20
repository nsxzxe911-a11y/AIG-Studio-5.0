/** FastModel 1.6 structural guard and honest head/neck diagnostic.
 * Metadata is deliberately explicit: never infer biological anatomy from skin index,
 * mesh name, hair color, or a 2D projected photo.
 * Not a topological weld/continuity or collision proof.
 */
export const PROTECTED_ANATOMY=Object.freeze(['head','neck','face','scalp']);
export function auditAnatomyMetadata(file){
 const g=file?.g;if(!g||!Array.isArray(g.nodes)||!Array.isArray(g.meshes))throw Error('ANATOMY_NO_GLB');
 const protectedMaterials=new Set(),protectedNodes=[],unclassified=[];
 for(let i=0;i<g.nodes.length;i++){
   const node=g.nodes[i];if(node.mesh===undefined)continue;
   const mesh=g.meshes[node.mesh];
   if(!mesh||!Array.isArray(mesh.primitives))throw Error('ANATOMY_MESH_INDEX_INVALID');
   const role=node.extras?.aigAnatomyPart;
   if(PROTECTED_ANATOMY.includes(role)){
     protectedNodes.push({index:i,role});
     for(const primitive of mesh.primitives)protectedMaterials.add(primitive.material??0);
   }else unclassified.push(i);
 }
 const roles=new Set(protectedNodes.map(x=>x.role));
 return {
  source:'EXPLICIT_NODE_EXTRAS_ONLY',
  status:roles.has('head')&&roles.has('neck')?'HEAD_NECK_METADATA_FOUND_CONTINUITY_NOT_PROVEN':'UNVERIFIED_MISSING_HEAD_OR_NECK_METADATA',
  headTagged:roles.has('head'),neckTagged:roles.has('neck'),
  protectedNodes,protectedMaterials,unclassifiedMeshCount:unclassified.length,
  actualGeometricContinuityVerified:false,
  bonesOrSkinIndexUsedForAnatomyGuess:false
 };
}
