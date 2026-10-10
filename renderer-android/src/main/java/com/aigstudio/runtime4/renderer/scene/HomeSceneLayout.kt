package com.aigstudio.runtime4.renderer

object HomeSceneLayout {
    fun nodes(widthPx: Float, heightPx: Float, density: Float): List<SceneNode> {
        val touch = SharedVisualPolicy.touchPx(density)
        val gap = SharedVisualPolicy.gapPx(density)
        val y = heightPx - touch - gap
        return listOf(
            RgbGlassButtonNode("NAV.HOME", UiBounds(gap, y, gap + touch, y + touch), 20, "HOME", "aig-rgb/icons/workspace.png", null, VisualState.SELECTED),
            RgbGlassButtonNode("NAV.CAD", UiBounds(gap * 2 + touch, y, gap * 2 + touch * 2, y + touch), 20, "CAD", "aig-rgb/icons/cad.png", null),
            RgbGlassButtonNode("NAV.CAM", UiBounds(gap * 3 + touch * 2, y, gap * 3 + touch * 3, y + touch), 20, "CAM", "aig-rgb/icons/cam.png", null),
            RgbGlassButtonNode("NAV.3AX", UiBounds(gap * 4 + touch * 3, y, gap * 4 + touch * 4, y + touch), 20, "3AX", null, null),
            RgbGlassButtonNode("NAV.NC", UiBounds(gap * 5 + touch * 4, y, gap * 5 + touch * 5, y + touch), 20, "NC", null, null),
        )
    }
}