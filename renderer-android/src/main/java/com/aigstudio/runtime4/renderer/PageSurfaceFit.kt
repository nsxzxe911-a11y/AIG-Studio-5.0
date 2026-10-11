package com.aigstudio.runtime4.renderer

import kotlin.math.min

data class PageSurfaceRect(val left:Float,val top:Float,val right:Float,val bottom:Float)

object PageSurfaceFit {
    fun contain(viewWidth:Float,viewHeight:Float,imageWidth:Float=720f,imageHeight:Float=1280f):PageSurfaceRect {
        val scale=min(viewWidth/imageWidth,viewHeight/imageHeight)
        val width=imageWidth*scale
        val height=imageHeight*scale
        val left=(viewWidth-width)/2f
        val top=(viewHeight-height)/2f
        return PageSurfaceRect(left,top,left+width,top+height)
    }
}
