package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.PageId
import org.junit.Assert.*
import org.junit.Test

class SimImageInteractionRegression {
 @Test fun exactUnifiedSimArtOwnsTheInteractionMap(){
  assertEquals("aig-rgb/page-surfaces/sim.png",PageSurfaceTexturePlan.path(PageId.SIM))
  assertEquals(941f to 1672f,PageSurfaceTexturePlan.imageSize(PageId.SIM))
  assertEquals(941f,SimImagePixelManifest.referenceWidth,0f)
  assertEquals(1672f,SimImagePixelManifest.referenceHeight,0f)
  assertEquals("c78fc52cf46e2778616469fb56137b667548e03648ac68c9e667e908f3de3d12",SimImagePixelManifest.expectedSha256)
  assertTrue(SimImagePixelManifest.isCompatibleSha(SimImagePixelManifest.expectedSha256))
  assertFalse(SimImagePixelManifest.isCompatibleSha("bad"))
 }

 @Test fun reverseMappedButtonsOnlyExposeFourRealSimRuntimeControls(){
  val nodes=SimImageInteractionLayout.nodes(941f,1672f).filterIsInstance<RgbGlassButtonNode>()
  val ids=nodes.map{it.id}.filter{it.startsWith("SIM.")}.toSet()
  assertEquals(setOf("SIM.DISPLAY","SIM.RESET","SIM.PLAY","SIM.STEP"),ids)
  assertEquals("SIM.DISPLAY",SimImageInteractionLayout.controlAt(941f,1672f,120f,1464f))
  assertEquals("SIM.RESET",SimImageInteractionLayout.controlAt(941f,1672f,352f,1464f))
  assertEquals("SIM.PLAY",SimImageInteractionLayout.controlAt(941f,1672f,583f,1464f))
  assertEquals("SIM.STEP",SimImageInteractionLayout.controlAt(941f,1672f,812f,1464f))
  assertTrue(nodes.none{it.id.startsWith("IMG.SIM.NAV.")})
 }

 @Test fun liveSlotsCoverNewViewportAndEntireBakedStatusCard(){
  assertEquals(SimImagePixelRect(20f,522f,921f,1033f),SimImagePixelManifest.viewport)
  assertEquals(SimImagePixelRect(18f,1040f,923f,1368f),SimImagePixelManifest.liveStatus)
 }
}
