package com.aigstudio.desktop

import com.aigstudio.core.AigRgbGlobalSkinV1
import com.aigstudio.core.AigRgbVisualState
import com.aigstudio.core.AigRgbWidgetRole
import java.awt.Color

data class AigRgbDesktopPanelSpec(
    val surfaceId:String,
    val role:AigRgbWidgetRole,
    val background:Color,
    val panel:Color,
    val accent:Color,
    val approvedAssetId:String?,
    val proceduralFallback:String
)

data class AigRgbDesktopButtonSpec(
    val surfaceId:String,
    val role:AigRgbWidgetRole,
    val accent:Color,
    val state:Color,
    val approvedAssetId:String?,
    val proceduralFallback:String
)

object AigRgbDesktopSkinAdapter {
    fun color(rgb:Int):Color = Color(rgb and 0x00FFFFFF)

    fun surfaceAccent(surface:String):Color {
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

    fun stateColor(state:AigRgbVisualState):Color = color(AigRgbGlobalSkinV1.stateColor(state))

    fun panelSpec(
        surface:String,
        role:AigRgbWidgetRole=AigRgbWidgetRole.GROUP
    ):AigRgbDesktopPanelSpec {
        val spec=AigRgbGlobalSkinV1.surface(surface)
        return AigRgbDesktopPanelSpec(
            surfaceId=spec.surfaceId.id,
            role=role,
            background=color(AigRgbGlobalSkinV1.BACKGROUND_RGB),
            panel=color(AigRgbGlobalSkinV1.PANEL_RGB),
            accent=surfaceAccent(surface),
            approvedAssetId=spec.approvedAssetId,
            proceduralFallback=spec.proceduralFallback
        )
    }

    fun buttonSpec(
        surface:String,
        role:AigRgbWidgetRole=AigRgbWidgetRole.TOOL,
        state:AigRgbVisualState=AigRgbVisualState.NORMAL
    ):AigRgbDesktopButtonSpec {
        val spec=AigRgbGlobalSkinV1.surface(surface)
        return AigRgbDesktopButtonSpec(
            surfaceId=spec.surfaceId.id,
            role=role,
            accent=surfaceAccent(surface),
            state=stateColor(state),
            approvedAssetId=spec.approvedAssetId,
            proceduralFallback=spec.proceduralFallback
        )
    }

    fun approvedAssetStatus(surface:String,assetPresent:Boolean):String =
        if(assetPresent) "MORNING_APPROVED_RGB_READY|WINDOWS|"+AigRgbGlobalSkinV1.surface(surface).surfaceId.id
        else "APPROVED_ASSET_PENDING_INGEST|WINDOWS|"+AigRgbGlobalSkinV1.surface(surface).surfaceId.id+"|PROCEDURAL_RGB_GLASS"
}
