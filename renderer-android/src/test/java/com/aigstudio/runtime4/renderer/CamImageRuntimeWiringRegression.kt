package com.aigstudio.runtime4.renderer

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class CamImageRuntimeWiringRegression {
    @Test fun camUsesShaBoundUnifiedSkinControlsAndLiveOverlay(){
        var root=File(System.getProperty("user.dir")).absoluteFile
        repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:error("repo root")}
        val view=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt").readText()
        val renderer=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
        assertTrue(view.contains("fun camImageMapReady"))
        assertTrue(view.contains("CamImagePixelManifest.isCompatibleBytes"))
        assertTrue(view.contains("cam={if(camImageMapReady()) imageSkinNavNodes(PageId.CAM)+CamImageInteractionLayout.nodes"))
        assertTrue(view.contains("if(PageSurfaceTexturePlan.path(page)!=null) return raw"))
        assertTrue(renderer.contains("PageId.CAM->drawCamImageLiveOverlay(p)"))
        assertTrue(renderer.contains("CamImageLiveOverlayPlan.build(state,widthPx,heightPx)"))
        assertTrue(renderer.contains("camStateSource.snapshotForFrame()"))
        assertTrue(renderer.contains("if(\"CAM.AVOID\" in CamImagePixelManifest.controls)"))
    }
}
