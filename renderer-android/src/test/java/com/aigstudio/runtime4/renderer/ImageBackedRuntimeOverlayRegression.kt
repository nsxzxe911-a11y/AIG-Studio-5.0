package com.aigstudio.runtime4.renderer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ImageBackedRuntimeOverlayRegression {
    private fun spec()=ImageBackedPageSpec(
        referenceWidth=100f,
        referenceHeight=200f,
        expectedSha256="x",
        dynamicSlots=listOf(
            ImageDynamicSlot("STATUS",ImagePixelRect(10f,150f,90f,190f)),
            ImageDynamicSlot("VIEWPORT",ImagePixelRect(10f,20f,90f,140f)),
        )
    )

    @Test fun missingRuntimeValueStillCoversBakedArtButNeverInventsNumber(){
        val plan=ImageBackedRuntimeOverlayPlan.build(spec(),200f,400f,emptyMap())
        val status=plan.cells.single{it.slotId=="STATUS"}
        assertTrue(status.coverBakedArt)
        assertFalse(status.available)
        assertNull(status.text)
    }

    @Test fun liveRuntimeValueIsPassedThroughExactly(){
        val plan=ImageBackedRuntimeOverlayPlan.build(spec(),200f,400f,mapOf("STATUS" to "X 12.345"))
        val status=plan.cells.single{it.slotId=="STATUS"}
        assertTrue(status.available)
        assertEquals("X 12.345",status.text)
        assertEquals(20f,status.bounds.left,0.001f)
        assertEquals(300f,status.bounds.top,0.001f)
        assertEquals(180f,status.bounds.right,0.001f)
        assertEquals(380f,status.bounds.bottom,0.001f)
    }

    @Test fun rendererOrdersStaticSkinThenDynamicRuntimeThenPressFeedback(){
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){ if(File(root,"settings.gradle.kts").isFile)return@repeat; root=root.parentFile ?: error("repo root") }
        val source=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        val skin=source.indexOf("p.draw(GlesGeometryBuffer.quad(imageBounds)")
        val dynamic=source.indexOf("drawImageBackedRuntimeOverlay(p,page)")
        val pressed=source.indexOf("drawPressedImageButtonFeedback(p,page)")
        assertTrue(skin>=0)
        assertTrue(dynamic>skin)
        assertTrue(pressed>dynamic)
    }
}
