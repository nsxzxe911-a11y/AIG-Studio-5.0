package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.*
import org.junit.Test
class FullSurfaceSkinRegression {
 @Test fun homeUsesExactMorningApprovedSkinPerOrientation(){
  assertEquals("aig-rgb/morning-20261005/home_landscape.png",FullSurfaceSkinPlan.assetFor(SceneId.HOME,1920f,1080f))
  assertEquals("aig-rgb/morning-20261005/home_portrait.png",FullSurfaceSkinPlan.assetFor(SceneId.HOME,1080f,1920f))
 }
 @Test fun morningHomeSkinIsHomeOnly(){SceneId.entries.filter{it!=SceneId.HOME}.forEach{scene->assertNull("scene="+scene,FullSurfaceSkinPlan.assetFor(scene,1920f,1080f))}}
}
