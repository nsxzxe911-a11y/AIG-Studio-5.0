import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=n=>readFileSync(new URL("../"+n,import.meta.url),"utf8");
test("both original CNC runtimes cache stock geometry without changing removal logic",()=>{
 for(const p of ["mobile-runtime.html","studio-375.html"]){
  const s=read(p);
  for(const x of ["function v33Match(","cache.parsed===scene.parsed","cache.index===scene.index","cache.t===scene.t","cache.dry===Boolean(scene.dry)","cache.cutterLen===Number(scene.cutterLen||30)","getMeshStatistics:v33MeshStats","root.aigVisualV33=glScene"])assert.ok(s.includes(x),p+":"+x);
  assert.ok(s.includes('return v33Save("height",scene,key,removalCache.n'));
  assert.ok(s.includes('return v33Save("voxel",scene,key,grid'));
  assert.ok(s.includes("getRemoval:()=>({...lastRemoval})"));
 }
});
test("Studio voxel scans only the tool envelope",()=>{
 const s=read("studio-375.html");
 assert.ok(s.includes("Math.min(tip.x,tipEnd.x)-r-v.minX"));
 assert.ok(s.includes("for(let iz=iz0;iz<=iz1;iz++)for(let iy=iy0;iy<=iy1;iy++)for(let ix=ix0;ix<=ix1;ix++)"));
 assert.ok(!s.includes("for(let iz=0;iz<voxelCache.nz;iz++)for(let iy=0;iy<voxelCache.ny;iy++)for(let ix=0;ix<voxelCache.nx;ix++)"));
});
test("V33 performance HUD shows derived metrics from the real WebGL controller",()=>{
 const s=read("axis-performance-v32.js");
 for(const x of ["root.aigVisualV33?.read?.()",'["tri","工件三角片"]','["reuse","網格重用率"]'])assert.ok(s.includes(x));
 for(const x of ["NC_SEND","MACHINE_CONNECT","localStorage.setItem(","dispatchUiCommand("])assert.ok(!s.includes(x));
});
test("service worker cache bumped without changing offline assets",()=>{
 const s=read("service-worker.js");assert.ok(s.includes("geometry-v33-20261018"));assert.ok(s.includes("axis-performance-v32.js"));
});
