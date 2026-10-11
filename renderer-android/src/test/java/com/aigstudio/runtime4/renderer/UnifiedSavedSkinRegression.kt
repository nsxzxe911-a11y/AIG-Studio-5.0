package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test

class UnifiedSavedSkinRegression {
 @Test fun savedPrimarySkinsUseOneTenButtonPageFamily(){
  val primary=listOf(PageId.HOME,PageId.CAD,PageId.CAM,PageId.SIM,PageId.AXIS3,PageId.AXIS4,PageId.AXIS5,PageId.AXIS6,PageId.NC,PageId.AI)
  primary.forEach{ assertNotNull(PageSurfaceTexturePlan.path(it)) }
  assertEquals(10,HomeImageNavigationLayout.nodes(2160f,3840f).size)
  val sizes=mapOf(
   PageId.HOME to (941f to 1672f), PageId.SIM to (941f to 1672f),
   PageId.CAD to (856f to 1836f), PageId.CAM to (856f to 1836f),
   PageId.AXIS3 to (856f to 1836f), PageId.AXIS4 to (856f to 1836f),
   PageId.AXIS5 to (856f to 1836f), PageId.AXIS6 to (856f to 1836f),
   PageId.NC to (856f to 1836f), PageId.AI to (856f to 1836f))
  sizes.forEach{(page,size)-> assertEquals(size,PageSurfaceTexturePlan.imageSize(page)) }
 }
}
