package com.aigstudio.core

fun main() {
    val c=RenderDemandController()
    check(c.shouldRender())
    check(c.targetVisualFps(120)==60)
    c.onFramePresented()
    check(!c.shouldRender())
    check(c.targetVisualFps(120)==0)
    c.setInteractionActive(true)
    check(c.shouldRender())
    check(c.targetVisualFps(120)==120)
    c.setInteractionActive(false)
    c.setAnimationActive(true)
    check(c.targetVisualFps(90)==90)
    c.setVisible(false)
    check(!c.shouldRender())
    check(c.targetVisualFps(120)==0)
    c.setVisible(true)
    c.setForeground(false)
    check(!c.shouldRender())
    check(c.targetVisualFps(60)==0)
    println("RENDER_DEMAND_CONTROLLER_PASS|STATIC_ZERO_FPS|HIDDEN_ZERO_FPS|ACTIVE_USER_TARGET")
}
