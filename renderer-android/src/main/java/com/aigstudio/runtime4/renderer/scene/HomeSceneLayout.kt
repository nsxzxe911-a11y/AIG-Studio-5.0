package com.aigstudio.runtime4.renderer

object HomeSceneLayout {
    fun nodes(widthPx:Float,heightPx:Float,density:Float):List<SceneNode> =
        AxisNavigationLayout.layout(widthPx,heightPx,density,"NAV.HOME").buttons
}