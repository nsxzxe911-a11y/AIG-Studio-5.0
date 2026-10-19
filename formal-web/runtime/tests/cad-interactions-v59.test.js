/* AIG Web V59 CAD core interaction regression. Run with
   node formal-web/runtime/tests/cad-interactions-v59.test.js
   Exercises original CAD engine, not mock CAD implementation. DOM/Canvas are
   deterministic test doubles; a real browser visual gate is still required. */
function cadTest(source,label){
 const a=source.indexOf("function makeCadRuntime("),b=source.indexOf("function makeCamRuntime(",a);
 if(a<0||b<=a)throw Error(label+": real CAD Runtime not found");
 const original=source.slice(a,b),nodes={},writes=[],canvasCalls=[];
 const nodeClass=()=>({s:new Set(),contains(k){return this.s.has(k)},toggle(k,on){if(on===undefined?!this.s.has(k):on)this.s.add(k);else this.s.delete(k)},add(k){this.s.add(k)},remove(k){this.s.delete(k)}});
 function node(key,value=""){
  if(nodes[key])return nodes[key];
  return nodes[key]={value,textContent:"",dataset:{},classList:nodeClass(),handlers:{},
   addEventListener(k,f){(this.handlers[k]??=[]).push(f)},
   fire(k,event){for(const f of this.handlers[k]||[])f(event)}};
 }
 const canvas=node("[data-cad-canvas]");let canvasWidth=600,canvasHeight=400;
 canvas.width=0;canvas.height=0;canvas.setPointerCapture=()=>{};
 canvas.getBoundingClientRect=()=>({left:0,top:0,width:canvasWidth,height:canvasHeight});
 const methods=["setTransform","clearRect","fillRect","setLineDash","beginPath","moveTo","lineTo","rect","arc","stroke","fillText","closePath","fill","save","restore"];
 const ctx=Object.fromEntries(methods.map(k=>[k,()=>canvasCalls.push(k)]));canvas.getContext=()=>ctx;
 const tools=["LINE","RECT","CIRCLE","ARC","HOLE","SELECT","PAN"];
 const actions=["TRIM","EXTEND","OFFSET","ARRAY","DIM","UNDO","REDO","FIT","SNAP","CONNECT","DISCONNECT","DELETE","CLEAR"];
 const toolBtns=tools.map(k=>{const n=node("T_"+k);n.dataset.cadTool=k;return n});
 const actionBtns=actions.map(k=>{const n=node("A_"+k);n.dataset.cadAction=k;return n});
 for(const [key,val] of Object.entries({"[data-cad-offset]":"5","[data-cad-array-count]":"3","[data-cad-array-spacing]":"10","[data-cad-dim]":"20"}))node(key,val);
 for(const key of ["count","coord","snaphud","toolhud","selected","topology","msg"])node("[data-cad-"+key+"]");
 const root={aigCadApi:null,handlers:{},
  querySelector(key){return key==='[data-cad-action="SNAP"]'?nodes["A_SNAP"]:nodes[key]||null},
  querySelectorAll(key){return key==="[data-cad-tool]"?toolBtns:[]},
  addEventListener(key,cb){(this.handlers[key]??=[]).push(cb)},
  fire(key,event){for(const f of this.handlers[key]||[])f(event)},
  closest(){return{classList:{contains(key){return key==="active"}}}}
 };
 const win={devicePixelRatio:2,handlers:{},
  addEventListener(k,cb){(this.handlers[k]??=[]).push(cb)},
  fire(k){for(const f of this.handlers[k]||[])f()}
 };
 const realCad=new Function("root","window","aigJsonRead","aigJsonWrite","aigValidateField","aigFieldIssue","aigFiniteNumber","aigGuard",
  original+"\nreturn makeCadRuntime(root);");
 realCad(root,win,(_r,_key,fallback)=>fallback,
  (_r,_key,value)=>writes.push(JSON.parse(JSON.stringify(value))),()=>{},()=>{},
  (value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback,(_r,_name,callback)=>callback());
 const checks=[];function test(truth,name){if(!truth)throw Error(label+" "+name);checks.push(name)}
 function click(type,key){const b=nodes[type+"_"+key];root.fire("click",{target:{closest(sel){
  return(type==="T"&&sel==="[data-cad-tool]")||(type==="A"&&sel==="[data-cad-action]")?b:null;
 }}})}
 let id=0;function point(x,y){const event={pointerId:++id,clientX:x,clientY:y};
  canvas.fire("pointerdown",event);canvas.fire("pointerup",event)}
 const count=()=>root.aigCadApi?.getShapeCount(),last=()=>writes[writes.length-1];
 test(!!root.aigCadApi,"real CAD API exists");
 test((win.handlers.resize||[]).length===1,"real resize listener registered");
 test(count()===0,"initial geometry empty");
 test(canvas.width===1200&&canvas.height===800,"DPR2 drawing buffer");
 click("T","LINE");point(300,200);point(340,160);
 test(count()===1&&last().shapes[0].type==="line","LINE committed");
 test(last().shapes[0].b.x===10&&last().shapes[0].b.y===10,"world coordinates");
 click("A","UNDO");test(count()===0,"UNDO line");
 click("A","REDO");test(count()===1,"REDO line");
 click("T","RECT");point(320,180);point(360,140);test(count()===2&&last().shapes.at(-1).type==="rect","RECT committed");
 click("T","CIRCLE");point(420,120);point(460,120);test(count()===3&&last().shapes.at(-1).type==="circle","CIRCLE committed");
 click("T","HOLE");point(500,280);point(540,280);test(count()===4&&last().shapes.at(-1).type==="hole","HOLE committed");
 click("T","ARC");point(220,110);point(260,110);point(220,150);test(count()===5&&last().shapes.at(-1).type==="arc","ARC committed");
 click("A","SNAP");test(nodes["[data-cad-snaphud]"].textContent==="SNAP OFF","SNAP off");
 click("A","SNAP");test(nodes["[data-cad-snaphud]"].textContent==="SNAP ON","SNAP on");
 click("T","SELECT");point(340,160);test(nodes["[data-cad-selected]"].textContent.includes("LINE"),"SELECT line");
 click("A","OFFSET");test(count()===6,"OFFSET selected");
 click("A","UNDO");test(count()===5,"UNDO offset");
 click("A","REDO");test(count()===6,"REDO offset");
 click("A","FIT");test(last().view.scale>0,"FIT persisted");
 const beforePan=JSON.stringify(last().view);
 click("T","PAN");
 canvas.fire("pointerdown",{pointerId:99,clientX:300,clientY:200});
 canvas.fire("pointermove",{pointerId:99,clientX:330,clientY:205});
 canvas.fire("pointerup",{pointerId:99,clientX:330,clientY:205});
 test(JSON.stringify(last().view)!==beforePan,"PAN persisted");
 canvas.fire("wheel",{clientX:300,clientY:200,deltaY:-80,preventDefault(){}});
 test(last().view.scale>0,"wheel zoom persisted");
 const beforeClear=count();click("A","CLEAR");test(count()===beforeClear,"CLEAR confirmation guard");
 click("A","CLEAR");test(count()===0,"CLEAR second press");
 click("A","UNDO");test(count()===beforeClear,"UNDO after CLEAR");
 canvasWidth=720;win.fire("resize");
 test(canvas.width===1440,"window resize repaints real canvas");
 test(canvasCalls.length>100,"real 2D renderer invoked");
 test(writes.length>12,"AutoSave called on drawing and history");
 return{project:label,checks:checks.length,steps:checks,autoSaves:writes.length,realCanvasCalls:canvasCalls.length};
}
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const outcomes=[['AIG-II','mobile-runtime.html'],['AIG Studio 5.0','studio-375.html']].map(([name,file])=>cadTest(fs.readFileSync(path.join(root,'formal-web',file),'utf8'),name));
console.log(JSON.stringify({result:'PASS',outcomes},null,2));
