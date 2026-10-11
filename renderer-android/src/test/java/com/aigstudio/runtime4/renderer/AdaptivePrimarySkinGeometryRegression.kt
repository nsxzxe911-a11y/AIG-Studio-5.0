package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.assertEquals
import org.junit.Test

class AdaptivePrimarySkinGeometryRegression {
    private val targets=listOf(1440f to 3088f,1080f to 2316f,720f to 1544f,2160f to 3840f)

    @Test fun skinNavigationAndImageHitMapsShareOneFullScreenTransform(){
        val refRect=ImagePixelRect(22f,142f,106f,228f)
        targets.forEach { (w,h) ->
            val full=UiBounds(0f,0f,w,h)
            val primary=PrimaryPageNavigationLayout.nodes(w,h,PageId.HOME)
            assertEquals(10,primary.size)
            assertEquals(full,CadImagePixelMapper.imageBounds(w,h))
            assertEquals(full,SimImagePixelMapper.imageBounds(w,h))
            assertEquals(full,ImagePixelMapper.imageBounds(CamImagePixelManifest.spec,w,h))
            val expected=AdaptivePageTransform.forViewport(941f,1672f,w,h).sourceRectToScreen(refRect)
            assertEquals(expected,primary.first().bounds)
        }
    }
}
