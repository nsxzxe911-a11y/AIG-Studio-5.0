/* AIG-II / Studio 375 V30: Read-only 3AX-6AX HUD mirroring existing live WEB runtime DOM.
   No separate position engine; never claims physical-machine feedback or Release Gate PASS. */
(function(w,d){"use strict";
const allowed=new Set(["3AX","4AX","5AX","6AX"]);
const roots=[...d.querySelectorAll(".simgrid[data-runtime]")].filter(x=>allowed.has(x.dataset.runtime));
if(!roots.length)return;
const store=new Map();
function item(parent,key,label){
 const e=d.createElement("div");e.className="v30-chip";
 const k=d.createElement("small");k.textContent=label;
 const v=d.createElement("strong");v.textContent="—";v.dataset.v30Key=key;
 e.append(k,v);parent.appendChild(e);return v;
}
function mount(root){
 if(store.has(root))return;
 const body=root.querySelector(".simleft > .body");
 const scene=body?.querySelector(".sceneWrap");
 const axisBar=body?.querySelector(".axisbar");
 if(!scene||!axisBar)return;
 root.classList.add("v30-axis-runtime");
 const wrap=d.createElement("section");wrap.className="v30-hud";
 wrap.setAttribute("aria-label",root.dataset.runtime+" 瀏覽器模擬即時資訊");wrap.setAttribute("aria-live","off");
 const heading=d.createElement("div");heading.className="v30-hud-title";
 const title=d.createElement("b");title.textContent="即時加工 HUD · "+root.dataset.runtime;
 const origin=d.createElement("span");origin.textContent="資料源：工作頁模擬，非機台回授";
 heading.append(title,origin);
 const axes=d.createElement("div");axes.className="v30-hud-axes";
 const others=d.createElement("div");others.className="v30-hud-others";
 const outputs=new Map();
 for(const id of ["X","Y","Z","A","B","C"]){
  if(!axisBar.querySelector('[data-axis-read="'+id+'"]'))continue;
  outputs.set(id,item(axes,id,id+("XYZ".includes(id)?" mm":" °")));
 }
 for(const [key,label] of [["feed","進給 mm/min"],["spindle","主軸 RPM"],["tool","刀具"],["wcs","座標系"],["motion","動作"],["block","NC 區塊"],["progress","進度"],["state","模擬狀態"]]){
  outputs.set(key,item(others,key,label));
 }
 const explanation=d.createElement("p");explanation.className="v30-hud-note";explanation.textContent="待原工作區初始化；不代表精度、碰撞、材料移除或上機驗收通過。";
 wrap.append(heading,axes,others,explanation);
 scene.insertAdjacentElement("afterend",wrap);
 store.set(root,{outputs,explanation});
}
function read(root,selector){
 const e=root.querySelector(selector);
 if(!e)return null;
 const s=(e.textContent||"").trim();
 return s&&s!=="初始化"&&s!=="待初始化"?s:null;
}
function publish(root,key,value){
 const entry=store.get(root);
 const node=entry?.outputs.get(key);if(!node)return;
 const next=value===null||value===undefined||value===""?"—":String(value);
 if(node.textContent!==next)node.textContent=next;
}
function update(root){
 const screen=root.closest(".screen[data-page]");
 if(!screen?.classList.contains("active")||!store.has(root))return;
 const renderer=read(root,"[data-renderer]");
 const initialized=root.dataset.aigInitialized==="true" || Boolean(renderer&&renderer!=="待初始化");
 const axis=root.dataset.runtime;
 for(const id of ["X","Y","Z","A","B","C"]){
  if(!store.get(root).outputs.has(id))continue;
  let value=null;
  if(initialized){
   const raw=read(root,'[data-axis-read="'+id+'"]');
   const match=raw?.match(new RegExp("^"+id+"\\s*([+-]?[0-9]+(?:\\.[0-9]+)?)"));
   if(match&&Number.isFinite(Number(match[1])))value=Number(match[1]).toFixed(3);
  }
  publish(root,id,value);
 }
 for(const [key,selector] of [
  ["feed","[data-feed]"],["spindle","[data-spindle]"],["tool","[data-toolmetric]"],
  ["wcs","[data-wcsmetric]"],["motion","[data-motion-role]"],
  ["block","[data-block]"],["progress","[data-progress-text]"],["state","[data-run-badge]"]
 ])publish(root,key,initialized?read(root,selector):null);
 const status=read(root,"[data-run-badge]")||"—";
 const note=store.get(root).explanation;
 const newNote=!initialized?"待 "+axis+" 工作區完成初始化；保留原 G-code 與控制。":
  "瀏覽器 "+axis+" 模擬："+status+"。座標按原 Runtime 顯示至 0.001；不等於幾何/切削解析度或機台實測精度。";
 if(note.textContent!==newNote)note.textContent=newNote;
}
function refresh(){
 const active=d.querySelector(".screen.active[data-page] .simgrid[data-runtime]");
 if(active){mount(active);update(active)}
 return{page:active?.dataset.runtime||null,telemetry:Boolean(active&&store.has(active))};
}
for(const root of roots)mount(root);
let stopped=false;
function loop(){
 if(stopped)return;
 if(d.visibilityState!=="hidden")refresh();
 w.setTimeout(loop,d.visibilityState==="hidden"?1400:180);
}
w.setTimeout(loop,180);
w.AIG_AXIS_HUD_V30=Object.freeze({version:"30",refresh,axisPages:[...allowed],source:"Existing Web Runtime DOM",destroy:()=>{stopped=true}});
})(window,document);
