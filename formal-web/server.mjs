import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
const port=Number(process.env.PORT||3000);
createServer(async(req,res)=>{try{const url=new URL(req.url||'/','http://localhost');if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store','x-aig-runtime-surface':'formal-web-runtime'});res.end('AIG_WEB_RUNTIME_OK');return;}const raw=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const rel=normalize(raw).replace(/^([/\\])+/,'');if(rel.startsWith('..'))throw new Error('forbidden');let path=join(root,rel);const s=await stat(path);if(s.isDirectory())path=join(path,'index.html');const body=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path).toLowerCase()]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff','x-aig-runtime-surface':'formal-web-runtime'});res.end(body);}catch{res.writeHead(404,{'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});res.end('Not Found');}}).listen(port,'0.0.0.0',()=>console.log(`AIG_WEB_RUNTIME_LISTENING ${port}`));
