/* AIG 6AX V2 NC pose sampling regression. Run with node from repo root:
 * node formal-web/runtime/6ax-nc-readonly-v2.test.cjs
 * These are source/geometry-proxy checks, NOT browser, collision certification or CNC gate. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const K=require("./6ax-mechanism-core-v1.js"),N=require("./6ax-nc-readonly-v2.js");
let n=0;function test(name,fn){fn();n++;console.log("PASS "+name)}
const src="(basic)\nO6000\nN10 G90 G54 G0 X0. Y0. Z40. A0. B0.\nN20 G1 X20. Y0. Z10. A90. B180. F300\nN30 G1 X0. Y0. Z30. A180. B270.\nM30";
test("parse G90 G0/G1 A/B with current axis states",()=>{const p=N.parse(src);assert.equal(p.ok,true);assert.equal(p.steps.length,3);assert.equal(p.steps[1].target.A,90);assert.equal(p.steps[1].target.B,180)});
test("comments and line numbers",()=>{const p=N.parse("G90 G0 X0 (X88) ; Y100\nN2 G1 X10");assert.equal(p.ok,true);assert.equal(p.steps[1].target.X,10);assert.equal(p.steps[1].target.Y,0)});
test("default C is NOT H",()=>{const p=N.parse("G90 G1 C45");assert.equal(p.ok,false);assert.equal(p.errors[0].code,"C_AXIS_UNMAPPED")});
test("C mapping is explicit visual-only",()=>{const p=N.parse("G90 G0 A0 B0 C0\nG1 A90 B180 C45",{headWord:"C"});assert.equal(p.ok,true);assert.equal(p.steps[1].target.H,45);assert.match(p.headMapping,/VISUAL ONLY/);assert.equal(p.machineOutput,"BLOCKED")});
test("unmapped C keeps manually chosen 45-degree head H",()=>{const p=N.parse("G90 G0 X0 A10 B20\nG1 X5 A20 B40",{initialH:45});assert.equal(p.ok,true);assert.equal(p.steps[0].target.H,45);assert.equal(p.steps[1].target.H,45);assert.match(p.warnings.join(" "),/45\.0/);});
test("invalid initial H is blocked",()=>{assert.equal(N.parse("G90 G0 X1",{initialH:60}).ok,false);assert.equal(N.parse("G90 G0 X1",{initialH:NaN}).ok,false)});
test("Fanuc H is tool length and not head angle",()=>{const p=N.parse("G90 G0 X0 H1");assert.equal(p.ok,false);assert.equal(p.errors[0].code,"FANUC_H_IS_TOOL_OFFSET")});
test("G43 tool length is not simulated",()=>{const p=N.parse("G90 G43 H1 G0 Z30");assert.equal(p.ok,false)});
test("G2 G3 G34 and G83 refuse",()=>{for(const s of ["G2 X1","G3 X1","G34 I20 J0 K6","G83 Z-20"])assert.equal(N.parse("G90 "+s).ok,false)});
test("G91 and G20 refuse",()=>{assert.equal(N.parse("G91 G1 X10").ok,false);assert.equal(N.parse("G20 G90 G1 X1").ok,false)});
test("M98 subprogram and M6 tool-change refuse",()=>{assert.equal(N.parse("M98 P4").ok,false);assert.equal(N.parse("T1 M6 G90 G0 X1").ok,false)});
test("macros and block skip refuse",()=>{assert.equal(N.parse("G90 G1 X[#100]").ok,false);assert.equal(N.parse("/ G90 G0 X1").ok,false)});
test("reject uncalibrated preview axis ranges",()=>{assert.equal(N.parse("G90 G1 A361").ok,false);assert.equal(N.parse("G90 G1 C46",{headWord:"C"}).ok,false)});
test("unsupported words and invalid numeric refused",()=>{assert.equal(N.parse("G90 G1 Q2").ok,false);assert.equal(N.parse("G90 G1 XNaN").ok,false)});
test("source NC text never modified",()=>{const s=src.slice(),p=N.parse(s),a=N.analyze(p);assert.equal(s,src);assert.equal(p.ncChanged,false);assert.equal(a.machineOutput,"BLOCKED")});
test("interpolation preserves full A/B/H combined motion",()=>{const p=N.parse("G90 G0 X0 A0 B0 C0\nG1 X20 A90 B180 C45",{headWord:"C"}),a=N.analyze(p);assert.equal(a.ok,true);assert.ok(a.samples>25);assert.equal(a.points[a.points.length-1].values.H,45);assert.equal(a.points[a.points.length-1].values.A,90)});
test("head pivot changes tool tip with A/B isolated",()=>{const p=N.parse("G90 G0 A0 B0 C0\nG1 C45",{headWord:"C"}),a=N.analyze(p);assert.ok(a.points.some(q=>Math.abs(q.toolTip[0]-a.points[0].toolTip[0])>.1));assert.deepEqual(K.solve({H:45}).pivots.platter,K.solve({H:0}).pivots.platter)});
test("sampling budget fails closed rather than partial pass",()=>{const p=N.parse("G90 G1 X200 A360 B360");const a=N.analyze(p,{maxSamples:50,previewLinearStep:0.1,previewAngleStep:.5});assert.equal(a.ok,false);assert.equal(a.status,"BLOCKED_SAMPLE_BUDGET");assert.equal(a.machineOutput,"BLOCKED")});
test("collision proxy never returns certified clearance",()=>{const a=N.analyze(N.parse(src));assert.equal(a.certifiedClearance,false);assert.equal(a.collisionGate,"UNVERIFIED");assert.notEqual(a.status,"PASS")});
test("potential interference flagged near disk with low Z",()=>{const p=N.parse("G90 G0 X0 Y0 Z-150 A0 B0");const a=N.analyze(p);assert.ok(a.potential.length>0)});
test("sampled A-support collision proxy raises candidate",()=>{const p=K.solve({X:-200,Y:-200,Z:-150,A:0,H:30});assert.ok(N.probe(p).zones.includes("A_SUPPORT"))});
test("rotating cradle collision proxy raises candidate",()=>{const p=K.solve({X:-200,Y:-200,Z:-150,A:180,H:0});assert.ok(N.probe(p).zones.includes("CRADLE"))});
test("axis status and NC output remain separated",()=>{assert.equal(K.verifiedCncSafety,false);assert.equal(N.machineOutput,"BLOCKED");assert.equal(N.machineSpecificPost,null)});
test("original 6AX V65 editor remains and V2 files linked",()=>{const html=fs.readFileSync(path.join(__dirname,"../mobile-runtime.html"),"utf8");for(const file of ["axis-6ax-v65.js","6ax-mechanism-core-v1.js","6ax-mechanism-preview-v1.js","6ax-nc-readonly-v2.js","6ax-nc-bridge-v2.js","axis-6ax-nc-preview-v2.css"])assert.ok(html.includes(file),file);assert.ok(html.includes("textarea.code"));});
test("negative A and B NC poses match signed visual slider range",()=>{const p=N.parse("G90 G0 A-90 B-90");assert.equal(p.ok,true);assert.equal(p.steps[0].target.A,-90);const js=fs.readFileSync(path.join(__dirname,"6ax-mechanism-preview-v1.js"),"utf8");assert.ok(js.includes("input.min=String(min)"));});
test("V2 bridge never writes editor value or clicks original RUN",()=>{const js=fs.readFileSync(path.join(__dirname,"6ax-nc-bridge-v2.js"),"utf8");assert.ok(js.includes("editor.value"));assert.ok(!/editor\.value\s*=(?!=)/.test(js));assert.ok(!/\.click\(\)/.test(js));assert.ok(js.includes('machineOutput:"BLOCKED"'));});
console.log("AIG_6AX_NC_POSE_V2_SOURCE_PASS|"+n+"_CASES|RENDER_COLLISION_SAFETY_PENDING");
