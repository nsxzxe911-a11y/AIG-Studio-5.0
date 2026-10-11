package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test

class AdaptivePageTransformRegression {
    @Test fun primaryPreviewTransformFillsEveryPortraitViewport(){
        val cases=listOf(
            floatArrayOf(856f,1836f,1440f,3088f),
            floatArrayOf(856f,1836f,1080f,2316f),
            floatArrayOf(856f,1836f,720f,1544f),
            floatArrayOf(856f,1836f,2160f,3840f),
            floatArrayOf(941f,1672f,2160f,3840f),
        )
        cases.forEach{c->
            val t=AdaptivePageTransform.forViewport(c[0],c[1],c[2],c[3])
            assertEquals(0f,t.bounds.left,0.001f)
            assertEquals(0f,t.bounds.top,0.001f)
            assertEquals(c[2],t.bounds.right,0.001f)
            assertEquals(c[3],t.bounds.bottom,0.001f)
            val center=t.sourceToScreen(c[0]/2f,c[1]/2f)
            assertEquals(c[2]/2f,center.x,0.001f)
            assertEquals(c[3]/2f,center.y,0.001f)
            val back=t.screenToSource(center.x,center.y)
            assertEquals(c[0]/2f,back!!.x,0.001f)
            assertEquals(c[1]/2f,back.y,0.001f)
        }
    }

    @Test fun mapperUsesTheSameFullViewportTransformForDynamicRects(){
        val s=ImageBackedPageSpec(1000f,2000f,ImageBackedPageSpec.sha256("ok".toByteArray()),dynamicSlots=listOf(ImageDynamicSlot("D",ImagePixelRect(200f,500f,800f,1500f))))
        val bounds=ImagePixelMapper.imageBounds(s,1200f,1200f)
        assertEquals(1200f,bounds.width,0.001f)
        assertEquals(1200f,bounds.height,0.001f)
        assertEquals(0f,bounds.left,0.001f)
        assertEquals(0f,bounds.top,0.001f)
        val mapped=ImagePixelMapper.pixelRectToScreen(s,1200f,1200f,s.dynamicSlots.single().rect)
        assertEquals(240f,mapped.left,0.001f)
        assertEquals(300f,mapped.top,0.001f)
        assertEquals(960f,mapped.right,0.001f)
        assertEquals(900f,mapped.bottom,0.001f)
    }
}
