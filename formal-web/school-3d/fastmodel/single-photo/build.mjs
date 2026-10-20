import {build} from 'esbuild';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const output=fileURLToPath(new URL('../../../fastmodel/',import.meta.url));
fs.mkdirSync(output,{recursive:true});
await build({entryPoints:['app.mjs'],bundle:true,format:'iife',platform:'browser',target:['chrome100','edge100'],outfile:output+'app.js',minify:true,legalComments:'eof'});
fs.copyFileSync('index.html',output+'index.html');
fs.copyFileSync('node_modules/three/LICENSE',output+'THREE-LICENSE.txt');
console.log('Built the static AIG /fastmodel/ page with local bundled dependencies.');
