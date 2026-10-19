"use strict";
/* V87 Manus candidate intake. NEVER execute untrusted app.js; only parse/check.
 * No deployment, no network access, no access to CNC or credential files. */
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),child=require("node:child_process");
const root=path.resolve(__dirname);
const config=JSON.parse(fs.readFileSync(path.join(root,"handoff-manifest.json"),"utf8"));
const candidate=path.join(root,"candidate");
const required=config.artifactIntake.expectedFiles.map(x=>x.name);
const strict=process.argv.includes("--strict");
const results=[];
for(const name of required){
 const file=path.resolve(candidate,name);
 if(!file.startsWith(candidate+path.sep)){results.push({file:name,status:"BLOCKED_PATH"});continue}
 if(!fs.existsSync(file)){results.push({file:name,status:"MISSING"});continue}
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8*1024*1024){results.push({file:name,status:"BLOCKED_TYPE_OR_SIZE"});continue}
 const bytes=fs.readFileSync(file);
 results.push({file:name,status:"PRESENT",bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex")});
}
const missing=results.filter(x=>x.status!=="PRESENT");
const flags=[];
const exists=name=>results.some(x=>x.file===name&&x.status==="PRESENT");
function text(name){return fs.readFileSync(path.join(candidate,name),"utf8")}
if(exists("app.js")){
 const src=text("app.js");
 for(const [name,pat] of [["dynamic-code",/\beval\s*\(|\bnew\s+Function\s*\(/],["sensitive-key",/sk-proj-|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],["machine-transport",/\b(?:WebSerial|SerialPort|navigator\.serial|navigator\.usb|navigator\.bluetooth)\b/],["network-egress",/\b(?:fetch\s*\(|XMLHttpRequest|WebSocket\s*\(|sendBeacon\s*\()/]])if(pat.test(src))flags.push("REVIEW_"+name);
 try{child.execFileSync(process.execPath,["--check",path.join(candidate,"app.js")],{stdio:"pipe",timeout:7000})}catch(e){flags.push("BLOCKED_SYNTAX_APP_JS")}
}
if(exists("index.html")){
 const html=text("index.html");
 if(/<script[^>]+(?:src|type)\s*=\s*["']https?:\/\//i.test(html))flags.push("REVIEW_EXTERNAL_SCRIPT");
 if(/<iframe/i.test(html))flags.push("REVIEW_IFRAME");
}
if(exists("public/manus-routes.json")){
 try{
  const data=JSON.parse(text("public/manus-routes.json"));
  const serialized=JSON.stringify(data).toLowerCase();
  for(const page of ["home","cad","cam","sim","3ax","4ax","5ax","6ax","nc","ai","toolpath"])if(!serialized.includes(page))flags.push("REVIEW_MISSING_ROUTE_"+page.toUpperCase());
 }catch(e){flags.push("BLOCKED_ROUTES_JSON")}
}
if(exists("styles.css")){
 const styles=text("styles.css").toLowerCase();
 if(!styles.includes("#020407")||!styles.includes("#07111b"))flags.push("REVIEW_RGB_TOKENS");
}
const output={schema:"AIG_V87_MANUS_INTAKE_RESULT",taskId:config.origin.taskId,
 expected:required.length,received:results.length-missing.length,
 files:results,flags,coreIntegration:"NOT_PERFORMED",machineOutput:"BLOCKED",
 status:missing.length?"BLOCKED_MANUS_SOURCE_MISSING":flags.some(x=>x.startsWith("BLOCKED_"))?"BLOCKED_SOURCE_INVALID":flags.length?"MANUAL_REVIEW_REQUIRED":"READY_FOR_MANUAL_UI_DIFF"};
process.stdout.write(JSON.stringify(output,null,2)+"\n");
if(strict&&(missing.length||flags.length))process.exitCode=2;
