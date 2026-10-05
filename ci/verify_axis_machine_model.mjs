import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = path.join(root, "web/axis-machine-model.js");
if (!existsSync(modulePath)) {
  console.error("AXIS_MACHINE_MODEL_FAIL|missing procedural model kinematics");
  process.exit(1);
}

await import(pathToFileURL(modulePath));
const model = globalThis.AigAxisModel;
assert.ok(model, "AXIS_MACHINE_MODEL_GLOBAL_MISSING");

const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${label}: ${actual} != ${expected}`);
const pose4 = model.rotaryPose({ A: 123, B: 70, C: 88 }, "4AX");
assert.deepEqual(pose4, { A: 123, B: 0, C: 0 });
const pose5 = model.rotaryPose({ A: 35, B: 70, C: 88 }, "5AX");
assert.deepEqual(pose5, { A: 35, B: 0, C: 0 });
const pose6 = model.rotaryPose({ A: 35, B: 70, C: 88 }, "6AX");
assert.deepEqual(pose6, { A: 35, B: 0, C: 88 });
assert.deepEqual(model.rotaryPose({ A: 90, B: 90, C: 90 }, "3AX"), { A: 0, B: 0, C: 0 });

for (const axis of ["5AX", "6AX"]) {
  const v = model.spindleAxis({ A: 40, B: 90, C: 180 }, axis);
  close(v.x, -1, `${axis}_B90_X`);
  close(v.y, 0, `${axis}_B90_Y`);
  close(v.z, 0, `${axis}_B90_Z`);
  const fullTurn = model.spindleAxis({ B: 360 }, axis);
  close(fullTurn.x, 0, `${axis}_B360_X`);
  close(fullTurn.z, 1, `${axis}_B360_Z`);
}

const m = model.axisCylinderMatrix(
  { x: -1, y: 0, z: 0 },
  { x: 10, y: 20, z: 30 },
  6,
  40,
);
close(m[8], -40, "CYLINDER_AXIS_X");
close(m[9], 0, "CYLINDER_AXIS_Y");
close(m[10], 0, "CYLINDER_AXIS_Z");
close(m[12], 10, "CYLINDER_CENTER_X");
close(m[13], 20, "CYLINDER_CENTER_Y");
close(m[14], 30, "CYLINDER_CENTER_Z");

const html = (await import("node:fs/promises")).readFile;
const source = await html(path.join(root, "web/index.html"), "utf8");
assert.match(source, /AigAxisModel\.rotaryPose\(/, "WEBGL_TABLE_POSE_NOT_BOUND");
assert.match(source, /AigAxisModel\.spindleAxis\(/, "WEBGL_SPINDLE_AXIS_NOT_BOUND");
assert.match(source, /AigAxisModel\.axisCylinderMatrix\(/, "WEBGL_HEAD_GEOMETRY_NOT_BOUND");

console.log("AXIS_MACHINE_MODEL_PASS|4AX_A_TABLE|5AX_B_HEAD_360|6AX_ABC|SPINDLE_MESH_ROTATES|WEBGL_BOUND");
