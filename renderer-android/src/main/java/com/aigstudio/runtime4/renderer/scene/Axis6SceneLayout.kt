package com.aigstudio.runtime4.renderer

import kotlin.math.max
object Axis6SceneLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode>{
        val touch=SharedVisualPolicy.touchPx(density);val gap=SharedVisualPolicy.gapPx(density);val nav=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.6AX")
        val count=4;val cw=max(touch,(widthPx-gap*(count+1))/count);val top=gap;val bottom=top+touch;val vt=bottom+gap;val vb=(nav.top-gap).coerceAtLeast(vt)
        val labels=listOf("VIEW","AXIS","PLAY","DISPLAY");val controls=labels.mapIndexed{idx,label->val left=gap+idx*(cw+gap);RgbGlassButtonNode("AXIS6.",UiBounds(left,top,(left+cw).coerceAtMost(widthPx-gap),bottom),30,label,null,null)}
        return controls+SceneNode("AXIS6.VIEWPORT",UiBounds(gap,vt,widthPx-gap,vb),1)+nav.buttons
    }
}