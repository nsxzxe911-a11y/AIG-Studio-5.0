import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAIGScanNativeOBJ,buildAIGReal3DScanNative,
 AIG_SCAN_NATIVE_SCHEMA} from '../aig-real3d-scan-native-mesh.mjs';
import {auditAIG3DScene} from '../aig-real3d-core.mjs';

/** Anonymous synthetic closed capsule fixture ONLY for testing the parser.
 * Never show it as an approved human or as a visual reconstruction. */
function fixture({rings=42,segments=44,open=false}={}){
 const vs=[],fs=[];
 for(let j=0;j<rings;j++){
  const t=j/(rings-1),theta=Math.PI*t,
   r=Math.max(.008,Math.sin(theta));
  for(let k=0;k<segments;k++){
   const a=2*Math.PI*k/segments;
   vs.push('v '+(.25*r*Math.cos(a)).toFixed(8)+' '+
    t.toFixed(8)+' '+(.15*r*Math.sin(a)).toFixed(8));
  }
 }
 for(let j=0;j<rings-1;j++)for(let k=0;k<segments;k++){
  if(open&&j===11&&k===5)continue;
  const a=j*segments+k+1,b=j*segments+(k+1)%segments+1,
   c=(j+1)*segments+k+1,d=(j+1)*segments+(k+1)%segments+1;
  fs.push('f '+a+' '+b+' '+d,'f '+a+' '+d+' '+c);
 }
 vs.push('v 0 0 0','v 0 1 0');
 const top=rings*segments+1,bottom=top+1;
 for(let k=0;k<segments;k++){
  const next=(k+1)%segments;
  fs.push('f '+top+' '+(next+1)+' '+(k+1));
  fs.push('f '+bottom+' '+((rings-1)*segments+k+1)+' '+
   ((rings-1)*segments+next+1));
 }
 return vs.concat(fs).join('\n');
}
test('local OBJ is consumed as real indexed XYZ, with no model generation',()=>{
 const obj=fixture();
 const raw=parseAIGScanNativeOBJ(obj);
 assert.ok(raw.original.length>1800);
 assert.ok(raw.indices.length/3>2000);
 const b=buildAIGReal3DScanNative({objText:obj,heightMm:1680,
  sourceSha256:'0000000000000000000000000000000000000000000000000000000000000000'});
 const x=b.evidence;
 assert.equal(x.schema,AIG_SCAN_NATIVE_SCHEMA);
 assert.equal(x.geometryPASS,true);
 assert.equal(x.connectedComponents,1);
 assert.equal(x.openEdges,0);
 assert.equal(x.nonManifoldEdges,0);
 assert.equal(x.actualVertices,raw.original.length);
 assert.equal(x.actualTriangles,raw.indices.length/3);
 assert.equal(x.measuredHeightMm,1680);
 assert.ok(x.widthToHeight>.22&&x.depthToHeight>.08);
 assert.equal(auditAIG3DScene(b.scene).triangleCount,x.actualTriangles);
 assert.equal(b.scene.nodes.length,1);
 assert.equal(b.scene.nodes[0].id,'sourceNativeBody');
 // Synthetic capsule is topologically valid but NOT a human scan or anatomy!
 assert.equal(x.sourceNotProvenHumanScan,true);
 assert.equal(x.authenticityVerified,false);
 assert.equal(x.faceHandsFeetVisuallyApproved,false);
 assert.equal(x.landmarkAudit.complete,false);
 assert.equal(x.stage1ReleasePASS,false);
 assert.equal(b.releasePASS,false);
});
test('holes are blocked by true measured topology, not guessed from appearance',()=>{
 const b=buildAIGReal3DScanNative({objText:fixture({open:true}),heightMm:1700});
 assert.ok(b.evidence.openEdges>=4);
 assert.ok(b.evidence.geometricErrors.includes('OPEN_OR_NONMANIFOLD_BODY_MESH'));
 assert.equal(b.evidence.geometryPASS,false);
 assert.equal(b.releasePASS,false);
});
test('Y-Up and Z-Up convert source mesh to the same measured standing height',()=>{
 const obj=fixture();
 const converted=obj.split('\n').map(line=>{
  if(!line.startsWith('v '))return line;
  const [tag,x,y,z]=line.split(' ');
  return [tag,x,(-Number(z)).toFixed(8),y].join(' ');
 }).join('\n');
 const a=buildAIGReal3DScanNative({objText:obj,heightMm:1800});
 const b=buildAIGReal3DScanNative({objText:converted,heightMm:1800,upAxis:'Z'});
 assert.equal(b.evidence.measuredHeightMm,a.evidence.measuredHeightMm);
 assert.equal(b.evidence.actualTriangles,a.evidence.actualTriangles);
 assert.equal(b.evidence.geometryPASS,true);
 assert.ok(Math.abs(a.scene.nodes[0].mesh.bounds.max[1]-1.8)<1e-6);
 assert.ok(Math.abs(b.scene.nodes[0].mesh.bounds.max[1]-1.8)<1e-6);
});
test('an OBJ reference to external mtllib is never fetched or counted as source',()=>{
 const v=fixture(),obj='mtllib https://untrusted.invalid/malicious.mtl\n'+
  'usemtl red\n'+v;
 assert.equal(parseAIGScanNativeOBJ(obj).indices.length,
  parseAIGScanNativeOBJ(v).indices.length);
});
test('source/height/method errors never silently become an approved template',()=>{
 const v=fixture();
 assert.throws(()=>buildAIGReal3DScanNative({objText:v,heightMm:0}),
  /MEASURED_HEIGHT/);
 assert.throws(()=>buildAIGReal3DScanNative({objText:v,heightMm:1680,upAxis:'X'}),
  /UP_AXIS/);
 assert.throws(()=>buildAIGReal3DScanNative({objText:v,heightMm:1680,sourceName:'x.glb'}),
  /LOCAL_OBJ_ONLY/);
 assert.throws(()=>parseAIGScanNativeOBJ('v 0 0 0\nf 1 2 3'),
  /SOURCE_TEXT_SIZE|BAD_FACE_INDEX/);
 assert.throws(()=>parseAIGScanNativeOBJ(v.replace(/^v .*$/m,'v nan 0 0')),
  /NONFINITE_VERTEX/);
 assert.throws(()=>parseAIGScanNativeOBJ(v.replace(/^f .*$/m,'f 1 1 3')),
  /DUPLICATE_FACE_VERTEX/);
});
test('landmark labels alone cannot approve scan authenticity or natural facial detail',()=>{
 const obj=fixture();
 const markers={headTop:[0,1,0],chin:[0,.86,0],noseTip:[0,.90,-.15]};
 const b=buildAIGReal3DScanNative({objText:obj,heightMm:1680,landmarks:markers});
 assert.equal(b.evidence.landmarkAudit.provided,true);
 assert.equal(b.evidence.landmarkAudit.complete,false);
 assert.equal(b.evidence.stage1ReleasePASS,false);
});
