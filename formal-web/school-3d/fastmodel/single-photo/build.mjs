import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],outfile:'dist/app.js',minify:true,legalComments:'eof'});
fs.copyFileSync('index.html','dist/index.html');
await build({entryPoints:['metric-stereo-studio.mjs'],bundle:true,
 format:'iife',platform:'browser',target:['chrome100','edge100'],
 outfile:'dist/metric-stereo-studio.js',minify:true,legalComments:'eof'});
fs.copyFileSync('metric-stereo-studio.html','dist/metric-stereo-studio.html');
for(const resource of ['reverse-lab.html','reverse-lab.mjs','aig-reverse-geometry-7-0.mjs','implicit-lab.html','implicit-lab.mjs','aig-implicit-volume-7-1.mjs','volume-lab.html','volume-lab.mjs','aig-volumetric-deform-7-2.mjs','face-material-lab.html','face-material-lab.mjs','aig-face-material-7-3.mjs','aig-portrait-audio-6-7.mjs','avatar-studio.html','avatar-studio.mjs','aig-avatar-rig-7-4.mjs','aig-landmark-rig-7-5.mjs','landmark-studio.html','landmark-studio.mjs','aig-face-depth-7-6.mjs','depth-studio.html','depth-studio.mjs','aig-hair-neck-7-7.mjs','occlusion-studio.html','occlusion-studio.mjs','aig-spatial-rig-7-8.mjs','spatial-studio.html','spatial-studio.mjs','aig-continuous-scan-7-9.mjs','continuous-studio.html','continuous-studio.mjs','aig-multiview-fusion-7-10.mjs','multiview-studio.html','multiview-studio.mjs','aig-auto-correspondence-7-11.mjs','tracking-studio.html','tracking-studio.mjs','aig-camera-pose-7-12.mjs','aig-cad-grid-scale-7-12.mjs','aig-scene-percent-7-12.mjs','cad-scale-studio.html','cad-scale-studio.mjs','aig-scene-map-7-12.mjs','scene-map-studio.html','scene-map-studio.mjs']){
 fs.copyFileSync(resource,'dist/'+resource);
}
fs.copyFileSync('node_modules/three/LICENSE','dist/THREE-LICENSE.txt');
console.log('Local bundled PBR viewer built; no CDN or third-party character assets.');

const sharedPath='../../../shared-3d/';
fs.mkdirSync('dist/shared-3d',{recursive:true});
for(const resource of [
 'aig-real3d-core.mjs','aig-real3d-quality.mjs','aig-real3d-gpu-budget-1-6.mjs','aig-real3d-webgl.mjs',
 'aig-real3d-adapters.mjs','aig-real3d-lab.html','aig-real3d-lab.mjs',
 'aig-real3d-stock-removal-1-1.mjs','aig-real3d-stock-lab.html','aig-real3d-stock-lab.mjs','aig-real3d-nc-preview-1-2.mjs','aig-real3d-nc-lab.html','aig-real3d-nc-lab.mjs','aig-real3d-step-replay-1-3.mjs','aig-real3d-replay-lab.html','aig-real3d-replay-lab.mjs','aig-real3d-axis-bridge-1-4.mjs','aig-real3d-rig-integrity-1-5.mjs'
]){
 fs.copyFileSync(sharedPath+resource,'dist/shared-3d/'+resource);
}
console.log('Shared AIG Real3D 1.0 copied into local offline package; no external CDN or NC writes.');
