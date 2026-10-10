package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.SceneId
import org.junit.Assert.*
import org.junit.Test
class FullSurfaceSkinRegression {
 @Test fun landscapeHomeUsesFullApprovedRgbSkin(){assertEquals("aig-rgb/full-surface/home_landscape.png",FullSurfaceSkinPlan.assetFor(SceneId.HOME,1920f,1080f))}
 @Test fun portraitHomeDoesNotStretchLandscapeSkin(){assertNull(FullSurfaceSkinPlan.assetFor(SceneId.HOME,1080f,1920f))}
}
