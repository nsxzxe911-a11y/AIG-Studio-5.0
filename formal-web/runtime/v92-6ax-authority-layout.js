/* AIG V92 — true 6AX image-to-runtime reverse mapping.
 * Reorders existing live DOM only. Every native command remains one element.
 * Authority: AIGII-MOBILE-6AX-CURRENT-20261016, 864x1536,
 * SHA-256 73f34e958bb22925ceed32b986443240b9322a77bf0cadbc1b81f62501683be6.
 * Source is non-4K MOBILE approval, NOT a desktop authority.
 */
(function(w,d){"use strict";
const AUTHORITY="AIGII-MOBILE-6AX-CURRENT-20261016";
const RAIL=[
 ["ISO","機視角","BTN_6AX_CAMERA_ISO","AXIS_CAMERA_ISO"],
 ["TOP","上視","BTN_6AX_CAMERA_TOP","AXIS_CAMERA_TOP"],
 ["FRONT","前視","BTN_6AX_CAMERA_FRONT","AXIS_CAMERA_FRONT"],
 ["LEFT","左視","BTN_6AX_CAMERA_LEFT","AXIS_CAMERA_LEFT"],
 ["RIGHT","右視","BTN_6AX_CAMERA_RIGHT","AXIS_CAMERA_RIGHT"],
 ["FIT","適合","BTN_6AX_CAMERA_FIT","AXIS_CAMERA_FIT"],
 ["IN","放大","BTN_6AX_CAMERA_IN","AXIS_CAMERA_ZOOM_IN"],
 ["OUT","縮小","BTN_6AX_CAMERA_OUT","AXIS_CAMERA_ZOOM_OUT"]
];
let bound=false,root=null;
function el(name,className){const x=d.createElement(name);x.className=className;return x;}
function findIn(container,selector){return container?.querySelector(selector)||null;}
function moveNative(root,selector,parent,id,cmd){
 const target=root.querySelector(selector);
 if(!target)return false;
 if(id&&!target.dataset.buttonId)target.dataset.buttonId=id;
 if(cmd&&!target.dataset.commandId)target.dataset.commandId=cmd;
 parent.appendChild(target);return true;
}
function bind(){
 if(bound)return;
 root=d.querySelector('.simgrid.axisModule[data-runtime="6AX"]');
 const simleft=root?.querySelector(":scope > .simleft"),body=simleft?.querySelector(":scope > .body");
 const scene=body?.querySelector(".sceneWrap"),controls=body?.querySelector(".controls");
 const status=body?.querySelector(".runtimeStatus"),axisbar=body?.querySelector(".axisbar");
 if(!root||!body||!scene||!controls||!status||!axisbar)return;
 // Keep native textarea, WebGL canvas, G-code parser, removal buffers and
 // all original command callbacks untouched.
 const original={canvas:scene.querySelector("canvas[data-glcanvas]"),textarea:root.querySelector("textarea.code")};
 const rail=el("aside","aig92-camera-rail");rail.setAttribute("aria-label","六軸鏡頭控制");
 for(const [action,label,id,command] of RAIL){
  const button=el("button","aig92-camera-btn");
  button.type="button";button.dataset.aig92Camera=action;
  button.dataset.buttonId=id;button.dataset.commandId=command;
  button.textContent=label;button.setAttribute("aria-label",label);
  if(action==="ISO")button.setAttribute("aria-pressed","true");
  button.addEventListener("click",()=>{
   const camera=root.aigCameraV92;
   if(!camera){button.dataset.aig92Error="CORE_NOT_READY";return}
   const success=camera.execute(action);
   if(!success){button.dataset.aig92Error="COMMAND_BLOCKED";return}
   for(const other of rail.querySelectorAll("[data-aig92-camera]")){
    if(["ISO","TOP","FRONT","LEFT","RIGHT"].includes(other.dataset.aig92Camera)){
     other.setAttribute("aria-pressed",String(other===button))
    }
   }
  });
  rail.appendChild(button);
 }
 const extra=el("div","aig92-camera-native");rail.appendChild(extra);
 // Original, already-bound native camera callbacks. DO NOT clone fake buttons.
 moveNative(root,'[data-cmd="center"]',extra,"BTN_6AX_CAMERA_CENTER","AXIS_CAMERA_CENTER");
 moveNative(root,'[data-cmd="follow"]',extra,"BTN_6AX_CAMERA_FOLLOW","AXIS_CAMERA_FOLLOW");
 moveNative(root,'[data-cmd="occlusion"]',extra,"BTN_6AX_CAMERA_OCCLUSION","AXIS_CAMERA_OCCLUSION");
 const telemetry=el("aside","aig92-telemetry");telemetry.setAttribute("aria-label","原生六軸即時數據");
 const head=el("div","aig92-telemetry-head");head.textContent="即時加工資訊 · G90 / 機床座標";
 const priority=el("div","aig92-telemetry-priority");
 const extraMetrics=el("details","aig92-telemetry-more");
 const summary=el("summary","");summary.textContent="更多原生數據與安全狀態";
 extraMetrics.appendChild(summary);
 // No made-up numbers: move actual Runtime metrics with their existing spans.
 for(const selector of ["[data-spindle]","[data-feed]","[data-block]",
       "[data-progress-text]","[data-removal-volume]","[data-collision]","[data-toolmetric]"]){
  const metric=root.querySelector(selector)?.closest(".metric");
  if(metric&&status.contains(metric))priority.appendChild(metric);
 }
 extraMetrics.appendChild(status);telemetry.append(head,axisbar,priority,extraMetrics);
 const stage=el("section","aig92-stage");stage.setAttribute("aria-label","6AX 實時加工視窗");
 stage.append(rail,scene,telemetry);
 const bottom=el("section","aig92-bottom");bottom.setAttribute("aria-label","真正的 CNC 模擬控制");
 const heading=el("div","aig92-bottom-title");heading.textContent="6AX / 原生播放與加工驗證";
 bottom.append(heading,controls);
 const notice=body.querySelector("[data-motion-legend]");
 if(notice)bottom.appendChild(notice);
 body.append(stage,bottom);
 body.classList.add("aig92-body");
 root.dataset.aig92ReverseMap="ready";
 root.dataset.aig92AuthorityId=AUTHORITY;
 root.dataset.aig92AuthorityStatus="CURRENT_APPROVED_NON_4K";
 // Deliberately no Desktop 438 authority: revoked 438 assets remain blocked.
 root.dataset.aig92DesktopAuthority="MISSING_AUTHORITY";
 bound=Boolean(original.canvas===root.querySelector("canvas[data-glcanvas]")&&
   original.textarea===root.querySelector("textarea.code"));
 if(!bound){root.dataset.aig92ReverseMap="DOM_REVIEW";return}
 w.dispatchEvent(new Event("resize"));
}
const install=()=>{bind();if(!bound)requestAnimationFrame(bind);};
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",install,{once:true});else install();
w.AIG_V92_IMAGE_REVERSE_MAPPING=Object.freeze({
 authority:AUTHORITY,
 inspect:()=>({mounted:bound,authority:AUTHORITY,desktopAuthority:"MISSING_AUTHORITY",
 imageIsInteractiveCanvas:false,liveGlb:root?.querySelector("canvas[data-glcanvas]")?.dataset.aig91Model||"NOT_INITIALIZED",
 nativePlay:!!root?.querySelector('[data-cmd="play"]'),
 nativePause:!!root?.querySelector('[data-cmd="pause"]'),
 nativeNc:!!root?.querySelector("textarea.code"),
 nativeMetrics:root?.querySelectorAll(".aig92-telemetry .metric").length||0,
 machineOutput:"BLOCKED"})
});
})(window,document);
