package com.aigstudio.core

fun main() {
    check(SharedSettingsContract.settingIds == linkedSetOf(
        "language","renderer","gpu3d","fps","quality","power","rgb","hud","precision"
    ))

    val defaults=SharedSettingsSnapshot()
    check(defaults.localeId=="zh-TW")
    check(defaults.rendererSelection==RendererSelection.AUTO)
    check(defaults.gpu3dEnabled)
    check(defaults.fpsMode==FpsMode.FPS_60)
    check(defaults.renderQuality==RenderQuality.HIGH)
    check(defaults.powerMode==PowerMode.AUTO)
    check(defaults.rgbBrightness==65)
    check(defaults.coordinatePrecision==CoordinatePrecisionMode.MM_0_001)
    check(defaults.ncPrecision==CoordinatePrecisionMode.MM_0_001)

    val androidCaps=RendererCapabilitySnapshot(
        available=setOf(RendererBackend.ANDROID_HWUI,RendererBackend.ANDROID_OPENGL_ES,RendererBackend.ANDROID_VULKAN),
        implemented=setOf(RendererBackend.ANDROID_HWUI)
    )
    val android=SharedSettingsContract.rendererOptions(RendererPlatform.ANDROID,androidCaps)
    check(android.map{it.selection}==listOf(
        RendererSelection.AUTO,
        RendererSelection.ANDROID_OPENGL_ES,
        RendererSelection.ANDROID_VULKAN
    ))
    check(android.first().selectable)
    check(!android.first{it.selection==RendererSelection.ANDROID_OPENGL_ES}.selectable)
    check(android.first{it.selection==RendererSelection.ANDROID_OPENGL_ES}.disabledReasonKey=="settings.renderer.notEnabled")
    check(!android.first{it.selection==RendererSelection.ANDROID_VULKAN}.selectable)

    val windowsCaps=RendererCapabilitySnapshot(
        available=setOf(RendererBackend.WINDOWS_JAVA2D,RendererBackend.WINDOWS_D3D11,RendererBackend.WINDOWS_D3D12),
        implemented=setOf(RendererBackend.WINDOWS_JAVA2D)
    )
    val windows=SharedSettingsContract.rendererOptions(RendererPlatform.WINDOWS,windowsCaps)
    check(windows.map{it.selection}==listOf(
        RendererSelection.AUTO,
        RendererSelection.WINDOWS_D3D12,
        RendererSelection.WINDOWS_D3D11,
        RendererSelection.WINDOWS_JAVA2D
    ))
    check(!windows.first{it.selection==RendererSelection.WINDOWS_D3D12}.selectable)
    check(!windows.first{it.selection==RendererSelection.WINDOWS_D3D11}.selectable)
    check(windows.first{it.selection==RendererSelection.WINDOWS_JAVA2D}.selectable)
    check(windows.first{it.selection==RendererSelection.WINDOWS_JAVA2D}.diagnosticOnly)

    val store=SharedSettingsStore(RendererPlatform.ANDROID,androidCaps)
    check(store.snapshot().rendererSelection==RendererSelection.AUTO)
    check(!store.selectRenderer(RendererSelection.ANDROID_OPENGL_ES))
    check(store.snapshot().rendererSelection==RendererSelection.AUTO)
    check(store.update { it.copy(rgbBrightness=80) }.rgbBrightness==80)

    var rejected=false
    try { store.update { it.copy(rgbBrightness=101) } } catch(_:IllegalArgumentException){ rejected=true }
    check(rejected)
    check(store.snapshot().rgbBrightness==80)

    println("AIGCNC_SHARED_SETTINGS_CONTRACT_PASS|COMMON_IDS|TRUTHFUL_RENDERER_OPTIONS|FAIL_CLOSED|VALIDATED_STATE")
}
