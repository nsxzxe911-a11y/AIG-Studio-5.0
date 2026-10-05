package com.aigstudio.app

import com.aigstudio.core.AigRgbGlobalSkinV1
import com.aigstudio.core.AigRgbVisualState
import com.aigstudio.core.AigRgbWidgetRole

data class AigRgbAndroidButtonSpec(
    val surfaceId:String,
    val role:AigRgbWidgetRole,
    val accentColor:Int,
    val stateColor:Int,
    val approvedAssetId:String?,
    val proceduralFallback:String
)

object AigRgbAndroidSkinAdapter {
    fun color(rgb:Int):Int = 0xFF000000.toInt() or (rgb and 0x00FFFFFF)

    fun surfaceAccent(surface:String):Int {
        val spec=AigRgbGlobalSkinV1.surface(surface)
        val rgb=when(spec.accentRole) {
            "CUTTING" -> AigRgbGlobalSkinV1.CUTTING_RGB
            "RAPID" -> AigRgbGlobalSkinV1.RAPID_RGB
            "WARNING" -> AigRgbGlobalSkinV1.WARNING_RGB
            "ALARM" -> AigRgbGlobalSkinV1.ALARM_RGB
            "SELECTED" -> AigRgbGlobalSkinV1.SELECTED_RGB
            else -> AigRgbGlobalSkinV1.ACCENT_RGB
        }
        return color(rgb)
    }

    fun stateColor(state:AigRgbVisualState):Int = color(AigRgbGlobalSkinV1.stateColor(state))

    fun buttonSpec(
        surface:String,
        role:AigRgbWidgetRole=AigRgbWidgetRole.TOOL,
        state:AigRgbVisualState=AigRgbVisualState.NORMAL
    ):AigRgbAndroidButtonSpec {
        val spec=AigRgbGlobalSkinV1.surface(surface)
        return AigRgbAndroidButtonSpec(
            surfaceId=spec.surfaceId.id,
            role=role,
            accentColor=surfaceAccent(surface),
            stateColor=stateColor(state),
            approvedAssetId=spec.approvedAssetId,
            proceduralFallback=spec.proceduralFallback
        )
    }

    fun approvedAssetStatus(surface:String,assetPresent:Boolean):String =
        if(assetPresent) "MORNING_APPROVED_RGB_READY|"+AigRgbGlobalSkinV1.surface(surface).surfaceId.id
        else "APPROVED_ASSET_PENDING_INGEST|"+AigRgbGlobalSkinV1.surface(surface).surfaceId.id+"|PROCEDURAL_RGB_GLASS"
}
