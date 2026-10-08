package com.aigstudio.core

/**
 * Platform-neutral render demand state.  Static or invisible surfaces must not
 * continuously redraw; interaction, animation or dirty scene data requests a frame.
 */
class RenderDemandController {
    private var visible=true
    private var foreground=true
    private var dirty=true
    private var animationActive=false
    private var interactionActive=false

    fun setVisible(value:Boolean) { visible=value }
    fun setForeground(value:Boolean) { foreground=value }
    fun setAnimationActive(value:Boolean) { animationActive=value }
    fun setInteractionActive(value:Boolean) { interactionActive=value }
    fun markDirty() { dirty=true }

    fun shouldRender():Boolean = foreground && visible && (dirty || animationActive || interactionActive)

    /** Called only after a frame has actually been presented. */
    fun onFramePresented() {
        dirty=false
    }

    fun targetVisualFps(userTarget:Int):Int {
        val target=userTarget.coerceIn(30,120)
        if(!foreground || !visible) return 0
        if(interactionActive || animationActive) return target
        return if(dirty) minOf(target,60) else 0
    }

    fun snapshot():RenderDemandSnapshot=RenderDemandSnapshot(
        visible=visible,
        foreground=foreground,
        dirty=dirty,
        animationActive=animationActive,
        interactionActive=interactionActive,
        renderNeeded=shouldRender()
    )
}

data class RenderDemandSnapshot(
    val visible:Boolean,
    val foreground:Boolean,
    val dirty:Boolean,
    val animationActive:Boolean,
    val interactionActive:Boolean,
    val renderNeeded:Boolean
)
