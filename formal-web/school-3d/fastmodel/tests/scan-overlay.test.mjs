import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCAN_MODES,SCAN_DENSITIES,scanBudget,buildScanOverlay,scanProject,paintScanOverlay} from '../web/scan-overlay.mjs';
const m=(x=0,y=0,z=0)=>Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]);
function fixture(){
 const values=[
  Float32Array.from([0,0,0,1,0,0,0,1,0,1,1,0]),
  Uint16Array.from([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]),
  Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]),
  Uint32Array.from([0,1,2,2,1,3])
 ];
 const file={g:{nodes:[
  {children:[1]},
  {children:[2],extras:{aigSkeletonRegion:'head-neck'}},
  {extras:{aigSkeletonRegion:'head-neck'}},
  {mesh:0,skin:0,extras:{aigAnatomyPart:'neck'}}
 ],skins:[{joints:[0,1,2]}],meshes:[{primitives:[{mode:4,
 attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3}]}]}};
 const reader=(_,id)=>values[id];
 return {file,reader};
}
function mockCanvas(){
 const dashes=[],segments=[],strokes=[];
 const ctx={setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},
   moveTo(...p){segments.push(['M',...p]);},lineTo(...p){segments.push(['L',...p]);},
   stroke(){strokes.push(segments.length);},setLineDash(a){dashes.push([...a]);}};
 return {clientWidth:600,clientHeight:360,width:0,height:0,
  getContext:()=>ctx,dashes,segments,strokes};
}
const view=file=>({file,width:1920,height:1080,angle:0,zoom:1,zoomFactor:1,center:[0,0,0]});
test('separate scan visual modes, bounded overlays, clean default; no full triangle grid',()=>{
 assert.deepEqual([...SCAN_MODES],['off','bones','bones-outline','head-neck','hair']);
 assert.deepEqual([...SCAN_DENSITIES],['eco','balanced','detail']);
 assert.ok(scanBudget('eco').segments<scanBudget('detail').segments);
 assert.throws(()=>scanBudget('unknown'),/SCAN_DENSITY_INVALID/);
 const {file,reader}=fixture(),top=buildScanOverlay(file,reader);
 assert.equal(top.status,'SOURCE_READY');
 assert.equal(top.bones.length,2);
 assert.equal(top.surfaces.length,1);
 assert.equal(top.triangles,2);
 const canvas=mockCanvas(),world=[m(),m(0,1),m(0,2),m()];
 const solid=paintScanOverlay(canvas,view(file),top,world,{mode:'bones'});
 assert.equal(solid.bonesDrawn,2);assert.equal(solid.dashedSegments,0);
 assert.ok(canvas.dashes.some(x=>x.length===0));
 assert.equal(canvas.dashes.some(x=>x.length>0),false);
 const both=paintScanOverlay(canvas,view(file),top,world,{mode:'bones-outline'});
 assert.equal(both.bonesDrawn,2);
 assert.equal(both.dashedSegments,4); // topological outer boundary only, no central diagonal
 assert.equal(both.meshTrianglesDrawn,0);
 assert.ok(canvas.dashes.some(x=>x.join(',')==='5,6'));
 assert.equal(both.trueDepthHiddenVerified,false);
 assert.equal(both.scanLayersSeparate,true);
 const focus=paintScanOverlay(canvas,view(file),top,world,{mode:'head-neck'});
 assert.equal(focus.bonesDrawn,2);assert.equal(focus.dashedSegments,4);
 const hair=paintScanOverlay(canvas,view(file),top,world,{mode:'hair'});
 assert.equal(hair.bonesDrawn,0);assert.equal(hair.dashedSegments,0); // no fake hair
 const off=paintScanOverlay(canvas,view(file),top,world,{mode:'off'});
 assert.equal(off.status,'SCAN_OFF');
});
test('solid bone projection follows a changing real pose while 3D GLB is untouched',()=>{
 const {file,reader}=fixture(),top=buildScanOverlay(file,reader),before=JSON.stringify(file.g);
 const a=mockCanvas(),v=view(file),first=[m(),m(0,1),m(0,2),m()];
 paintScanOverlay(a,v,top,first,{mode:'bones'});
 const lines1=a.segments.filter(s=>s[0]==='L');
 const b=mockCanvas(),second=[m(),m(0,1),m(0.5,2),m()];
 paintScanOverlay(b,v,top,second,{mode:'bones'});
 const lines2=b.segments.filter(s=>s[0]==='L');
 assert.notDeepEqual(lines1,lines2);
 assert.equal(JSON.stringify(file.g),before);
 assert.deepEqual(scanProject([0,0,0],v,600,360),[300,180]);
});
test('nonrigged scenes, invalid dense inputs and no viewport block without fake skeleton',()=>{
 const {file,reader}=fixture();
 assert.equal(buildScanOverlay({...file,g:{...file.g,skins:[]}},reader).status,'BLOCKED_NO_SKIN');
 const tooDense={...file,g:{...file.g,meshes:[{primitives:[{
   attributes:{POSITION:0,JOINTS_0:1,WEIGHTS_0:2},indices:3}]}]}};
 const valid=buildScanOverlay(tooDense,reader,{density:'eco'});
 assert.ok(valid.triangles<=1600);
 assert.throws(()=>buildScanOverlay(file,reader,{density:'impossible'}),/SCAN_DENSITY_INVALID/);
 const result=paintScanOverlay(mockCanvas(),{...view(file),width:0},buildScanOverlay(file,reader),[m(),m(),m(),m()],{mode:'bones'});
 assert.ok(result.status); // no claims about GPU hardware capability
});
test('UI and renderer bind real scan callback, standalone packer strips module imports',()=>{
 const root=new URL('../',import.meta.url);
 const read=p=>fs.readFileSync(new URL(p,root),'utf8');
 const h=read('web/index.html'),main=read('web/main.mjs'),r=read('web/renderer.mjs'),packer=read('tools/build_standalone.py');
 for(const id of ['scan-overlay','scan-mode','scan-density','scan-layer-status','scan-btn'])assert.ok(h.includes('id="'+id+'"'),id);
 assert.match(h,/value="off" selected/);
 for(const x of ['buildScanOverlay(f,readAccessor','paintScanOverlay(scanCanvas,view,scanTopology,world',
  "view.setWireMode('off','balanced')",'view.onScanFrame=(world,ts)=>',
  "el('scan-mode').value='bones-outline'"])assert.ok(main.includes(x),x);
 assert.ok(r.includes('this.onScanFrame(this.scanWorldCache,ts)'));
 assert.ok(packer.includes('scan-overlay.mjs'));
 assert.ok(packer.includes("'\\n'+scanOverlay+'\\n'"));
 assert.ok(!h.includes('id="scan-simulated-skeleton"'));
});
