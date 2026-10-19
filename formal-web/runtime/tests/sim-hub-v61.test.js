/* Executable source-engine SIM hub checks. No simulated status is inserted
   into production. Test doubles provide real Runtime state shape only.
   node formal-web/runtime/tests/sim-hub-v61.test.js */
const fs=require("node:fs"),path=require("node:path");
const rootPath=path.resolve(__dirname,"../../..");
const files=["mobile-runtime.html","studio-375.html"];
const AX=["3AX","4AX","5AX","6AX"];
function extract(s,a,b){
 const x=s.indexOf(a),y=s.indexOf(b,x+a.length);
 if(x<0||y<=x)throw Error("SIM_SOURCE_NOT_FOUND");
 return s.slice(x,y);
}
function test(name,source){
 const def=extract(source,"function makeSimHubRuntime(root){","function ncHelpForLine(");
 const page=extract(source,"function simHubPage(){","function simPage(axis){");
 const ui=(new Function(page+"return simHubPage();"))();
 for(const axis of AX){for(const key of ["state","volume","blocks","progress","collision"]){
  if(!ui.includes('data-sim-'+key+'="'+axis+'"'))throw Error(name+" UI_MISSING_"+key+"_"+axis);
 }}
 const values={},events={},runtimeStates={},timers=[],store={};
 const make=key=>values[key]||(values[key]={textContent:"",attributes:{},handlers:{},
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(k,fn){(this.handlers[k]??=[]).push(fn)}});
 const fakeRoot={querySelector(q){return make(q)},aigSimApi:null};
 const win={addEventListener(k,cb){events[k]=cb}};
 const document={hidden:false},localStorage={getItem(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null}};
 const f=new Function("runtimes","window","document","localStorage","setInterval","clearInterval",def+"return makeSimHubRuntime;");
 const init=f(runtimeStates,win,document,localStorage,cb=>{timers.push(cb);return timers.length},()=>{});
 init(fakeRoot);
 if(!fakeRoot.aigSimApi||typeof fakeRoot.aigSimApi.sample!=="function")throw Error(name+" NO_REAL_API");
 const sample=axis=>fakeRoot.aigSimApi.sample(axis);
 const checks=[];const testCase=(cond,message)=>{if(!cond)throw Error(name+" "+message);checks.push(message)};
 testCase(sample("3AX").state==="未就緒","uninitialized axis fail-closed");
 testCase(make('[data-sim-state="4AX"]').textContent==="未就緒","uninitialized DOM not READY");
 testCase(make('[data-sim-volume="5AX"]').textContent==="—","no fabricated stock volume");
 const volume={textContent:"12.340 mm³"};
 runtimeStates["3AX"]={parsed:{errors:[],warnings:[],blocks:[{},{},{},{}]},root:{querySelector:q=>q==="[data-removal-volume]"?volume:null},
  index:1,t:.5,running:true,dry:false,collisions:[],collisionAlarm:false};
 store["aig-code-3AX"]="G90 G54\nG1 X5 F100";
 fakeRoot.aigSimApi.refresh();
 testCase(sample("3AX").state==="執行中","live running state");
 testCase(sample("3AX").volume==="12.340 mm³","read original stock volume");
 testCase(sample("3AX").progress==="37.5%","real block progress");
 testCase(sample("3AX").userProgram===true,"saved G-code differentiated");
 runtimeStates["3AX"].dry=true;
 testCase(sample("3AX").volume==="空跑 / 0 mm³","dry run never claims material removal");
 runtimeStates["4AX"]={parsed:{errors:["BAD G"],blocks:[],warnings:[]},collisions:[]};
 testCase(sample("4AX").state==="解析錯誤","parse errors not pass");
 runtimeStates["5AX"]={parsed:{errors:[],blocks:[{}],warnings:[]},collisionAlarm:true,collisions:[{}]};
 testCase(sample("5AX").state==="碰撞警示","collision alarm not pass");
 fakeRoot.aigSimApi.refresh();
 testCase(make('[data-sim-cam-count]').textContent==="0 條刀路","no CAM path claim when absent");
 store["aig-cam-toolpath-v1"]=JSON.stringify({paths:[{kind:"cut"},{kind:"drill"}],source:"MANUAL"});
 fakeRoot.aigSimApi.refresh();
 testCase(make('[data-sim-cam-count]').textContent==="2 條刀路","saved CAM count read-only");
 testCase(make('[data-sim-summary]').textContent.includes("待處理警示"),"runtime summary surfaced");
 testCase(typeof events["aig-cam-updated"]==="function"&&typeof events["aig-stock-updated"]==="function","real event listeners");
 testCase(timers.length===1,"bounded refresh timer");
 return{name,checks:checks.length,steps:checks};
}
const result=files.map((file,i)=>test(i?"AIG Studio 5.0":"AIG-II",fs.readFileSync(path.join(rootPath,"formal-web",file),"utf8")));
console.log(JSON.stringify({result:"PASS",tests:result},null,2));
