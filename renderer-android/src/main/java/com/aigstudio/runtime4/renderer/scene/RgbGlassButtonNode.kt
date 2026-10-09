package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.CadCommand

class RgbGlassButtonNode(
    id: String,
    bounds: UiBounds,
    z: Int,
    val label: String,
    val textureRef: String?,
    val commandBinding: CadCommand?,
    visualState: VisualState = VisualState.NORMAL,
    enabled: Boolean = true,
    visible: Boolean = true,
) : SceneNode(id, bounds, z, visualState, enabled, visible) {
    val usesFallback: Boolean get() = textureRef.isNullOrBlank()
}
