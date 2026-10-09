package com.aigstudio.runtime4.renderer

data class UiBounds(val left: Float, val top: Float, val right: Float, val bottom: Float) {
    val width: Float get() = right - left
    val height: Float get() = bottom - top
    fun contains(x: Float, y: Float): Boolean = x >= left && x <= right && y >= top && y <= bottom
}

enum class VisualState { NORMAL, PRESSED, SELECTED, DISABLED, ALARM }

open class SceneNode(
    val id: String,
    val bounds: UiBounds,
    val z: Int,
    val visualState: VisualState = VisualState.NORMAL,
    val enabled: Boolean = true,
    val visible: Boolean = true,
)

fun hitTestTopmost(nodes: List<SceneNode>, x: Float, y: Float): SceneNode? =
    nodes.asSequence()
        .filter { it.visible && it.enabled && it.bounds.contains(x, y) }
        .sortedWith(compareByDescending<SceneNode> { it.z }.thenBy { it.id })
        .firstOrNull()
