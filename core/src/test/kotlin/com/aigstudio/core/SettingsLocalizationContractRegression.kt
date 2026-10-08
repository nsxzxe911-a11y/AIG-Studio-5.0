package com.aigstudio.core

fun main() {
    val requiredKeys=listOf(
        "settings.title","settings.language","settings.language.zhTw","settings.language.enUs",
        "settings.renderer","settings.renderer.auto","settings.renderer.openGles","settings.renderer.vulkan",
        "settings.renderer.d3d12","settings.renderer.d3d11","settings.renderer.java2d",
        "settings.renderer.notEnabled","settings.renderer.notAvailable","settings.renderer.diagnosticOnly",
        "settings.gpu3d","settings.fps","settings.quality","settings.power","settings.rgb","settings.hud",
        "settings.precision","settings.apply","settings.cancel","settings.enabled","settings.disabled"
    )
    UiLocalizationRegistry.supportedLocales.forEach { locale ->
        requiredKeys.forEach { key ->
            val value=UiLocalizationRegistry.text(locale,key)
            check(value!=key) { "missing $locale translation: $key" }
            check(value.isNotBlank()) { "blank $locale translation: $key" }
        }
    }
    check(UiLocalizationRegistry.text("zh-TW","settings.language.zhTw")=="繁體中文")
    check(UiLocalizationRegistry.text("en-US","settings.language.enUs")=="English")

    val caps=RendererCapabilitySnapshot(
        available=setOf(RendererBackend.ANDROID_HWUI),
        implemented=setOf(RendererBackend.ANDROID_HWUI)
    )
    val store=SharedSettingsStore(RendererPlatform.ANDROID,caps)
    UiPresentationState.selectLocale("zh-TW")
    check(store.selectLocale("en-US"))
    check(store.snapshot().localeId=="en-US")
    check(UiPresentationState.localeId=="en-US")
    check(UiPresentationState.text("settings.title")=="SETTINGS")

    val before=store.snapshot()
    check(!store.selectLocale("xx-INVALID"))
    check(store.snapshot()==before)
    check(UiPresentationState.localeId=="en-US")

    check(store.selectLocale("zh-TW"))
    check(UiPresentationState.text("settings.title")=="設定")
    println("AIGCNC_SETTINGS_LOCALIZATION_CONTRACT_PASS|ZH_TW_EN_US|PRODUCTION_LOCALE_STATE|FAIL_CLOSED")
}
