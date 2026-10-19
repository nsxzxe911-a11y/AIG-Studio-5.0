"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,".."),js=fs.readFileSync(path.join(root,"runtime/v69-source-intake.js"),"utf8"),
 html=fs.readFileSync(path.join(root,"mobile-runtime.html"),"utf8"),
 css=fs.readFileSync(path.join(root,"v69-source-intake.css"),"utf8");
new Function(js);
assert.ok(html.includes('src="./runtime/v69-source-intake.js"'));
assert.ok(html.includes('href="./v69-source-intake.css"'));
for(const action of ["BTN.HOME.SOURCE.START_CAD","BTN.HOME.SOURCE.CALIBRATE","BTN.HOME.SOURCE.OPEN_CAD","BTN.HOME.SOURCE.SEND_NC","BTN.HOME.SOURCE.OPEN_CAM"])assert.ok(js.includes(action),action);
for(const kind of ["CAMERA","PHOTO","CAD","NC_FIRST"])assert.ok(js.includes('"'+kind+'"'),kind);
assert.ok(js.includes('mmPerPixel:mm/px'));assert.ok(js.includes('precisionVerified:false'));
assert.ok(js.includes('points.length!==2'));assert.ok(js.includes('URL.createObjectURL'));
assert.ok(js.includes('w.confirm('));assert.ok(js.includes('dispatchEvent(new Event("input"'));
assert.ok(js.includes('machineOutput:"BLOCKED"'));assert.ok(js.includes('digitalFinishedPart:false'));
assert.ok(!/\.click\(\)/.test(js.replace('nav.click()','')));
assert.ok(!js.includes("MACHINE.CONNECT"));assert.ok(!js.includes("localStorage.clear"));
console.log("AIG_V69_SOURCE_INTAKE_STATIC_PASS | UI_PHOTO_CALIBRATION_NC_FIRST_PRESENT | BROWSER_AND_CORE_GATES_PENDING");
