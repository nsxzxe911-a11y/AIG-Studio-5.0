package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SceneId
import kotlin.math.max

object Axis3SceneLayout {
    fun nodes(widthPx: Float, heightPx: Float, density: Float): List<SceneNode> {
        val touch = SharedVisualPolicy.touchPx(density)
        val gap = SharedVisualPolicy.gapPx(density)
        val navTop = heightPx - touch - gap
        val controlWidth = max(touch, (widthPx - gap * 4f) / 3f)
        val toolbarTop = gap
        val toolbarBottom = toolbarTop + touch
        val viewportTop = toolbarBottom + gap
        val viewportBottom = navTop - gap
        val navWidth = max(touch, (widthPx - gap * 6f) / 5f)
        fun navBounds(index: Int): UiBounds {
            val left = gap + index * (navWidth + gap)
            return UiBounds(left, navTop, left + navWidth, navTop + touch)
        }
        return listOf(
            RgbGlassButtonNode("AXIS3.VIEW", UiBounds(gap, toolbarTop, gap + controlWidth, toolbarBottom), 30, "VIEW", null, null),
            RgbGlassButtonNode("AXIS3.PLAY", UiBounds(gap * 2f + controlWidth, toolbarTop, gap * 2f + controlWidth * 2f, toolbarBottom), 30, "PLAY", null, null),
            RgbGlassButtonNode("AXIS3.DISPLAY", UiBounds(gap * 3f + controlWidth * 2f, toolbarTop, widthPx - gap, toolbarBottom), 30, "DISPLAY", null, null),
            SceneNode("AXIS3.VIEWPORT", UiBounds(gap, viewportTop, widthPx - gap, viewportBottom), 1),
            RgbGlassButtonNode("NAV.HOME", navBounds(0), 50, "HOME", "aig-rgb/icons/workspace.png", null),
            RgbGlassButtonNode("NAV.CAD", navBounds(1), 50, "CAD", "aig-rgb/icons/cad.png", null),
            RgbGlassButtonNode("NAV.CAM", navBounds(2), 50, "CAM", "aig-rgb/icons/cam.png", null),
            RgbGlassButtonNode("NAV.3AX", navBounds(3), 50, "3AX", null, null, VisualState.SELECTED),
            RgbGlassButtonNode("NAV.NC", navBounds(4), 50, "NC", null, null),
        )
    }
}