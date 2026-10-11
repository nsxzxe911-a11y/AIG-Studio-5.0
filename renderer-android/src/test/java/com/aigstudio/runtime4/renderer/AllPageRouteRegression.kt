package com.aigstudio.runtime4.renderer
import com.aigstudio.runtime4.contract.SceneId
import com.aigstudio.runtime4.renderer.gpu.FourthRenderRoute
import com.aigstudio.runtime4.renderer.gpu.RenderRoutePolicy
import org.junit.Assert.*
import org.junit.Test
class AllPageRouteRegression {
 @Test fun everyProductPageHasDedicatedRouteAndNavigation(){
  val expected=mapOf(
   SceneId.HOME to FourthRenderRoute.HOME,SceneId.CAD to FourthRenderRoute.CAD,SceneId.CAM to FourthRenderRoute.CAM,
   SceneId.SIM to FourthRenderRoute.SIM,SceneId.AXIS3 to FourthRenderRoute.AXIS3,SceneId.AXIS4 to FourthRenderRoute.AXIS4,
   SceneId.AXIS5 to FourthRenderRoute.AXIS5,SceneId.AXIS6 to FourthRenderRoute.AXIS6,SceneId.NC to FourthRenderRoute.NC,SceneId.AI to FourthRenderRoute.AI)
  expected.forEach{(scene,route)->assertEquals(route,RenderRoutePolicy.forScene(scene))}
  assertEquals(SceneId.SIM,SharedVisualPolicy.destination("NAV.SIM"));assertEquals(SceneId.AI,SharedVisualPolicy.destination("NAV.AI"))
  val nav=AxisNavigationLayout.layout(1080f,1920f,2f,"NAV.SIM").buttons
  assertNotNull(nav.firstOrNull{it.id=="NAV.SIM"});assertNotNull(nav.firstOrNull{it.id=="NAV.AI"})
 }
}
