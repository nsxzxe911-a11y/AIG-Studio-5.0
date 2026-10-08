package com.aigstudio.core

/** Presentation-only state: changing locale/typography must not mutate actions, scene or CNC truth. */
object UiPresentationState {
    @Volatile var localeId:String="zh-TW"
        private set
    @Volatile var typographyId:String="MOBILE_COMPACT"
        private set

    @Synchronized
    fun selectLocale(newLocaleId:String) {
        UiLocalizationRegistry.requireLocale(newLocaleId)
        localeId=newLocaleId
    }

    @Synchronized
    fun selectTypography(newTypographyId:String) {
        UiTypographyRegistry.require(newTypographyId)
        typographyId=newTypographyId
    }

    fun text(key:String):String=UiLocalizationRegistry.text(localeId,key)
    fun typography():UiTypographyProfile=UiTypographyRegistry.require(typographyId)
}
