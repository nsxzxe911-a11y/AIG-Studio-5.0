package com.aigstudio.core

import kotlin.math.abs

fun main() {
    check(AxisCockpitSkinContract.DEFAULT_PRESET == AxisViewPreset.CLOSE)
    check(abs(AxisCockpitSkinContract.CLOSE_ZOOM * 0.48 - 0.696) < 1e-9)
    check(AxisCockpitSkinContract.PORTRAIT_VISUAL_FRACTION >= 0.60)
    check(AxisCockpitSkinContract.PORTRAIT_VISUAL_FRACTION <= 0.65)
    check(AxisCockpitSkinContract.viewActions == listOf("近景","FIT加工區","全機台","RESET VIEW"))

    val a3=AxisCockpitSkinContract.mode("3AX")
    val a4=AxisCockpitSkinContract.mode("4AX")
    val a5=AxisCockpitSkinContract.mode("5AX")
    val a6=AxisCockpitSkinContract.mode("6AX")
    check(a3.visibleRotaryAxes.isEmpty())
    check(a4.visibleRotaryAxes == listOf("A"))
    check(a5.visibleRotaryAxes == listOf("A","B"))
    check(a6.visibleRotaryAxes == listOf("A","B","C"))
    check(listOf(a3.skinKey,a4.skinKey,a5.skinKey,a6.skinKey).distinct().size == 4)
    check(a6.skinKey != a5.skinKey)
    check(a6.shellVariants == listOf("VERTICAL","HORIZONTAL"))
    check(a3.controlsDock != "OVER_MODEL")
    check(a6.hudDock != "CENTER")
    check(AxisCockpitSkinContract.zoomFor(AxisViewPreset.CLOSE) > AxisCockpitSkinContract.zoomFor(AxisViewPreset.MACHINING_FIT))
    check(AxisCockpitSkinContract.zoomFor(AxisViewPreset.MACHINING_FIT) > AxisCockpitSkinContract.zoomFor(AxisViewPreset.FULL_MACHINE))

    println("STUDIO_AXIS_COCKPIT_SKIN_PASS|3AX|4AX|5AX|6AX|CLOSE_VIEW|NO_OVERLAP|UNIQUE_SKIN")
}
