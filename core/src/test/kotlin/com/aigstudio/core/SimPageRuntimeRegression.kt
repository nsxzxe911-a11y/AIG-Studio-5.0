package com.aigstudio.core

private fun simCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.SIM,PageCatalog.requireSubpage(page),id,mapOf(*args))

fun main(){
    val snapshot=DrawingSnapshot(listOf(Circle(center=Vec2(0.0,0.0),radius=12.0)))
    val settings=CamSettings(
        toolDiameter=6.0,depth=-2.0,safeZ=5.0,feedMmMin=200.0,
        pathMode=CamPathMode.MANUAL,
        manualPath=listOf(
            ManualCamPoint(0.0,0.0,5.0,true),
            ManualCamPoint(0.0,0.0,-2.0,false),
            ManualCamPoint(10.0,0.0,-2.0,false),
            ManualCamPoint(10.0,0.0,5.0,true),
        )
    )
    val sim=SimPageRuntime(snapshot,settings)
    val material=sim.dispatch(simCmd("SIM.MATERIAL","SIM.MATERIAL.RUN")) as PageResult.Accepted
    check(material.evidence.getValue("removedCells").toInt()>0)
    check(material.evidence.getValue("removedVolumeMm3").toDouble()>0.0)
    check(sim.snapshot().state.getValue("removedVolumeMm3").toDouble()>0.0)

    val view=sim.dispatch(simCmd("SIM.MAIN","SIM.MAIN.VIEW_3D")) as PageResult.Accepted
    check(view.evidence.getValue("meshVertices").toInt()>0)
    check(view.evidence.getValue("meshTriangles").toInt()>0)

    check(sim.dispatch(simCmd("SIM.PLAYBACK","SIM.PLAYBACK.PLAY")) is PageResult.Accepted)
    check(sim.snapshot().state["playback"]=="PLAYING")
    val single=sim.dispatch(simCmd("SIM.PLAYBACK","SIM.PLAYBACK.SINGLE_BLOCK")) as PageResult.Accepted
    check(single.evidence.getValue("frameIndex").toInt()>=0)
    check(sim.dispatch(simCmd("SIM.PLAYBACK","SIM.PLAYBACK.PAUSE")) is PageResult.Accepted)
    check(sim.snapshot().state["playback"]=="PAUSED")
    check(sim.dispatch(simCmd("SIM.PLAYBACK","SIM.PLAYBACK.RESET")) is PageResult.Accepted)
    check(sim.snapshot().state["frameIndex"]=="0")

    val risk=sim.dispatch(simCmd("SIM.COLLISION","SIM.COLLISION.CHECK")) as PageResult.Accepted
    check(risk.evidence["collisionCount"]=="0")
    check(risk.evidence["overcutCount"]=="0")
    check(risk.evidence["fixtureCoverage"]=="UNMODELED")
    check(sim.dispatch(simCmd("SIM.RESULT","SIM.RESULT.ACCEPT")) is PageResult.Accepted)

    println("SIM_PAGE_RUNTIME_PASS|TRUE_MATERIAL_REMOVAL|REMOVED_VOLUME|PROGRESSIVE_PLAYBACK|3D_MESH|COLLISION_LOCAL|UNMODELED_WARNING_ONLY")
}
