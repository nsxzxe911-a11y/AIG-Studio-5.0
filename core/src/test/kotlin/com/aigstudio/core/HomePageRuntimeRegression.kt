package com.aigstudio.core

private fun homeCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.HOME,PageCatalog.requireSubpage(page),id,mapOf(*args))

fun main(){
    val home=HomePageRuntime(platform="WINDOWS",device="TEST")
    check(home.dispatch(homeCmd("HOME.PROJECTS","HOME.PROJECTS.NEW","name" to "PART_A")) is PageResult.Accepted)
    val first=home.snapshot()
    check(first.state["projectName"]=="PART_A")
    check(first.state["localDirty"]=="true")

    val save=home.dispatch(homeCmd("HOME.PROJECTS","HOME.PROJECTS.SAVE")) as PageResult.Accepted
    check(save.evidence.getValue("revision").toLong()==1L)
    check(home.snapshot().state["localDirty"]=="false")

    check(home.dispatch(homeCmd("HOME.SETTINGS","HOME.SETTINGS.OPEN","section" to "RENDERER")) is PageResult.Accepted)
    check(home.snapshot().state["settingsSection"]=="RENDERER")

    val sync=home.dispatch(homeCmd("HOME.MAIN","HOME.SYNC.STATUS",
        "remoteRevision" to "2","remoteBaseRevision" to "1","remoteDigest" to "remote-2")) as PageResult.Accepted
    check(sync.evidence["syncState"]=="REMOTE_NEWER")

    val before=home.snapshot()
    val wrong=home.dispatch(PageCommand(PageId.CAD,PageCatalog.requireSubpage("CAD.MAIN"),"CAD.DRAW.LINE"))
    check(wrong is PageResult.Rejected)
    check(home.snapshot()==before)

    val open=HomePageRuntime(platform="ANDROID",device="PHONE")
    check(open.dispatch(homeCmd("HOME.PROJECTS","HOME.PROJECTS.OPEN",
        "name" to "PART_B","revision" to "8","baseRevision" to "7","digest" to "abc")) is PageResult.Accepted)
    check(open.snapshot().state["projectName"]=="PART_B")
    check(open.snapshot().state["revision"]=="8")

    println("HOME_PAGE_RUNTIME_PASS|PROJECT_NEW_OPEN_SAVE|REVISION|SETTINGS|SYNC_STATUS|LOCAL_FIRST|CHILD_ERROR_NO_RESET")
}
