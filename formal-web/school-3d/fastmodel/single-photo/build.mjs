import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],outfile:'dist/app.js',minify:true,legalComments:'eof'});
fs.copyFileSync('index.html','dist/index.html');
for(const resource of ['reverse-lab.html','reverse-lab.mjs','aig-reverse-geometry-7-0.mjs','implicit-lab.html','implicit-lab.mjs','aig-implicit-volume-7-1.mjs','volume-lab.html','volume-lab.mjs','aig-volumetric-deform-7-2.mjs','face-material-lab.html','face-material-lab.mjs','aig-face-material-7-3.mjs','aig-portrait-audio-6-7.mjs','avatar-studio.html','avatar-studio.mjs','aig-avatar-rig-7-4.mjs']){
 fs.copyFileSync(resource,'dist/'+resource);
}
fs.copyFileSync('node_modules/three/LICENSE','dist/THREE-LICENSE.txt');
console.log('Local bundled PBR viewer built; no CDN or third-party character assets.');
