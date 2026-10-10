package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.AxisMode

object Axis4SceneLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode>{
        val deck=AxisControlDeck.layout(AxisMode.AXIS4,widthPx,heightPx,density)
        val nav=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.4AX")
        val gap=SharedVisualPolicy.gapPx(density);val viewportBottom=(nav.top-gap).coerceAtLeast(deck.viewportTop)
        return deck.nodes+SceneNode("AXIS4.VIEWPORT",UiBounds(gap,deck.viewportTop,widthPx-gap,viewportBottom),1)+nav.buttons
    }
}