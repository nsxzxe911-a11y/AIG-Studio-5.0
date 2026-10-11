package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class UnifiedPrimaryPageRuntimeWiringRegression {
    private fun root():File{
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){if(File(root,"settings.gradle.kts").isFile)return root;root=root.parentFile?:error("repo root")}
        error("repo root")
    }

    @Test fun mountedPrimarySkinUsesOneNavigationContractForHitTestAndPressedFeedback(){
        val root=root()
        val view=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt").readText()
        val renderer=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        assertTrue(renderer.contains("if(PageSurfaceTexturePlan.path(page)!=null)return"))
        assertTrue(view.contains("PrimaryPageNavigationLayout.nodes(width.toFloat(),height.toFloat(),page)"))
        assertFalse(view.contains("HomeImageNavigationLayout.nodes(width.toFloat(),height.toFloat())"))
        assertTrue(renderer.contains("PrimaryPageNavigationLayout.nodes(widthPx,heightPx,page)"))
        assertTrue(renderer.contains("PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI"))
    }
}
