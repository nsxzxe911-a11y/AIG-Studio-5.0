/* V35: machine viewport-first layout + 3AX/4AX/5AX/6AX visible model provenance.
   Read-only view labels; machine meshes are rendered by existing live inline WebGL. */
(function(w,d){"use strict";
const descriptors={
 "3AX":{title:"立式 XYZ 虎鉗",axes:"X / Y / Z",hardware:"立式床台、虎鉗夾持、固定立柱"},
 "4AX":{title:"臥式 A 軸卡盤",axes:"X / Y / Z / A",hardware:"兩端軸承、旋轉卡盤、分度工作台"},
 "5AX":{title:"A／B 雙側搖籃",axes:"X / Y / Z / A / B",hardware:"雙側支撐、A/B 傾斜搖籃、加工工作台"},
 "6AX":{title:"直立單臂搖籃",axes:"X / Y / Z / A / B / C",hardware:"固定 Z 軸直立頭、單側搖籃、三旋轉自由度"}
};
function mount(root){
 const id=root.dataset.runtime,entry=descriptors[id],canvas=root.querySelector(".sceneWrap");
 if(!entry||!canvas||root.querySelector(".aig-v35-machine-identity"))return false;
 root.classList.add("aig-v35-live-axis");
 const title=d.createElement("div");title.className="aig-v35-machine-identity";title.setAttribute("aria-label",id+" 目前 WebGL 機型");
 const type=d.createElement("strong");type.textContent=id+" · "+entry.title;
 const state=d.createElement("span");state.textContent=entry.axes;
 const note=d.createElement("small");note.textContent=entry.hardware+" · 非原廠數位分身";
 title.append(type,state,note);
 canvas.prepend(title);
 return true;
}
function update(){
 const active=d.querySelector(".screen.active .simgrid[data-runtime]");
 if(!active)return null;
 mount(active);
 const present=active.querySelector(".aig-v35-machine-identity");
 const renderer=active.querySelector("[data-renderer]")?.textContent||"";
 if(present){present.dataset.aigRenderer=renderer.includes("WEBGL 3D")?"webgl":"unverified";}
 return{axis:active.dataset.runtime,meshType:descriptors[active.dataset.runtime]?.title||"—",webgl:renderer.includes("WEBGL 3D")};
}
let running=true;function loop(){if(!running)return;if(d.visibilityState!=="hidden")update();w.setTimeout(loop,d.visibilityState==="hidden"?1400:550);}
w.setTimeout(loop,200);
w.AIG_AXIS_MACHINE_V35=Object.freeze({release:"35.0.0",update,destroy:()=>{running=false}});
})(window,document);
