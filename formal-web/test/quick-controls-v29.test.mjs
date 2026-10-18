import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
test("V29 loads after V28 in both existing real RGB workspaces",()=>{
 for(const page of ["mobile-runtime.html","studio-375.html"]){
  const h=read(page);
  assert.ok(h.includes("runtime-actions-v28.js"));
  assert.ok(h.includes("runtime-quick-v29.js"));
  assert.ok(h.includes("runtime-quick-v29.css"));
  assert.ok(h.indexOf("runtime-actions-v28.js")<h.indexOf("runtime-quick-v29.js"));
 }
});
test("NC and AI actions only focus, not invoke",()=>{
 const j=read("runtime-quick-v29.js");
 for(const s of ["[data-nc-action='VERIFY']","[data-nc-action='SAVE']","[data-tp-action='VERIFY']","[data-ai-analyze]"]){
  assert.ok(j.includes('"'+s+'","focus"'));
 }
 assert.ok(j.includes('".screen.active[data-page]"'));
 assert.ok(j.includes("getComputedStyle"));
 assert.ok(!j.includes("NC_SEND"));
});
test("offline cache invalidation and asset inclusion",()=>{
 const sw=read("service-worker.js");
 assert.ok(sw.includes("quick-v29-20261018"));
 assert.ok(sw.includes('"./runtime-quick-v29.js"'));
 assert.ok(sw.includes('"./runtime-quick-v29.css"'));
});
