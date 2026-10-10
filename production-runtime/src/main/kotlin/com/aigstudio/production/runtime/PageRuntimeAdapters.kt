package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*

class ProductionPageRuntime(
    private val cad:FourthCadRuntimeAdapter=FourthCadRuntimeAdapter(),
    private val cam:FourthCamRuntimeAdapter=FourthCamRuntimeAdapter(),
    private val nc:FourthNcRuntimeAdapter=FourthNcRuntimeAdapter(),
    private val ai:CleanAiSession=CleanAiSession(),
):PageRuntimePort {
    private val axis=FourthAxisRuntimeAdapter(nc)
    private val links=linkedMapOf<Pair<PageId,PageId>,Boolean>().apply{
        PageId.entries.forEach{source->PageId.entries.filter{it!=source}.forEach{target->put(source to target,false)}}
    }

    override fun snapshot(page:PageId):PageCapabilityState {
        val status=when(page){
            PageId.CAD->cad.snapshot().message?.toPageStatus()
            PageId.CAM->cam.snapshot().message?.toPageStatus()
            PageId.NC->nc.snapshot().message?.toPageStatus()
            PageId.AXIS3->axis.snapshot(AxisMode.AXIS3).message?.toPageStatus()
            PageId.AXIS4->axis.snapshot(AxisMode.AXIS4).message?.toPageStatus()
            PageId.AXIS5->axis.snapshot(AxisMode.AXIS5).message?.toPageStatus()
            PageId.AXIS6->axis.snapshot(AxisMode.AXIS6).message?.toPageStatus()
            PageId.AI->PageLocalStatus(MessageSeverity.INFO,ai.snapshot().summary)
            PageId.HOME,PageId.SIM->null
        }
        return PageCapabilityState(
            page=page,
            launchable=true,
            connections=PageId.entries.filter{it!=page}.map{target->PageConnection(page,target,links[page to target]==true)},
            status=status,
        )
    }

    fun setConnection(source:PageId,target:PageId,connected:Boolean){
        require(source!=target){"Page cannot connect to itself"}
        links[source to target]=connected
    }

    fun dispatchCad(command:CadCommand):CadDispatchResult=cad.dispatch(command)
    fun dispatchCam(command:CamCommand):CamDispatchResult=cam.dispatch(command)
    fun dispatchNc(command:NcCommand):NcDispatchResult=nc.dispatch(command)
    fun cadSnapshot():CadState=cad.snapshot()
    fun camSnapshot():CamState=cam.snapshot()
    fun ncSnapshot():NcState=nc.snapshot()
    fun aiSnapshot():CleanAiSnapshot=ai.snapshot()
    fun axisSnapshot(mode:AxisMode,blockIndex:Int=-1):AxisSceneState=axis.snapshot(mode,blockIndex)

    private fun RuntimeMessage.toPageStatus()=PageLocalStatus(severity,text)
}