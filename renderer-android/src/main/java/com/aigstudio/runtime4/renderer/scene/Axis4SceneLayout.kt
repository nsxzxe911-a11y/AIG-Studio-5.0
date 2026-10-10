package com.aigstudio.runtime4.renderer

import kotlin.math.max

object Axis4SceneLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode> {
        val touch=SharedVisualPolicy.touchPx(density);val gap=SharedVisualPolicy.gapPx(density)
        val nav=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.4AX")
        val controlWidth=max(touch,(widthPx-gap*4f)/3f)
        val toolbarTop=gap;val toolbarBottom=toolbarTop+touch
        val viewportTop=toolbarBottom+gap;val viewportBottom=(nav.top-gap).coerceAtLeast(viewportTop)
        return listOf(
            RgbGlassButtonNode("AXIS4.VIEW",UiBounds(gap,toolbarTop,gap+controlWidth,toolbarBottom),30,"VIEW",null,null),
            RgbGlassButtonNode("AXIS4.PLAY",UiBounds(gap*2f+controlWidth,toolbarTop,gap*2f+controlWidth*2f,toolbarBottom),30,"PLAY",null,null),
            RgbGlassButtonNode("AXIS4.DISPLAY",UiBounds(gap*3f+controlWidth*2f,toolbarTop,widthPx-gap,toolbarBottom),30,"DISPLAY",null,null),
            SceneNode("AXIS4.VIEWPORT",UiBounds(gap,viewportTop,widthPx-gap,viewportBottom),1),
        )+nav.buttons
    }
}