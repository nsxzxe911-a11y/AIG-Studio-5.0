package com.aigstudio.core

object TypographyLocalizationRegression {
    @JvmStatic fun main(args:Array<String>) {
        check(UiLocalizationRegistry.supportedLocales==listOf("zh-TW","en-US"))
        check(UiLocalizationRegistry.text("zh-TW","machine.online")=="機台運行中")
        check(UiLocalizationRegistry.text("en-US","machine.online")=="MACHINE ONLINE")
        check(UiLocalizationRegistry.text("zh-TW","tool.info")=="刀具資訊")
        check(UiLocalizationRegistry.text("zh-TW","action.cycleStart")=="循環啟動")
        check(UiTypographyRegistry.require("MOBILE_COMPACT").monoFontAlias=="CNC_MONO")
        check(UiTypographyRegistry.require("DESKTOP_4K").cjkFontAlias=="CJK_SANS")

        val actionBefore=RuntimeVisualModuleRegistry.require("NC").actionGroup
        val sceneBefore=RuntimeVisualModuleRegistry.require("6AX").sceneProfile
        val skinBefore=RuntimeSkinState.skinId
        UiPresentationState.selectLocale("en-US")
        UiPresentationState.selectTypography("DESKTOP_STANDARD")
        UiPresentationState.selectLocale("zh-TW")
        UiPresentationState.selectTypography("MOBILE_COMPACT")
        check(RuntimeVisualModuleRegistry.require("NC").actionGroup==actionBefore)
        check(RuntimeVisualModuleRegistry.require("6AX").sceneProfile==sceneBefore)
        check(RuntimeSkinState.skinId==skinBefore)
        check(UiPresentationState.text("nav.home")=="首頁")
        println("TYPOGRAPHY_LOCALIZATION_PASS")
    }
}
