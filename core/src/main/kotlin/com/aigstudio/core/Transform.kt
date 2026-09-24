package com.aigstudio.core

/** Single source of truth for screen/world mapping. World is +X right, +Y up. */
data class WorldTransform(
    var originScreenX: Double,
    var originScreenY: Double,
    var pixelsPerUnit: Double = 5.0
) {
    init { require(pixelsPerUnit > EPS) }

    fun worldToScreen(p: Vec2): Vec2 = Vec2(
        originScreenX + p.x * pixelsPerUnit,
        originScreenY - p.y * pixelsPerUnit
    )

    fun screenToWorld(p: Vec2): Vec2 = Vec2(
        (p.x - originScreenX) / pixelsPerUnit,
        (originScreenY - p.y) / pixelsPerUnit
    )

    fun pan(dxPx: Double, dyPx: Double) {
        originScreenX += dxPx
        originScreenY += dyPx
    }

    fun zoomAt(screenFocus: Vec2, scaleFactor: Double) {
        require(scaleFactor > 0)
        val before = screenToWorld(screenFocus)
        pixelsPerUnit = (pixelsPerUnit * scaleFactor).coerceIn(0.2, 200.0)
        val afterScreen = worldToScreen(before)
        originScreenX += screenFocus.x - afterScreen.x
        originScreenY += screenFocus.y - afterScreen.y
    }
}
