package com.aigstudio.runtime4.renderer

import kotlin.math.max
import kotlin.math.min

class CamViewportNode(val viewport:UiBounds){
    private val scale:Float=max(1f,min(viewport.width,viewport.height)/200f)
    private val originX:Float=(viewport.left+viewport.right)*0.5f
    private val originY:Float=(viewport.top+viewport.bottom)*0.5f
    fun worldToScreen(x:Double,y:Double):Pair<Float,Float> = originX+x.toFloat()*scale to originY-y.toFloat()*scale
    fun mmScale():Float=scale
}
