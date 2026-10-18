/* AIG-II / Studio V32: actual browser WebGL frame measurements and adaptive pixel-only quality switch.
   FPS is render-call cadence; JS ms excludes deferred GPU work. CNC core and simulation grid remain intact. */
(function(w,d){"use strict";
const allowed=new Set(["3AX","4AX","5AX","6AX"]);
const mounted=new Map();
function el(tag,cls,txt){
 const e=d.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;
}
function mount(root){
 if(mounted.has(root))return;
 const owner=root.querySelector(".v30-hud");
 if(!owner)return;
 const bar=el("div","v32-perf");bar.setAttribute("aria-label","3D 畫面效能監測與自動品質調整");
 bar.appendChild(el("strong","v32-perf-title","3D 畫面效能"));
 const outputs={};
 for(const [key,label] of [["fps","渲染 FPS"],["ms","JS 毫秒"],["res","畫面像素"],["scale","像素比例"],["tri","工件三角片"],["reuse","網格重用率"]]){
  const wrap=el("span","v32-perf-metric"),k=el("small","",label),v=el("b","", "—");wrap.append(k,v);bar.appendChild(wrap);outputs[key]=v;
 }
 const button=el("button","v32-auto","自動畫質：啟用");button.type="button";button.setAttribute("aria-pressed","true");
 const note=el("p","v32-perf-note","等待 WebGL；自動畫質只改畫面像素，不改切削網格或 NC 座標。");
 button.addEventListener("click",()=>{
  const bridge=root.aigVisualV32;if(!bridge?.read||!bridge?.setAuto)return;
  const current=bridge.read();bridge.setAuto(!current.auto);update(root);
 });
 bar.append(button,note);
 owner.appendChild(bar);
 mounted.set(root,{outputs,button,note});
}
function formatFps(value){return Number.isFinite(value)?value.toFixed(1):"—"}
function update(root){
 mount(root);
 const view=mounted.get(root);if(!view)return;
 const bridge=root.aigVisualV32;
 const state=bridge?.read?.()||null;
 const values=state?{
  fps:formatFps(state.fps),
  ms:Number.isFinite(state.jsMs)?state.jsMs.toFixed(1):"—",
  res:state.canvas||"—",
  scale:Math.round(state.scale*100)+"%",
  tri:(()=>{const c=root.aigVisualV33?.read?.();return c?.builds>0?c.triangles.toLocaleString("en-US"):"—"})(),
  reuse:(()=>{const c=root.aigVisualV33?.read?.();return c&&c.hits+c.builds>0?(100*c.hits/(c.hits+c.builds)).toFixed(1)+"%":"—"})()
 }:{fps:"—",ms:"—",res:"—",scale:"—",tri:"—",reuse:"—"};
 for(const k of Object.keys(values))if(view.outputs[k].textContent!==values[k])view.outputs[k].textContent=values[k];
 view.button.disabled=!state||Boolean(state.contextLost);
 view.button.setAttribute("aria-pressed",String(Boolean(state?.auto)));
 const label=state?.auto?"自動畫質：啟用":"自動畫質：關閉";
 if(view.button.textContent!==label)view.button.textContent=label;
 const note=!state?"工作區尚未啟動或瀏覽器無法使用 WebGL；原 NC 編輯器仍保留。":
  state.contextLost?"3D 繪圖內容遺失，無法取得有效渲染幀率；不影響 G-code 編輯。":
  state.frames<3?"統計初始化中；非實體 CNC 資料。":
  "WebGL 呼叫間隔與 JS 繪製耗時（不含 GPU 非同步時間）；V33 重用工件網格，不變更切削或 NC 精度。";
 if(view.note.textContent!==note)view.note.textContent=note;
}
function refresh(){
 const root=d.querySelector(".screen.active .simgrid[data-runtime]");
 if(!root||!allowed.has(root.dataset.runtime))return{page:null,ready:false};
 update(root);return{page:root.dataset.runtime,ready:Boolean(root.aigVisualV32)};
}
let alive=true;
function loop(){
 if(!alive)return;
 if(d.visibilityState!=="hidden")refresh();
 w.setTimeout(loop,d.visibilityState==="hidden"?1400:500);
}
w.setTimeout(loop,200);
w.AIG_AXIS_PERFORMANCE_V32=Object.freeze({version:"32",refresh,source:"measured WebGL render calls",destroy:()=>{alive=false}});
})(window,document);
