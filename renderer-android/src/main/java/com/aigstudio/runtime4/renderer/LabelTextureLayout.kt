package com.aigstudio.runtime4.renderer

import kotlin.math.max

object LabelTextureLayout {
    fun contain(bounds:UiBounds,sourceAspect:Float,paddingPx:Float=0f,alignStart:Boolean=false):UiBounds {
        require(sourceAspect.isFinite() && sourceAspect>0f)
        val pad=max(0f,paddingPx)
        val left=bounds.left+pad
        val top=bounds.top+pad
        val right=max(left,bounds.right-pad)
        val bottom=max(top,bounds.bottom-pad)
        val innerW=(right-left).coerceAtLeast(1f)
        val innerH=(bottom-top).coerceAtLeast(1f)
        val innerAspect=innerW/innerH
        val outW:Float
        val outH:Float
        if(innerAspect>sourceAspect){outH=innerH;outW=outH*sourceAspect}else{outW=innerW;outH=outW/sourceAspect}
        val outLeft=if(alignStart)left else left+(innerW-outW)/2f
        val outTop=top+(innerH-outH)/2f
        return UiBounds(outLeft,outTop,outLeft+outW,outTop+outH)
    }
}