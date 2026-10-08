package com.aigstudio.desktop

import com.aigstudio.core.*
import java.util.prefs.Preferences

/** Windows persistence/capability adapter. Native D3D is disabled until implemented. */
object SharedSettingsDesktopBridge {
    private val prefs=Preferences.userRoot().node("aigstudio/runtime")
    @Volatile private var liveStore:SharedSettingsStore?=null

    fun load():SharedSettingsStore {
        val caps=capabilities()
        val persistedRenderer=runCatching {
            RendererSelection.valueOf(prefs.get("renderer_selection",RendererSelection.AUTO.name))
        }.getOrDefault(RendererSelection.AUTO)
        val renderer=if(SharedSettingsContract.selectable(persistedRenderer,RendererPlatform.WINDOWS,caps))
            persistedRenderer else RendererSelection.AUTO
        val locale=prefs.get("locale_id","zh-TW").takeIf{it in UiLocalizationRegistry.supportedLocales} ?: "zh-TW"
        val snapshot=SharedSettingsSnapshot(
            localeId=locale,
            rendererSelection=renderer,
            gpu3dEnabled=prefs.getBoolean("gpu3d_enabled",true),
            fpsMode=parseFps(prefs.get("fps_mode","60 FPS")),
            renderQuality=parseQuality(prefs.get("render_quality","High")),
            powerMode=parsePower(prefs.get("power_mode","Auto")),
            rgbBrightness=prefs.getInt("rgb_brightness",65).coerceIn(0,100),
            rgbBreathingEnabled=prefs.getBoolean("rgb_breathing_enabled",true),
            hudEnabled=prefs.getBoolean("hud_enabled",false),
            systemHudEnabled=prefs.getBoolean("system_hud_enabled",false),
            fpsDisplayEnabled=prefs.getBoolean("fps_display_enabled",false),
            temperatureDisplayEnabled=prefs.getBoolean("temperature_display_enabled",false),
            thermalAuto=prefs.getBoolean("thermal_auto",true),
            idleRedrawThrottle=prefs.getBoolean("idle_throttle",true),
            coordinatePrecision=CoordinatePrecisionMode.fromStorage(prefs.get("coordinate_precision","0.001")),
            ncPrecision=CoordinatePrecisionMode.fromStorage(prefs.get("nc_output_precision","0.001"))
        )
        val store=SharedSettingsStore(RendererPlatform.WINDOWS,caps,snapshot)
        liveStore=store
        store.selectLocale(locale)
        return store
    }

    fun store():SharedSettingsStore=liveStore ?: load()

    fun apply(requested:SharedSettingsSnapshot):Result<SharedSettingsSnapshot> {
        val store=store()
        val before=store.snapshot()
        return try {
            UiLocalizationRegistry.requireLocale(requested.localeId)
            require(SharedSettingsContract.selectable(requested.rendererSelection,RendererPlatform.WINDOWS,capabilities())) {
                "Renderer unavailable: ${requested.rendererSelection}"
            }
            val next=store.update { requested }
            UiPresentationState.selectLocale(next.localeId)
            prefs.put("locale_id",next.localeId)
            prefs.put("renderer_selection",next.rendererSelection.name)
            prefs.putBoolean("gpu3d_enabled",next.gpu3dEnabled)
            prefs.put("fps_mode",fpsStorage(next.fpsMode))
            prefs.put("render_quality",qualityStorage(next.renderQuality))
            prefs.put("power_mode",powerStorage(next.powerMode))
            prefs.putInt("rgb_brightness",next.rgbBrightness)
            prefs.putBoolean("rgb_breathing_enabled",next.rgbBreathingEnabled)
            prefs.putBoolean("hud_enabled",next.hudEnabled)
            prefs.putBoolean("system_hud_enabled",next.systemHudEnabled)
            prefs.putBoolean("fps_display_enabled",next.fpsDisplayEnabled)
            prefs.putBoolean("temperature_display_enabled",next.temperatureDisplayEnabled)
            prefs.putBoolean("thermal_auto",next.thermalAuto)
            prefs.putBoolean("idle_throttle",next.idleRedrawThrottle)
            prefs.put("coordinate_precision",next.coordinatePrecision.storageValue)
            prefs.put("nc_output_precision",next.ncPrecision.storageValue)
            prefs.flush()
            Result.success(next)
        } catch(error:Throwable) {
            runCatching { store.update { before } }
            runCatching { UiPresentationState.selectLocale(before.localeId) }
            Result.failure(error)
        }
    }

    fun capabilities():RendererCapabilitySnapshot=RendererCapabilitySnapshot(
        available=setOf(
            RendererBackend.WINDOWS_D3D12,
            RendererBackend.WINDOWS_D3D11,
            RendererBackend.WINDOWS_JAVA2D
        ),
        implemented=setOf(RendererBackend.WINDOWS_JAVA2D)
    )

    fun effectiveBackend():RendererBackend? {
        val selected=store().snapshot().rendererSelection
        return selected.backend ?: RendererCapabilityNegotiator.selectAuto(RendererPlatform.WINDOWS,capabilities())
    }

    fun rendererLabel(option:RendererSettingOption):String {
        val key=when(option.selection) {
            RendererSelection.AUTO->"settings.renderer.auto"
            RendererSelection.ANDROID_OPENGL_ES->"settings.renderer.openGles"
            RendererSelection.ANDROID_VULKAN->"settings.renderer.vulkan"
            RendererSelection.WINDOWS_D3D12->"settings.renderer.d3d12"
            RendererSelection.WINDOWS_D3D11->"settings.renderer.d3d11"
            RendererSelection.WINDOWS_JAVA2D->"settings.renderer.java2d"
        }
        val label=UiPresentationState.text(key)
        val diagnostic=if(option.diagnosticOnly) " • ${UiPresentationState.text("settings.renderer.diagnosticOnly")}" else ""
        val disabled=option.disabledReasonKey?.let { " • ${UiPresentationState.text(it)}" } ?: ""
        return label+diagnostic+disabled
    }

    private fun parseFps(value:String?):FpsMode=when(value?.trim()?.uppercase()) {
        "AUTO"->FpsMode.AUTO
        "120 FPS"->FpsMode.FPS_120
        "90 FPS"->FpsMode.FPS_90
        "30 FPS"->FpsMode.FPS_30
        else->FpsMode.FPS_60
    }
    private fun fpsStorage(value:FpsMode):String=when(value) {
        FpsMode.AUTO->"Auto";FpsMode.FPS_120->"120 FPS";FpsMode.FPS_90->"90 FPS";FpsMode.FPS_60->"60 FPS";FpsMode.FPS_30->"30 FPS"
    }
    private fun parseQuality(value:String?):RenderQuality=runCatching { RenderQuality.valueOf(value?.trim()?.uppercase() ?: "HIGH") }.getOrDefault(RenderQuality.HIGH)
    private fun qualityStorage(value:RenderQuality):String=value.name.lowercase().replaceFirstChar{it.uppercase()}
    private fun parsePower(value:String?):PowerMode=runCatching { PowerMode.valueOf(value?.trim()?.uppercase() ?: "AUTO") }.getOrDefault(PowerMode.AUTO)
    private fun powerStorage(value:PowerMode):String=value.name.lowercase().replaceFirstChar{it.uppercase()}
}
