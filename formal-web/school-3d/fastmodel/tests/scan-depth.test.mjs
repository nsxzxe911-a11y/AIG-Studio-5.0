import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCAN_DEPTH_MODES,scanDepthBudget,scanDepthCoordinate,sampleSourceDepth,classifySourceOcclusion} from '../web/scan-depth.mjs';
import {paintScanOverlay} from '../web/scan-overlay.mjs';
const matrix=()=>Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const view={angle:0,zoom:1,zoomFactor:1,center:[0,0,0],width:1920,height:1080,file:{g:{skins:[{joints:[0]}]}}};
function canvas(){
 const strokes=[],ctx={setTransform(){},clearRect(){},save(){},restore(){},lineWidth:0,strokeStyle:'',
 current:[],dash:[],beginPath(){this.current=[];},moveTo(...p){this.current.push(['M',...p]);},lineTo(...p){this.current.push(['L',...p]);},
 setLineDash(a){this.dash=[...a];},stroke(){strokes.push({dash:[...this.dash],color:this.strokeStyle,vertices:this.current.length});}};
 return {clientWidth:640,clientHeight:360,width:0,height:0,getContext:()=>ctx,strokes};
}
const onePlane={
 indices:Uint32Array.from([0,1,2]),
 vertices:[{x:.1,y:.1,z:-.65},{x:.9,y:.1,z:-.65},{x:.5,y:.9,z:-.65}]
};
const position=(_s,i)=>onePlane.vertices[i];
test('source triangle CPU grid correctly resolves a nearer screen-space occluder',()=>{
 assert.deepEqual([...SCAN_DEPTH_MODES],['off','sampled']);
 const depth=sampleSourceDepth([onePlane],position,{density:'balanced'});
 assert.equal(depth.status,'SAMPLED_SOURCE_TRIANGLE_DEPTH');
 assert.equal(depth.triangles,1);
 assert.equal(depth.actualGpuDepthTest,false);
 assert.ok(depth.cellTests>1&&depth.cellTests<=35000);
 const behind={x:.47,y:.5,z:+.18},other={x:.53,y:.5,z:+.18};
 assert.equal(classifySourceOcclusion(depth,behind,other),'behind-sampled-surface');
 assert.equal(classifySourceOcclusion(depth,{...behind,z:-.8},{...other,z:-.8}),'not-behind-sampled-surface');
 assert.equal(classifySourceOcclusion(depth,{...behind,z:-.65},{...other,z:-.65}),'not-behind-sampled-surface');
 assert.equal(classifySourceOcclusion(depth,{x:-1,y:-1,z:0},{x:-.4,y:-.4,z:0}),'unknown');
});
test('bounded phone depth budget and shader-matching rotated GLB depth sign',()=>{
 assert.ok(scanDepthBudget('eco').maxTriangles<scanDepthBudget('detail').maxTriangles);
 assert.ok(scanDepthBudget('eco').maxCellTests<scanDepthBudget('balanced').maxCellTests);
 assert.throws(()=>scanDepthBudget('maximum'),/SCAN_DEPTH_DENSITY_INVALID/);
 const v={angle:0,center:[0,0,0]};
 assert.ok(scanDepthCoordinate([0,0,-1],v)<scanDepthCoordinate([0,0,1],v));
 assert.equal(scanDepthCoordinate([0,0,-100],v),-.95);
 const rotated={angle:Math.PI/2,center:[0,0,0]};
 assert.ok(scanDepthCoordinate([1,0,0],rotated)<scanDepthCoordinate([-1,0,0],rotated));
 const many=Array.from({length:1500},()=>onePlane);
 const sampled=sampleSourceDepth(many,position,{density:'eco'});
 assert.equal(sampled.incomplete,true);
 assert.ok(sampled.triangles<=scanDepthBudget('eco').maxTriangles);
 assert.ok(sampled.cellTests<=scanDepthBudget('eco').maxCellTests);
 assert.equal(sampled.fullyRenderedSceneDepth,false);
 assert.throws(()=>classifySourceOcclusion(sampled,{},{} ,{epsilon:-1}),/SCAN_DEPTH_CLASSIFY_INPUT/);
});
test('live scan overlay distinguishes hidden finer-dashed edges and preserves real GLB/colors',()=>{
 // Two overlapping source triangles: front z=-1 hides an outlined rear z=+1.
 const front={skin:0,role:'hair',indices:Uint32Array.from([0,1,2]),
 positions:Float32Array.from([-.8,-.8,-1,.8,-.8,-1,0,.8,-1]),
 joints:Uint16Array.from(Array(12).fill(0)),weights:Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),
 edges:[]};
 const back={skin:0,role:'neck',indices:Uint32Array.from([0,1,2]),
 positions:Float32Array.from([-.3,-.3,1,.3,-.3,1,0,.3,1]),
 joints:Uint16Array.from(Array(12).fill(0)),weights:Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),
 edges:[{a:0,c:1,faces:[0]},{a:1,c:2,faces:[0]},{a:2,c:0,faces:[0]}]};
 const topo={status:'SOURCE_READY',bones:[{parent:0,child:1,role:'head-neck'}],surfaces:[front,back],inverse:[[matrix()]],omitted:0};
 const old=JSON.stringify(topo.bones),c=canvas();
 const result=paintScanOverlay(c,view,topo,[matrix(),matrix()],{depthMode:'sampled',mode:'bones-outline',density:'balanced'});
 assert.equal(result.sampledDepthTriangles,2);
 assert.ok(result.occludedSegments>0,'front plane actually occludes rear outlined mesh in projected depth');
 assert.ok(c.strokes.some(s=>s.dash.join(',')==='2,5'),'occluded outline has short dashes');
 assert.ok(c.strokes.some(s=>s.dash.length===0),'bones stay SOLID');
 assert.equal(result.realGpuDepthVerified,false);
 assert.equal(result.actualAnimatedCollisionProved,false);
 assert.equal(result.sourceMaterialColorsUntouched,true);
 assert.equal(JSON.stringify(topo.bones),old);
 const bare=paintScanOverlay(canvas(),view,topo,[matrix(),matrix()],{depthMode:'off',mode:'bones-outline'});
 assert.equal(bare.sampledDepthTriangles,0);
 assert.equal(bare.occludedSegments,0);
});
test('2.3 UI live callback, mobile cadence, offline import and benchmark export are wired',()=>{
 const root=new URL('../',import.meta.url),get=p=>fs.readFileSync(new URL(p,root),'utf8');
 const html=get('web/index.html'),main=get('web/main.mjs'),packer=get('tools/build_standalone.py');
 for(const id of ['scan-depth','scan-depth-status'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('<option value="sampled" selected>'));
 assert.ok(main.includes("el('scan-depth').addEventListener('change',applyScanMode)"));
 assert.ok(main.includes("scanCanvas.clientWidth<650"));
 assert.ok(main.includes("smallViewport?90:50"));
 assert.ok(main.includes("view.lastCPU>25?'off'"));
 assert.ok(main.includes("depthMode:el('scan-depth').value"));
 assert.ok(packer.includes('scan-depth.mjs'));
 assert.ok(packer.includes("'\\n'+scanColors+'\\n'+scanDepth+'\\n'+scanOverlay"));
});
