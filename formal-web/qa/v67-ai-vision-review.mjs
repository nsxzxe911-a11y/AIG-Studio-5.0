/* Optional true multimodal AI review. No images leave GitHub runner unless
 * explicitly provisioned with AIG_VISUAL_AI_API_KEY in repository secrets.
 * NEVER auto-approve 438 revoked images, page Authority, machine safety,
 * material removal, callback functionality or 0.001mm precision.
 * Pre-existing screenshot/pixel/DOM audit continues without this API key.
 */
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {PNG} from "pngjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(process.env.AIG_V67_AUDIT_OUT||path.join(here,"artifacts","v67"));
const key=process.env.AIG_VISUAL_AI_API_KEY;
const enabled=process.env.AIG_VISUAL_AI_ENABLED==="true";
const model=process.env.AIG_VISUAL_AI_MODEL||"gpt-4.1-mini";
let source;
try{source=JSON.parse(await fs.readFile(path.join(out,"report.json"),"utf8"))}
catch(e){source=null}
const report={schema:"AIG_V67_MULTIMODAL_IMAGE_REVIEW_V1",date:new Date().toISOString(),
 enabled,model,completed:0,pending:0,failed:0,items:[],
 verdict:"PENDING",reason:null,
 authoritySource:"NO_EXACT_APPROVED_PAGE_REFERENCE",actualImagesViewed:false,
 noCncCertification:true,noAutomaticRelease:true};
function thumb(buf){
 const original=PNG.sync.read(buf),f=Math.min(1,1280/original.width,960/original.height);
 const w=Math.max(1,Math.round(original.width*f)),h=Math.max(1,Math.round(original.height*f));
 const image=new PNG({width:w,height:h});
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const srcX=Math.min(original.width-1,Math.floor(x/f));
  const srcY=Math.min(original.height-1,Math.floor(y/f));
  const si=(srcY*original.width+srcX)*4,di=(y*w+x)*4;
  image.data[di]=original.data[si];image.data[di+1]=original.data[si+1];
  image.data[di+2]=original.data[si+2];image.data[di+3]=255;
 }
 return PNG.sync.write(image);
}
function parseText(data){
 const all=(data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==="output_text").map(c=>c.text).join("\n");
 const start=all.indexOf("{"),end=all.lastIndexOf("}");
 if(start<0||end<=start)throw Error("MODEL_DID_NOT_RETURN_JSON");
 return JSON.parse(all.slice(start,end+1));
}
if(!enabled){report.reason="AIG_VISUAL_AI_ENABLED_NOT_SET; screenshots still saved and statically analyzed";}
else if(!key){report.reason="AIG_VISUAL_AI_API_KEY_MISSING; automatic screenshots work but semantic model not connected";}
else if(!source){report.reason="SCREENSHOT_REPORT_NOT_AVAILABLE";}
else{
 const screenshots=source.captures.filter(c=>c.subpage==="MAIN");
 for(const snap of screenshots){
  const item={page:snap.page,profile:snap.profile,path:snap.file,modelStatus:"PENDING"};
  try{
   const buffer=thumb(await fs.readFile(path.join(out,snap.file)));
   const instruction=[
    "You are a forensic CNC UI/UX visual-audit reviewer. The image is an actual screenshot, not an approved Authority source.",
    "Return strictly one JSON object with properties: engineeringShellRisk (boolean), mismatchedAxisVisualRisk (boolean), ",
    "clippedOrOverlappingPanels (boolean), missingVisibleButtonsRisk (boolean), rgbGlassStyleVisible (boolean), ",
    "issues (array of up to 5 concise Traditional Chinese strings), confidence (0-1).",
    "Be conservative. Never invent hidden controls, axis degrees of freedom, manufacturing safety, CAD/CAM/NC correctness,",
    "or conformity to an approved image, because none is supplied. If uncertain add an issue.",
    "Target page: "+snap.page+", platform: "+snap.profile+". AIG requires black #020407 RGB CNC UI;",
    "6AX requires open-frame A/B independent 360° and a hinged 45° spindle head.",
    "Original exact approved Mobile/Desktop image Authority is NOT attached: do not output any Authority PASS."
   ].join(" ");
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),45000);
   let response;
   try{response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model,max_output_tokens:550,input:[{role:"user",content:[
     {type:"input_text",text:instruction},
     {type:"input_image",image_url:"data:image/png;base64,"+buffer.toString("base64"),detail:"low"}
    ]}]}),signal:abort.signal});
   }finally{clearTimeout(timer)}
   if(!response.ok)throw Error("VISION_HTTP_"+response.status+":"+String(await response.text()).slice(0,260));
   const answer=parseText(await response.json());
   item.modelStatus="IMAGE_REVIEW_COMPLETED_UNAPPROVED";
   item.result=answer;report.completed++;report.actualImagesViewed=true;
  }catch(e){item.modelStatus="FAILED";item.error=String(e?.message||e).slice(0,600);report.failed++;}
  report.items.push(item);
 }
 report.verdict=report.completed===screenshots.length&&report.failed===0?"IMAGES_REVIEWED_AUTHORITY_PENDING":"INCOMPLETE";
}
await fs.mkdir(out,{recursive:true});
report.pending=Math.max(0,(source?.captures?.filter(c=>c.subpage==="MAIN")?.length||0)-report.completed);
await fs.writeFile(path.join(out,"vision-review.json"),JSON.stringify(report,null,2));
console.log("AIG_V67_MULTIMODAL_VISUAL_REVIEW|"+JSON.stringify({
 status:report.verdict,completed:report.completed,failed:report.failed,
 reason:report.reason,approvedAuthority:false}));
