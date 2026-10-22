import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],outfile:'dist/app.js',minify:true,legalComments:'eof'});
fs.copyFileSync('index.html','dist/index.html');
for(const resource of ['reverse-lab.html','reverse-lab.mjs','aig-reverse-geometry-7-0.mjs','implicit-lab.html','implicit-lab.mjs','aig-implicit-volume-7-1.mjs','volume-lab.html','volume-lab.mjs','aig-volumetric-deform-7-2.mjs','face-material-lab.html','face-material-lab.mjs','aig-face-material-7-3.mjs','aig-portrait-audio-6-7.mjs','avatar-studio.html','avatar-studio.mjs','aig-avatar-rig-7-4.mjs','aig-landmark-rig-7-5.mjs','landmark-studio.html','landmark-studio.mjs','aig-face-depth-7-6.mjs','depth-studio.html','depth-studio.mjs','aig-hair-neck-7-7.mjs','occlusion-studio.html','occlusion-studio.mjs','aig-spatial-rig-7-8.mjs','spatial-studio.html','spatial-studio.mjs','aig-continuous-scan-7-9.mjs','continuous-studio.html','continuous-studio.mjs','aig-multiview-fusion-7-10.mjs','multiview-studio.html','multiview-studio.mjs']){
 fs.copyFileSync(resource,'dist/'+resource);
}
fs.copyFileSync('node_modules/three/LICENSE','dist/THREE-LICENSE.txt');
console.log('Local bundled PBR viewer built; no CDN or third-party character assets.');
