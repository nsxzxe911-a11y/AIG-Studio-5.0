package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import java.util.Locale

data class RuntimeTruthSourceRegion(val id:String,val rect:ImagePixelRect)
data class RuntimeTruthRegion(val id:String,val bounds:UiBounds)
data class RuntimeTruthTextBlock(val regionId:String,val lines:List<String>)

object MobileRuntimeTruthMaskLayout {
    private fun common(page:PageId):List<RuntimeTruthSourceRegion> {
        val (w,_)=PageSurfaceTexturePlan.imageSize(page) ?: return emptyList()
        return if(w>=900f) listOf(
            RuntimeTruthSourceRegion("HEADER.STATUS",ImagePixelRect(365f,16f,710f,126f)),
            RuntimeTruthSourceRegion("HEADER.CLOCK",ImagePixelRect(714f,16f,927f,126f)),
        ) else listOf(
            RuntimeTruthSourceRegion("HEADER.STATUS",ImagePixelRect(324f,16f,640f,120f)),
            RuntimeTruthSourceRegion("HEADER.CLOCK",ImagePixelRect(642f,16f,842f,120f)),
        )
    }

    private val specific:Map<PageId,List<RuntimeTruthSourceRegion>> = mapOf(
        PageId.HOME to listOf(
            RuntimeTruthSourceRegion("HOME.LINK_STATUS",ImagePixelRect(20f,520f,920f,640f)),
            RuntimeTruthSourceRegion("HOME.RECENT_FILES",ImagePixelRect(20f,970f,520f,1190f)),
            RuntimeTruthSourceRegion("HOME.CONNECTIONS",ImagePixelRect(20f,1218f,520f,1530f)),
            RuntimeTruthSourceRegion("HOME.SYSTEM_INFO",ImagePixelRect(525f,1370f,920f,1530f)),
        ),
        PageId.CAD to listOf(
            RuntimeTruthSourceRegion("CAD.VIEWPORT",ImagePixelRect(18f,594f,838f,1128f)),
            RuntimeTruthSourceRegion("CAD.LAYERS",ImagePixelRect(18f,1180f,420f,1440f)),
            RuntimeTruthSourceRegion("CAD.PROPERTIES",ImagePixelRect(430f,1180f,838f,1440f)),
        ),
        PageId.CAM to listOf(
            RuntimeTruthSourceRegion("CAM.STRATEGY",ImagePixelRect(150f,930f,430f,1205f)),
            RuntimeTruthSourceRegion("CAM.POINTS",CamImagePixelManifest.pointPanel),
        ),
        PageId.SIM to listOf(
            RuntimeTruthSourceRegion("SIM.STATUS",ImagePixelRect(
                SimImagePixelManifest.liveStatus.left,SimImagePixelManifest.liveStatus.top,
                SimImagePixelManifest.liveStatus.right,SimImagePixelManifest.liveStatus.bottom,
            )),
        ),
        PageId.AXIS3 to listOf(
            RuntimeTruthSourceRegion("AXIS3.COORD",ImagePixelRect(505f,430f,838f,635f)),
            RuntimeTruthSourceRegion("AXIS3.WORK",ImagePixelRect(20f,925f,422f,1130f)),
            RuntimeTruthSourceRegion("AXIS3.PROCESS",ImagePixelRect(430f,925f,838f,1130f)),
            RuntimeTruthSourceRegion("AXIS3.MACHINE",ImagePixelRect(20f,1140f,545f,1330f)),
            RuntimeTruthSourceRegion("AXIS3.TOOL",ImagePixelRect(550f,1140f,838f,1330f)),
            RuntimeTruthSourceRegion("AXIS3.NC",ImagePixelRect(20f,1340f,545f,1575f)),
        ),
        PageId.AXIS4 to listOf(
            RuntimeTruthSourceRegion("AXIS4.STATUS",ImagePixelRect(525f,880f,838f,1055f)),
            RuntimeTruthSourceRegion("AXIS4.MCS",ImagePixelRect(525f,1060f,838f,1215f)),
            RuntimeTruthSourceRegion("AXIS4.TOOL",ImagePixelRect(525f,1220f,838f,1430f)),
            RuntimeTruthSourceRegion("AXIS4.MACHINING",ImagePixelRect(20f,1430f,420f,1690f)),
            RuntimeTruthSourceRegion("AXIS4.PROGRAM",ImagePixelRect(430f,1430f,838f,1690f)),
        ),
        PageId.AXIS5 to listOf(
            RuntimeTruthSourceRegion("AXIS5.STATUS",ImagePixelRect(18f,883f,450f,1170f)),
            RuntimeTruthSourceRegion("AXIS5.TOOL",ImagePixelRect(460f,883f,838f,1170f)),
            RuntimeTruthSourceRegion("AXIS5.MACHINE",ImagePixelRect(18f,1178f,838f,1360f)),
            RuntimeTruthSourceRegion("AXIS5.PART",ImagePixelRect(18f,1365f,450f,1565f)),
            RuntimeTruthSourceRegion("AXIS5.INFO",ImagePixelRect(18f,1580f,838f,1715f)),
        ),
        PageId.AXIS6 to listOf(
            RuntimeTruthSourceRegion("AXIS6.COORD",ImagePixelRect(18f,870f,838f,1052f)),
            RuntimeTruthSourceRegion("AXIS6.TOOL",ImagePixelRect(520f,1060f,838f,1345f)),
            RuntimeTruthSourceRegion("AXIS6.MACHINE",ImagePixelRect(18f,1360f,420f,1575f)),
            RuntimeTruthSourceRegion("AXIS6.SAFETY",ImagePixelRect(430f,1360f,838f,1575f)),
        ),
        PageId.NC to listOf(
            RuntimeTruthSourceRegion("NC.EDITOR",ImagePixelRect(18f,477f,414f,1046f)),
            RuntimeTruthSourceRegion("NC.STATUS",ImagePixelRect(18f,1348f,838f,1655f)),
        ),
        PageId.AI to listOf(
            RuntimeTruthSourceRegion("AI.STATUS",ImagePixelRect(18f,468f,838f,824f)),
        ),
    )

    fun sourceRegions(page:PageId):List<RuntimeTruthSourceRegion> = common(page)+specific[page].orEmpty()

    fun regions(page:PageId,screenWidth:Float,screenHeight:Float):List<RuntimeTruthRegion> {
        val (refW,refH)=PageSurfaceTexturePlan.imageSize(page) ?: return emptyList()
        val transform=AdaptivePageTransform.forViewport(refW,refH,screenWidth,screenHeight)
        return sourceRegions(page).map{RuntimeTruthRegion(it.id,transform.sourceRectToScreen(it.rect))}
    }

    fun region(page:PageId,id:String,screenWidth:Float,screenHeight:Float):UiBounds? =
        regions(page,screenWidth,screenHeight).firstOrNull{it.id==id}?.bounds
}

object MobileRuntimeTruthTextPlan {
    private fun f3(v:Double)=String.format(Locale.US,"%.3f",v)

    fun header():List<RuntimeTruthTextBlock> = listOf(
        RuntimeTruthTextBlock("HEADER.STATUS",listOf("CNC —")),
        RuntimeTruthTextBlock("HEADER.CLOCK",listOf("時間 —")),
    )

    fun home(nc:NcState?,ai:AiState?):List<RuntimeTruthTextBlock> {
        val ncLine=nc?.let{"NC ${it.working.id} V${it.working.revision} | CAM ${it.camLink.name}"} ?: "NC —"
        val aiLine=ai?.let{"AI ${it.vaultState} | VERIFIED ${it.verified} | ISSUES ${it.issueCount}"} ?: "AI —"
        return listOf(
            RuntimeTruthTextBlock("HOME.LINK_STATUS",listOf("連線狀態 —")),
            RuntimeTruthTextBlock("HOME.RECENT_FILES",listOf("最近檔案 —")),
            RuntimeTruthTextBlock("HOME.CONNECTIONS",listOf("連線資料 —")),
            RuntimeTruthTextBlock("HOME.SYSTEM_INFO",listOf(ncLine,aiLine)),
        )
    }

    fun cad(state:CadState):List<RuntimeTruthTextBlock> {
        val visible=CadLayer.entries.count{state.layerVisibility[it]!=false}
        return listOf(
            RuntimeTruthTextBlock("CAD.LAYERS",listOf(
                "ACTIVE ${state.activeLayer.name}",
                "VISIBLE $visible/${CadLayer.entries.size}",
            )),
            RuntimeTruthTextBlock("CAD.PROPERTIES",listOf(
                "REV ${state.revision} | PRIM ${state.primitives.size} | SEL ${state.selectedCount}",
                "TOOL ${state.activeTool.name} | SNAP ${state.snapMode.name}",
                "ORIGIN X${f3(state.originX)} Y${f3(state.originY)}",
                "DIM ${state.dimensions.size} | TOPO ${state.topologyCount}",
            )),
        )
    }

    fun axis(state:AxisSceneState):List<RuntimeTruthTextBlock> {
        val p=state.pose.forMode(state.mode)
        val page=when(state.mode){
            AxisMode.AXIS3->PageId.AXIS3
            AxisMode.AXIS4->PageId.AXIS4
            AxisMode.AXIS5->PageId.AXIS5
            AxisMode.AXIS6->PageId.AXIS6
        }
        val coordId=when(state.mode){
            AxisMode.AXIS3->"AXIS3.COORD"
            AxisMode.AXIS4->"AXIS4.STATUS"
            AxisMode.AXIS5->"AXIS5.STATUS"
            AxisMode.AXIS6->"AXIS6.COORD"
        }
        val programId=when(state.mode){
            AxisMode.AXIS3->"AXIS3.NC"
            AxisMode.AXIS4->"AXIS4.PROGRAM"
            AxisMode.AXIS5->"AXIS5.INFO"
            AxisMode.AXIS6->"AXIS6.MACHINE"
        }
        val axisLines=buildList{
            add("X ${f3(p.x)} | Y ${f3(p.y)} | Z ${f3(p.z)}")
            when(state.mode){
                AxisMode.AXIS3->Unit
                AxisMode.AXIS4->add("A ${f3(p.a)}")
                AxisMode.AXIS5->add("A ${f3(p.a)} | B ${f3(p.b)}")
                AxisMode.AXIS6->add("A ${f3(p.a)} | B ${f3(p.b)} | C ${f3(p.c)}")
            }
        }
        val blockNow=if(state.blockIndex>=0)state.blockIndex+1 else 0
        val programLines=buildList{
            add("PROGRAM ${state.motionProgramId ?: "—"} | REV ${state.motionRevision}")
            add("BLOCK $blockNow/${state.blockCount}")
            state.message?.let{add("${it.severity.name}: ${it.text}")}
        }
        val blocks=mutableListOf(
            RuntimeTruthTextBlock(coordId,axisLines),
            RuntimeTruthTextBlock(programId,programLines),
        )
        val used=blocks.map{it.regionId}.toSet()
        MobileRuntimeTruthMaskLayout.sourceRegions(page)
            .filter{it.id.startsWith("AXIS") && it.id !in used}
            .forEach{blocks+=RuntimeTruthTextBlock(it.id,listOf("—"))}
        return blocks
    }
}
