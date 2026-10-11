package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class PageSurfaceRendererWiringRegression {
    @Test fun primaryPageSurfaceUsesAdaptiveFullViewportThenLiveOverlayThenPressedFeedback(){
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){ if(File(root,"settings.gradle.kts").isFile)return@repeat; root=root.parentFile ?: error("repo root") }
        val source=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        val functionStart=source.indexOf("private fun drawPageSurfaceOverlay")
        assertTrue(functionStart>=0)
        val functionEnd=source.indexOf("private fun imageInteractionNodes",functionStart)
        val body=source.substring(functionStart,functionEnd)
        assertTrue(body.contains("AdaptivePageTransform.forViewport"))
        assertTrue(body.contains("FIT=ADAPTIVE_FULL"))
        assertFalse(body.contains("FIT=CONTAIN"))
        val skin=body.indexOf("textureId")
        val live=body.indexOf("drawImageBackedRuntimeOverlay")
        val pressed=body.indexOf("drawPressedImageButtonFeedback")
        assertTrue(skin>=0 && live>skin && pressed>live)
        assertTrue(body.contains("MISSING_PAGE_ART"))
    }
}
