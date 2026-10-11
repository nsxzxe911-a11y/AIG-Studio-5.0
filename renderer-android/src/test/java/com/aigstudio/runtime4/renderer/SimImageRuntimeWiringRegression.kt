package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test
import java.io.File

class SimImageRuntimeWiringRegression {
 @Test fun simUsesShaBoundImageHitMapWithoutExtraChrome(){
  var root=File(System.getProperty("user.dir")); repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile}
  val view=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesView.kt").readText()
  val renderer=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
  assertTrue(view.contains("fun simImageMapReady"))
  assertTrue(view.contains("SimImagePixelManifest.isCompatibleBytes"))
  assertTrue(view.contains("sim={if(simImageMapReady()) imageSkinNavNodes(PageId.SIM)+SimImageInteractionLayout.nodes"))
  assertTrue(view.contains("if(PageSurfaceTexturePlan.path(page)!=null) return raw"))
  assertTrue(renderer.contains("PageId.SIM->primaryNavigationNodes(page)+SimImageInteractionLayout.nodes"))
  assertTrue(renderer.contains("private fun drawUnifiedMobileChrome"))
  assertTrue(renderer.contains("drawImageBackedRuntimeOverlay(p,page)"))
  assertTrue(renderer.contains("PageId.SIM->if(simImageMapEnabled) drawSimImageLiveOverlay(p)"))
  assertTrue(renderer.contains("SimImageLiveOverlayPlan.build(state,viewport)"))
  assertTrue(renderer.contains("simStateSource?.snapshot()"))
 }
}
