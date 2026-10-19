/* V56.0.1 CAM/NC fail-closed regression. Pure functions; no browser DOM or machine IO.
   Run with: AigCamSafetyRegression.run(AigManualCam,AigCamNcV52)
   Rejections count as PASS only if they throw; no false acceptance. */
(function(g){"use strict";
function run(manual,preflight){
 const p={safeZ:5,stockTop:0,stockThickness:20,feed:150,rpm:2300,toolDia:10,routeMode:"MANUAL"};
 const code="G0 X0 Y0 Z5\nG1 X0 Y0 Z-2 F150\nG1 X20 Y0 Z-2\nG0 Z5";
 const clone=x=>JSON.parse(JSON.stringify(x));
 const fresh=()=>{const r=manual.parseManual(code,p);return{
  source:"MANUAL",params:clone(p),stock:{top:0,bottom:-20,thickness:20},
  manualNodes:r.nodes,paths:r.paths
 }};
 const cases=[],failures=[];
 const ok=(name,fn)=>cases.push([name,fn,true]);
 const no=(name,fn)=>cases.push([name,fn,false]);
 const bad=(name,mut)=>no(name,()=>{const x=fresh();mut(x);return preflight.inspect(x)});
 const badParam=(name,mut)=>no(name,()=>manual.parseManual(code,mut(clone(p))));
 const badCode=(name,src)=>no(name,()=>manual.parseManual(src,p));
 ok("valid manual",()=>manual.parseManual(code,p));
 ok("valid NC candidate",()=>preflight.inspect(fresh()));
 ok("NC never machine output",()=>{const x=preflight.inspect(fresh());if(x.machineEnabled||x.simVerified||x.ncVerified||x.canAutoApply||x.status!=="NC_CANDIDATE_ONLY")throw Error("unsafe");return x});
 ok("missing CAM snapshot fails closed",()=>{const x=preflight.snapshot({getItem:()=>null});if(x.ok)throw Error("false OK");return x});
 ok("valid CAM snapshot",()=>{const x=preflight.snapshot({getItem:()=>JSON.stringify(fresh())});if(!x.ok)throw Error(x.message);return x});
 ok("minimum valid grid",()=>manual.parseManual("G0 X0 Y0 Z5\nG1 Z-0.001 F0.001\nG0 Z5",{...p,feed:.001,toolDia:.001,rpm:1}));
 ok("negative grid coordinate",()=>manual.parseManual("G0 X-10.001 Y0 Z5\nG1 Z-2\nG1 X-9.999\nG0 Z5",p));
 ok("max bounded coordinate",()=>manual.parseManual("G0 X100000 Y0 Z5\nG1 Z-2\nG0 Z5",p));
 ok("missing retract warns",()=>{const x=manual.parseManual("G0 X0 Y0 Z5\nG1 Z-2",p);if(!x.warnings.length)throw Error("missing warning");return x});
 ok("NC G90 candidate",()=>{const x=preflight.inspect(fresh());if(!x.candidateCode.includes("G90 G54 G17"))throw Error("no modal");return x});
 for(const [name,key,val] of [
 ["manual feed string","feed","150"],["manual feed half-grid","feed",.0005],
 ["manual tool string","toolDia","10"],["manual tool half-grid","toolDia",.0005],
 ["manual safe string","safeZ","5"],["manual safe half-grid","safeZ",5.0005],
 ["manual rpm string","rpm","2300"],["manual rpm fraction","rpm",2300.5],
 ["manual stock null","stockTop",null],["manual thickness boolean","stockThickness",true]
 ])badParam(name,p=>{p[key]=val;return p});
 for(const [name,src] of [
 ["G-code F half-grid",code.replace("F150","F0.0005")],
 ["G-code Z half-grid",code.replace("Z-2","Z-2.0005")],
 ["G-code X half-grid",code.replace("X20","X20.0005")],
 ["G-code F negative",code.replace("F150","F-150")],
 ["G-code F zero",code.replace("F150","F0")],
 ["G-code rotary A",code.replace("G1 X20","G1 A10 X20")],
 ["G-code unsupported M",code.replace("G1 X20","M3 G1 X20")],
 ["G-code diagonal","G0 X0 Y0 Z5\nG1 X20 Z-2\nG0 Z5"],
 ["G-code unsafe rapid","G0 X0 Y0 Z5\nG0 Z-2\nG1 X20\nG0 Z5"],
 ["G-code no first rapid","G1 X0 Y0 Z-2\nG0 Z5"],
 ["G-code zero G1","G0 X0 Y0 Z5\nG1 X0 Y0 Z5"],
 ["G-code below stock","G0 X0 Y0 Z5\nG1 Z-20.001\nG0 Z5"],
 ["G-code duplicate X","G0 X0 X1 Y0 Z5\nG1 Z-2\nG0 Z5"],
 ["G-code rapid only","G0 X0 Y0 Z5"]
 ])badCode(name,src);
 for(const [name,fn] of [
 ["param feed string",v=>v.params.feed="150"],
 ["param feed half-grid",v=>v.params.feed=.0005],
 ["param tool string",v=>v.params.toolDia="10"],
 ["param tool half-grid",v=>v.params.toolDia=.0005],
 ["param rpm string",v=>v.params.rpm="2300"],
 ["param rpm fraction",v=>v.params.rpm=2300.5],
 ["param safe string",v=>v.params.safeZ="5"],
 ["param safe half-grid",v=>v.params.safeZ=5.0005],
 ["stock top string",v=>v.stock.top="0"],
 ["stock bottom string",v=>v.stock.bottom="-20"],
 ["node x string",v=>v.manualNodes[2].x="20"],
 ["node x half-grid",v=>v.manualNodes[2].x=20.0005],
 ["node y string",v=>v.manualNodes[2].y="0"],
 ["node z half-grid",v=>v.manualNodes[2].z=-2.0005],
 ["node feed string",v=>v.manualNodes[1].f="150"],
 ["node feed half-grid",v=>v.manualNodes[1].f=.0005],
 ["point x string",v=>v.paths[1].points[0].x="0"],
 ["point x half-grid",v=>v.paths[1].points[0].x=.0005],
 ["point y string",v=>v.paths[1].points[0].y="0"],
 ["point y half-grid",v=>v.paths[1].points[0].y=.0005],
 ["segment node x string",v=>v.paths[1].nodes[1].x="20"],
 ["segment node x half-grid",v=>v.paths[1].nodes[1].x=20.0005],
 ["segment depth string",v=>v.paths[1].depth="-2"],
 ["segment depth half-grid",v=>v.paths[1].depth=-2.0005],
 ["segment feed string",v=>v.paths[1].feed="150"],
 ["segment feed half-grid",v=>v.paths[1].feed=.0005],
 ["segment rpm string",v=>v.paths[1].rpm="2300"],
 ["segment rpm fraction",v=>v.paths[1].rpm=2300.5],
 ["segment safe string",v=>v.paths[1].safeZ="5"],
 ["segment safe half-grid",v=>v.paths[1].safeZ=5.0005],
 ["stale mode",v=>v.paths[1].routeMode="AUTO"],
 ["closed segment",v=>v.paths[1].closed=true],
 ["fake segment G0",v=>v.paths[1].nodes[0].g="G0"],
 ["stale source ID",v=>v.paths[1].sourceId="OLD"],
 ["extra points",v=>v.paths[1].points.push({x:0,y:0})],
 ["missing retract",v=>v.manualNodes.pop()],
 ["unsafe first rapid",v=>v.manualNodes[0].z=4],
 ["rotary axis",v=>v.manualNodes[1].a=10],
 ["wrong stock bottom",v=>v.stock.bottom=-19],
 ["nonmanual source",v=>v.source="AUTO"],
 ["missing paths",v=>v.paths=[]],
 ["negative feed",v=>v.manualNodes[1].f=-1],
 ["diagonal cut",v=>v.manualNodes[2].z=-3]
 ])bad(name,fn);
 let passed=0;for(const [name,fn,accept] of cases){
  let actual=true,err=null;try{fn()}catch(e){actual=false;err=String(e.code||e.message||e)}
  if(actual===accept)passed++;else failures.push({name,expected:accept?"ACCEPT":"REJECT",actual:actual?"ACCEPT":err});
 }
 return Object.freeze({total:cases.length,passed,failed:failures.length,failures});
}
g.AigCamSafetyRegression=Object.freeze({run});
})(typeof window!=="undefined"?window:globalThis);
