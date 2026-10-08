package com.aigstudio.app

import android.app.Activity
import android.app.ActivityManager
import android.content.pm.PackageManager
import android.os.Build
import com.aigstudio.core.*

/** Android persistence/capability adapter. SharedSettingsStore remains product truth. */
object SharedSettingsAndroidBridge {
    private const val PREFS="aig_environment"
    @Volatile private var liveStore:SharedSettingsStore?=null

    fun load(activity:Activity):SharedSettingsStore {
        val prefs=activity.getSharedPreferences(PREFS,Activity.MODE_PRIVATE)
        val caps=capabilities(activity)
        val persistedRenderer=runCatching {
            RendererSelection.valueOf(prefs.getString("renderer_selection",RendererSelection.AUTO.name) ?: RendererSelection.AUTO.name)
        }.getOrDefault(RendererSelection.AUTO)
        val renderer=if(SharedSettingsContract.selectable(persistedRenderer,RendererPlatform.ANDROID,caps))
            persistedRenderer else RendererSelection.AUTO
        val snapshot=SharedSettingsSnapshot(
            localeId=prefs.getString("locale_id","zh-TW")?.takeIf{it in UiLocalizationRegistry.supportedLocales} ?: "zh-TW",
            rendererSelection=renderer,
            gpu3dEnabled=prefs.getBoolean("gpu3d_enabled",true),
            fpsMode=parseFps(prefs.getString("fps_mode","60 FPS")),
            renderQuality=parseQuality(prefs.getString("render_quality","High")),
            powerMode=parsePower(prefs.getString("power_mode","Auto")),
            rgbBrightness=prefs.getInt("rgb_brightness",65).coerceIn(0,100),
            rgbBreathingEnabled=prefs.getBoolean("rgb_breathing_enabled",true),
            hudEnabled=prefs.getBoolean("hud_enabled",false),
            systemHudEnabled=prefs.getBoolean("system_hud_enabled",false),
            fpsDisplayEnabled=prefs.getBoolean("fps_display_enabled",false),
            temperatureDisplayEnabled=prefs.getBoolean("temperature_display_enabled",RuntimeDeviceProfile.defaultTemperatureDisplayEnabled),
            thermalAuto=prefs.getBoolean("thermal_auto",true),
            idleRedrawThrottle=prefs.getBoolean("idle_throttle",true),
            coordinatePrecision=CoordinatePrecisionMode.fromStorage(prefs.getString("coordinate_precision","0.001")),
            ncPrecision=CoordinatePrecisionMode.fromStorage(prefs.getString("nc_output_precision","0.001"))
        )
        val store=SharedSettingsStore(RendererPlatform.ANDROID,caps,snapshot)
        liveStore=store
        store.selectLocale(snapshot.localeId)
        return store
    }

    fun store(activity:Activity):SharedSettingsStore=liveStore ?: load(activity)

    fun apply(activity:Activity,requested:SharedSettingsSnapshot):Result<SharedSettingsSnapshot> {
        val store=store(activity)
        val before=store.snapshot()
        return try {
            UiLocalizationRegistry.requireLocale(requested.localeId)
            require(SharedSettingsContract.selectable(requested.rendererSelection,RendererPlatform.ANDROID,capabilities(activity))) {
                "Renderer unavailable: ${requested.rendererSelection}"
            }
            val next=store.update { requested }
            UiPresentationState.selectLocale(next.localeId)
            val committed=activity.getSharedPreferences(PREFS,Activity.MODE_PRIVATE).edit()
                .putString("locale_id",next.localeId)
                .putString("renderer_selection",next.rendererSelection.name)
                .putBoolean("gpu3d_enabled",next.gpu3dEnabled)
                .putString("fps_mode",fpsStorage(next.fpsMode))
                .putString("render_quality",qualityStorage(next.renderQuality))
                .putString("power_mode",powerStorage(next.powerMode))
                .putInt("rgb_brightness",next.rgbBrightness)
                .putBoolean("rgb_breathing_enabled",next.rgbBreathingEnabled)
                .putBoolean("hud_enabled",next.hudEnabled)
                .putBoolean("system_hud_enabled",next.systemHudEnabled)
                .putBoolean("fps_display_enabled",next.fpsDisplayEnabled)
                .putBoolean("temperature_display_enabled",next.temperatureDisplayEnabled)
                .putBoolean("thermal_auto",next.thermalAuto)
                .putBoolean("idle_throttle",next.idleRedrawThrottle)
                .putString("coordinate_precision",next.coordinatePrecision.storageValue)
                .putString("nc_output_precision",next.ncPrecision.storageValue)
                .commit()
            if(!committed) error("Shared settings persistence failed")
            Result.success(next)
        } catch(error:Throwable) {
            runCatching { store.update { before } }
            runCatching { UiPresentationState.selectLocale(before.localeId) }
            Result.failure(error)
        }
    }

    fun capabilities(activity:Activity):RendererCapabilitySnapshot {
        val available=linkedSetOf(RendererBackend.ANDROID_HWUI)
        val activityManager=activity.getSystemService(Activity.ACTIVITY_SERVICE) as ActivityManager
        if(activityManager.deviceConfigurationInfo.reqGlEsVersion>=0x00030000) {
            available += RendererBackend.ANDROID_OPENGL_ES
        }
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.N &&
            activity.packageManager.hasSystemFeature(PackageManager.FEATURE_VULKAN_HARDWARE_VERSION)) {
            available += RendererBackend.ANDROID_VULKAN
        }
        return RendererCapabilitySnapshot(
            available=available,
            implemented=setOf(RendererBackend.ANDROID_HWUI)
        )
    }

    fun effectiveBackend(activity:Activity):RendererBackend? {
        val store=store(activity)
        val selected=store.snapshot().rendererSelection
        return selected.backend ?: RendererCapabilityNegotiator.selectAuto(RendererPlatform.ANDROID,capabilities(activity))
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
        return option.disabledReasonKey?.let { "$label • ${UiPresentationState.text(it)}" } ?: label
    }

    private fun parseFps(value:String?):FpsMode=when(value?.trim()?.uppercase()) {
        "AUTO"->FpsMode.AUTO
        "120 FPS"->FpsMode.FPS_120
        "90 FPS"->FpsMode.FPS_90
        "30 FPS"->FpsMode.FPS_30
        else->FpsMode.FPS_60
    }

    private fun fpsStorage(value:FpsMode):String=when(value) {
        FpsMode.AUTO->"Auto"
        FpsMode.FPS_120->"120 FPS"
        FpsMode.FPS_90->"90 FPS"
        FpsMode.FPS_60->"60 FPS"
        FpsMode.FPS_30->"30 FPS"
    }

    private fun parseQuality(value:String?):RenderQuality=when(value?.trim()?.uppercase()) {
        "ULTRA"->RenderQuality.ULTRA
        "BALANCED"->RenderQuality.BALANCED
        "ECO"->RenderQuality.ECO
        else->RenderQuality.HIGH
    }

    private fun qualityStorage(value:RenderQuality):String=value.name.lowercase().replaceFirstChar{it.uppercase()}

    private fun parsePower(value:String?):PowerMode=when(value?.trim()?.uppercase()) {
        "PERFORMANCE"->PowerMode.PERFORMANCE
        "BALANCED"->PowerMode.BALANCED
        "ECO"->PowerMode.ECO
        else->PowerMode.AUTO
    }

    private fun powerStorage(value:PowerMode):String=value.name.lowercase().replaceFirstChar{it.uppercase()}
}
