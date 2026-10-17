from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def read(path): return (ROOT/path).read_text(encoding='utf-8')
def write(path,text): (ROOT/path).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise AssertionError(f'{label}: expected 1 match, got {count}')
    return text.replace(old,new,1)


def patch_android():
    path=Path('app/src/main/java/com/aigstudio/app/MainActivity.kt')
    text=read(path)
    if 'val viewId=UiDualIdContract.navigationViewId(navId)' not in text:
        text=replace_once(
            text,
            '            val normalized=ProductionUiSwitchContract.normalize(id)\n            val button=RgbGlowButton(this).apply {',
            '            val normalized=ProductionUiSwitchContract.normalize(id)\n            val navId="NAV_"+normalized\n            val viewId=UiDualIdContract.navigationViewId(navId)\n            val button=RgbGlowButton(this).apply {',
            'ANDROID_NAV_DUAL_ID_DECL',
        )
        text=replace_once(
            text,
            '                text=normalized\n                contentDescription="UI $normalized"',
            '                text=normalized\n                tag=viewId\n                contentDescription="$viewId • $navId"',
            'ANDROID_NAV_VIEW_TAG',
        )
        text=replace_once(
            text,
            '                    val navId="NAV_"+normalized\n                    if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            '                    if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigateView(viewId) ?: action() else action()',
            'ANDROID_NAV_DISPATCH_VIEW',
        )
    write(path,text)


def patch_desktop():
    path=Path('desktop/src/main/kotlin/com/aigstudio/desktop/DesktopApp.kt')
    text=read(path)
    if 'val viewId=UiDualIdContract.navigationViewId(navId)' not in text:
        text=replace_once(
            text,
            '        val normalized=ProductionUiSwitchContract.normalize(id)\n        return GlassActionButton(normalized,color).apply {',
            '        val normalized=ProductionUiSwitchContract.normalize(id)\n        val navId="NAV_"+normalized\n        val viewId=UiDualIdContract.navigationViewId(navId)\n        return GlassActionButton(normalized,color).apply {',
            'DESKTOP_NAV_DUAL_ID_DECL',
        )
        text=replace_once(
            text,
            '            toolTipText="正式 UI 切換 • "+normalized\n            productionUiButtons[normalized]=this',
            '            name=viewId\n            putClientProperty("aig.buttonId",navId)\n            toolTipText="正式 UI 切換 • $viewId • $navId"\n            productionUiButtons[normalized]=this',
            'DESKTOP_NAV_VIEW_NAME',
        )
        text=replace_once(
            text,
            '                val navId="NAV_"+normalized\n                if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigate(navId) ?: action() else action()',
            '                if(PageRuntimeRouter.NAVIGATION.containsKey(navId)) productionPageRouter?.navigateView(viewId) ?: action() else action()',
            'DESKTOP_NAV_DISPATCH_VIEW',
        )
    write(path,text)


def patch_web():
    index=Path('web/index.html')
    text=read(index)
    if 'b.dataset.viewId=navViewId' not in text:
        old='''pages.forEach(([name,color])=>{
 const b=document.createElement("button");b.textContent=name;b.dataset.page=name;b.style.setProperty("--accent",color);b.onclick=()=>aigGuard(document.body,"頁面切換",()=>navigateProductionPage(name),null,"warn");nav.appendChild(b);
 const s=document.createElement("section");s.className="screen";s.dataset.page=name;
'''
        new='''pages.forEach(([name,color])=>{
 const navButtonId="NAV_"+name,navViewId=AIG_NAV_VIEW_ID(navButtonId);
 const b=document.createElement("button");b.textContent=name;b.dataset.page=name;b.dataset.buttonId=navButtonId;b.dataset.viewId=navViewId;b.style.setProperty("--accent",color);b.onclick=()=>aigGuard(document.body,"頁面切換",()=>productionPageRouter.navigateView(navViewId),null,"warn");nav.appendChild(b);
 const s=document.createElement("section");s.className="screen";s.dataset.page=name;
'''
        text=replace_once(text,old,new,'WEB_NAV_DOM_DUAL_ID')
    if 'productionPageRouter.navigateView(viewId)' not in text:
        old='''function navigateProductionPage(name){
 const navId="NAV_"+name;
 return AIG_PAGE_NAVIGATION[navId]?productionPageRouter.navigate(navId):show(name);
}
'''
        new='''function navigateProductionPage(name){
 const navId="NAV_"+name;
 if(!AIG_PAGE_NAVIGATION[navId])return show(name);
 const viewId=AIG_NAV_VIEW_ID(navId);
 return productionPageRouter.navigateView(viewId);
}
'''
        text=replace_once(text,old,new,'WEB_NAVIGATE_VIEW')
    write(index,text)

    ai=Path('web/runtime/ai-page-runtime.js')
    ai_text=read(ai)
    if 'btn.dataset.viewId=viewId' not in ai_text:
        old="""    root.querySelectorAll('[data-ai-command]').forEach(btn=>btn.addEventListener('click',()=>router.dispatchButton(btn.dataset.aiCommand,args())));
"""
        new="""    root.querySelectorAll('[data-ai-command]').forEach(btn=>{
      const buttonId=btn.dataset.aiCommand,viewId=global.AIG_VIEW_ID_FOR_BUTTON(buttonId);
      btn.dataset.buttonId=buttonId;btn.dataset.viewId=viewId;
      btn.addEventListener('click',()=>router.dispatchView(viewId,args()));
    });
"""
        ai_text=replace_once(ai_text,old,new,'WEB_AI_DOM_DUAL_ID')
    write(ai,ai_text)


def main():
    patch_android()
    patch_desktop()
    patch_web()
    print('DUAL_UI_RUNTIME_BINDING_PATCH_PASS|ANDROID_NAV_VIEW_ID|WINDOWS_NAV_VIEW_ID|WEB_NAV_VIEW_ID|WEB_AI_VIEW_ID|NAVIGATE_VIEW|DISPATCH_VIEW')

if __name__=='__main__': main()
