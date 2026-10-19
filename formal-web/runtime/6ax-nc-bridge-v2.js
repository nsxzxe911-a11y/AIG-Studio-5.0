/* AIG V66 6AX NC posture preview UI — READ ONLY.
 * Adds a secondary panel inside independently mounted V1 WebGL preview.
 * Never clicks V65 Play/Run, changes G-code, or performs machine output. */
(function(w,d){"use strict";
const N=w.AIG_6AX_NC_READONLY_V2;if(!N)return;
let ui=null,editor=null,loaded=null,index=0,raf=0,lastTick=0,playing=false,status=null,choice=null;
const P=()=>w.AIG_6AX_MECHANISM_PREVIEW_V1;
const el=(tag,text,cls)=>{const node=d.createElement(tag);if(text!==undefined&&text!==null)node.textContent=text;if(cls)node.className=cls;return node};
function notify(text,severity="warn"){if(!status)return;status.textContent=text;status.dataset.severity=severity}
function pause(){playing=false;if(raf){w.cancelAnimationFrame(raf);raf=0}if(ui)ui.querySelector('[data-aig6-play]').textContent="▶ 播放姿態"}
function validity(){return !!loaded&&!!editor&&editor.value===loaded.sourceText&&choice.checked===loaded.previewMapping}
function buttons(){if(!ui)return;const valid=validity();for(const [name,disabled] of [["prev",!valid||index<=0],["next",!valid||index>=loaded.samples.points.length-1],["play",!valid||loaded.samples.points.length<2]]){
 const b=ui.querySelector('[data-aig6-'+name+']');if(b)b.disabled=disabled;
}}
function refreshPose(){
 if(!validity()){pause();notify("編輯內容或 C 軸映射已更改，請重新讀取 NC","warn");buttons();return false}
 const point=loaded.samples.points[index],v=point.values,p=P();
 if(!p||!p.show(true)){pause();notify("WebGL 尚未就緒，請檢查圖形裝置","warn");return false}
 for(const key of ["X","Y","Z","A","B","H"])if(!p.setAxis(key,v[key])){pause();notify("預覽位置超出模型範圍","warn");return false}
 const sample=loaded.samples;
 const key=point.line+"|"+point.fraction.toFixed(8);
 const flag=loaded.candidateKeys.has(key);
 notify("行 "+point.line+" · 取樣 "+(index+1)+"/"+sample.points.length+
   " · A "+v.A.toFixed(1)+"° B "+v.B.toFixed(1)+"° 頭 "+v.H.toFixed(1)+"°"+
   " · 模型 TCP("+point.toolTip.map(n=>n.toFixed(2)).join(", ")+")"+
   (flag?" · 此取樣點可能干涉":" · 本點無候選干涉，仍未驗證安全"),
   flag?"warning":"neutral");
 buttons();return true;
}
function load(){
 pause();const p=P();if(!p||!editor){notify("6AX 原始 NC 編輯器或 3D 預覽不存在","error");return false}
 const source=editor.value;
 const savedHead=choice.checked?0:(p.inspect?.().joints?.H??0);
 const parsed=N.parse(source,{headWord:choice.checked?"C":null,initialH:savedHead});
 if(!parsed.ok){loaded=null;const e=parsed.errors[0];notify("拒絕載入：行 "+(e?.line||0)+" · "+(e?.code||"UNKNOWN")+(e?.detail?" · "+e.detail:""),"error");buttons();return false}
 const samples=N.analyze(parsed,{maxSamples:12000,previewLinearStep:2,previewAngleStep:5});
 if(!samples.ok){loaded=null;notify("路徑取樣超過預覽上限："+samples.status+"。NC 原文保持不變","error");buttons();return false}
 loaded=Object.freeze({sourceText:source,previewMapping:choice.checked,parsed,samples,
  candidateKeys:new Set(samples.potential.map(p=>p.line+"|"+p.fraction.toFixed(8)))});
 index=0;const ok=refreshPose();
 if(ok){const notes=ui.querySelector("[data-aig6-notes]");if(notes)notes.textContent=
   "已解析 "+parsed.steps.length+" 段，取樣 "+samples.samples+" 點 · "+
   (samples.potential.length?"疑似干涉取樣 "+samples.potential.length+" 點":"無候選干涉≠安全")+
   " · "+parsed.warnings.join("；");}
 return ok;
}
function advance(direction){if(!validity())return refreshPose();index=Math.min(loaded.samples.points.length-1,Math.max(0,index+direction));return refreshPose()}
function play(){if(playing){pause();return}
 if(!validity()||index>=loaded.samples.points.length-1){notify("先載入 G0/G1 程式，或回到取樣起點","warn");return}
 playing=true;lastTick=0;ui.querySelector('[data-aig6-play]').textContent="Ⅱ 暫停預覽";
 function tick(now){raf=0;if(!playing||!validity()||d.hidden||!d.querySelector('.app>.shell>.screen.active[data-page="6AX"]')||
     (ui?.getClientRects&&ui.getClientRects().length===0)){pause();buttons();return}
  if(!lastTick||now-lastTick>=65){lastTick=now;index=Math.min(index+1,loaded.samples.points.length-1);if(!refreshPose()){pause();return}}
  if(index>=loaded.samples.points.length-1){pause();return}
  raf=w.requestAnimationFrame(tick);
 }
 raf=w.requestAnimationFrame(tick);
}
function mount(){
 if(ui?.isConnected)return true;
 const root=d.querySelector('.app>.shell>.screen[data-page="6AX"] .simgrid[data-runtime="6AX"]');
 const panel=root?.querySelector(".aig6-mount .aig6-panel");
 const ta=root?.querySelector('textarea.code[data-axis="6AX"]');
 if(!panel||!ta)return false;
 editor=ta;ui=el("section",null,"aig6-nc-bridge");
 ui.setAttribute("aria-label","唯讀 NC 姿態預覽");
 const headline=el("strong","NC → 6AX 姿態預覽");
 const explain=el("p","僅讀取原編輯器 G90／G0／G1；非材料移除與真機安全驗證");
 const mapping=el("label",null,"aig6-nc-map");
 choice=el("input");choice.type="checkbox";choice.checked=false;choice.setAttribute("aria-label","把 NC C 軸僅映射為預覽的主軸頭 H；不更動 NC");
 mapping.append(choice,el("span","C → 頭部 H（僅視覺；預設關閉）"));
 const actions=el("div",null,"aig6-nc-actions");
 const addBtn=(label,id,fn)=>{const b=el("button",label);b.type="button";b.dataset["aig6"+id]=true;b.addEventListener("click",fn);actions.append(b);return b};
 addBtn("讀取 NC","Load",load);
 addBtn("◀","Prev",()=>advance(-1));
 addBtn("▶","Next",()=>advance(1));
 addBtn("▶ 播放姿態","Play",play);
 const notes=el("p","不支援 G43 H、G2/G3、G34、M98、刀具更換和巨集", "aig6-nc-notes");notes.dataset.aig6Notes="";
 status=el("output","待讀取 NC · 真機輸出 BLOCKED","aig6-nc-status");status.setAttribute("role","status");status.dataset.severity="warn";
 ui.append(headline,explain,mapping,actions,status,notes);panel.append(ui);
 const invalidated=()=>{if(loaded){pause();notify("原 NC 已變更：預覽停用，請重新讀取","warn");buttons()}};
 editor.addEventListener("input",invalidated);
 choice.addEventListener("change",invalidated);
 d.addEventListener("visibilitychange",()=>{if(d.hidden)pause()});
 w.addEventListener("hashchange",()=>{if(!d.querySelector('.screen.active[data-page="6AX"]'))pause()});
 buttons();return true;
}
function init(){if(mount())return;let retries=0;const again=()=>{if(mount()||++retries>24)return;w.setTimeout(again,300)};again()}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
w.AIG_6AX_NC_BRIDGE_V2=Object.freeze({version:"2.0.0",load,pause,inspect:()=>({
 mounted:!!ui?.isConnected,previewOnly:true,sourceEditorUntouched:true,
 loaded:!!loaded,valid:validity(),samples:loaded?.samples.samples||0,
 potentialInterference:loaded?.samples.potential.length||0,
 status:loaded?.samples.status||"NOT_LOADED",machineOutput:"BLOCKED"})});
})(window,document);
