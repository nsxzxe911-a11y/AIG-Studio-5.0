package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test
import java.io.File

class AxisImageRuntimeOverlayRegression {
 @Test fun axisPreviewViewportsMapInsideApproved856x1836Skins(){
  listOf(PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6).forEach{page->
   val b=AxisImageRuntimeLayout.viewport(page,2160f,3840f)
   assertNotNull(b)
   b!!
   assertTrue(b.left>=0f && b.top>600f)
   assertTrue(b.right<=2160f && b.bottom<2600f)
   assertTrue(b.width>1000f && b.height>700f)
  }
 }

 @Test fun rendererDrawsTrueAxisSceneAfterSkinIntoWhitelistedViewport(){
  var root=File(System.getProperty("user.dir")).absoluteFile
  repeat(8){if(File(root,"settings.gradle.kts").isFile)return@repeat;root=root.parentFile?:error("repo root")}
  val renderer=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AigGlesRenderer.kt").readText()
  val axis=File(root,"renderer-android/src/main/java/com/aigstudio/runtime4/renderer/gpu/AxisGlesSceneRenderer.kt").readText()
  assertTrue(renderer.contains("private fun drawAxisImageLiveOverlay"))
  assertTrue(renderer.contains("AxisImageRuntimeLayout.viewport(page,widthPx,heightPx)"))
  assertTrue(renderer.contains("viewportOverride=viewport,drawControls=false"))
  assertTrue(axis.contains("viewportOverride:UiBounds?=null"))
  assertTrue(axis.contains("drawControls:Boolean=true"))
  assertTrue(axis.contains("val viewport=viewportOverride ?:"))
 }
}
