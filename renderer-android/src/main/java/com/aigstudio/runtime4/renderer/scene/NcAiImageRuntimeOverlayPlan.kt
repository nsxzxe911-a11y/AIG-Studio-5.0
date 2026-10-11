package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.AiState
import com.aigstudio.runtime4.contract.NcState

data class NcImageLiveOverlay(
    val editor:UiBounds,
    val statusPanel:UiBounds,
    val lines:List<String>,
    val cursorLine:Int,
    val status:String,
)

data class AiImageLiveOverlay(
    val panel:UiBounds,
    val rows:List<String>,
)

object NcAiImageRuntimeLayout {
    private const val REF_W=856f
    private const val REF_H=1836f
    private val ncEditor=ImagePixelRect(18f,477f,414f,1046f)
    private val ncStatus=ImagePixelRect(18f,1348f,838f,1655f)
    private val aiPanel=ImagePixelRect(18f,468f,838f,824f)
    private fun map(rect:ImagePixelRect,width:Float,height:Float)=
        AdaptivePageTransform.forViewport(REF_W,REF_H,width,height).sourceRectToScreen(rect)
    fun ncEditor(width:Float,height:Float)=map(ncEditor,width,height)
    fun ncStatus(width:Float,height:Float)=map(ncStatus,width,height)
    fun aiPanel(width:Float,height:Float)=map(aiPanel,width,height)
}

object NcImageLiveOverlayPlan {
    fun build(state:NcState,widthPx:Float,heightPx:Float):NcImageLiveOverlay {
        val presentation=NcPresentation.from(state)
        val lines=presentation.lines.map{line->line.number.toString().padStart(4,'0')+"  "+line.text}
        val msg=presentation.localMessage?.let{" | ${it.severity.name}: ${it.text}"}.orEmpty()
        val status="WORK ${presentation.workingId} V${presentation.revision} | ${state.editMode.name} | CAM ${presentation.camLink.name}$msg"
        return NcImageLiveOverlay(
            editor=NcAiImageRuntimeLayout.ncEditor(widthPx,heightPx),
            statusPanel=NcAiImageRuntimeLayout.ncStatus(widthPx,heightPx),
            lines=lines,
            cursorLine=presentation.cursorLine,
            status=status,
        )
    }
}

object AiImageLiveOverlayPlan {
    fun build(state:AiState?,widthPx:Float,heightPx:Float):AiImageLiveOverlay {
        val rows=if(state==null || !state.available){
            listOf("AI RUNTIME UNAVAILABLE")
        } else {
            buildList {
                add("AI LOCAL VAULT | ${state.vaultState}")
                add(state.summary)
                add("CHANGES ${state.hasChanges} | VERIFIED ${state.verified} | ISSUES ${state.issueCount}")
                state.message?.let{add("${it.severity.name}: ${it.text}")}
            }
        }
        return AiImageLiveOverlay(NcAiImageRuntimeLayout.aiPanel(widthPx,heightPx),rows)
    }
}
