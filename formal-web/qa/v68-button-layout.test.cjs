/* AIG V68 source-only Gate: positions and native command IDs are stable.
 * Node run: node formal-web/qa/v68-button-layout.test.cjs
 * Browser callback / actual button touch targets require Chromium test.
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),read=p=>fs.readFileSync(path.join(root,p),"utf8");
const contract=JSON.parse(read("runtime/v68-button-layout-contract.json"));
const source=read("runtime/v68-command-deck.js");
const css=read("v68-unified-command-deck.css");
const html=read("mobile-runtime.html");
const lanes=["EDIT","VIEW","RUN","VERIFY","FILE","DANGER"];
let cases=0;
function check(name,fn){fn();console.log("PASS "+name);cases++}
check("ten independent modules including native 3D toolpath page",()=>{
 assert.deepEqual(contract.pageOrder,["CAD","CAM","TOOLPATH","SIM","3AX","4AX","5AX","6AX","NC","AI"]);
 assert.ok(source.includes('page==="TOOLPATH"?"刀路":page'));
});
check("exact six fixed positions and danger last",()=>{
 assert.deepEqual(contract.lanes.map(s=>s.id),lanes);
 assert.ok(css.includes("grid-template-columns:repeat(6,minmax(0,1fr))"));
 assert.ok(css.includes("grid-template-columns:repeat(5,minmax(0,1fr))"));
 assert.ok(css.includes('[data-aig68-lane="DANGER"]'));
});
check("all 84 source records have unique stable Page/Subpage/Button/Command IDs",()=>{
 assert.equal(contract.allRecords.length,84);
 const keys=contract.allRecords.map(r=>r.buttonId);
 assert.equal(new Set(keys).size,keys.length);
 for(const r of contract.allRecords){
  assert.equal(r.pageId,"PAGE_"+r.page);
  assert.ok(r.subpageId.startsWith("SUBPAGE_"+r.page+"_"));
  assert.equal(r.buttonId,"BTN."+r.page+"."+r.subpageId.slice(("SUBPAGE_"+r.page+"_").length)+"."+r.buttonId.split(".").pop());
  assert.ok(r.commandId.startsWith("COMMAND."+r.page+"."));
  assert.ok(lanes.includes(r.slot));
  assert.ok(r.sourceSelector.startsWith("[data-"));
 }
});
check("axis 3–6 use the exact same six-lane order and action semantics",()=>{
 const ids=["3AX","4AX","5AX","6AX"];
 const all=ids.map(id=>contract.allRecords.filter(r=>r.page===id).map(r=>r.slot+":"+r.buttonId.split(".").pop()));
 for(const x of all.slice(1))assert.deepEqual(x,all[0]);
});
check("danger lane includes destructive controls, excludes execution and verification",()=>{
 const danger=contract.allRecords.filter(r=>r.slot==="DANGER");
 assert.deepEqual(danger.map(r=>r.buttonId).sort(),[
  "BTN.CAD.MODIFY.CLEAR","BTN.TOOLPATH.MAIN.DELETE","BTN.3AX.MACHINE.RESET",
  "BTN.4AX.MACHINE.RESET","BTN.5AX.MACHINE.RESET","BTN.6AX.MACHINE.RESET",
  "BTN.NC.EDITOR.DELETE"].sort());
 assert.ok(danger.every(r=>!r.sourceSelector.includes("play")&&!r.sourceSelector.includes("VERIFY")));
});
check("no cloned button, synthetic click, unexpected dispatch or G-code mutation",()=>{
 assert.ok(source.includes("target.append(native)"));
 assert.ok(!source.includes("cloneNode("));
 assert.ok(!/\.click\s*\(/.test(source));
 assert.ok(!/editor\.value\s*=/.test(source));
 assert.ok(!/textarea\.value\s*=/.test(source));
 assert.ok(!/localStorage\.(?:setItem|clear|removeItem)/.test(source));
});
check("original DOM delegation roots and all native callbacks are preserved",()=>{
 for(const x of ["[data-cad-runtime]","[data-cam-runtime]","[data-tp-runtime]",
  "data-axis-kind=","[data-nc-runtime]","[data-ai-page-runtime]"])assert.ok(html.includes(x));
 assert.ok(source.includes("root.insertBefore(deck,root.firstChild)"));
 assert.ok(contract.allRecords.every(r=>r.handlerEvidence.includes("PENDING_BROWSER_CLICK")));
 assert.ok(html.includes("root.addEventListener(\"click\""));
});
check("proposed IDs never overwrite V65/V67 original Button ID and Command ID",()=>{
 assert.ok(source.includes("dataset.aig68OriginalButtonId"));
 assert.ok(source.includes("dataset.aig68OriginalCommandId"));
 assert.ok(!source.includes('setAttribute("data-button-id"'));
 assert.ok(!source.includes('setAttribute("data-command-id"'));
});
check("unknown/unmapped and duplicate original controls remain auditable, no fake PASS",()=>{
 assert.ok(source.includes("UNMAPPED_REQUIRES_CALLBACK_AUDIT"));
 assert.ok(source.includes("DUPLICATE_CANONICAL_BUTTON_ID"));
 assert.ok(source.includes("REAL_BUTTON_MISSING"));
 assert.ok(source.includes("PENDING_REAL_BROWSER_UI_AND_CALLBACK_TEST"));
 assert.ok(source.includes('machineOutput:"BLOCKED"'));
});
check("six real category buttons are keyboard accessible; dangerous group not default",()=>{
 assert.ok(source.includes('tab.addEventListener("click"'));
 assert.ok(source.includes('tab.setAttribute("aria-controls"'));
 assert.ok(source.includes('tab.setAttribute("aria-selected"'));
 assert.ok(source.includes('ctx.el.dataset.aig68Selected="EDIT"')||source.includes('deck.dataset.aig68Selected="EDIT"'));
 assert.ok(source.includes('const preferred=ctx.byLane[ctx.selected]'));
});
check("responsive desktop 4K and mobile safety grouping",()=>{
 assert.ok(css.includes("@media(min-width:3200px)"));
 assert.ok(css.includes("@media(max-width:900px)"));
 assert.ok(css.includes('aig68-tab[data-aig68-lane-tab="DANGER"]'));
 assert.ok(css.includes("min-height:37px")||css.includes("min-height:38px"));
});
check("V68 real source and visual CSS are loaded on existing formal CNC runtime",()=>{
 assert.ok(html.includes('href="./v68-unified-command-deck.css"'));
 assert.ok(html.includes('src="./runtime/v68-command-deck.js"'));
 assert.ok(html.includes('src="./runtime/v67-control-registry.js"'));
 assert.ok(html.includes('src="./runtime/v67-global-nav.js"'));
 assert.ok(html.includes('src="./axis-6ax-v65.js"'));
});
check("duplicate V43 proxy quickbars are safely collapsed with native callbacks intact",()=>{
 const compact=read("runtime/v68-legacy-shortcuts.js");
 assert.ok(html.includes('src="./runtime/v68-legacy-shortcuts.js"'));
 assert.ok(compact.includes('d.createElement("details")'));
 assert.ok(compact.includes('detail.append(bar)'));
 assert.ok(compact.includes("screen.append(detail)"));
 assert.ok(compact.includes("aig43-bar"));
 assert.ok(!compact.includes("cloneNode("));
 assert.ok(!/\.click\s*\(/.test(compact));
 assert.ok(source.includes("details")||source.includes("panel.open=!panel.open"));
 const css=read("v68-unified-command-deck.css");
 assert.ok(css.includes("body:has(>.aig67-global-nav) .aig55-top"));
 assert.ok(source.includes("機台輸出關閉"));
});
console.log("AIG_V68_SAME_POSITION_NATIVE_BUTTON_SOURCE_PASS|"+cases+"_CASES|CHROMIUM_CALLBACK_LAYOUT_GATE_PENDING");
