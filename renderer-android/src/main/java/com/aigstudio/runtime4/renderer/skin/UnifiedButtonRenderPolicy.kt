package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.UnifiedButtonTokens

object UnifiedButtonRenderPolicy {
    val minTouchDp:Float get()=UnifiedButtonTokens.MIN_TOUCH_DP
    val preferredTouchDp:Float get()=UnifiedButtonTokens.PREFERRED_TOUCH_DP
    val pressedScale:Float get()=UnifiedButtonTokens.PRESSED_SCALE

    fun pressedBounds(bounds:UiBounds):UiBounds{
        val w=bounds.width.coerceAtLeast(1f)
        val h=bounds.height.coerceAtLeast(1f)
        val dx=(w-w*pressedScale)*0.5f
        val dy=(h-h*pressedScale)*0.5f
        val shiftY=h*0.01f
        return UiBounds(
            bounds.left+dx,
            bounds.top+dy+shiftY,
            bounds.right-dx,
            bounds.bottom-dy+shiftY,
        )
    }

    fun stateFor(node:RgbGlassButtonNode,pressed:Boolean,selected:Boolean):VisualState=when{
        !node.enabled || node.visualState==VisualState.DISABLED->VisualState.DISABLED
        node.visualState==VisualState.ALARM->VisualState.ALARM
        pressed->VisualState.PRESSED
        selected || node.visualState==VisualState.SELECTED->VisualState.SELECTED
        else->VisualState.NORMAL
    }

    fun pressedOverlayFill():FloatArray = AigWorkstationSkinTokens.controlFill(VisualState.PRESSED).copyOf().also{it[3]=0.22f}
    fun pressedAccent(alpha:Float=0.42f):FloatArray = AigWorkstationSkinTokens.accent(VisualState.PRESSED).copyOf().also{it[3]=alpha}
}
