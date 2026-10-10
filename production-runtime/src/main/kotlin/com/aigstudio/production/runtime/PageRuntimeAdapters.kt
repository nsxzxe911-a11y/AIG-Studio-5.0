package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*

class ProductionPageRuntime(
    private val cad:CadRuntimePort=FourthCadRuntimeAdapter(),
    private val cam:CamRuntimePort=FourthCamRuntimeAdapter(),
    private val nc:NcRuntimePort=FourthNcRuntimeAdapter(),
    private val axis:AxisRuntimePort=FourthAxisRuntimeAdapter(nc),
    private val sim:SimRuntimePort=FourthSimRuntimeAdapter { nc.snapshot().motionProgram },
    private val ai:AiRuntimePort=FourthAiRuntimeAdapter(),
):PageConnectionRuntimePort {
    private val links=linkedMapOf<Pair<PageId,PageId>,Boolean>().apply{
        PageId.entries.forEach{source->PageId.entries.filter{it!=source}.forEach{target->put(source to target,false)}}
    }

    override fun snapshot(page:PageId):PageCapabilityState {
        val status=when(page){
            PageId.CAD->cad.snapshot().message?.toPageStatus()
            PageId.CAM->cam.snapshot().message?.toPageStatus()
            PageId.SIM->sim.snapshot().message?.toPageStatus()
            PageId.NC->nc.snapshot().message?.toPageStatus()
            PageId.AXIS3->axis.snapshot(AxisMode.AXIS3).message?.toPageStatus()
            PageId.AXIS4->axis.snapshot(AxisMode.AXIS4).message?.toPageStatus()
            PageId.AXIS5->axis.snapshot(AxisMode.AXIS5).message?.toPageStatus()
            PageId.AXIS6->axis.snapshot(AxisMode.AXIS6).message?.toPageStatus()
            PageId.AI->ai.snapshot().message?.toPageStatus() ?: PageLocalStatus(MessageSeverity.INFO,ai.snapshot().summary)
            PageId.HOME->null
        }
        return PageCapabilityState(page,true,PageId.entries.filter{it!=page}.map{target->PageConnection(page,target,links[page to target]==true)},status)
    }

    override fun setConnection(source:PageId,target:PageId,connected:Boolean):PageCapabilityState {
        require(source!=target){"Page cannot connect to itself"}
        links[source to target]=connected
        return snapshot(source)
    }

    fun dispatchCad(command:CadCommand):CadDispatchResult=cad.dispatch(command)
    fun dispatchCam(command:CamCommand):CamDispatchResult=cam.dispatch(command)
    fun dispatchNc(command:NcCommand):NcDispatchResult=nc.dispatch(command)
    fun cadSnapshot():CadState=cad.snapshot()
    fun camSnapshot():CamState=cam.snapshot()
    fun ncSnapshot():NcState=nc.snapshot()
    fun aiSnapshot():AiState=ai.snapshot()
    fun simSnapshot():SimState=sim.snapshot()
    fun axisSnapshot(mode:AxisMode,blockIndex:Int=-1):AxisSceneState=axis.snapshot(mode,blockIndex)
    private fun RuntimeMessage.toPageStatus()=PageLocalStatus(severity,text)
}