/* UI / UX V25: presentation controls only; all CNC callbacks and data untouched. */
(function(w,d){"use strict";
const defs=[["HOME","首頁","core"],["CAD","CAD 製圖","cadcam"],["CAM","CAM 刀路","cadcam"],["SIM","SIM 模擬","axis"],["3AX","三軸加工","axis"],["4AX","四軸加工","axis"],["5AX","五軸加工","axis"],["6AX","六軸加工","axis"],["NC","NC 程式","ncai"],["AI","AI 助手","ncai"],["刀路","刀路編輯","core"],["功能","功能設定","core"]];
const label=Object.fromEntries(defs.map(x=>[x[0],x[1]]));
const locked=new Set(["HOME","刀路","功能"]);
const editable=defs.map(x=>x[0]).filter(x=>!locked.has(x));
const nav=d.getElementById("nav"),header=d.querySelector(".top");
if(!nav||!header)return;
const studio=/studio-375\.html$/i.test(w.location?.pathname||"");
const key=studio?"aigii.studio375.uiux.v25":"aigii.web.uiux.v25";
const defaults=()=>({layout:"auto",density:"normal",contrast:false,visible:[...editable]});
function clean(x){
 const v=x&&typeof x==="object"?x:{};
 return{layout:["auto","desktop","mobile"].includes(v.layout)?v.layout:"auto",
 density:["normal","compact"].includes(v.density)?v.density:"normal",
 contrast:v.contrast===true,
 visible:Array.isArray(v.visible)?[...new Set(v.visible.filter(id=>editable.includes(id)))]:[...editable]};
}
let config=defaults();try{const x=w.localStorage.getItem(key);if(x)config=clean(JSON.parse(x))}catch(_){}
function persist(){try{w.localStorage.setItem(key,JSON.stringify(config));return true}catch(_){return false}}
const launch=d.createElement("button");launch.type="button";launch.className="uiux25-launch";launch.textContent="介面設定";launch.setAttribute("aria-haspopup","dialog");
header.insertBefore(launch,header.querySelector(".status")||null);
const popup=d.createElement("dialog");popup.className="uiux25-dialog";popup.setAttribute("aria-label","繁體中文 UI/UX 模組化設定");
popup.innerHTML=`<div class="uiux25-title"><div><small>繁體中文 / UI・UX V25</small><h2>模組化介面設定</h2><p>只更改顯示與導覽，所有加工核心、G-code 和本機資料保持原樣。</p></div><button type="button" data-uiux-close aria-label="關閉介面設定">✕</button></div>
<div class="uiux25-group"><h3>語言與版型</h3><div class="uiux25-fields"><label>顯示語言<select disabled><option>繁體中文（台灣）</option></select></label><label>裝置版型<select data-uiux-layout><option value="auto">自動適配</option><option value="desktop">桌面版</option><option value="mobile">手機版</option></select></label><label>顯示密度<select data-uiux-density><option value="normal">標準</option><option value="compact">緊湊</option></select></label></div><label class="uiux25-contrast"><input type="checkbox" data-uiux-contrast>高對比 RGB</label></div>
<div class="uiux25-group"><h3>模組化導覽設定</h3><p>取消勾選只會隱藏導覽按鈕，不會停用模組。首頁、刀路及功能固定保留；正在編輯的頁面始終可見。</p><div class="uiux25-presets"><button type="button" data-uiux-preset="all">全部顯示</button><button type="button" data-uiux-preset="cadcam">製圖／刀路</button><button type="button" data-uiux-preset="axis">模擬與多軸</button><button type="button" data-uiux-preset="ncai">NC／AI</button></div><div class="uiux25-modules"></div></div>
<div class="uiux25-end"><p data-uiux-message aria-live="polite">介面偏好僅儲存在本機瀏覽器。</p><div><button type="button" data-uiux-reset>恢復預設介面</button><button type="button" data-uiux-close>完成</button></div></div>`;
d.body.appendChild(popup);
const list=popup.querySelector(".uiux25-modules");
for(const [id,name] of defs){const l=d.createElement("label"),box=d.createElement("input"),text=d.createElement("span");box.type="checkbox";box.dataset.uiuxModule=id;box.disabled=locked.has(id);text.textContent=name;l.append(box,text);list.appendChild(l)}
const display=popup.querySelector("[data-uiux-message]");
function active(){return nav.querySelector("button.active[data-page]")?.dataset.page||decodeURIComponent((w.location?.hash||"#HOME").slice(1))}
function navUpdate(){const current=active();for(const btn of nav.querySelectorAll("button[data-page]")){const id=btn.dataset.page;if(!(id in label))continue;btn.textContent=label[id];btn.hidden=!(locked.has(id)||config.visible.includes(id)||current===id)}}
function apply(){
 d.documentElement.lang="zh-Hant";
 d.documentElement.dataset.uiux25Density=config.density;
 d.documentElement.dataset.uiux25Contrast=config.contrast?"high":"normal";
 d.documentElement.dataset.uiux25Layout=config.layout;
 let mobile=config.layout==="mobile";
 if(config.layout==="auto")mobile=typeof w.matchMedia==="function"?w.matchMedia("(max-width:720px)").matches:Number(w.innerWidth||1200)<=720;
 d.documentElement.dataset.uiux25Present=mobile?"mobile":"desktop";
 const switcher=d.getElementById("aig-layout-switch");
 if(switcher){const btn=switcher.querySelector('[data-layout-mode="'+config.layout+'"]');if(btn&&btn.getAttribute("aria-pressed")!=="true")btn.click()}
 navUpdate();
 popup.querySelector("[data-uiux-layout]").value=config.layout;
 popup.querySelector("[data-uiux-density]").value=config.density;
 popup.querySelector("[data-uiux-contrast]").checked=config.contrast;
 for(const cb of list.querySelectorAll("[data-uiux-module]"))cb.checked=cb.disabled||config.visible.includes(cb.dataset.uiuxModule);
}
function change(next){config=clean({...config,...next});const saved=persist();apply();display.textContent=saved?"已套用：只有介面顯示變更，CNC 資料未修改。":"介面已套用，但瀏覽器拒絕儲存偏好。"}
function open(){apply();if(typeof popup.showModal==="function"){if(!popup.open)popup.showModal()}else popup.setAttribute("open","")}
function close(){if(typeof popup.close==="function"){if(popup.open)popup.close()}else popup.removeAttribute("open")}
launch.addEventListener("click",open);
d.addEventListener("click",e=>{if(e.target.closest("[data-open-uiux]"))open()});
popup.addEventListener("click",e=>{if(e.target.closest("[data-uiux-close]")){close();return}if(e.target.closest("[data-uiux-reset]")){change(defaults());return}const b=e.target.closest("[data-uiux-preset]");if(!b)return;const options={all:[...editable],cadcam:["CAD","CAM"],axis:["SIM","3AX","4AX","5AX","6AX"],ncai:["NC","AI"]};if(options[b.dataset.uiuxPreset])change({visible:options[b.dataset.uiuxPreset]})});
popup.addEventListener("change",e=>{const el=e.target;if(el.matches("[data-uiux-layout]"))change({layout:el.value});else if(el.matches("[data-uiux-density]"))change({density:el.value});else if(el.matches("[data-uiux-contrast]"))change({contrast:el.checked});else if(el.matches("[data-uiux-module]")){const id=el.dataset.uiuxModule;if(!editable.includes(id))return;const next=new Set(config.visible);el.checked?next.add(id):next.delete(id);change({visible:[...next]})}});
nav.addEventListener("click",()=>w.requestAnimationFrame?w.requestAnimationFrame(navUpdate):navUpdate());
w.addEventListener("hashchange",()=>w.requestAnimationFrame?w.requestAnimationFrame(navUpdate):navUpdate());
w.addEventListener("resize",()=>{if(config.layout==="auto")apply()});
apply();
try{if(new URLSearchParams(w.location.search).get("panel")==="uiux")open()}catch(_){}
w.AIG_UIUX_V25=Object.freeze({getSettings:()=>({...config,visible:[...config.visible]}),open});
})(window,document);