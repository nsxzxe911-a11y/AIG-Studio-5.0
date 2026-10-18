'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=(dir,name)=>fs.readFileSync(path.join(root,dir,name),'utf8');
const html=()=>read('formal-web','mobile-runtime.html');
test('main release source and Render publish folder match',()=>{
 for(const f of ['mobile-runtime.html','service-worker.js'])
  assert.equal(read('web',f),read('formal-web',f),f);
});
test('3-6AX WebGL is lazy and invisible/idle pages never redraw continuously',()=>{
 const s=html(),start=s.indexOf('function tick(now)'),end=s.indexOf('function bounds(){',start);
 assert.ok(start>0&&end>start);
 const tick=s.slice(start,end);
 assert.match(tick,/if\(state\.running&&visible&&now-/);
 assert.match(tick,/axisScreen\?\.classList\.contains\("active"\)/);
 assert.doesNotMatch(tick,/^\s*draw\(\);\s*}\s*catch\(err\)/m);
 assert.match(s,/const axisRoots=new Map\(\)/);
 assert.match(s,/function ensureAxisRuntime\(axis\)/);
 assert.doesNotMatch(s,/document\.querySelectorAll\("\[data-runtime\]"\)\.forEach\(el=>\{aigBindFieldFeedback\(el\);aigGuard\(el/);
});
test('show activates axis before WebGL initialization and refreshes CAD canvas',()=>{
 const s=html(),start=s.indexOf('function show(name){'),end=s.indexOf('const productionPageRouter=',start);
 assert.ok(start>0&&end>start);
 const show=s.slice(start,end);
 assert.ok(show.indexOf('classList.toggle("active"')<show.indexOf('ensureAxisRuntime(name)'));
 for(const marker of ['cad.aigCadApi.refreshView()','cam.aigCamApi.refreshView()','sim.aigSimApi.refresh()'])
  assert.ok(show.includes(marker),marker);
 assert.match(s,/root\.aigCadApi=\{refreshView/);
 assert.match(s,/state\.refreshView=\(\)=>\{updateUi\(\);draw\(\)\}/);
});
test('CAD actual two-pointer LINE gesture persists a complete entity, with no data reset',()=>{
 const s=html(),i=s.indexOf('function makeCadRuntime(root){'),j=s.indexOf('function makeCamRuntime(root){',i);
 assert.ok(i>0&&j>i);
 const source=s.slice(i,j),selectors=[...source.matchAll(/root\.querySelector\("([^"]+)"\)/g)].map(m=>m[1]);
 const newNode=()=>({value:'10',checked:false,textContent:'',dataset:{},style:{},
  classList:{toggle(){},add(){},remove(){}},addEventListener(type,fn){(this.handlers??={})[type]=fn},
  setAttribute(){},focus(){}});
 const fields=Object.fromEntries(selectors.map(sel=>[sel,newNode()]));
 Object.assign(fields['[data-cad-offset]'],{value:'5'});
 fields['[data-cad-array-count]'].value='3';
 fields['[data-cad-array-spacing]'].value='10';
 fields['[data-cad-dim]'].value='20';
 const ctx=new Proxy({setLineDash(){},setTransform(){},clearRect(){},fillRect(){},stroke(){}},{
  get(obj,k){return k in obj?obj[k]:(()=>{})},set(obj,k,v){obj[k]=v;return true}});
 const canvas=fields['[data-cad-canvas]'];
 Object.assign(canvas,{width:0,height:0,getContext:()=>ctx,
  getBoundingClientRect:()=>({left:0,top:0,width:640,height:480}),setPointerCapture(){}});
 const buttons=['LINE','RECT','CIRCLE','ARC','HOLE','SELECT'].map(x=>({...newNode(),dataset:{cadTool:x}}));
 const events={},saved={},window={devicePixelRatio:1,addEventListener:(type,fn)=>events[type]=fn};
 const rootNode={querySelector:sel=>fields[sel],querySelectorAll:sel=>sel==='[data-cad-tool]'?buttons:[],
  addEventListener:(type,fn)=>events[type]=fn,closest:()=>({classList:{contains:()=>true}})};
 const run=new Function('root','aigJsonRead','aigJsonWrite','aigValidateField','aigFieldIssue','aigGuard','window',
   source+';return makeCadRuntime(root)');
 run(rootNode,()=>null,(el,key,val)=>{saved[key]=val},()=>{},()=>{},(root,label,fn)=>fn(),window);
 const b=buttons[0];events.click({target:{closest:q=>q==='[data-cad-tool]'?b:null}});
 for(const [pointerId,x,y] of [[1,210,220],[2,310,120]]){
  canvas.handlers.pointerdown({pointerId,clientX:x,clientY:y});
  canvas.handlers.pointerup({pointerId});
 }
 rootNode.aigCadApi.refreshView();
 assert.equal(saved['aig-cad-draft-v1'].shapes.length,1);
 assert.equal(saved['aig-cad-draft-v1'].shapes[0].type,'line');
 assert.equal(canvas.width,640);assert.equal(canvas.height,480);
 assert.equal(rootNode.aigCadApi.getShapeCount(),1);
 assert.ok(typeof events.resize==='function');
});
test('CAM, SIM, NC and AI remain reachable and unchanged core markers survive',()=>{
 const s=html();
 for(const page of ['HOME','CAD','CAM','SIM','3AX','4AX','5AX','6AX','NC','AI'])
  assert.match(s,new RegExp('\\["'+page+'","\\#'));
 for(const marker of ['function makeCadRuntime(root)','function makeCamRuntime(root)',
  'function makeSimHubRuntime(root)','function makeNcRuntime(root)','function makeRuntime(root)',
  'data-cam-manual-input','data-sim-volume','data-ai-page-runtime','function parseProgram('])
  assert.ok(s.includes(marker),marker);
 for(const script of s.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
  if(script[1])assert.doesNotThrow(()=>new vm.Script(script[1]));
});
test('v15 cache only refreshes code; no storage wipe or version rollback',()=>{
 const s=html(),sw=read('formal-web','service-worker.js');
 assert.match(sw,/aig-ii-authority-registry-recovered-20261018-v17/);
 assert.doesNotMatch(s.slice(s.indexOf('function show(name){'),s.indexOf('const productionPageRouter=')),/localStorage\.(?:clear|removeItem)|resetAll/i);
 assert.doesNotThrow(()=>new vm.Script(sw));
});
