/* AIG V93 HOME — approved RGB reference -> LIVE native components.
 * The original HOME buttons, project links, metrics and storage handlers are moved,
 * never copied into a bitmap or rewritten. No CNC command is issued here.
 * Mobile composition: 01_HOME.png approved reference; Desktop 438 revoked.
 */
(function(w,d){"use strict";
const pages=[
 ["HOME","首頁","⌂"],["CAD","CAD","▱"],["CAM","CAM","≋"],["SIM","SIM","◇"],
 ["3AX","3AX","⌖"],["4AX","4AX","⊙"],["5AX","5AX","⬡"],["6AX","6AX","✧"],
 ["NC","NC","≡"],["AI","AI","✺"]];
let mounted=false,home=null;
function node(tag,cls,txt){
 const x=d.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;
}
function routeButton(page,label,cls,id){
 const b=node("button",cls,label);b.type="button";b.dataset.openPage=page;
 b.dataset.buttonId=id;b.dataset.commandId="NAV_"+page;
 b.setAttribute("aria-label","開啟 "+page+" 真實工作區");return b;
}
function init(){
 if(mounted)return;
 home=d.querySelector('.app>.shell>.screen[data-page="HOME"] [data-home-runtime]');
 if(!home)return;
 const hero=home.querySelector(".aigHero"),heroCenter=hero?.querySelector(".aigHeroCenter"),
  projects=hero?.querySelector(".aigProjects"),system=hero?.querySelector(".aigSystem"),
  net=hero?.querySelector("[data-home-network]"),
  metrics=home.querySelector(".aigHomeMetrics"),modules=home.querySelector(".aigModuleGrid"),
  utility=home.querySelector(".aig57-utility");
 if(!heroCenter||!projects||!system||!net||!metrics||!modules||!utility)return;
 // Build a real dashboard; DOM nodes with all the original navigation IDs survive.
 const top=node("header","aig93-top");
 const logo=node("div","aig93-logo");
 logo.append(node("strong","","AIG II"),node("span","","CNC · 智慧加工"));
 const connection=node("div","aig93-connection");
 connection.append(node("i","aig93-led"),net);
 const safety=node("span","aig93-safe","LOCAL FIRST · 真機輸出停用");
 top.append(logo,connection,safety);
 const navbar=node("nav","aig93-nav");navbar.setAttribute("aria-label","AIG 正式模組導覽");
 for(const [page,label,icon] of pages){
  const btn=routeButton(page,label,"aig93-nav-btn","BTN_HOME_V93_NAV_"+page);
  btn.prepend(node("span","aig93-nav-symbol",icon));
  if(page==="HOME"){btn.setAttribute("aria-current","page");btn.classList.add("selected")}
  navbar.append(btn);
 }
 const stage=node("section","aig93-stage");stage.setAttribute("aria-label","正式 RGB 6AX 模型預覽與專案控制");
 const visual=node("section","aig93-visual");visual.setAttribute("aria-label","6AX 真 GLB 外觀預覽");
 const model=node("div","aig93-model");
 const canvas=node("canvas","aig93-model-canvas");canvas.dataset.aig93Glb="loading";
 canvas.setAttribute("aria-label","本機 6AX GLB 3D 模型（外觀預覽，非切削證據）");
 const label=node("div","aig93-model-status","正在載入本機 6AX GLB 外觀模型");
 label.dataset.aig93ModelLabel="";
 model.append(canvas,label);
 const modelBadge=node("div","aig93-model-badge","6AX · 3D MACHINE PREVIEW");
 visual.append(model,modelBadge,heroCenter);
 // Existing native HOME hero buttons remain delegated to the real page router.
 const goto6=routeButton("6AX","查看 6AX 真加工工作區","aig93-view6","BTN_HOME_V93_ENTER_6AX");
 heroCenter.querySelector(".aigHeroActions")?.append(goto6);
 const sidebar=node("aside","aig93-sidebar");sidebar.setAttribute("aria-label","實際本機資料與工作入口");
 const sideHead=node("h2","aig93-side-title","本機工作狀態");
 const projectDetails=node("details","aig93-project-details");
 projectDetails.open=w.matchMedia("(min-width:901px)").matches;
 const projectTitle=node("summary","","快速開啟專案");
 projectDetails.append(projectTitle,projects);
 const sysDetails=node("details","aig93-system-details");
 const sysTitle=node("summary","","裝置與儲存狀態");
 sysDetails.append(sysTitle,system);
 sidebar.append(sideHead,metrics,projectDetails,sysDetails);
 stage.append(visual,sidebar);
 const entries=node("section","aig93-entries");entries.setAttribute("aria-label","全部工作模組");
 const entriesTitle=node("div","aig93-section-head");
 entriesTitle.append(node("strong","","工作模組"),node("span","","CAD → CAM → SIM → NC · 3AX / 4AX / 5AX / 6AX"));
 entries.append(entriesTitle,modules);
 const bottom=node("footer","aig93-footer");
 const note=node("span","aig93-footer-note","本機保存 · 正式真 Runtime · 模型預覽不代表 CNC 加工驗證");
 bottom.append(note,utility);
 for(const card of modules.querySelectorAll("button.aigModuleCard[data-open-page]")){
  const page=card.dataset.openPage;
  const icon=d.createElement("img");icon.className="aig93-card-icon";icon.alt="";
  icon.setAttribute("aria-hidden","true");icon.loading="lazy";
  icon.src="./visual-library/icons/"+(page==="CAD"?"cad":page==="CAM"?"cam":page==="SIM"?"sim":page==="NC"?"nc":page==="AI"?"ai":page==="3AX"?"3ax":page==="4AX"?"4ax":page==="5AX"?"5ax":"machine_model")+".png";
  card.prepend(icon);
 }
 home.replaceChildren(top,navbar,stage,entries,bottom);
 home.classList.add("aig93-home");home.dataset.aig93Home="ready";
 // The native network/CAD/CAM/NC spans remain the exact original DOM objects.
 mounted=Boolean(home.querySelector("[data-home-network]")===net &&
    home.querySelector(".aigHomeMetrics [data-home-cad]") &&
    home.querySelector(".aig93-entries .aigModuleCard[data-open-page='6AX']"));
 if(!mounted){home.dataset.aig93Home="incomplete";return}
 w.dispatchEvent(new Event("aig93-home-mounted"));
}
function active(){return d.querySelector('.app>.shell>.screen.active[data-page="HOME"]')?.contains(home)}
function inspect(){
 const h=home;return {mounted,active:!!active(),nativeCad:!!h?.querySelector("[data-home-cad]"),
 nativeCam:!!h?.querySelector("[data-home-cam]"),nativeNc:!!h?.querySelector("[data-home-nc]"),
 nativeNetwork:!!h?.querySelector("[data-home-network]"),
 moduleRoutes:[...(h?.querySelectorAll(".aig93-entries [data-open-page]")||[])].map(b=>b.dataset.openPage),
 actualGLB:h?.querySelector("canvas[data-aig93-glb]")?.dataset.aig93Glb||"NOT_READY",
 machineOutput:"BLOCKED",desktopAuthority:"MISSING_APPROVED_4K_IMAGE"};
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init,{once:true});else init();
w.AIG_HOME_V93=Object.freeze({inspect,mount:init});
})(window,document);
