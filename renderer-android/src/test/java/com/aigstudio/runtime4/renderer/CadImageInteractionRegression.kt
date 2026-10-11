package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test

class CadImageInteractionRegression {
 @Test fun cadUsesNew856x1836SkinViewportAndRealImageButtons(){
  assertEquals("aig-rgb/page-surfaces/cad.png",PageSurfaceTexturePlan.path(PageId.CAD))
  assertEquals(856f to 1836f,PageSurfaceTexturePlan.imageSize(PageId.CAD))
  assertEquals(856f,CadImagePixelManifest.referenceWidth,0.01f)
  assertEquals(1836f,CadImagePixelManifest.referenceHeight,0.01f)
  assertEquals("742d9fbe1f92f004712dab6f4011160954b83d21789c37cf3db58c2ce9662b10",CadImagePixelManifest.expectedSha256)
  val nodes=CadImageInteractionLayout.nodes(856f,1836f)
  fun idAt(x:Float,y:Float)=hitTestTopmost(nodes,x,y)?.id
  assertEquals("CAD.SELECT",idAt(55f,535f))
  assertEquals("CAD.LINE",idAt(128f,535f))
  assertEquals("CAD.RECT",idAt(191f,535f))
  assertEquals("CAD.CIRCLE",idAt(255f,535f))
  assertEquals("CAD.ARC",idAt(320f,535f))
  assertEquals("CAD.HOLE",idAt(385f,535f))
  assertEquals("CAD.CHAMFER",idAt(448f,535f))
  assertEquals("CAD.FILLET",idAt(512f,535f))
  assertEquals("CAD.DIMENSION",idAt(706f,535f))
  assertEquals("CAD.TRIM",idAt(807f,535f))
  assertEquals("CAD.VIEWPORT",idAt(428f,800f))
  assertTrue(nodes.filterIsInstance<RgbGlassButtonNode>().filter{it.id.startsWith("CAD.")}.all{it.aigActionBinding!=null})
 }

 @Test fun cadImageBoundsFillWideNoxViewport(){
  val b=CadImageInteractionLayout.imageBounds(2160f,3840f)
  assertEquals(0f,b.left,0.01f);assertEquals(0f,b.top,0.01f)
  assertEquals(2160f,b.right,0.01f);assertEquals(3840f,b.bottom,0.01f)
 }
}
