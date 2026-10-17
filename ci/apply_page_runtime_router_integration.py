from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1: raise AssertionError(f'{label}: expected 1 exact match, got {count}')
    return text.replace(old,new,1)

def patch_android():
    rel=Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
    text=read(rel)
    if 'var productionPageRouter:PageRuntimeRouter?=null' not in text:
        text=replace_once(
            text,
            '        var showRuntimeHome:(()->Unit)?=null\n',
            '        var showRuntimeHome:(()->Unit)?=null\n        var productionPageRouter:PageRuntimeRouter?=null\n',
            'ANDROID_ROUTER_DECLARATION',
        )
    text=text.replace(
        '        addProductionUi("CAD") {\n            Toast.makeText(this,"CAD • LIVE WORKSPACE",Toast.LENGTH_SHORT).show()\n        }',
        '        addProductionUi("CAD") { enterCadRuntime() }',
        1,
    )
    if 'CAD • LIVE WORKSPACE' in text:
        raise AssertionError('ANDROID_NAV_CAD_TOAST_STILL_PRESENT')

    marker='''        fun enterCadRuntime() {
            homeRoot.visibility=View.GONE
            root.visibility=View.VISIBLE
            selectProductionUi("CAD")
            refreshVisibleMode("CAD")
        }
'''
    if 'productionPageRouter=PageRuntimeRouter(' not in text:
        router='''        productionPageRouter=PageRuntimeRouter(
            runtimeProvider={ _:PageId -> null },
            pageNavigator={ page ->
                when(page) {
                    PageId.HOME -> showRuntimeHome?.invoke()
                    PageId.CAD -> enterCadRuntime()
                    PageId.CAM -> showCamWorkstation()
                    PageId.SIM -> showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("SIM"))
                    PageId.AX3 -> showUnifiedMachiningWorkspace("3AX")
                    PageId.AX4 -> showUnifiedMachiningWorkspace("4AX")
                    PageId.AX5 -> showUnifiedMachiningWorkspace("5AX")
                    PageId.AX6 -> showSixAxisRuntimeStage()
                    PageId.NC -> showUnifiedMachiningWorkspace(ProductionUiSwitchContract.runtimeTarget("NC"))
                    PageId.AI -> showAiSystemSuiteDialog()
                }
            }
        )
'''
        text=replace_once(text,marker,marker+router,'ANDROID_ROUTER_INIT')

    start=text.index('        fun addProductionUi(id:String, action:()->Unit) {')
    end=text.index('        addProductionUi("CAD")',start)
    block=text[start:end]
    if 'productionPageRouter?.navigate(navId)' not in block:
        if block.count('action()')!=1:
            raise AssertionError(f'ANDROID_ADD_UI_ACTION_CALL_COUNT:{block.count("action()")}')
        block=block.replace(
            'action()',
            'val navId="NAV_"+normalized\n                    if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            1,
        )
        text=text[:start]+block+text[end:]
    write(rel,text)


def patch_desktop():
    rel=Path('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt')
    text=read(rel)
    if 'var productionPageRouter:PageRuntimeRouter?=null' not in text:
        text=replace_once(
            text,
            '    val productionUiButtons=linkedMapOf<String,GlassActionButton>()\n',
            '    val productionUiButtons=linkedMapOf<String,GlassActionButton>()\n    var productionPageRouter:PageRuntimeRouter?=null\n',
            'WINDOWS_ROUTER_DECLARATION',
        )
    marker='    fun productionUiButton(id:String,color:Color,action:()->Unit):GlassActionButton {\n'
    if 'productionPageRouter=PageRuntimeRouter(' not in text:
        router='''    productionPageRouter=PageRuntimeRouter(
        runtimeProvider={ _:PageId -> null },
        pageNavigator={ page ->
            when(page) {
                PageId.HOME -> { productionUiButtons.forEach { (_,button) -> button.active=false }; mainCardLayout.show(mainCardHost,"HOME"); status.text="HOME • PRODUCTION RUNTIME" }
                PageId.CAD -> { mainCardLayout.show(mainCardHost,"CAD"); status.text="CAD • PRODUCTION UI" }
                PageId.CAM -> showProductionCam()
                PageId.SIM -> runCatching { showUnifiedMachiningEditor(frame,doc,status,productionCamDerivedCache,ProductionUiSwitchContract.runtimeTarget("SIM"),productionCamSettings,productionFixtures,productionToolAssembly) }.onFailure { status.text="SIM WARNING • "+(it.message?:"error") }
                PageId.AX3 -> runCatching { showUnifiedMachiningEditor(frame,doc,status,productionCamDerivedCache,"3AX",productionCamSettings,productionFixtures,productionToolAssembly) }.onFailure { status.text="3AX WARNING • "+(it.message?:"error") }
                PageId.AX4 -> runCatching { showUnifiedMachiningEditor(frame,doc,status,productionCamDerivedCache,"4AX",productionCamSettings,productionFixtures,productionToolAssembly) }.onFailure { status.text="4AX WARNING • "+(it.message?:"error") }
                PageId.AX5 -> runCatching { showUnifiedMachiningEditor(frame,doc,status,productionCamDerivedCache,"5AX",productionCamSettings,productionFixtures,productionToolAssembly) }.onFailure { status.text="5AX WARNING • "+(it.message?:"error") }
                PageId.AX6 -> showSixAxisRuntimeStage()
                PageId.NC -> runCatching { showNcEditor(frame,productionCamDerivedCache,!productionCamIsStale()) }.onFailure { status.text="NC EDIT BLOCKED • "+(it.message?:"error") }
                PageId.AI -> { mainCardLayout.show(mainCardHost,"AI"); status.text="AI • PRODUCTION UI • LOCAL ASSIST" }
            }
        }
    )
'''
        text=replace_once(text,marker,router+marker,'WINDOWS_ROUTER_INIT')
    start=text.index(marker)
    end=text.index('    val productionHomeButton=',start)
    block=text[start:end]
    if 'productionPageRouter?.navigate(navId)' not in block:
        if block.count('action()')!=1:
            raise AssertionError(f'WINDOWS_PRODUCTION_BUTTON_ACTION_CALL_COUNT:{block.count("action()") }')
        block=block.replace(
            'action()',
            'val navId="NAV_"+normalized\n                if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            1,
        )
        text=text[:start]+block+text[end:]
    write(rel,text)


def patch_web():
    rel=Path('web/index.html')
    text=read(rel)
    if './runtime/page-runtime-router.js' not in text:
        text=replace_once(
            text,
            '<script>\nconst pages=[',
            '<script src="./runtime/page-runtime-router.js"></script>\n<script src="./runtime/ai-page-runtime.js"></script>\n<script>\nconst pages=[',
            'WEB_ROUTER_SCRIPT',
        )
    old=' ["HOME","#9f72ff"],["CAD","#27e9ff"],["CAM","#33f39b"],["SIM","#ff4da6"],["3AX","#3694ff"],["4AX","#ffb326"],["5AX","#ff4da6"],["6AX","#27e9ff"],["NC","#33f39b"]\n'
    new=' ["HOME","#9f72ff"],["CAD","#27e9ff"],["CAM","#33f39b"],["SIM","#ff4da6"],["3AX","#3694ff"],["4AX","#ffb326"],["5AX","#ff4da6"],["6AX","#27e9ff"],["NC","#33f39b"],["AI","#9f72ff"]\n'
    if '["AI","#9f72ff"]' not in text:
        text=replace_once(text,old,new,'WEB_AI_PAGE_ID')
    if 'function aiPage(){' not in text:
        ai='''function aiPage(){
 return '<div data-ai-page-runtime><section class="panel"><div class="head"><div><h2>AI 加工規劃</h2><small>只規劃 / 解釋 / 稽核；不直接控制機台</small></div></div><div class="body">'+
 '<div class="menuDetailGrid"><label class="field"><b>目標軸數</b><select data-ai-axis><option>3AX</option><option>4AX</option><option>5AX</option><option>6AX</option></select></label><label class="field"><b>目標</b><select data-ai-objective><option>FASTEST_SAFE</option><option>MIN_REWORK</option><option>MIN_TOOL_CHANGES</option></select></label><label class="field"><b>現有成果</b><span><label><input type="checkbox" data-ai-cad> CAD</label> <label><input type="checkbox" data-ai-manual> MANUAL CAM</label> <label><input type="checkbox" data-ai-cam> CAM 刀路</label> <label><input type="checkbox" data-ai-nc> NC</label></span></label></div>'+
 '<div class="controls"><button class="btn" data-ai-command="AI.PLAN.BUILD">建立方案</button><button class="btn" data-ai-command="AI.PLAN.OPTIMIZE">最快安全</button><button class="btn" data-ai-command="AI.ASSIST.EXPLAIN">說明</button><button class="btn" data-ai-command="AI.AUDIT.RUN">稽核</button><button class="btn" data-ai-command="AI.RECOVERY.REPLAN">重新規劃</button></div>'+
 '<div class="notice" style="margin-top:9px" data-ai-result>AI READY • 等待加工條件</div></div></section></div>';
}
'''
        text=replace_once(text,'function ncPage(){\n',ai+'function ncPage(){\n','WEB_AI_PAGE_RENDERER')
    old_render=' s.innerHTML=name==="HOME"?homePage():name==="CAD"?cadPage():name==="CAM"?camPage():name==="SIM"?simHubPage():name==="NC"?ncPage():simPage(name);'
    new_render=' s.innerHTML=name==="HOME"?homePage():name==="CAD"?cadPage():name==="CAM"?camPage():name==="SIM"?simHubPage():name==="NC"?ncPage():name==="AI"?aiPage():simPage(name);'
    if new_render not in text:
        text=replace_once(text,old_render,new_render,'WEB_PAGE_RENDER_SWITCH')

    if 'const productionPageRouter=new AigPageRuntimeRouter({' not in text:
        show_block='''function show(name){
 aigApplyAdvancedVisibility();
 if(!pages.concat(utilityPages).some(p=>p[0]===name))name="HOME";
 document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===name));
 document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.dataset.page===name));
 history.replaceState(null,"","#"+encodeURIComponent(name));
 setTimeout(()=>window.dispatchEvent(new Event("resize")),0);
}
'''
        router='''const productionPageRouter=new AigPageRuntimeRouter({
 runtimeProvider:page=>page==="AI"?(document.querySelector("[data-ai-page-runtime]")?._aigAiRuntime||null):null,
 pageNavigator:page=>show(page)
});
window.aigProductionPageRouter=productionPageRouter;
function navigateProductionPage(name){
 const navId="NAV_"+name;
 return AIG_PAGE_NAVIGATION[navId]?productionPageRouter.navigate(navId):show(name);
}
'''
        text=replace_once(text,show_block,show_block+router,'WEB_ROUTER_INSTANCE')

    text=text.replace(
        'b.onclick=()=>aigGuard(document.body,"頁面切換",()=>show(name),null,"warn")',
        'b.onclick=()=>aigGuard(document.body,"頁面切換",()=>navigateProductionPage(name),null,"warn")',
        1,
    )
    text=text.replace(
        'document.addEventListener("click",e=>{const a=e.target.closest("[data-open-page]");if(a)aigGuard(document.body,"頁面切換",()=>show(a.dataset.openPage),null,"warn")});',
        'document.addEventListener("click",e=>{const a=e.target.closest("[data-open-page]");if(a)aigGuard(document.body,"頁面切換",()=>navigateProductionPage(a.dataset.openPage),null,"warn")});',
        1,
    )
    write(rel,text)


def main():
    patch_android();patch_desktop();patch_web()
    print('PAGE_RUNTIME_ROUTER_INTEGRATION_PATCH_PASS|ANDROID|WINDOWS|WEB|CAD_TOAST_REMOVED|WEB_AI_ADDED|WEB_ROUTER_INSTANCE')

if __name__=='__main__': main()
