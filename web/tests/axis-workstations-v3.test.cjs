'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(dir,file)=>fs.readFileSync(path.join(root,dir,file),'utf8');
const pages=['3AX','4AX','5AX','6AX'];
test('dedicated 3-6AX workstation assets match actual Render publish folder',()=>{
 for(const file of ['mobile-runtime.html','authority/aigii-axis-module-v3.css','service-worker.js'])
  assert.equal(read('web',file),read('formal-web',file),file);
});
test('four independent module IDs, axis manifests, axis badges and NC-first subpages',()=>{
 const html=read('formal-web','mobile-runtime.html');
 const start=html.indexOf('const AIG_AXIS_MODULES='),end=html.indexOf('function cadPage(){',start);
 assert.ok(start>=0&&end>start);
 const section=html.slice(start,end);
 const sourceCode=Object.fromEntries(pages.map(p=>[p,'O1000\nG90\nM30']));
 const runtime=new Function('sourceCode',section+'return {AIG_AXIS_MODULES,simPage};')(sourceCode);
 for(const page of pages){
  const cfg=runtime.AIG_AXIS_MODULES[page],markup=runtime.simPage(page);
  assert.ok(cfg,page);
  assert.ok(markup.includes('data-runtime="'+page+'"'));
  assert.ok(markup.includes('data-page-id="PAGE_'+page+'"'));
  assert.ok(markup.includes('data-button-id="BTN_'+page+'_MACHINE"'));
  assert.ok(markup.includes('data-button-id="BTN_'+page+'_NC_FIRST"'));
  assert.ok(markup.includes('data-axis-subpage="MACHINE"'));
  assert.ok(markup.includes('data-axis-subpage="NC_FIRST"'));
  assert.ok(markup.includes('data-command-id="AXIS_VIEW_NC_FIRST"'));
  assert.ok(markup.includes('data-glcanvas'));
  assert.ok(markup.includes('data-nc-code')||markup.includes('textarea class="code"'),page+' editor');
  assert.ok(markup.includes('data-cmd="play"'));
  assert.ok(markup.includes('data-editcmd="verify"'));
  assert.ok(markup.includes('data-removal-volume'));
  assert.ok(markup.includes('data-collision'));
  assert.equal(cfg.subpages.length,2);
  assert.ok(cfg.machineId.includes(page));
  assert.ok(cfg.ncId.includes(page));
  assert.ok(cfg.kinematic.includes('X / Y / Z'));
 }
 assert.match(runtime.AIG_AXIS_MODULES['6AX'].machine,/獨臂搖籃/);
 assert.match(runtime.AIG_AXIS_MODULES['4AX'].machine,/卡盤/);
});
test('axis module switch keeps the same parser, WebGL and stock-removal state',()=>{
 const html=read('formal-web','mobile-runtime.html');
 assert.match(html,/const subpageButtons=\[\.\.\.root\.querySelectorAll\("\[data-axis-subpage\]"\)\]/);
 assert.match(html,/root\.dataset\.axisSubpage=subpage/);
 assert.match(html,/entry\.setAttribute\("aria-pressed"/);
 assert.match(html,/requestAnimationFrame\(\(\)=>window\.dispatchEvent\(new Event\("resize"\)\)\)/);
 assert.match(html,/if\(subpage==="NC_FIRST"\)/);
 // No new makeRuntime or WebGL objects should be constructed on button clicks.
 const subpageSection=html.slice(html.indexOf('const subpageButtons=['),html.indexOf('const axis=root.dataset.runtime'));
 assert.doesNotMatch(subpageSection,/makeGlScene|makeRuntime|parseProgram|localStorage\.clear/);
});
test('distinct rendered machine parts exist for 3AX VMC, 4AX A chuck, 5AX cradle, 6AX vertical arm',()=>{
 const html=read('formal-web','mobile-runtime.html');
 const begin=html.indexOf('function drawAxisMachineProfile(p)'),end=html.indexOf('function render(scene)',begin);
 assert.ok(begin>=0&&end>begin);
 const source=html.slice(begin,end);
 for(const axis of pages)assert.ok(source.includes('axis==="'+axis+'"'),axis);
 for(const signature of ['const jawX','const alongX=RY(Math.PI/2)','Dual-support A/B','independent single-sided A/B/C','part(cx,cy+radius*1.38']){
  assert.ok(source.includes(signature),'missing visual feature '+signature);
 }
 const render=html.slice(end,html.indexOf('function makeRuntime(',end));
 assert.ok(render.includes('drawAxisMachineProfile({axis,cx,cy,stockBottom,stockH,spanX,spanY,tableR,R,vp});'));
 assert.ok(render.includes('drawVoxelStock('));
 assert.ok(render.includes('drawHeightfield('));
 assert.doesNotMatch(render,/drawMesh\(cube,T\(-tableR-7/);
});
test('axis modules have usable desktop and mobile NC-first viewports',()=>{
 const css=read('formal-web','authority/aigii-axis-module-v3.css');
 assert.match(css,/data-axis-subpage="NC_FIRST"/);
 assert.match(css,/\.simgrid\.axisModule\[data-axis-subpage="NC_FIRST"\]>\.editor/);
 assert.match(css,/\.simgrid\.axisModule\[data-axis-subpage="NC_FIRST"\]>\.simleft/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/data-axis-subpage="MACHINE"/);
 assert.match(css,/color-mix/);
 assert.doesNotMatch(css,/background-image\s*:\s*url|uiux\/assets/);
});
test('all scripts parse, and offline V11 includes axis workstations',()=>{
 const html=read('formal-web','mobile-runtime.html');
 assert.match(html,/aigii-axis-module-v3\.css/);
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1])assert.doesNotThrow(()=>new vm.Script(match[1]));
 const sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-ai-orchestrator-20261018-v13/);
 assert.match(sw,/\.\/authority\/aigii-axis-module-v3\.css/);
 assert.doesNotThrow(()=>new vm.Script(sw));
});
