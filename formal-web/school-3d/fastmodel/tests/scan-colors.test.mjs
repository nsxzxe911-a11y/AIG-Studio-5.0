import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCAN_PALETTE_MODES,SCAN_WARNING_LEVELS,scanPalette,scanSemanticGroup,scanColor,scanColorLegend} from '../web/scan-colors.mjs';
import {paintScanOverlay} from '../web/scan-overlay.mjs';
const matrix=(x=0)=>Float32Array.from([1,0,0,0,0,1,0,0,0,0,1,0,x,0,0,1]);
const view={angle:0,zoom:1,zoomFactor:1,center:[0,0,0],width:1920,height:1080,file:{g:{skins:[]}}};
function canvas(){
 const strokes=[],ctx={strokeStyle:'',lineWidth:0,dash:[],setTransform(){},clearRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},setLineDash(v){this.dash=[...v];},stroke(){strokes.push({color:this.strokeStyle,dash:[...this.dash]});}};
 return {clientWidth:600,clientHeight:360,width:0,height:0,getContext:()=>ctx,strokes};
}
test('three complete reversible palettes, explicit region mapping, unknown never guessed',()=>{
 assert.deepEqual([...SCAN_PALETTE_MODES],['aig-rgb','inspection','low-glare']);
 assert.deepEqual([...SCAN_WARNING_LEVELS],['none','review','alarm']);
 for(const mode of SCAN_PALETTE_MODES){
  const p=scanPalette(mode);assert.match(p.head,/^#[0-9A-F]{6}$/i);
  assert.match(p.outline,/^rgba\(/);
  assert.equal(scanColor('head',{palette:mode}),p.head);
  assert.equal(scanColor('left-arm',{palette:mode}),p.arm);
  assert.equal(scanColor('knee',{palette:mode}),p.leg);
  assert.equal(scanColor('backbone',{palette:mode}),p.unknown);
  assert.equal(scanColor('head',{palette:mode,line:'outline'}),p.headOutline);
  assert.equal(scanColor('hair',{palette:mode,line:'outline'}),p.hairOutline);
  assert.equal(scanColor('hair',{palette:mode,warning:'review'}),p.hair); // no evidence selector
  assert.equal(scanColor('head',{palette:mode,warning:'review',highlightRoles:['hair']}),p.head);
  assert.equal(scanColor('hair',{palette:mode,warning:'review',highlightRoles:['hair']}),p.review);
  assert.equal(scanColor('hair',{palette:mode,warning:'alarm',highlightRoles:['hair']}),p.alarm);
  assert.equal(scanColorLegend(mode).length,7);
  assert.equal(Object.isFrozen(p),true);
 }
 assert.equal(scanSemanticGroup(null),'unknown');
 assert.throws(()=>scanPalette('rainbow-external'),/SCAN_PALETTE_INVALID/);
 assert.throws(()=>scanColor('head',{line:'solid3d'}),/SCAN_COLOR_LINE_INVALID/);
 assert.throws(()=>scanColor('head',{warning:'definitely-broken'}),/SCAN_WARNING_INVALID/);
});
test('render palette changes actual SOLID segment stroke colors without changing model or adding triangles',()=>{
 const topology={status:'SOURCE_READY',bones:[
  {parent:0,child:1,role:'head-neck'},
  {parent:0,child:2,role:'left-arm'},
  {parent:0,child:3,role:'left-leg'},
  {parent:0,child:4,role:'spine'},
  {parent:0,child:5,role:'hair'}
 ],surfaces:[],inverse:[]};
 const world=[matrix(0),matrix(1),matrix(2),matrix(3),matrix(4),matrix(5)];
 const old=JSON.stringify(topology);
 const rgb=canvas(),r=paintScanOverlay(rgb,view,topology,world,{mode:'bones',palette:'aig-rgb'});
 assert.equal(r.bonesDrawn,5);
 assert.equal(r.sourceMaterialColorsUntouched,true);
 assert.ok(rgb.strokes.some(s=>s.color===scanPalette('aig-rgb').head && !s.dash.length));
 assert.ok(rgb.strokes.some(s=>s.color===scanPalette('aig-rgb').arm && !s.dash.length));
 const eco=canvas(),v=paintScanOverlay(eco,view,topology,world,{mode:'bones',palette:'low-glare',warning:'review',highlightRoles:['hair']});
 assert.ok(eco.strokes.some(s=>s.color===scanPalette('low-glare').review));
 assert.ok(eco.strokes.some(s=>s.color===scanPalette('low-glare').head)); // never false warning on head
 assert.equal(v.warningStyle,'review');
 assert.equal(JSON.stringify(topology),old);
});
test('dashed real silhouette color differs from solid and respects muted RGB opacity',()=>{
 const surface={skin:0,role:'neck',
 positions:Float32Array.from([0,0,0,1,0,0,0,1,0]),
 joints:Uint16Array.from([0,0,0,0,0,0,0,0,0,0,0,0]),
 weights:Float32Array.from([1,0,0,0,1,0,0,0,1,0,0,0]),
 indices:Uint32Array.from([0,1,2]),
 edges:[{a:0,c:1,faces:[0]},{a:1,c:2,faces:[0]},{a:2,c:0,faces:[0]}]};
 const topology={status:'SOURCE_READY',bones:[{parent:0,child:1,role:'head'}],
 surfaces:[surface],inverse:[[matrix()]],omitted:0};
 const scene={...view,file:{g:{skins:[{joints:[0]}]}}},c=canvas();
 const result=paintScanOverlay(c,scene,topology,[matrix(),matrix(1)],{palette:'aig-rgb',mode:'bones-outline'});
 assert.equal(result.bonesDrawn,1);assert.equal(result.dashedSegments,3);
 assert.ok(c.strokes.some(s=>s.color===scanPalette('aig-rgb').head && s.dash.length===0));
 assert.ok(c.strokes.some(s=>s.color===scanPalette('aig-rgb').headOutline&&s.dash.join(',')==='5,6'));
 assert.equal(result.trueDepthHiddenVerified,false); // NOT a real GPU hidden-line test
});
test('palette UI swatch callback, safe hair-risk opt in, JSON export and standalone packer real wiring',()=>{
 const root=new URL('../',import.meta.url);
 const load=x=>fs.readFileSync(new URL(x,root),'utf8');
 const h=load('web/index.html'),m=load('web/main.mjs'),p=load('tools/build_standalone.py');
 for(const id of ['scan-palette','scan-color-legend','scan-risk-color','scan-color-status']){
  assert.ok(h.includes('id="'+id+'"'),id);
 }
 assert.ok(h.includes('value="aig-rgb" selected'));
 assert.ok(h.includes('data-color-role="head"'));
 assert.ok(m.includes("el('scan-palette').addEventListener('change',applyScanMode)"));
 assert.ok(m.includes("el('scan-risk-color').addEventListener('change',applyScanMode)"));
 assert.ok(m.includes("highlightRoles:hairReview?['hair']:[]"));
 assert.ok(m.includes('scanColorLegend(selected)'));
 assert.ok(m.includes("palette:el('scan-palette').value"));
 assert.ok(m.includes("palette:el('scan-palette').value,depthMode:el('scan-depth').value,warningOptIn:"));
 assert.ok(p.includes('scan-colors.mjs'));
 assert.ok(p.includes("'\\n'+scanColors+'\\n'+scanOverlay"));
});
