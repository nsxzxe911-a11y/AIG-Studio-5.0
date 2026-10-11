package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import java.util.Locale

data class CamImageLiveOverlay(
    val viewport:UiBounds,
    val pointPanel:UiBounds,
    val strategyPanel:UiBounds,
    val avoidancePanel:UiBounds,
    val activePoints:List<CamPointSnapshot>,
    val candidatePoints:List<CamPointSnapshot>,
    val pointStatus:String,
    val strategyStatus:String,
    val avoidanceStatus:String,
)

object CamImageLiveOverlayPlan {
    fun build(state:CamState,widthPx:Float,heightPx:Float):CamImageLiveOverlay {
        val s=state.strategy
        val active=state.active?.points.orEmpty()
        val candidate=state.candidate?.points.orEmpty()
        val pointStatus="ACTIVE ${active.size} | CAND ${candidate.size} | ZONES ${state.zones.size} | REV ${state.active?.revision ?: 0L}"
        val strategyStatus=String.format(Locale.US,
            "T%d | DIA %.3f | DEPTH %.3f | SAFE-Z %.3f | F %.1f | S %.0f | %s | %s",
            s.toolNumber,s.toolDiameterMm,s.depthMm,s.safeZMm,s.feedMmMin,s.spindleRpm,s.side.name,s.direction.name)
        val fixtureCount=state.zones.count{it.kind==CamZoneKind.FIXTURE}
        val clampCount=state.zones.count{it.kind==CamZoneKind.CLAMP}
        val keepOutCount=state.zones.count{it.kind==CamZoneKind.KEEP_OUT}
        val avoidanceStatus=String.format(Locale.US,
            "SAFE-Z %.3f | FIXTURE %d | CLAMP %d | KEEP-OUT %d",
            s.safeZMm,fixtureCount,clampCount,keepOutCount)
        fun map(rect:ImagePixelRect)=ImagePixelMapper.pixelRectToScreen(CamImagePixelManifest.spec,widthPx,heightPx,rect)
        return CamImageLiveOverlay(
            map(CamImagePixelManifest.viewport),map(CamImagePixelManifest.pointPanel),
            map(CamImagePixelManifest.strategyPanel),map(CamImagePixelManifest.avoidancePanel),
            active,candidate,pointStatus,strategyStatus,avoidanceStatus,
        )
    }
}
