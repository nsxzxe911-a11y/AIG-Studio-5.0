package com.aigstudio.core

private fun cadBridgeCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.CAD,PageCatalog.requireSubpage(page),id,mapOf(*args))
private fun camBridgeCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.CAM,PageCatalog.requireSubpage(page),id,mapOf(*args))
private fun simBridgeCmd(page:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(PageId.SIM,PageCatalog.requireSubpage(page),id,mapOf(*args))

fun main(){
    val links=RuntimeLinkStore()
    val cad=CadPageRuntime()
    val cam=CamPageRuntime()
    val sim=SimPageRuntime(
        DrawingSnapshot(emptyList()),
        ManualCamPathEngine.startBlank(CamSettings())
    )
    val nc=NcPageRuntime()

    cad.dispatch(cadBridgeCmd("CAD.DRAW","CAD.DRAW.HOLE","cx" to "10","cy" to "20","r" to "4"))
    val cadToCam=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAD_CAM,links,cad,cam)
    check(cadToCam is RuntimeBridgeTransferResult.Accepted)
    check(cam.snapshot().state["sourceCadRevision"]==cad.snapshot().revision.toString())
    check(cam.cadSourceSnapshot().entities.size==1)

    cam.dispatch(camBridgeCmd("CAM.MANUAL","CAM.MANUAL.ADD_POINT",
        "x" to "10","y" to "20","z" to "-2","rapid" to "false","a" to "10","b" to "20","c" to "30"))
    cam.dispatch(camBridgeCmd("CAM.MANUAL","CAM.MANUAL.ADD_POINT",
        "x" to "20","y" to "20","z" to "-2","rapid" to "false","a" to "15","b" to "25","c" to "35"))

    val simBefore=sim.snapshot()
    links.set(RuntimeLinkId.CAM_SIM,RuntimeLinkStatus.DISCONNECTED)
    val disconnected=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAM_SIM,links,cam,sim)
    check(disconnected is RuntimeBridgeTransferResult.Rejected && disconnected.code=="DISCONNECTED")
    check(sim.snapshot()==simBefore)
    links.set(RuntimeLinkId.CAM_SIM,RuntimeLinkStatus.CONNECTED)

    val camToSim=RuntimeBridgeRouter.transfer(RuntimeLinkId.CAM_SIM,links,cam,sim)
    check(camToSim is RuntimeBridgeTransferResult.Accepted)
    check(sim.sourceCamSettings().pathMode==CamPathMode.MANUAL)
    check(sim.sourceCamSettings().manualPath.last().axisC==35.0)

    check(sim.dispatch(simBridgeCmd("SIM.MATERIAL","SIM.MATERIAL.RUN")) is PageResult.Accepted)
    check(sim.dispatch(simBridgeCmd("SIM.COLLISION","SIM.COLLISION.CHECK")) is PageResult.Accepted)
    check(sim.dispatch(simBridgeCmd("SIM.RESULT","SIM.RESULT.ACCEPT")) is PageResult.Accepted)

    val simToNc=RuntimeBridgeRouter.transfer(RuntimeLinkId.SIM_NC,links,sim,nc)
    check(simToNc is RuntimeBridgeTransferResult.Accepted)
    check(nc.snapshot().state["upstreamSimVerified"]=="true")

    val ncBefore=nc.snapshot()
    val repeated=RuntimeBridgeRouter.transfer(RuntimeLinkId.SIM_NC,links,sim,nc)
    check(repeated is RuntimeBridgeTransferResult.Rejected && repeated.code=="STALE_REVISION")
    check(nc.snapshot()==ncBefore)

    println("RUNTIME_PAGE_BRIDGE_PASS|CAD_CAM_GEOMETRY|CAM_SIM_MANUAL_ABC|DISCONNECT_PRESERVE|SIM_NC_VERIFIED_EVIDENCE|STALE_NO_OVERWRITE")
}
