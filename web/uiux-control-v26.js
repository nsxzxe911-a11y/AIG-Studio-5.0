/* V26 site UI/UX controls – staged, per-project, version 25-compatible; no CNC data access */
(function(w,d){"use strict";
const root=d.getElementById("uiux26-center");if(!root)return;
const DEFINITIONS=[["HOME","首頁",true],["CAD","CAD 製圖",false],["CAM","CAM 刀路",false],["SIM","SIM 模擬",false],["3AX","三軸加工",false],["4AX","四軸加工",false],["5AX","五軸加工",false],["6AX","六軸加工",false],["NC","NC 程式",false],["AI","AI 助手",false],["刀路","刀路編輯",true],["功能","功能設定",true]];
const mutable=DEFINITIONS.filter(x=>!x[2]).map(x=>x[0]);
const sources={aigii:{key:"aigii.web.uiux.v25",url:"./mobile-runtime.html#HOME",name:"AIG-II 原工作區"},studio:{key:"aigii.studio375.uiux.v25",url:"./studio-375.html#HOME",name:"Studio 375 工作區"}};
const standard=()=>({layout:"auto",density:"normal",contrast:false,visible:mutable.slice()});
function normalize(raw){const a=raw&&typeof raw==="object"?raw:{};return{layout:["auto","desktop","mobile"].includes(a.layout)?a.layout:"auto",density:["normal","compact"].includes(a.density)?a.density:"normal",contrast:a.contrast===true,visible:Array.isArray(a.visible)?[...new Set(a.visible.filter(x=>mutable.includes(x)))]:mutable.slice()}}
function read(id){try{const raw=w.localStorage.getItem(sources[id].key);return raw?normalize(JSON.parse(raw)):standard()}catch(_){return standard()}}
function snapshot(c){return JSON.stringify(normalize(c))}
let project="aigii";
const drafts={aigii:read("aigii"),studio:read("studio")};
const saved={aigii:snapshot(drafts.aigii),studio:snapshot(drafts.studio)};
const projects=[...root.querySelectorAll("[data-ux26-project]")];
const options=d.getElementById("ux26-module-options"),state=d.getElementById("ux26-message");
const preview=d.getElementById("ux26-preview"),previewNav=d.getElementById("ux26-preview-nav"),previewMode=d.getElementById("ux26-preview-mode");
const launch=d.getElementById("ux26-open-workspace"),layout=d.getElementById("ux26-layout"),density=d.getElementById("ux26-density"),contrast=d.getElementById("ux26-contrast");
const boxes={};
for(const [id,name,locked] of DEFINITIONS){
 const l=d.createElement("label");l.className="ux26-option";
 const input=d.createElement("input");input.type="checkbox";input.disabled=locked;input.dataset.ux26Module=id;
 const label=d.createElement("span");label.textContent=name;
 const hint=d.createElement("small");hint.textContent=locked?"固定":"可切換";
 l.append(input,label,hint);options.appendChild(l);boxes[id]=input;
}
function isDirty(id){return snapshot(drafts[id])!==saved[id]}
function note(message){state.textContent=message}
function render(){
 const c=drafts[project];
 projects.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.ux26Project===project)));
 layout.value=c.layout;density.value=c.density;contrast.checked=c.contrast;
 for(const [id,,locked] of DEFINITIONS)boxes[id].checked=locked||c.visible.includes(id);
 const shown=DEFINITIONS.filter(x=>x[2]||c.visible.includes(x[0]));
 previewNav.replaceChildren();
 for(const [id,name] of shown){const chip=d.createElement("span");chip.textContent=name;chip.dataset.pageId=id;previewNav.appendChild(chip)}
 preview.dataset.layout=c.layout;preview.dataset.density=c.density;preview.dataset.contrast=c.contrast?"high":"normal";
 const desc={auto:"自動適配",mobile:"手機版",desktop:"桌面版"}[c.layout];
 previewMode.textContent=desc+" · "+(c.density==="compact"?"緊湊":"標準")+" · "+(c.contrast?"高對比":"一般 RGB")+" · "+shown.length+" 個導覽";
 launch.href=sources[project].url;launch.textContent="前往 "+sources[project].name+" ↗";
 if(isDirty(project))note("此工作區有尚未套用的介面修改。請按「套用到此工作區」保存。");
 else note("正在編輯："+sources[project].name+"。目前顯示已儲存的本機介面設定。");
}
function update(patch){drafts[project]=normalize({...drafts[project],...patch});render()}
projects.forEach(btn=>btn.addEventListener("click",()=>{project=btn.dataset.ux26Project;render()}));
layout.addEventListener("change",()=>update({layout:layout.value}));
density.addEventListener("change",()=>update({density:density.value}));
contrast.addEventListener("change",()=>update({contrast:contrast.checked}));
options.addEventListener("change",e=>{
 const input=e.target.closest("[data-ux26-module]");if(!input||input.disabled)return;
 const id=input.dataset.ux26Module,next=new Set(drafts[project].visible);
 if(input.checked)next.add(id);else next.delete(id);
 update({visible:[...next]});
});
const presets={all:mutable,cadcam:["CAD","CAM"],axis:["SIM","3AX","4AX","5AX","6AX"],ncai:["NC","AI"]};
root.querySelectorAll("[data-ux26-preset]").forEach(btn=>btn.addEventListener("click",()=>{const chosen=presets[btn.dataset.ux26Preset];if(chosen)update({visible:chosen})}));
d.getElementById("ux26-default").addEventListener("click",()=>{drafts[project]=standard();render();note("已在預覽選用預設介面，尚未寫入本機設定。按「套用」才會保存。")});
d.getElementById("ux26-reload").addEventListener("click",()=>{drafts[project]=read(project);saved[project]=snapshot(drafts[project]);render();note("已重新讀取此工作區的介面偏好，沒有修改 CNC 資料。")});
d.getElementById("ux26-save").addEventListener("click",()=>{
 const id=project,key=sources[id].key,old=saved[id],next=snapshot(drafts[id]);
 let latest;
 try{latest=w.localStorage.getItem(key);latest=latest?snapshot(JSON.parse(latest)):snapshot(standard())}
 catch(_){note("無法讀取本機設定；未寫入任何 CNC 資料。");return}
 if(latest!==old){note("其他分頁已變更此工作區設定；為避免覆蓋，請先按「重新讀取已儲存設定」。");return}
 try{w.localStorage.setItem(key,next)}catch(_){note("瀏覽器不允許儲存介面設定。預覽仍可使用，CNC 資料未變動。");return}
 saved[id]=next;render();note("已套用至 "+sources[id].name+"，進入工作區即可使用。本機 CNC 專案未修改。");
});
w.addEventListener?.("storage",event=>{
 if(!event||!event.key)return;
 for(const id of Object.keys(sources)){
  if(sources[id].key!==event.key)continue;
  if(isDirty(id)){if(id===project)note("另一個分頁已更新偏好；目前預覽未覆蓋它，請按重新讀取。");return}
  drafts[id]=read(id);saved[id]=snapshot(drafts[id]);if(id===project){render();note("已從其他分頁同步介面設定。")}
 }
});
render();
w.AIG_UIUX_V26=Object.freeze({getSelectedProject:()=>project,getPreview:()=>({...drafts[project],visible:[...drafts[project].visible]}),hasUnsavedChanges:()=>isDirty(project)});
})(window,document);