package com.aigstudio.core

data class UiTypographyProfile(
    val id:String,
    val uiFontAlias:String,
    val cjkFontAlias:String,
    val monoFontAlias:String,
    val titleSp:Float,
    val bodySp:Float,
    val valueSp:Float,
    val ncSp:Float,
    val lineHeightScale:Float
)

/** Font aliases are semantic. Platform adapters resolve them to system fonts. */
object UiTypographyRegistry {
    val profiles=listOf(
        UiTypographyProfile("MOBILE_COMPACT","UI_SANS","CJK_SANS","CNC_MONO",16f,12f,15f,12f,1.12f),
        UiTypographyProfile("MOBILE_LARGE","UI_SANS","CJK_SANS","CNC_MONO",19f,14f,18f,14f,1.18f),
        UiTypographyProfile("DESKTOP_STANDARD","UI_SANS","CJK_SANS","CNC_MONO",18f,13f,17f,13f,1.15f),
        UiTypographyProfile("DESKTOP_4K","UI_SANS","CJK_SANS","CNC_MONO",24f,17f,22f,17f,1.18f)
    )

    fun require(id:String):UiTypographyProfile = profiles.firstOrNull { it.id==id }
        ?: error("Unknown typography profile: $id")

    fun defaultFor(layoutProfile:String):String = when(layoutProfile) {
        "MOBILE_PORTRAIT" -> "MOBILE_COMPACT"
        "MOBILE_LANDSCAPE" -> "MOBILE_COMPACT"
        "DESKTOP_4K" -> "DESKTOP_4K"
        else -> "DESKTOP_STANDARD"
    }
}
