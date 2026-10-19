"use strict";
const fs=require("node:fs"),assert=require("node:assert/strict"),path=require("node:path");
const js=fs.readFileSync(path.join(__dirname,"../runtime/v69-source-intake.js"),"utf8");
new Function(js);
for(const token of ["function pointToMillimeters(","function addTracePoint(","function getTraceContract(","BTN.HOME.SOURCE.TRACE_LINE","cadCoreCommitted:false","autoVectorized:false","precisionVerified:false","machineOutput:\"BLOCKED\"","PHOTO_POINT_OUT_OF_BOUNDS","units:\"mm\"","origin:\"PHOTO_BOTTOM_LEFT\""])assert.ok(js.includes(token),token);
assert.ok(js.includes("tracePoints=[];traceSegments=[];renderTrace();"));
assert.ok(!js.includes("MACHINE.CONNECT"));
console.log("AIG_V70_MANUAL_PHOTO_TRACE_STATIC_PASS | PHOTO_TO_MM_LINE_CONTRACT_ONLY | CAD_CORE_COMMIT_AND_E2E_PENDING");
