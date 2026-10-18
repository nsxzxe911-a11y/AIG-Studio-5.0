/* V52: deterministic CAM→SIM/NC preflight. No automatic NC edits, storage writes,
   simulation PASS, machine output, fake model, or G-code auto-scroll. */
(function(g){"use strict";
const KEY="aig-cam-toolpath-v1",EPS=1e-6;
function bad(code,msg){const e=new Error(msg);e.code=code;throw e}
function mm(x,name){const n=Number(x);if(!Number.isFinite(n)||Math.abs(n)>1e5)bad("NONFINITE",name+" 非有效毫米數值");if(Math.abs(n*1000-Math.round(n*1000))>EPS)bad("PRECISION",name+" 不符合 0.001 mm 格點");return n}
function positive(x,name){const n=Number(x);if(!Number.isFinite(n)||n<=0||n>1e5)bad("PARAM",name+" 必須是有效正值");return n}
function eq(a,b){return Math.abs(a-b)<1e-5}
function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,"0").toUpperCase()}
function inspect(v){
 if(!v||typeof v!=="object")bad("NO_CAM","沒有已套用 CAM");
 if(v.source!=="MANUAL"||v.params?.routeMode!=="MANUAL")bad("NOT_MANUAL","僅支援 3AX 手動 G0/G1；不可將自動 CAM 假轉 NC");
 const p=v.params,stock=v.stock,ns=v.manualNodes,paths=v.paths;
 if(!stock||!Array.isArray(ns)||!Array.isArray(paths)||!ns.length||!paths.length)bad("INCOMPLETE","手動節點、刀路或毛坯資料缺失");
 if(ns.length>1600||paths.length>1200)bad("TOO_LARGE","超過刀路上限");
 const safe=mm(p.safeZ,"Safe-Z"),top=mm(p.stockTop,"頂面"),thick=mm(p.stockThickness,"厚度");
 const bottom=mm(stock.bottom,"底面"),feed=positive(p.feed,"進給"),rpm=positive(p.rpm,"轉速");
 positive(p.toolDia,"刀徑");
 if(!Number.isInteger(rpm))bad("RPM","轉速 S 必須是整數，不能默默取整");
 if(safe<=top||thick<=0||!eq(bottom,top-thick)||!eq(mm(stock.top,"毛坯頂面"),top)||!eq(mm(stock.thickness,"毛坯厚度"),thick))bad("STOCK","Safe-Z 或毛坯上下界不一致");
 const lines=["(AIG V52 UNVERIFIED NC CANDIDATE)","(NO G43 H OR MACHINE CLEARANCE CERTIFICATION)","G90 G54 G17","S"+rpm+" M3","G0 Z"+safe.toFixed(3)];
 const warnings=["NC 候選僅供人工核對；刀長 G43/H、夾治具碰撞、SIM 材料移除、真機安全均未驗證。"];
 let prev=null,cuts=0;
 for(let i=0;i<ns.length;i++){
  const n=ns[i],tag="節點 "+(i+1);
  if(!n||!["G0","G1"].includes(n.g))bad("MOTION",tag+" 不是 G0/G1");
  if(["A","B","C","a","b","c"].some(a=>a in n))bad("ROTARY",tag+" 含不支援旋轉軸");
  const x=mm(n.x,tag+" X"),y=mm(n.y,tag+" Y"),z=mm(n.z,tag+" Z"),f=positive(n.f,tag+" F");
  const xy=prev?Math.hypot(x-prev.x,y-prev.y)>.0001:false,dz=prev?Math.abs(z-prev.z)>.0001:false;
  if(i===0&&(n.g!=="G0"||z<safe-.0001))bad("START","第一節點必須在 Safe-Z 的 G0");
  if(n.g==="G0"&&(z<safe-.0001||(prev&&xy&&Math.min(prev.z,z)<safe-.0001)))bad("RAPID",tag+" G0 快移低於 Safe-Z");
  if(n.g==="G1"){
   if(!prev||(!xy&&!dz)||(xy&&dz))bad("SWEEP",tag+" G1 無位移或含未驗證 XYZ 斜向掃掠");
   if(z<bottom-.0001)bad("OVER_CUT",tag+" 超出毛坯底面");
   const path=paths[cuts++];
   if(!path||path.kind!=="manual"||!Array.isArray(path.nodes)||path.nodes.length!==2)bad("PATH_MISMATCH",tag+" 切削段缺失");
   const pairs=[[path.nodes[0].x,prev.x],[path.nodes[0].y,prev.y],[path.nodes[0].z,prev.z],
    [path.nodes[1].x,x],[path.nodes[1].y,y],[path.nodes[1].z,z],[path.depth,z],[path.feed,f]];
   if(pairs.some(([a,b])=>!Number.isFinite(Number(a))||!eq(Number(a),b)))bad("PATH_MISMATCH",tag+" 與已保存 CAM 刀路不一致");
   // The saved segment must match its original CAM node and machining parameters.
   // Never present stale segment metadata as a coherent NC candidate.
   if(path.routeMode!=="MANUAL"||path.closed!==false||
      !Number.isFinite(Number(path.rpm))||!eq(Number(path.rpm),rpm)||
      !Number.isFinite(Number(path.safeZ))||!eq(Number(path.safeZ),safe)||
      path.nodes.some(q=>q?.g!=="G1")||
      !Number.isInteger(n.line)||n.line<1||n.line>1600||
      path.sourceId!=="MANUAL_L"+n.line)bad("PATH_MISMATCH",tag+" CAM 段落模式、轉速、Safe-Z 或來源行不一致");
   const expectedXY=xy?[[prev.x,prev.y],[x,y]]:[[x,y]];
   if(!Array.isArray(path.points)||path.points.length!==expectedXY.length||
      path.points.some((pt,j)=>!pt||!Number.isFinite(Number(pt.x))||
        !Number.isFinite(Number(pt.y))||!eq(Number(pt.x),expectedXY[j][0])||
        !eq(Number(pt.y),expectedXY[j][1])))bad("PATH_MISMATCH",tag+" CAM 平面刀路點與節點不一致");
   if(xy&&z>top+.0001)warnings.push(tag+" 在毛坯上方，不能宣稱移除材料");
  }
  lines.push(n.g+" X"+x.toFixed(3)+" Y"+y.toFixed(3)+" Z"+z.toFixed(3)+(n.g==="G1"?" F"+f.toFixed(3):""));
  prev={x,y,z};
 }
 if(cuts!==paths.length)bad("PATH_MISMATCH","G1 數量與刀路數量不一致");
 if(prev.z<safe-.0001||ns[ns.length-1].g!=="G0")bad("RETRACT","缺少 G0 安全退刀");
 lines.push("M5","M30");
 return Object.freeze({status:"NC_CANDIDATE_ONLY",axis:"3AX",pathCount:cuts,nodeCount:ns.length,
  fingerprint:digest(JSON.stringify({ns,paths,stock,p})),candidateCode:lines.join("\n"),
  warnings,simVerified:false,ncVerified:false,machineEnabled:false,canAutoApply:false,precision:.001});
}
function snapshot(store){try{const raw=store?.getItem(KEY);if(!raw)return{ok:false,code:"NO_CAM",message:"尚無已套用 CAM"};return{ok:true,evidence:inspect(JSON.parse(raw))}}catch(e){return{ok:false,code:e.code||"INVALID_CAM",message:String(e.message||e)}}}
function node(tag,label,cls){const e=document.createElement(tag);if(label!=null)e.textContent=label;if(cls)e.className=cls;return e}
function mount(root,kind){
 if(!root||root.querySelector(".aig52-preflight"))return;
 const host=kind==="CAM"?root.querySelector(".camgrid>.panel:first-child .body"):root.querySelector(".panel .body");
 if(!host)return;
 const box=node("section",null,"aig52-preflight");box.setAttribute("aria-label","CAM SIM NC 預檢");
 const row=node("div",null,"aig52-row"),btn=node("button","CAM→SIM／NC 預檢","btn"),status=node("span","讀取本機 CAM","aig52-status");
 btn.type="button";btn.dataset.buttonId="CAM.V52.PREFLIGHT";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 row.append(btn,status);box.append(row);
 let out,copy;
 if(kind==="CAM"){
  out=node("textarea",null,"aig52-code");out.readOnly=true;out.spellcheck=false;out.rows=6;out.hidden=true;
  out.setAttribute("aria-label","未驗證 NC 候選碼");
  copy=node("button","複製候選碼（不覆寫 NC）","btn");copy.type="button";copy.hidden=true;
  copy.addEventListener("click",async()=>{
   if(!out.value)return;
   try{await navigator.clipboard.writeText(out.value);status.textContent="候選碼已複製；NC/SIM 未驗證，原 G-code 未修改。"}
   catch(_){status.textContent="剪貼簿不可用；可手動選取複製，原 NC 未修改。";out.focus();out.select()}
  });box.append(out,copy);
 }
 const refresh=()=>{
  const s=snapshot(g.localStorage);
  if(s.ok){const v=s.evidence;status.textContent="CAM "+v.pathCount+" 段 · #"+v.fingerprint+" · NC 候選未驗證 · SIM 尚未接入";
   if(out){out.value=v.candidateCode;out.hidden=false;copy.hidden=false}}
  else{status.textContent=s.code+"："+s.message+"；原 NC/SIM 未變更";if(out){out.value="";out.hidden=true;copy.hidden=true}}
 };
 btn.addEventListener("click",refresh);g.addEventListener?.("aig-cam-updated",refresh);
 host.append(box);refresh();
}
function install(){
 if(typeof document==="undefined")return;
 document.querySelectorAll("[data-cam-runtime]").forEach(r=>mount(r,"CAM"));
 document.querySelectorAll("[data-sim-hub]").forEach(r=>mount(r,"SIM"));
}
function init(){
 install();const screens=document.getElementById("screens");
 if(screens&&typeof MutationObserver!=="undefined"){let queued=false;new MutationObserver(()=>{
  if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;install()})
 }).observe(screens,{childList:true,subtree:true})}
}
if(typeof document!=="undefined"){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init()}
g.AigCamNcV52=Object.freeze({inspect,snapshot,digest,install});
})(typeof window!=="undefined"?window:globalThis);

