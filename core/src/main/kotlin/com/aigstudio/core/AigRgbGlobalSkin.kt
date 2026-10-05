package com.aigstudio.core

import java.util.Locale

enum class AigRgbSurfaceId(val id:String) {
    HOME("HOME"), CAD("CAD"), CAM("CAM"), SIM("SIM"),
    AX3("3AX"), AX4("4AX"), AX5("5AX"), AX6("6AX"),
    NC("NC"), AI("AI"), SETTINGS("SETTINGS"), VIEW("VIEW"), PHOTO("PHOTO"), CORNER("CORNER"),
    EDIT("EDIT"), FILE("FILE"), TOOL("TOOL"), WORK("WORK"), ALARM("ALARM"), MONITOR("MONITOR"),
    SYNC("SYNC"), LINK("LINK")
}

enum class AigRgbWidgetRole { NAV, TOOL, PRIMARY, STATUS, WARNING, DANGER, INPUT, GROUP }
enum class AigRgbVisualState { NORMAL, PRESSED, SELECTED, DISABLED, WARNING, ALARM }

data class AigRgbSurfaceSpec(
    val surfaceId:AigRgbSurfaceId,
    val titleZh:String,
    val accentRole:String,
    val glassDepth:String,
    val approvedAssetId:String?,
    val proceduralFallback:String,
    val dangerStatusPolicy:String="STATUS_ONLY_NO_VERSION_ACTION"
)

object AigRgbGlobalSkinV1 {
    const val ID="aig_rgb_global_v1"
    const val VERSION="1.0.0"
    const val BACKGROUND_RGB=0x020407
    const val PANEL_RGB=0x07111B
    const val TEXT_RGB=0xF4FBFF
    const val ACCENT_RGB=0x27E9FF
    const val SELECTED_RGB=0x27E9FF
    const val CUTTING_RGB=0x33F39B
    const val RAPID_RGB=0xFF4DA6
    const val WARNING_RGB=0xFFB326
    const val ALARM_RGB=0xFF465F
    const val DISABLED_RGB=0x54606A
    const val OPTIONAL_ART_POLICY="WARNING_PROCEDURAL_FALLBACK"
    const val APPROVED_ASSET_PRIORITY="MORNING_APPROVED_RGB_FIRST"
    const val MOBILE_DESKTOP_ASSET_SPLIT=true
    const val ENGINEERING_SHELL_FALLBACK=false
    const val RED_STATUS_ONLY=true

    private val ordered=listOf(
        AigRgbSurfaceId.HOME,AigRgbSurfaceId.CAD,AigRgbSurfaceId.CAM,AigRgbSurfaceId.SIM,
        AigRgbSurfaceId.AX3,AigRgbSurfaceId.AX4,AigRgbSurfaceId.AX5,AigRgbSurfaceId.AX6,
        AigRgbSurfaceId.NC,AigRgbSurfaceId.AI,AigRgbSurfaceId.SETTINGS,AigRgbSurfaceId.VIEW,
        AigRgbSurfaceId.PHOTO,AigRgbSurfaceId.CORNER,AigRgbSurfaceId.EDIT,AigRgbSurfaceId.FILE,
        AigRgbSurfaceId.TOOL,AigRgbSurfaceId.WORK,AigRgbSurfaceId.ALARM,AigRgbSurfaceId.MONITOR,
        AigRgbSurfaceId.SYNC,AigRgbSurfaceId.LINK
    )

    private fun spec(
        id:AigRgbSurfaceId,title:String,accent:String="ACCENT",depth:String="BALANCED",asset:String?=id.id.lowercase(Locale.US)
    )=AigRgbSurfaceSpec(id,title,accent,depth,asset,"PROCEDURAL_RGB_GLASS")

    private val specs=linkedMapOf(
        AigRgbSurfaceId.HOME to spec(AigRgbSurfaceId.HOME,"首頁","ACCENT","DEEP","home"),
        AigRgbSurfaceId.CAD to spec(AigRgbSurfaceId.CAD,"CAD","SELECTED","LIGHT","cad"),
        AigRgbSurfaceId.CAM to spec(AigRgbSurfaceId.CAM,"CAM","CUTTING","BALANCED","cam"),
        AigRgbSurfaceId.SIM to spec(AigRgbSurfaceId.SIM,"SIM","CUTTING","BALANCED","sim"),
        AigRgbSurfaceId.AX3 to spec(AigRgbSurfaceId.AX3,"3AX","RAPID","DEEP","3ax"),
        AigRgbSurfaceId.AX4 to spec(AigRgbSurfaceId.AX4,"4AX","RAPID","DEEP","4ax"),
        AigRgbSurfaceId.AX5 to spec(AigRgbSurfaceId.AX5,"5AX","RAPID","DEEP","5ax"),
        AigRgbSurfaceId.AX6 to spec(AigRgbSurfaceId.AX6,"6AX","RAPID","DEEP","6ax"),
        AigRgbSurfaceId.NC to spec(AigRgbSurfaceId.NC,"NC","WARNING","PRECISION","nc"),
        AigRgbSurfaceId.AI to spec(AigRgbSurfaceId.AI,"AI","ACCENT","BALANCED","ai"),
        AigRgbSurfaceId.SETTINGS to spec(AigRgbSurfaceId.SETTINGS,"設定","ACCENT","LIGHT","settings"),
        AigRgbSurfaceId.VIEW to spec(AigRgbSurfaceId.VIEW,"檢視","ACCENT","LIGHT","view"),
        AigRgbSurfaceId.PHOTO to spec(AigRgbSurfaceId.PHOTO,"照片","ACCENT","LIGHT","photo"),
        AigRgbSurfaceId.CORNER to spec(AigRgbSurfaceId.CORNER,"角落","SELECTED","LIGHT","corner"),
        AigRgbSurfaceId.EDIT to spec(AigRgbSurfaceId.EDIT,"編輯","SELECTED","LIGHT","edit"),
        AigRgbSurfaceId.FILE to spec(AigRgbSurfaceId.FILE,"檔案","ACCENT","LIGHT","file"),
        AigRgbSurfaceId.TOOL to spec(AigRgbSurfaceId.TOOL,"刀具","CUTTING","BALANCED","tool"),
        AigRgbSurfaceId.WORK to spec(AigRgbSurfaceId.WORK,"工件","CUTTING","BALANCED","work"),
        AigRgbSurfaceId.ALARM to spec(AigRgbSurfaceId.ALARM,"警報","ALARM","PRECISION","alarm"),
        AigRgbSurfaceId.MONITOR to spec(AigRgbSurfaceId.MONITOR,"監控","ACCENT","PRECISION","monitor"),
        AigRgbSurfaceId.SYNC to spec(AigRgbSurfaceId.SYNC,"同步","WARNING","PRECISION","sync"),
        AigRgbSurfaceId.LINK to spec(AigRgbSurfaceId.LINK,"連結","WARNING","PRECISION","link")
    )

    private val aliases=mapOf(
        "3D" to AigRgbSurfaceId.SIM,
        "3D SIM" to AigRgbSurfaceId.SIM,
        "5X" to AigRgbSurfaceId.AX5,
        "6X" to AigRgbSurfaceId.AX6,
        "NC_EDIT" to AigRgbSurfaceId.NC,
        "NC EDIT" to AigRgbSurfaceId.NC,
        "AXIS" to AigRgbSurfaceId.AX5
    )

    fun formalSurfaceIds():List<String> = ordered.map { it.id }

    fun normalizeSurface(raw:String):AigRgbSurfaceId {
        val key=raw.trim().uppercase(Locale.US).replace('-', '_').replace(Regex("\\s+")," ")
        aliases[key]?.let { return it }
        return ordered.firstOrNull { it.id==key } ?: AigRgbSurfaceId.HOME
    }

    fun surface(raw:String):AigRgbSurfaceSpec = specs.getValue(normalizeSurface(raw))

    fun stateColor(state:AigRgbVisualState):Int = when(state) {
        AigRgbVisualState.NORMAL -> ACCENT_RGB
        AigRgbVisualState.PRESSED -> SELECTED_RGB
        AigRgbVisualState.SELECTED -> SELECTED_RGB
        AigRgbVisualState.DISABLED -> DISABLED_RGB
        AigRgbVisualState.WARNING -> WARNING_RGB
        AigRgbVisualState.ALARM -> ALARM_RGB
    }

    fun versionControlActionAllowed(state:AigRgbVisualState):Boolean = false
}
