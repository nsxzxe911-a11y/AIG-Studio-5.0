import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("V30 injected after V29 on both original RGB workspaces",()=>{
 for(const name of ["mobile-runtime.html","studio-375.html"]){
  const html=read(name);
  assert.ok(html.includes("./axis-hud-v30.css"));
  assert.ok(html.includes("./axis-hud-v30.js"));
  assert.ok(html.indexOf("runtime-quick-v29.js")<html.indexOf("axis-hud-v30.js"));
  assert.ok(html.includes("data-axis-read"));
 }
});
test("V30 has no new parser or machine callbacks",()=>{
 const js=read("axis-hud-v30.js");
 assert.ok(js.includes('".simgrid[data-runtime]"'));
 assert.ok(js.includes('root.dataset.aigInitialized==="true"'));
 for(const token of ["[data-feed]","[data-spindle]","[data-toolmetric]","[data-motion-role]","[data-run-badge]","[data-axis-read"]){
  assert.ok(js.includes(token),token);
 }
 assert.ok(!js.includes("target.click("));
 assert.ok(!js.includes("localStorage.setItem("));
 assert.ok(!js.includes("dispatchUiCommand("));
});
test("V30 offline cache version and assets",()=>{
 const sw=read("service-worker.js");
 assert.ok(sw.includes("hud-v30-20261018"));
 assert.ok(sw.includes('"./axis-hud-v30.js"'));
 assert.ok(sw.includes('"./axis-hud-v30.css"'));
});
