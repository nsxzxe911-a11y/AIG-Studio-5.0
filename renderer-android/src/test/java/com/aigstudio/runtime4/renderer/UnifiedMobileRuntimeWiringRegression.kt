package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class UnifiedMobileRuntimeWiringRegression {
    private fun root():File{
        var r=File(System.getProperty("user.dir"))
        repeat(8){if(File(r,"settings.gradle.kts").isFile)return r;r=r.parentFile?:r}
        return r
    }

    @Test fun viewUsesUnifiedShellAndGenericToolSwipe(){
        val source=File(root(),"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt").readText()
        assertTrue(source.contains("UnifiedMobileControlShell.compose("))
        assertTrue(source.contains("PageToolGestureTracker"))
        assertTrue(source.contains("AIG4_${'$'}{page.name}|RIBBON|"))
        assertTrue(source.contains("aigRenderer.setToolPageIndex"))
    }

    @Test fun rendererDrawsUnifiedChromeAfterPageArtwork(){
        val source=File(root(),"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        val overlay=source.indexOf("drawPageSurfaceOverlay(p,sceneRouter.current.toPageId())")
        val chrome=source.indexOf("drawUnifiedMobileChrome(p,sceneRouter.current.toPageId())")
        assertTrue(overlay>=0)
        assertTrue(chrome>overlay)
        assertTrue(source.contains("GlobalPageRibbon.layout"))
        assertTrue(source.contains("UnifiedMobileControlShell.toolRibbonNodes"))
    }
}
