package com.aigstudio.runtime4.renderer

data class AdaptivePageTransform(
    val referenceWidth:Float,
    val referenceHeight:Float,
    val screenWidth:Float,
    val screenHeight:Float,
){
    init {
        require(referenceWidth>0f && referenceHeight>0f)
        require(screenWidth>0f && screenHeight>0f)
    }

    val scaleX:Float=screenWidth/referenceWidth
    val scaleY:Float=screenHeight/referenceHeight
    val bounds:UiBounds=UiBounds(0f,0f,screenWidth,screenHeight)

    fun sourceToScreen(x:Float,y:Float)=ImagePixelPoint(x*scaleX,y*scaleY)

    fun screenToSource(x:Float,y:Float):ImagePixelPoint?{
        if(!bounds.contains(x,y)) return null
        return ImagePixelPoint(x/scaleX,y/scaleY)
    }

    fun sourceRectToScreen(rect:ImagePixelRect)=UiBounds(
        rect.left*scaleX,
        rect.top*scaleY,
        rect.right*scaleX,
        rect.bottom*scaleY,
    )

    companion object {
        fun forViewport(referenceWidth:Float,referenceHeight:Float,screenWidth:Float,screenHeight:Float)=
            AdaptivePageTransform(referenceWidth,referenceHeight,screenWidth,screenHeight)
    }
}
