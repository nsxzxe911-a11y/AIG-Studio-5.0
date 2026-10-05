package com.aigstudio.core

enum class AxisViewPreset { CLOSE, MACHINING_FIT, FULL_MACHINE, RESET }

data class AxisCockpitModeSkin(
    val mode:String,
    val visibleRotaryAxes:List<String>,
    val skinKey:String,
    val accentHex:String,
    val hudDock:String="EDGE_TOP",
    val controlsDock:String="EDGE_BOTTOM",
    val shellVariants:List<String> = listOf("STANDARD")
)

object AxisCockpitSkinContract {
    const val CLOSE_ZOOM=1.45
    const val MACHINING_FIT_ZOOM=1.28
    const val FULL_MACHINE_ZOOM=0.78
    const val PORTRAIT_VISUAL_FRACTION=0.64
    const val LANDSCAPE_VISUAL_FRACTION=0.72
    const val DEFAULT_REFRESH_HZ=60
    val DEFAULT_PRESET=AxisViewPreset.CLOSE
    val viewActions=listOf("近景","FIT加工區","全機台","RESET VIEW")

    private val skins=mapOf(
        "3AX" to AxisCockpitModeSkin("3AX",emptyList(),"axis-3ax-rgb-cockpit-v2","#3B82F6"),
        "4AX" to AxisCockpitModeSkin("4AX",listOf("A"),"axis-4ax-rgb-cockpit-v2","#F59E0B"),
        "5AX" to AxisCockpitModeSkin("5AX",listOf("A","B"),"axis-5ax-rgb-cockpit-v2","#EC4899"),
        "6AX" to AxisCockpitModeSkin("6AX",listOf("A","B","C"),"axis-6ax-rgb-cockpit-v2","#9F72FF",shellVariants=listOf("VERTICAL","HORIZONTAL"))
    )

    fun mode(id:String):AxisCockpitModeSkin = skins[id.uppercase()]
        ?: error("Unsupported axis cockpit mode: $id")

    fun zoomFor(preset:AxisViewPreset):Double = when(preset) {
        AxisViewPreset.CLOSE,AxisViewPreset.RESET -> CLOSE_ZOOM
        AxisViewPreset.MACHINING_FIT -> MACHINING_FIT_ZOOM
        AxisViewPreset.FULL_MACHINE -> FULL_MACHINE_ZOOM
    }

    fun cameraAngles(mode:String):Pair<Double,Double> = when(mode.uppercase()) {
        "3AX" -> -30.0 to 32.0
        "4AX" -> -28.0 to 40.0
        "5AX" -> -32.0 to 42.0
        "6AX" -> -30.0 to 45.0
        else -> -30.0 to 35.0
    }

    fun modelTopInsetFraction():Double = 0.08
    fun controlBottomInsetFraction():Double = 0.10
}
