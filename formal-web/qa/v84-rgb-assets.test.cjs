"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const dir=path.resolve(__dirname,"../visual-library/candidates/v84");
const manifest=JSON.parse(fs.readFileSync(path.join(dir,"manifest.json"),"utf8"));
assert.equal(manifest.schema,"AIG_V84_RGB_ASSET_MANIFEST");
assert.equal(manifest.width,3840);assert.equal(manifest.height,2160);
assert.equal(manifest.assets.length,3);
for(const a of manifest.assets){
 const f=path.join(dir,a.filename);const data=fs.readFileSync(f);
 assert.equal(data.length,a.bytes,a.page+" SIZE_MISMATCH");
 assert.equal(data.subarray(0,4).toString("ascii"),"RIFF");
 assert.equal(data.subarray(8,12).toString("ascii"),"WEBP");
 assert.equal(crypto.createHash("sha256").update(data).digest("hex"),a.sha256,a.page+" DIGEST_MISMATCH");
 assert.equal(a.approval==="CANDIDATE"||a.approval==="REWORK_REQUIRED",true);
}
assert.equal(manifest.machineOutput,"BLOCKED");
console.log("AIG_V84_RGB_3PAGE_ASSET_INTEGRITY_PASS | STATIC_ART_ONLY");
