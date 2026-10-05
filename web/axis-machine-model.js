(function exposeAxisMachineModel(root) {
  "use strict";

  function finiteAngle(value) {
    const angle = Number(value);
    return Number.isFinite(angle) ? angle : 0;
  }

  function rotaryPose(position, axis) {
    const p = position || {};
    return {
      A: axis === "3AX" ? 0 : finiteAngle(p.A),
      B: 0,
      C: axis === "6AX" ? finiteAngle(p.C) : 0,
    };
  }

  function spindleAxis(position, axis) {
    const p = position || {};
    const b = axis === "5AX" || axis === "6AX" ? finiteAngle(p.B) * Math.PI / 180 : 0;
    return { x: -Math.sin(b), y: 0, z: Math.cos(b) };
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  function axisCylinderMatrix(axis, center, diameter, length) {
    const z = normalize(axis);
    const reference = Math.abs(z.z) > 0.985 ? { x: 0, y: 1, z: 0 } : { x: 0, y: 0, z: 1 };
    const x = normalize(cross(reference, z));
    const y = normalize(cross(z, x));
    const d = Math.max(0.001, Number(diameter) || 0.001);
    const h = Math.max(0.001, Number(length) || 0.001);
    return new Float32Array([
      x.x * d, x.y * d, x.z * d, 0,
      y.x * d, y.y * d, y.z * d, 0,
      z.x * h, z.y * h, z.z * h, 0,
      Number(center.x) || 0, Number(center.y) || 0, Number(center.z) || 0, 1,
    ]);
  }

  root.AigAxisModel = Object.freeze({ rotaryPose, spindleAxis, axisCylinderMatrix });
})(globalThis);
