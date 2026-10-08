package com.aigstudio.core

enum class RendererSelection(val backend:RendererBackend?=null) {
    AUTO,
    ANDROID_OPENGL_ES(RendererBackend.ANDROID_OPENGL_ES),
    ANDROID_VULKAN(RendererBackend.ANDROID_VULKAN),
    WINDOWS_D3D12(RendererBackend.WINDOWS_D3D12),
    WINDOWS_D3D11(RendererBackend.WINDOWS_D3D11),
    WINDOWS_JAVA2D(RendererBackend.WINDOWS_JAVA2D)
}

data class RendererSettingOption(
    val selection:RendererSelection,
    val selectable:Boolean,
    val disabledReasonKey:String?=null,
    val diagnosticOnly:Boolean=false
)

data class SharedSettingsSnapshot(
    val localeId:String="zh-TW",
    val rendererSelection:RendererSelection=RendererSelection.AUTO,
    val gpu3dEnabled:Boolean=true,
    val fpsMode:FpsMode=FpsMode.FPS_60,
    val renderQuality:RenderQuality=RenderQuality.HIGH,
    val powerMode:PowerMode=PowerMode.AUTO,
    val rgbBrightness:Int=65,
    val rgbBreathingEnabled:Boolean=true,
    val hudEnabled:Boolean=false,
    val systemHudEnabled:Boolean=false,
    val fpsDisplayEnabled:Boolean=false,
    val temperatureDisplayEnabled:Boolean=false,
    val thermalAuto:Boolean=true,
    val idleRedrawThrottle:Boolean=true,
    val coordinatePrecision:CoordinatePrecisionMode=CoordinatePrecisionMode.MM_0_001,
    val ncPrecision:CoordinatePrecisionMode=CoordinatePrecisionMode.MM_0_001
) {
    init {
        require(localeId in setOf("zh-TW","en-US")) { "Unsupported locale: $localeId" }
        require(rgbBrightness in 0..100) { "RGB brightness must be 0..100" }
    }
}

object SharedSettingsContract {
    val settingIds=linkedSetOf(
        "language","renderer","gpu3d","fps","quality","power","rgb","hud","precision"
    )

    fun rendererOptions(
        platform:RendererPlatform,
        capabilities:RendererCapabilitySnapshot
    ):List<RendererSettingOption> = when(platform) {
        RendererPlatform.ANDROID -> listOf(
            RendererSettingOption(RendererSelection.AUTO,selectable=true),
            option(RendererSelection.ANDROID_OPENGL_ES,capabilities),
            option(RendererSelection.ANDROID_VULKAN,capabilities)
        )
        RendererPlatform.WINDOWS -> listOf(
            RendererSettingOption(RendererSelection.AUTO,selectable=true),
            option(RendererSelection.WINDOWS_D3D12,capabilities),
            option(RendererSelection.WINDOWS_D3D11,capabilities),
            option(RendererSelection.WINDOWS_JAVA2D,capabilities,diagnosticOnly=true)
        )
    }

    fun selectable(
        selection:RendererSelection,
        platform:RendererPlatform,
        capabilities:RendererCapabilitySnapshot
    ):Boolean = rendererOptions(platform,capabilities)
        .firstOrNull { it.selection==selection }
        ?.selectable == true

    private fun option(
        selection:RendererSelection,
        capabilities:RendererCapabilitySnapshot,
        diagnosticOnly:Boolean=false
    ):RendererSettingOption {
        val backend=requireNotNull(selection.backend)
        val available=backend in capabilities.available
        val implemented=backend in capabilities.implemented
        val explicitlyDisabled=backend in capabilities.disabled
        val selectable=available && implemented && !explicitlyDisabled
        val reason=when {
            selectable -> null
            !available -> "settings.renderer.notAvailable"
            else -> "settings.renderer.notEnabled"
        }
        return RendererSettingOption(selection,selectable,reason,diagnosticOnly)
    }
}

class SharedSettingsStore(
    private val platform:RendererPlatform,
    capabilities:RendererCapabilitySnapshot,
    initial:SharedSettingsSnapshot=SharedSettingsSnapshot()
) {
    @Volatile private var current=initial
    @Volatile private var rendererCapabilities=capabilities
    private val observers=linkedSetOf<(SharedSettingsSnapshot)->Unit>()

    @Synchronized fun snapshot():SharedSettingsSnapshot=current

    fun observe(observer:(SharedSettingsSnapshot)->Unit):()->Unit {
        val first=synchronized(this) { observers += observer; current }
        observer(first)
        return { synchronized(this) { observers -= observer } }
    }

    fun update(transform:(SharedSettingsSnapshot)->SharedSettingsSnapshot):SharedSettingsSnapshot {
        val next:SharedSettingsSnapshot
        val targets:List<(SharedSettingsSnapshot)->Unit>
        synchronized(this) {
            next=transform(current)
            validateRenderer(next.rendererSelection,rendererCapabilities)
            current=next
            targets=observers.toList()
        }
        targets.forEach { it(next) }
        return next
    }

    fun selectLocale(localeId:String):Boolean {
        if(localeId !in UiLocalizationRegistry.supportedLocales) return false
        UiLocalizationRegistry.requireLocale(localeId)
        val next=update { it.copy(localeId=localeId) }
        UiPresentationState.selectLocale(next.localeId)
        return true
    }

    fun selectRenderer(selection:RendererSelection):Boolean {
        if(!SharedSettingsContract.selectable(selection,platform,rendererCapabilities)) return false
        update { it.copy(rendererSelection=selection) }
        return true
    }

    fun updateCapabilities(capabilities:RendererCapabilitySnapshot) {
        synchronized(this) {
            rendererCapabilities=capabilities
            if(!SharedSettingsContract.selectable(current.rendererSelection,platform,capabilities)) {
                current=current.copy(rendererSelection=RendererSelection.AUTO)
            }
        }
    }

    fun rendererOptions():List<RendererSettingOption> =
        SharedSettingsContract.rendererOptions(platform,rendererCapabilities)

    private fun validateRenderer(
        selection:RendererSelection,
        capabilities:RendererCapabilitySnapshot
    ) {
        require(SharedSettingsContract.selectable(selection,platform,capabilities)) {
            "Renderer selection is unavailable: $selection"
        }
    }
}
