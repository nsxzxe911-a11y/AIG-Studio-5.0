package com.aigstudio.runtime4.renderer

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.security.MessageDigest

class CadImagePixelSwipeRegression {
 private fun repoRoot():File {
  var p=File(System.getProperty("user.dir")).absoluteFile
  repeat(8){ if(File(p,"settings.gradle.kts").isFile)return p; p=p.parentFile?:error("repo root") }
  error("repo root")
 }
 @Test fun exactArtworkUsesPixelMapperAndShaBinding(){
  assertEquals(856f,CadImagePixelManifest.referenceWidth,0f)
  assertEquals(1836f,CadImagePixelManifest.referenceHeight,0f)
  assertEquals("742d9fbe1f92f004712dab6f4011160954b83d21789c37cf3db58c2ce9662b10",CadImagePixelManifest.expectedSha256)
  val root=repoRoot(); val f=File(root,"renderer-android/src/main/assets/aig-rgb/page-surfaces/cad.png")
  val sha=MessageDigest.getInstance("SHA-256").digest(f.readBytes()).joinToString(""){"%02x".format(it)}
  assertTrue(CadImagePixelManifest.isCompatibleSha(sha))
  val screen=CadImagePixelMapper.imagePixelToScreen(1080f,2400f,470.5f,836f)
  val image=CadImagePixelMapper.screenToImagePixel(1080f,2400f,screen.x,screen.y)
  assertNotNull(image); assertEquals(470.5f,image!!.x,0.05f); assertEquals(836f,image.y,0.05f)
 }
 @Test fun swipeRibbonIsFourLargeRealModuleButtonsPerPage(){
  assertEquals(5,CadSwipeRibbonModel.pageCount)
  val ids=CadSwipeRibbonModel.pages.flatten()
  assertEquals(ids.size,ids.toSet().size)
  assertTrue(ids.all{it in CadImageModuleCatalog.controlIds()})
  val nodes=CadSwipeRibbonLayout.nodes(941f,1672f,0,1f)
  assertEquals(4,nodes.size)
  assertTrue(nodes.all{it.bounds.width>=210f})
 }
 @Test fun horizontalSwipeNeverActivatesACommandAndSnapsOnePage(){
  val tracker=CadSwipeGestureTracker(20f)
  tracker.onDown(700f,1100f)
  assertEquals(CadSwipeGestureState.TRACKING,tracker.onMove(690f,1102f))
  assertEquals(CadSwipeGestureState.SWIPING,tracker.onMove(620f,1105f))
  val release=tracker.onUp(560f,1107f)
  assertEquals(CadSwipeRelease.SWIPE_LEFT,release)
  assertNull(tracker.tapActivationId)
  val state=CadSwipeRibbonState()
  assertEquals(0,state.pageIndex); state.apply(release); assertEquals(1,state.pageIndex)
  state.apply(CadSwipeRelease.SWIPE_RIGHT); assertEquals(0,state.pageIndex)
 }
 @Test fun tapRemainsTapWhenMovementStaysInsideSlop(){
  val tracker=CadSwipeGestureTracker(20f)
  tracker.onDown(150f,1100f,"CAD.LINE")
  tracker.onMove(158f,1104f)
  assertEquals(CadSwipeRelease.TAP,tracker.onUp(159f,1105f))
  assertEquals("CAD.LINE",tracker.tapActivationId)
 }
}
