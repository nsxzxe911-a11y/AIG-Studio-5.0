package com.aigstudio.runtime4.renderer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ImageBackedPageContractRegression {
    private fun spec()=ImageBackedPageSpec(
        referenceWidth=1000f,
        referenceHeight=2000f,
        expectedSha256=ImageBackedPageSpec.sha256("approved".toByteArray()),
        controls=listOf(ImageControlSlot("CAM.PLAY",ImagePixelRect(100f,200f,300f,400f))),
        dynamicSlots=listOf(ImageDynamicSlot("CAM.VIEWPORT",ImagePixelRect(200f,500f,800f,1500f)))
    )

    @Test fun primaryImageMapperFillsViewportWithoutLetterbox(){
        val bounds=ImagePixelMapper.imageBounds(spec(),1200f,1200f)
        assertEquals(1200f,bounds.width,0.001f)
        assertEquals(1200f,bounds.height,0.001f)
        assertEquals(0f,bounds.left,0.001f)
        assertEquals(0f,bounds.top,0.001f)
    }

    @Test fun shaMismatchFailsClosed(){
        val s=spec()
        assertTrue(s.isCompatibleBytes("approved".toByteArray()))
        assertFalse(s.isCompatibleBytes("changed".toByteArray()))
    }

    @Test fun onlyRegisteredControlRegionCanActivate(){
        val s=spec()
        assertEquals("CAM.PLAY",s.controlAtPixel(150f,250f)?.controlId)
        assertNull(s.controlAtPixel(500f,250f))
    }

    @Test fun dynamicSlotMapsFromOriginalPixelsToScreen(){
        val mapped=ImagePixelMapper.pixelRectToScreen(spec(),1200f,1200f,spec().dynamicSlots.single().rect)
        assertEquals(240f,mapped.left,0.001f)
        assertEquals(300f,mapped.top,0.001f)
        assertEquals(960f,mapped.right,0.001f)
        assertEquals(900f,mapped.bottom,0.001f)
    }
}
