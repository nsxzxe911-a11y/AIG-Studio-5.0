import {build} from 'esbuild';
import fs from 'node:fs';
await build({entryPoints:['app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],outfile:'dist/app.js',minify:true,legalComments:'eof'});
fs.copyFileSync('index.html','dist/index.html');
fs.copyFileSync('node_modules/three/LICENSE','dist/THREE-LICENSE.txt');
console.log('Local bundled PBR viewer built; no CDN or third-party character assets.');
