#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
web_path=ROOT/"web/index.html"
verify_path=ROOT/"ci/verify_web_runtime.mjs"
html=web_path.read_text(encoding="utf-8")

old_pages='["5AX","#ff4da6"],["6AX","#27e9ff"],["NC","#33f39b"]'
new_pages='["5AX","#ff4da6"],["6AX","#27e9ff"],["NC","#33f39b"],["AI","#9f72ff"]'
if old_pages in html:
    html=html.replace(old_pages,new_pages,1)

ai_page='''
function aiPage(){
 return '<div data-ai-runtime data-authority-fallback="PROCEDURAL_RGB_GLASS"><div class="workgrid">'+
 '<section class="panel"><div class="head"><div><h2>AI • LOCAL PROJECT CONTEXT</h2><small>AIG 正式 RGB Runtime • 本機優先 • 不控制 CNC 輸出</small></div><span class="spacer"></span><span class="badge">LOCAL AI</span></div><div class="body">'+
 '<div class="runtimeStatus"><div class="metric"><b>WORKING COPY</b><span data-ai-working>LOCAL ACTIVE</span></div><div class="metric"><b>VERIFIED MAIN</b><span data-ai-verified>PENDING VERIFY</span></div><div class="metric"><b>IMMUTABLE VAULT</b><span data-ai-vault>READ ONLY</span></div><div class="metric"><b>MACHINE OUTPUT</b><span>DISABLED</span></div></div>'+
 '<div class="notice" style="margin-top:9px">AI 只讀取目前專案 CAD / CAM / SIM / NC context 提供檢查與導覽；不自動覆蓋 Verified Main、不直接送出 CNC 動作。</div></div></section>'+
 '<section class="panel"><div class="head"><h3>PROJECT CONTEXT</h3></div><div class="body menuDetailGrid">'+
 '<div class="field"><b>CAD</b><span data-ai-context-cad>CHECKING</span></div><div class="field"><b>CAM</b><span data-ai-context-cam>CHECKING</span></div><div class="field"><b>SIM</b><span data-ai-context-sim>CHECKING</span></div><div class="field"><b>NC</b><span data-ai-context-nc>CHECKING</span></div>'+
 '<div class="field"><b>Authority</b><span>PROCEDURAL RGB GLASS</span></div><div class="field"><b>Visual asset</b><span>APPROVED ASSET PENDING INGEST</span></div></div></section>'+
 '</div></div>';
}
'''
if "function aiPage()" not in html:
    html=html.replace("\nfunction simPage(axis){",ai_page+"\nfunction simPage(axis){",1)

ai_runtime='''
function makeAiRuntime(root){
 const present=(key)=>{try{return localStorage.getItem(key)?"AVAILABLE":"EMPTY"}catch{return"LOCAL STORAGE UNAVAILABLE"}};
 const ncLines=()=>{try{return ["3AX","4AX","5AX","6AX"].reduce((n,ax)=>{const code=localStorage.getItem("aig-code-"+ax)||"";return n+(code?code.split(/\\r?\\n/).filter(Boolean).length:0)},0)}catch{return 0}};
 const set=(sel,value)=>{const el=root.querySelector(sel);if(el)el.textContent=value};
 set("[data-ai-working]","LOCAL ACTIVE");
 set("[data-ai-verified]","PENDING #589 VERIFY");
 set("[data-ai-vault]","READ ONLY");
 set("[data-ai-context-cad]",present("aig-cad-draft-v1"));
 set("[data-ai-context-cam]",present("aig-cam-toolpath-v1"));
 set("[data-ai-context-sim]",present("aig-stock-v1"));
 set("[data-ai-context-nc]",ncLines()+" lines");
}
'''
if "function makeAiRuntime(root)" not in html:
    html=html.replace("\npages.forEach(([name,color])=>{",ai_runtime+"\npages.forEach(([name,color])=>{",1)

old_route='name==="SIM"?simHubPage():name==="NC"?ncPage():simPage(name);'
new_route='name==="SIM"?simHubPage():name==="NC"?ncPage():name==="AI"?aiPage():simPage(name);'
if old_route in html:
    html=html.replace(old_route,new_route,1)

nc_init='document.querySelectorAll("[data-nc-runtime]").forEach(el=>{aigBindFieldFeedback(el);aigGuard(el,"NC Runtime 初始化",()=>makeNcRuntime(el),null,"error")});'
ai_init='document.querySelectorAll("[data-ai-runtime]").forEach(el=>aigGuard(el,"AI Runtime 初始化",()=>makeAiRuntime(el),null,"warn"));'
if ai_init not in html:
    html=html.replace(nc_init,nc_init+"\n"+ai_init,1)

for marker in (new_pages,"function aiPage()","function makeAiRuntime(root)",new_route,ai_init):
    if marker not in html:
        raise SystemExit("WEB_AUTHORITY_PATCH_FAILED:"+marker[:80])
web_path.write_text(html,encoding="utf-8")

verify=verify_path.read_text(encoding="utf-8")
verify=verify.replace('(?:HOME|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC)', '(?:HOME|CAD|CAM|SIM|3AX|4AX|5AX|6AX|NC|AI)', 1)
verify=verify.replace('if (pageDefs.length !== 9)', 'if (pageDefs.length !== 10)', 1)
verify=verify.replace('|9_FORMAL_PAGES|', '|10_FORMAL_PAGES|', 1)
if 'pageDefs.length !== 10' not in verify or '|10_FORMAL_PAGES|' not in verify:
    raise SystemExit('WEB_RUNTIME_VERIFIER_PATCH_FAILED')
verify_path.write_text(verify,encoding="utf-8")
print('WEB_AUTHORITY_COMPLETION_PATCH_APPLIED|AI|10_FORMAL_PAGES|PROCEDURAL_RGB_GLASS')
