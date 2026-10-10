package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test

class LabelTextureLayoutRegression {
    @Test fun containPreservesAspectForWideNcLine() {
        val box=UiBounds(10f,20f,910f,86f)
        val fitted=LabelTextureLayout.contain(box,8f,paddingPx=3f,alignStart=true)
        assertTrue(fitted.left>=13f)
        assertTrue(fitted.right<=907f)
        assertTrue(fitted.top>=23f && fitted.bottom<=83f)
        val aspect=fitted.width/fitted.height
        assertEquals(8f,aspect,0.02f)
        assertEquals(13f,fitted.left,0.01f)
    }

    @Test fun containCentersButtonLabelWithoutStretching() {
        val box=UiBounds(0f,0f,180f,144f)
        val fitted=LabelTextureLayout.contain(box,2.5f,paddingPx=12f,alignStart=false)
        assertTrue(fitted.width<=156f && fitted.height<=120f)
        assertEquals(2.5f,fitted.width/fitted.height,0.02f)
        assertEquals(box.left+box.width/2f,fitted.left+fitted.width/2f,0.02f)
    }
}