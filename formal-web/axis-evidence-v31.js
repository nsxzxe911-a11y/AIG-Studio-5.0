/* V31 real CNC Web Runtime evidence mirror; read-only, not an engine or machine output.
   Material removal comes ONLY from the existing heightfield/voxel renderer. */
(function(w,d){"use strict";
const pages=new Set(["3AX","4AX","5AX","6AX"]);
const nodes=new Map();
function metric(container,key,title){
 const col=d.createElement("div");col.className="v31-value";
 const label=d.createElement("small");label.textContent=title;
 const output=d.createElement("strong");output.dataset.v31Key=key;output.textContent="—";
 col.append(label,output);container.appendChild(col);return output;
}
function mount(root){
 if(nodes.has(root))return;
 const owner=root.querySelector(".v30-hud");
 if(!owner)return;
 const section=d.createElement("section");section.className="v31-evidence";section.setAttribute("aria-label","材料移除與渲染數值證據");
 const header=d.createElement("div");header.className="v31-evidence-title";
 const title=d.createElement("b");title.textContent="加工數值證據 · Web 模擬";
 const state=d.createElement("span");state.textContent="等待原渲染器";state.dataset.v31State="";
 header.append(title,state);
 const stats=d.createElement("div");stats.className="v31-stats";
 const fields=new Map();
 for(const [key,label] of [
  ["removed","網格移除 mm³"],["remaining","剩餘體積 mm³"],["percent","移除百分比"],
  ["depth","移除深度 mm"],["grid","切削網格"],["frame","畫面像素"]]){
  fields.set(key,metric(stats,key,label));
 }
 const note=d.createElement("p");note.className="v31-explanation";
 note.textContent="數值由原工作區計算；非機台回授，亦不是加工安全或精度 Gate。";
 section.append(header,stats,note);owner.appendChild(section);
 nodes.set(root,{fields,state,note});
}
function read(root,selector){
 const el=root.querySelector(selector);
 if(!el)return null;
 const value=(el.textContent||"").trim();
 return value||null;
}
function set(root,key,value){
 const el=nodes.get(root)?.fields.get(key);
 if(el){const next=value==null?"—":String(value);if(el.textContent!==next)el.textContent=next}
}
function update(root){
 const screen=root.closest(".screen");
 if(!screen?.classList.contains("active"))return;
 mount(root);
 const entry=nodes.get(root);if(!entry)return;
 const renderer=read(root,"[data-renderer]")||"";
 const ready=root.dataset.aigInitialized==="true";
 const webgl=ready&&renderer.includes("WEBGL 3D");
 const dry=root.querySelector('[data-cmd="dry"]')?.classList.contains("warn")===true;
 const busy=root.querySelector("[data-run-badge]")?.textContent?.trim()||"—";
 const raw={
  removed:read(root,"[data-removal-volume]"),
  remaining:read(root,"[data-remaining-volume]"),
  percent:read(root,"[data-removal-percent]"),
  depth:read(root,"[data-removal]"),
  grid:read(root,"[data-cut-resolution]")
 };
 const scene=root.querySelector("canvas[data-glcanvas]");
 const image=scene?.width>1&&scene?.height>1?scene.width+" × "+scene.height+" px":null;
 const validVolume=Number.parseFloat(raw.removed||"NaN");
 const evidence=webgl&&Number.isFinite(validVolume);
 for(const key of ["removed","remaining","percent","depth"])set(root,key,evidence?raw[key]:null);
 set(root,"grid",webgl&&raw.grid&&!/不可用|待初始化/.test(raw.grid)?raw.grid:null);
 set(root,"frame",webgl?image:null);
 const stateText=!ready?"等待原模組初始化":!webgl?"3D 尚不可用":dry?"空跑，不累加移除":busy==="ALARM"?"模擬警報":"3D 模擬 · "+busy;
 if(entry.state.textContent!==stateText)entry.state.textContent=stateText;
 const noteText=!evidence?"目前沒有可證實的 WebGL 材料移除數值；保留原程式及其他模組。":
  dry?"原模組正處於空跑；顯示值來自現有數值渲染器，不代表實際切削。":
  "真實來源：原工作區 heightfield / voxel 近似計算。0.001 為座標顯示位數，實際移除精度取決於網格密度；此數值不等於上機驗收。";
 if(entry.note.textContent!==noteText)entry.note.textContent=noteText;
}
function refresh(){
 const active=d.querySelector(".screen.active .simgrid[data-runtime]");
 if(!active||!pages.has(active.dataset.runtime))return{page:null,evidence:false};
 update(active);return{page:active.dataset.runtime,evidence:Boolean(nodes.has(active))};
}
let running=true;
function loop(){
 if(!running)return;
 if(d.visibilityState!=="hidden")refresh();
 w.setTimeout(loop,d.visibilityState==="hidden"?1500:350);
}
w.setTimeout(loop,200);
w.AIG_AXIS_EVIDENCE_V31=Object.freeze({version:"31",refresh,source:"existing WebGL and computed DOM outputs",destroy:()=>{running=false}});
})(window,document);
