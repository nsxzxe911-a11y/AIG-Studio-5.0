package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.AxisMode

object Axis6SceneLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode>{
        val deck=AxisControlDeck.layout(AxisMode.AXIS6,widthPx,heightPx,density)
        val nav=AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.6AX")
        val gap=SharedVisualPolicy.gapPx(density);val viewportBottom=(nav.top-gap).coerceAtLeast(deck.viewportTop)
        return deck.nodes+SceneNode("AXIS6.VIEWPORT",UiBounds(gap,deck.viewportTop,widthPx-gap,viewportBottom),1)+nav.buttons
    }
}