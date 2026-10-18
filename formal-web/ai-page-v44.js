/* V44 additive extension: real callbacks only; advisory checks never command a machine. */
(function(w,d){"use strict";
const VERSION="44.0.0",AXES=["3AX","4AX","5AX","6AX"],PAGES=["HOME","CAD","CAM","SIM",...AXES,"NC","AI"],mounted=new Map();
const extra={
HOME:[["3AX 加工","[data-open-page=\"3AX\"]","OPEN_3AX"],["4AX 加工","[data-open-page=\"4AX\"]","OPEN_4AX"],["5AX 加工","[data-open-page=\"5AX\"]","OPEN_5AX"],["6AX 加工","[data-open-page=\"6AX\"]","OPEN_6AX"],["AI 助手","[data-open-page=\"AI\"]","OPEN_AI"]],
CAD:[["矩形","[data-cad-tool=\"RECT\"]","DRAW_RECT"],["圓弧","[data-cad-tool=\"ARC\"]","DRAW_ARC"],["孔","[data-cad-tool=\"HOLE\"]","DRAW_HOLE"],["延伸","[data-cad-action=\"EXTEND\"]","EDIT_EXTEND"],["偏移","[data-cad-action=\"OFFSET\"]","EDIT_OFFSET"],["陣列","[data-cad-action=\"ARRAY\"]","EDIT_ARRAY"],["尺寸","[data-cad-action=\"DIM\"]","EDIT_DIM"],["重做","[data-cad-action=\"REDO\"]","EDIT_REDO"],["選取","[data-cad-tool=\"SELECT\"]","TOOL_SELECT"],["縮放全圖","[data-cad-action=\"FIT\"]","VIEW_FIT"]],
CAM:[["重讀 CAD","[data-cam-action=\"RELOAD\"]","RELOAD"],["Z 等高","[data-cam-strategy=\"ZLEVEL\"]","ZLEVEL"],["平行","[data-cam-strategy=\"PARALLEL\"]","PARALLEL"],["2.5D 自適應","[data-cam-strategy=\"ADAPTIVE\"]","ADAPTIVE"],["倒角","[data-cam-strategy=\"CHAMFER\"]","CHAMFER"],["攻牙","[data-cam-strategy=\"TAP\"]","TAP"],["預覽全圖","[data-cam-action=\"FIT\"]","FIT"],["套用刀路","[data-cam-action=\"APPLY\"]","APPLY"],["AUTO","[data-cam-route-mode]","AUTO","select","AUTO"],["MANUAL","[data-cam-route-mode]","MANUAL","select","MANUAL"],["檢查手動節點","[data-cam-manual-input]","MANUAL_PREFLIGHT","preflight"]],
SIM:[["四軸","[data-open-page=\"4AX\"]","OPEN_4AX"]],
NC:[["Block Skip","[data-nc-action=\"BLOCKSKIP\"]","BLOCK_SKIP"],["行首","[data-nc-action=\"TOP\"]","JUMP_TOP"],["行尾","[data-nc-action=\"BOTTOM\"]","JUMP_BOTTOM"],["軸別預檢","[data-nc-code]","AXIS_REVIEW","review"]],
AI:[["問題說明","[data-ai-command=\"AI.ASSIST.EXPLAIN\"]","EXPLAIN"],["優化建議","[data-ai-command=\"AI.PLAN.OPTIMIZE\"]","OPTIMIZE"],["恢復規劃","[data-ai-command=\"AI.RECOVERY.REPLAN\"]","REPLAN"]]
};
for(const axis of AXES)extra[axis]=[
["機台頁","[data-axis-subpage=\"MACHINE\"]","MACHINE"],["原生解析","[data-editcmd=\"parse\"]","PARSE"],["原生驗證","[data-editcmd=\"verify\"]","VERIFY"],["編輯儲存","[data-editcmd=\"save\"]","SAVE"],["單節","[data-cmd=\"single\"]","SINGLE"],["選擇停","[data-cmd=\"optional\"]","OPTIONAL"],["跳段","[data-cmd=\"blockskip\"]","BLOCKSKIP"],["流暢","[data-render-quality=\"FAST\"]","QUALITY_FAST"],["標準","[data-render-quality=\"BALANCED\"]","QUALITY_BALANCED"],["細緻","[data-render-quality=\"DETAIL\"]","QUALITY_DETAIL"],["軸別預檢","textarea.code[data-axis]","AXIS_REVIEW","review"]];
for(const axis of ["5AX","6AX"])extra[axis].push(["跟刀","[data-cmd=\"follow\"]","CAM_FOLLOW"],["避遮擋","[data-cmd=\"occlusion\"]","CAM_OCCLUSION"],["毛坯置中","[data-cmd=\"center\"]","CAM_CENTER"]);
function el(tag,cls,label){const e=d.createElement(tag);e.className=cls;e.textContent=label||"";return e}
function real(root,spec){
 try{const e=root.querySelector(spec[1]);if(!e||!e.isConnected||e.disabled||e.closest("[disabled]"))return null;
 if(spec[3]==="select")return e.matches("select")&&[...e.options].some(o=>o.value===spec[4])?e:null;
 if(spec[3]==="preflight")return typeof w.AigManualCam?.parseManual==="function"?e:null;
 if(spec[3]==="review")return "value" in e?e:null;
 return typeof e.click==="function"&&e.matches("button,[role=button],input[type=button]")?e:null;
 }catch(_){return null}
}
function notice(ref,text,warn){ref.message.textContent=text;ref.message.dataset.aig44Warning=warn?"true":"false"}
function scan(text,axis){
 const allowed=new Set(["X","Y","Z"].concat(axis==="4AX"?["A"]:axis==="5AX"?["A","B"]:axis==="6AX"?["A","B","C"]:[])),issues=[];
 const lines=String(text||"").replace(/\r/g,"").split("\n");
 for(let i=0;i<lines.length&&issues.length<12;i++){
  const line=lines[i].replace(/\([^)]*\)/g," ").replace(/;.*$/,"").toUpperCase();
  for(const hit of line.matchAll(/([ABCXYZ])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))/g)){
   if(!allowed.has(hit[1]))issues.push("L"+(i+1)+" "+hit[1]+" 非 "+axis+" 軸");
   if(issues.length>=12)break;
  }
  if(/G0*20(?![\d.])/.test(line))issues.push("L"+(i+1)+" G20 英制：確認單位");
  if(/G0*91(?![\d.])/.test(line))issues.push("L"+(i+1)+" G91 增量：確認原點");
  if(/M0*98(?![\d.])/.test(line))issues.push("L"+(i+1)+" M98 子程式：須原生解析");
 }
 return{lines:lines.length,issues};
}
function review(root,ref){
 const axis=AXES.includes(root.dataset.page)?root.dataset.page:root.querySelector("[data-nc-axis]")?.value||"3AX";
 const ta=AXES.includes(root.dataset.page)?root.querySelector("textarea.code[data-axis]"):root.querySelector("[data-nc-code]");
 if(!ta){notice(ref,"原 G-code 編輯器尚未就緒。",true);return}
 const result=scan(ta.value,axis);
 notice(ref,axis+" Web 軸別檢視："+result.lines+" 行；"+(result.issues.length?result.issues.join("；"):"未偵測跨軸地址或指定模式提醒")+"。只做輔助掃描；不代表原生解析、碰撞或上機安全 PASS。",!!result.issues.length);
}
function preflight(root,ref){
 const n=k=>Number(root.querySelector("[data-cam-"+k+"]")?.value);
 try{const result=w.AigManualCam.parseManual(root.querySelector("[data-cam-manual-input]").value,
 {safeZ:n("safez"),stockTop:n("stocktop"),stockThickness:n("stockthickness"),feed:n("feed"),rpm:n("rpm"),toolDia:n("tool")});
 notice(ref,"手動 CAM："+result.nodes.length+" 節點／"+result.paths.length+" 切削段；"+(result.warnings.join("；")||"通過基本節點檢查")+"。尚未 SIM／NC 驗證。",result.warnings.length>0);
 }catch(e){notice(ref,"手動 CAM 預檢失敗："+String(e.message||e)+"；原刀路不變。",true)}
}
function update(root){
 const ref=mounted.get(root);if(!ref||!ref.bar.isConnected)return;
 for(const item of ref.items){
  const target=real(root,item.spec);item.button.disabled=!target;
  item.button.title=target?"原 Runtime 操作；不會輸出機台":"原功能未就緒，已停用";
  if(item.spec[3]==="select")item.button.setAttribute("aria-pressed",String(!!target&&target.value===item.spec[4]));
  else if(target&&(target.matches("[data-cmd]")||target.matches("[data-cam-strategy]")))
   item.button.setAttribute("aria-pressed",String(target.classList.contains("warn")||target.classList.contains("selected")||target.classList.contains("cadSelected")));
 }
 if(ref.telemetry){
  const read=s=>root.querySelector(s)?.textContent?.trim()||"—";
  const axes=[...root.querySelectorAll("[data-axis-read]")].map(e=>e.textContent.trim()).join(" · ");
  const t=axes+"  |  材移 "+read("[data-removal-volume]")+"  |  網格 "+read("[data-cut-resolution]");
  if(ref.telemetry.textContent!==t)ref.telemetry.textContent=t;
 }
}
function mount(root){
 if(mounted.has(root))return true;
 const page=root.dataset.page,bar=root.querySelector(".aig43-bar");if(!bar||!extra[page])return false;
 root.dataset.aig44Page=page;
 const actions=el("div","aig44-actions"),message=el("div","aig44-message"),ref={bar,actions,message,items:[],telemetry:null};
 actions.setAttribute("role","group");actions.setAttribute("aria-label",page+" 原生操作擴充");
 message.setAttribute("role","status");message.setAttribute("aria-live","polite");
 for(const spec of extra[page]){
  const b=el("button","aig44-action",spec[0]);b.type="button";
  b.dataset.aig44ButtonId="BTN_"+page+"_V44_"+spec[2];b.dataset.aig44CommandId="CMD_"+page+"_"+spec[2];
  b.addEventListener("click",()=>{
   const target=real(root,spec);if(!target)return;
   if(spec[3]==="preflight")preflight(root,ref);
   else if(spec[3]==="review")review(root,ref);
   else if(spec[3]==="select"){if(target.value!==spec[4]){target.value=spec[4];target.dispatchEvent(new Event("change",{bubbles:true}))}}
   else target.click();
   w.setTimeout(()=>update(root),40);
  });ref.items.push({button:b,spec});actions.appendChild(b);
 }
 const toggle=el("button","aig44-focus","專注工作區");toggle.type="button";
 toggle.dataset.aig44ButtonId="BTN_"+page+"_V44_FOCUS";
 toggle.setAttribute("aria-pressed","false");
 toggle.addEventListener("click",()=>{
  const on=root.dataset.aig44Focus!=="true";root.dataset.aig44Focus=String(on);
  toggle.setAttribute("aria-pressed",String(on));toggle.textContent=on?"展開操作":"專注工作區";
 });
 bar.querySelector(".aig43-header")?.appendChild(toggle);
 const metrics=bar.querySelector(".aig43-metrics");if(metrics)bar.insertBefore(actions,metrics);else bar.appendChild(actions);
 if(AXES.includes(page)){ref.telemetry=el("div","aig44-axis-telemetry","—");bar.appendChild(ref.telemetry)}
 bar.appendChild(message);mounted.set(root,ref);update(root);return true;
}
function inspect(){return PAGES.map(page=>{const root=d.querySelector('.screen[data-page="'+page+'"]'),ref=root&&mounted.get(root);
 return{page,mounted:!!ref,working:ref?.items.filter(x=>!x.button.disabled).length||0,total:extra[page].length}})}
function refresh(){for(const root of d.querySelectorAll(".screen[data-page]"))mount(root);const r=d.querySelector(".screen.active[data-page]");if(r)update(r);return inspect()}
let running=true;function loop(){if(!running)return;if(d.visibilityState!=="hidden")refresh();w.setTimeout(loop,d.visibilityState==="hidden"?1400:850)}
function start(){refresh();w.setTimeout(loop,400)}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",start,{once:true});else start();
w.AIG_AI_PAGE_V44=Object.freeze({version:VERSION,pages:PAGES.slice(),refresh,inspect,scan,stop(){running=false}});
})(window,document);
