/* AIG V94 — real HOME verification & Release download center.
 * Read-only, local-first; never infer current APK/EXE from source-only Web Gate.
 * No tokens, no user storage writes, no automatic machine action.
 */
(function(w,d){"use strict";
const BASE="https://api.github.com/repos/",GH="https://github.com/";
const PROJECTS=[
 Object.freeze({label:"AIG-II",repo:"nsxzxe911-a11y/AIG-II"}),
 Object.freeze({label:"AIG Studio 5.0",repo:"nsxzxe911-a11y/AIG-Studio-5.0"})
];
const BRANCH="web/aig-dual-formal-runtime-20261016";
const PERIOD=15*60*1000;
let root=null,panel=null,button=null,last=0,busy=false,opened=false,ticker=null,prevFocus=null;
let state={checkedAt:null,head:null,run:null,downloads:[],error:null,valid:false};
function el(tag,cls,content){
 const n=d.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=String(content);return n;
}
function validUrl(url,repo){
 try{const u=new URL(url);return u.protocol==="https:"&&u.hostname==="github.com"&&
  u.pathname.startsWith("/"+repo+"/releases/download/")&&u.search==="" ?u.href:null}
 catch(_){return null}
}
function runUrl(url){
 try{const u=new URL(url);return u.protocol==="https:"&&u.hostname==="github.com"&&
  u.pathname.startsWith("/nsxzxe911-a11y/AIG-Studio-5.0/actions/runs/")?u.href:null}
 catch(_){return null}
}
function link(text,url,cls){
 const a=el("a",cls,text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";
 return a;
}
function api(url){
 const ctrl=new AbortController(),timeout=w.setTimeout(()=>ctrl.abort(),12000);
 return fetch(url,{headers:{Accept:"application/vnd.github+json"},cache:"no-store",signal:ctrl.signal})
 .then(async r=>{
  if(!r.ok)throw Error("GitHub API "+r.status);
  const data=await r.json();return data;
 }).finally(()=>w.clearTimeout(timeout));
}
async function audit(){
 if(busy)return;
 if(!navigator.onLine){state.error="離線：無法核對 GitHub。工作區仍可離線使用。";render();return}
 busy=true;state.error=null;render();
 try{
  const headPromise=api(BASE+PROJECTS[1].repo+"/git/ref/heads/"+BRANCH);
  const runsPromise=api(BASE+PROJECTS[1].repo+"/actions/runs?branch="+encodeURIComponent(BRANCH)+"&per_page=25");
  const releasePromises=PROJECTS.map(p=>api(BASE+p.repo+"/releases?per_page=30")
   .then(data=>({project:p,data})).catch(e=>({project:p,error:String(e)})));
  const [headRaw,runRaw,...releases]=await Promise.all([headPromise,runsPromise,...releasePromises]);
  const sha=headRaw?.object?.sha;
  if(!/^[0-9a-f]{40}$/.test(sha||""))throw Error("GitHub 正式分支 SHA 無效");
  const runs=Array.isArray(runRaw?.workflow_runs)?runRaw.workflow_runs:[];
  const validRuns=runs.filter(r=>r?.head_sha===sha&&/AIG V9[34].*(?:HOME|Formal|RGB)/i.test(r.name||""));
  validRuns.sort((a,b)=>String(b.created_at||"").localeCompare(String(a.created_at||"")));
  const run=validRuns[0]||null;
  const downloads=releases.map(({project,data,error})=>{
   if(error)return {project,error,assets:[],release:null};
   const publicReleases=(Array.isArray(data)?data:[]).filter(r=>!r.draft&&!r.prerelease&&r.published_at);
   publicReleases.sort((a,b)=>String(b.published_at).localeCompare(String(a.published_at)));
   const grouped=[];
   for(const suffix of [".apk",".exe"]){
    let found=null;
    for(const release of publicReleases){
     const asset=(release.assets||[]).find(a=>typeof a.name==="string"&&
       a.name.toLowerCase().endsWith(suffix)&&Number(a.size)>1024&&validUrl(a.browser_download_url,project.repo));
     if(asset){found={release:release.tag_name,when:release.published_at,
       name:asset.name,url:validUrl(asset.browser_download_url,project.repo),
       bytes:asset.size,kind:suffix===".apk"?"APK":"EXE"};break}
    }
    if(found)grouped.push(found);
   }
   return {project,error:null,assets:grouped,release:publicReleases[0]?.tag_name||null};
  });
  state={checkedAt:new Date(),head:sha,run,downloads,error:null,valid:true};
  last=Date.now();
 }catch(e){
  state.error="無法從 GitHub 即時完成審核："+String(e?.message||e);
  // A network/API error never becomes a PASS and never unlocks CNC.
  state.valid=false;
 }finally{busy=false;render()}
}
function statusTag(text,kind){
 const v=el("span","aig94-tag");v.dataset.aig94Kind=kind;v.textContent=text;return v;
}
function addRow(target,name,detail,badge){
 const row=el("div","aig94-audit-row"),left=el("div","aig94-audit-label");
 left.append(el("strong","",name),el("span","",detail));row.append(left,badge);target.append(row);return row;
}
function model(){
 const overall=state.run;
 if(!state.valid)return {text:"無法核對",kind:"unknown",detail:state.error||"等待取得實際 GitHub 狀態"};
 if(!overall)return {text:"等待 Gate",kind:"pending",detail:"最新正式 SHA 尚未取得對應的 V93/V94 HOME 審核 run"};
 if(overall.status!=="completed")return {text:"執行中",kind:"pending",detail:"最新 GitHub Actions 尚未完成"};
 if(overall.conclusion==="success")return {text:"來源／畫面 PASS",kind:"pass",detail:"僅代表該 GitHub 工作流程通過，不代表 CNC、安全、APK/EXE 全部通過"};
 if(overall.conclusion==="failure")return {text:"FAIL · 禁止放行",kind:"fail",detail:"本輪自動測試失敗，不能宣稱 Release"};
 return {text:"未放行",kind:"pending",detail:"GitHub 結果："+String(overall.conclusion||"未取得")};
}
function render(){
 const small=button?.querySelector("[data-aig94-badge]");
 const st=model();
 if(small){small.textContent=busy?"查核中":st.text;small.dataset.aig94Kind=busy?"pending":st.kind}
 if(!panel)return;
 const content=panel.querySelector(".aig94-content");if(!content)return;
 content.replaceChildren();
 if(state.error)content.append(el("p","aig94-warning",state.error));
 if(busy)content.append(el("p","aig94-note","正在讀取原 GitHub Actions 與正式 Release；不影響工作區操作。"));
 const list=el("section","aig94-section");list.append(el("h3","","自動審核 · 唯讀狀態"));
 const sha=state.head?state.head.slice(0,12):"尚未確認";
 addRow(list,"網站原始碼","GitHub 正式分支 SHA："+sha,statusTag(state.head?"已取得 SHA":"待確認",state.head?"neutral":"pending"));
 const row=addRow(list,"HOME 對應 GitHub Gate",st.detail,statusTag(st.text,st.kind));
 if(state.run&&runUrl(state.run.html_url))row.append(link("查看完整測試紀錄 ↗",runUrl(state.run.html_url),"aig94-detail-link"));
 addRow(list,"CNC 真機／加工數值 Gate","不得因首頁通過就開放真機輸出",statusTag("BLOCKED","fail"));
 content.append(list);
 const dl=el("section","aig94-section");dl.append(el("h3","","正式下載中心"));
 dl.append(el("p","aig94-hint","目前網頁 V94 不等於 APK／EXE 的建置版本。僅出示 GitHub 已發布、有實體資產的安裝檔；歷史版本不會冒充新版。"));
 for(const record of state.downloads){
  const project=el("div","aig94-project");project.append(el("h4","",record.project.label));
  if(record.error)project.append(el("p","aig94-warning","Release 查詢失敗，下載狀態未核對："+record.error));
  else if(!record.assets.length)project.append(el("p","aig94-warning","沒有可確認的已發布 APK／EXE"));
  else{
   const items=el("div","aig94-files");
   for(const asset of record.assets){
    const info=el("div","aig94-file"),details=el("div","aig94-file-info");
    details.append(el("strong","",asset.kind+"｜"+asset.name));
    const age=(new Date(asset.when)).toLocaleDateString("zh-TW");
    details.append(el("small","","歷史發布 "+asset.release+" · "+age+" · 非目前網頁版"));
    info.append(details,link("下載 "+asset.kind+" ↗",asset.url,"aig94-file-download"));
    items.append(info);
   }
   project.append(items);
  }
  dl.append(project);
 }
 if(state.valid&&state.downloads.length===0)dl.append(el("p","aig94-hint","等待正式 Release 資料。"));
 dl.append(link("查看 AIG-II Release ↗",GH+"nsxzxe911-a11y/AIG-II/releases","aig94-releases"));
 dl.append(link("查看 AIG Studio Release ↗",GH+"nsxzxe911-a11y/AIG-Studio-5.0/releases","aig94-releases"));
 content.append(dl);
 const foot=panel.querySelector(".aig94-foot-info");
 if(foot)foot.textContent="審核時間："+(state.checkedAt?state.checkedAt.toLocaleString("zh-TW"):"尚未完成")+" · 自動更新約 15 分鐘 · 無需登入或 API Token";
}
function open(){
 if(!panel)return;
 opened=true;prevFocus=d.activeElement;
 panel.hidden=false;panel.querySelector("[data-aig94-close]")?.focus();
 if(Date.now()-last>10*60*1000||!state.valid)void audit();else render();
}
function close(){
 if(!panel)return;opened=false;panel.hidden=true;prevFocus?.focus?.();
}
function mount(){
 if(button)return;
 root=d.querySelector('.app>.shell>.screen[data-page="HOME"] [data-home-runtime]');
 if(!root||!root.classList.contains("aig93-home"))return;
 const top=root.querySelector(".aig93-top");if(!top)return;
 button=el("button","aig94-open");button.type="button";
 button.dataset.buttonId="BTN_HOME_V94_AUDIT_DOWNLOAD";
 button.dataset.commandId="OPEN_HOME_AUDIT_DOWNLOAD";
 button.append(el("span","","審核／下載"),el("b","","待查核"));
 button.lastChild.dataset.aig94Badge="";
 button.addEventListener("click",open);
 const safe=top.querySelector(".aig93-safe");top.insertBefore(button,safe||null);
 const utility=root.querySelector(".aig93-footer .aig57-utility");
 if(utility){
  const more=el("button","aig94-open-alt","自動審核・下載");
  more.dataset.buttonId="BTN_HOME_V94_AUDIT_DOWNLOAD_MOBILE";
  more.dataset.commandId="OPEN_HOME_AUDIT_DOWNLOAD";
  more.type="button";more.addEventListener("click",open);utility.prepend(more);
 }
 panel=el("section","aig94-overlay");panel.hidden=true;
 panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");
 panel.setAttribute("aria-label","AIG 自動審核與下載中心");
 const card=el("div","aig94-dialog"),heading=el("header","aig94-header");
 const title=el("div","");
 title.append(el("strong","","AIG｜自動審核與下載"),el("span","","GitHub 真實 Gate／Release · 無假下載"));
 const ref=el("button","aig94-refresh","重新審核");
 ref.type="button";ref.dataset.buttonId="BTN_HOME_V94_AUDIT_REFRESH";
 ref.dataset.commandId="READ_GITHUB_GATE_REFRESH";ref.addEventListener("click",()=>void audit());
 const closeBtn=el("button","aig94-close","關閉");
 closeBtn.dataset.aig94Close="";closeBtn.type="button";closeBtn.addEventListener("click",close);
 heading.append(title,ref,closeBtn);
 const content=el("div","aig94-content"),foot=el("footer","aig94-foot-info");
 card.append(heading,content,foot);panel.append(card);d.body.append(panel);
 panel.addEventListener("click",e=>{if(e.target===panel)close()});
 d.addEventListener("keydown",e=>{if(opened&&e.key==="Escape"){e.preventDefault();close()}});
 d.addEventListener("visibilitychange",()=>{if(!d.hidden&&active()&&Date.now()-last>PERIOD)void audit()});
 // Refresh status while HOME is in foreground, never polling while user is machining.
 ticker=w.setInterval(()=>{if(!d.hidden&&active()&&Date.now()-last>PERIOD)void audit()},PERIOD);
 w.addEventListener("online",()=>{if(active())void audit()});
 render();void audit();
}
function active(){return !!d.querySelector('.app>.shell>.screen.active[data-page="HOME"] [data-home-runtime]')}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
w.addEventListener("aig93-home-mounted",mount,{once:true});
w.AIG_HOME_V94_AUDIT=Object.freeze({version:"94.0.0",inspect:()=>({
 mounted:!!panel,head:state.head,runId:state.run?.id||null,valid:state.valid,
 releaseAssets:state.downloads.map(p=>({project:p.project.label,files:p.assets.map(a=>a.name)})),
 physicalMachineOutput:"BLOCKED",lastChecked:state.checkedAt?.toISOString()||null
}),refresh:audit});
})(window,document);
