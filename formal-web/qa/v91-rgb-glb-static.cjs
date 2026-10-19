"use strict";
const a=require("node:assert/strict"),fs=require("node:fs");
const n=fs.readFileSync("formal-web/mobile-runtime-v91.html","utf8"),
 b=fs.readFileSync("formal-web/mobile-runtime-v90.html","utf8"),
 css=fs.readFileSync("formal-web/v91-rgb-desktop.css","utf8");
const header=' // V91: Real GLB binary meshes loaded into the existing CNC WebGL renderer.\n';
const footer=' // Four distinct *visual* machine structures; geometry stays subordinate to real';
a(n.includes(header)&&n.includes(footer));
const start=n.indexOf(header),stop=n.indexOf(footer,start);
let original=n.slice(0,start)+n.slice(stop);
original=original.replace('<link rel="stylesheet" href="./v91-rgb-desktop.css">\n',"");
original=original.replace('     if(!v91DrawGlb({vp,cx,cy,stockBottom,stockH,sceneR,A,B,C}))\n',"");
original=original.replace("AIG-II｜RGB Desktop · 6AX GLB","AIG-II｜V90 真 Runtime 工作區試用");
original=original.replace("AIG RGB 桌面＋6AX 新 3D 模型 · 真機輸出 BLOCKED","V90 真 Runtime 工作區試用 · CNC Safety Gate 未驗收，禁止真機輸出");
a.equal(original,b,"original live CNC solver, parser and DOM are preserved");
a(n.includes('aig_6ax_machine_v9.glb')&&n.includes('GLB_READY')&&n.includes('v91DrawGlb'));
a(css.includes('aig55-nav button')&&css.includes('data-aig91-model'));
console.log("AIG_V91_SOURCE_PASS — original NC and numerical solver unchanged");
