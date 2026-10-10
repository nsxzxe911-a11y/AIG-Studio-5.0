package com.aigstudio.runtime4.contract

enum class PageId { HOME, CAD, CAM, SIM, AXIS3, AXIS4, AXIS5, AXIS6, NC, AI }

data class PageConnection(val source:PageId,val target:PageId,val connected:Boolean)
data class PageLocalStatus(val severity:MessageSeverity,val text:String)

data class PageCapabilityState(
    val page:PageId,
    val launchable:Boolean,
    val connections:List<PageConnection>,
    val status:PageLocalStatus?=null,
){
    companion object {
        fun disconnected(page:PageId):PageCapabilityState = PageCapabilityState(
            page=page,
            launchable=true,
            connections=PageId.entries.filter{it!=page}.map{target->PageConnection(page,target,false)},
            status=null,
        )
    }
}

interface PageRuntimePort { fun snapshot(page:PageId):PageCapabilityState }

interface PageConnectionRuntimePort:PageRuntimePort {
    fun setConnection(source:PageId,target:PageId,connected:Boolean):PageCapabilityState
}
