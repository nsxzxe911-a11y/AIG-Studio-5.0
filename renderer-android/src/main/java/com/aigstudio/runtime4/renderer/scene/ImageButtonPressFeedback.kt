package com.aigstudio.runtime4.renderer

data class ImageButtonPressPlan(
    val shadow:UiBounds,
    val depressed:UiBounds,
    val topShade:UiBounds,
    val bottomHighlight:UiBounds,
)

/** Visual-only feedback over full-page artwork. It never crops or resamples the source image. */
object ImageButtonPressFeedback {
    fun plan(bounds:UiBounds):ImageButtonPressPlan {
        val w=bounds.width.coerceAtLeast(1f)
        val h=bounds.height.coerceAtLeast(1f)
        val depressed=UnifiedButtonRenderPolicy.pressedBounds(bounds)
        val shadow=UiBounds(
            bounds.left+w*0.01f,
            bounds.top+h*0.02f,
            bounds.right-w*0.01f,
            bounds.bottom-h*0.005f,
        )
        val shadeH=depressed.height*0.16f
        val glowH=depressed.height*0.08f
        return ImageButtonPressPlan(
            shadow=shadow,
            depressed=depressed,
            topShade=UiBounds(depressed.left,depressed.top,depressed.right,depressed.top+shadeH),
            bottomHighlight=UiBounds(depressed.left,depressed.bottom-glowH,depressed.right,depressed.bottom),
        )
    }
}
