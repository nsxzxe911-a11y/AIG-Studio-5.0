'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(dir,file)=>fs.readFileSync(path.join(root,dir,file),'utf8');
const html=()=>read('formal-web','mobile-runtime.html');
const body=()=>html().slice(html().indexOf('function makeGlScene('),html().indexOf('function makeRuntime(',html().indexOf('function makeGlScene(')));
test('fidelity V4 source matches actual Render assets',()=>{
 for(const file of ['mobile-runtime.html','authority/aigii-axis-fidelity-v4.css','service-worker.js'])
  assert.equal(read('web',file),read('formal-web',file),file);
});
test('FAST, BALANCED and DETAIL are real selectable per-axis callbacks with stable IDs',()=>{
 const s=html();
 assert.match(s,/data-button-id="BTN_'\+axis\+'_MACHINE"/);
 assert.match(s,/data-button-id="BTN_'\+axis\+'_NC_FIRST"/);
 for(const p of ['FAST','BALANCED','DETAIL']){
  assert.ok(s.includes('data-render-quality="'+p+'"'));
  assert.ok(s.includes('SET_VISUAL_'+p));
 }
 assert.match(s,/glScene\?\.setQuality\?\.\(b\.dataset\.renderQuality\)/);
 assert.match(s,/root\.dataset\.axisSubpage=subpage/);
 assert.match(s,/const gridEl=root\.querySelector\("\[data-cut-resolution\]"\)/);
 assert.match(s,/const fidelity=glScene\?\.getFidelity\?\.\(\)/);
});
test('higher-quality pixel density and grid are real, bounded values',()=>{
 const t=body();
 assert.match(t,/DETAIL:\{height:104,xy:56,z:36,dpr:3,pixels:8200000,steps:140\}/);
 assert.match(t,/FAST:\{height:40,xy:26,z:16,dpr:1\.5,pixels:1800000,steps:56\}/);
 assert.match(t,/Math\.sqrt\(cfg\.pixels\/cssArea\)/);
 assert.match(t,/removalCache\.n=FIDELITY\[quality\]\.height/);
 assert.match(t,/voxelCache\.nx=FIDELITY\[quality\]\.xy/);
 assert.match(t,/removalCache\.parsed=null/);
 assert.match(t,/voxelCache\.parsed=null/);
});
test('heightfield no longer leaves an artificial 0.15mm uncut bottom',()=>{
 const t=body();
 const a=t.indexOf('function cutSample('),b=t.indexOf('function cutBlock(',a);
 const fragment=t.slice(a,b);
 const cache={stockTop:0,stockBottom:-5,n:5,cellX:1,cellY:1,minX:0,minY:0};
 const run=new Function('removalCache',fragment+'return cutSample;')(cache);
 const heights=new Float32Array(25);
 run(heights,{X:2,Y:2,Z:-5},.6);
 assert.equal(heights[2+5*2],-5);
 assert.doesNotMatch(fragment,/stockBottom\+\.15/);
});
test('rotary voxel cutter scopes work to tool envelope rather than entire stock',()=>{
 const t=body(),a=t.indexOf('function voxelCutSample('),b=t.indexOf('function voxelCutBlock(',a);
 const fragment=t.slice(a,b);
 const v={nx:60,ny:60,nz:40,sx:1,sy:1,sz:1,minX:0,minY:0,minZ:0};
 let probes=0;
 const cache=new Uint8Array(v.nx*v.ny*v.nz);cache.fill(1);
 const f=new Function('axis','voxelCache','inverseRotABPoint','inverseRotABVector',
 'sceneBlockToolDia','voxelIndex','voxelCenter',fragment+'return voxelCutSample;')(
 '6AX',v,
 p=>{probes++;return p},p=>p,
 ()=>4,
 (ix,iy,iz)=>iz*v.nx*v.ny+iy*v.nx+ix,
 (ix,iy,iz)=>({x:ix+.5,y:iy+.5,z:iz+.5})
 );
 f(cache,{X:22,Y:22,Z:16,A:0,B:0,C:0},{cutterLen:7},{kind:'move'});
 const left=cache.reduce((a,b)=>a+b,0);
 assert.ok(left<cache.length,'some volume must be removed');
 assert.ok(left>cache.length*.98,'small tool must not remove distant stock');
 assert.ok(probes===1,'sample transform should be evaluated once');
 assert.match(fragment,/const ix0=Math\.max\(0,Math\.floor/);
 assert.doesNotMatch(fragment,/for\(let iz=0;iz<voxelCache\.nz;iz\+\+\)/);
});
test('rotary sampling adapts to selected visual quality',()=>{
 const t=body();assert.match(t,/Math\.min\(FIDELITY\[quality\]\.steps/);
 assert.match(t,/Math\.max\(\.13,Math\.min\(voxelCache\.sx/);
 assert.match(t,/Math\.min\(quality==="DETAIL"\?1600/);
});
test('visible mesh/canvas cell measurements are labeled honestly',()=>{
 const s=html(),css=read('formal-web','authority/aigii-axis-fidelity-v4.css');
 assert.match(s,/mm\/格/);
 assert.match(s,/data-cut-resolution/);
 assert.match(s,/data-frame-resolution/);
 assert.match(css,/data-cut-resolution/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.doesNotMatch(css,/background-image\s*:\s*url/);
});
test('all inline JS and cache V12 parse, prior CNC core kept untouched',()=>{
 const s=html();
 for(const p of ['function makeCadRuntime(root)','function makeCamRuntime(root)','function makeNcRuntime(root)',
 'function parseProgram(','data-glcanvas','data-nc-code','data-cam-canvas','data-cad-canvas']){
  assert.ok(s.includes(p),p);
 }
 for(const match of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(match[1])assert.doesNotThrow(()=>new vm.Script(match[1]));
 }
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-authority-registry-recovered-20261018-v17/);
 assert.match(sw,/aigii-axis-fidelity-v4\.css/);
 assert.doesNotThrow(()=>new vm.Script(sw));
});
