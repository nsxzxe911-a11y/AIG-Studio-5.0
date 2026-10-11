package com.aigstudio.production.runtime
import com.aigstudio.runtime4.contract.*
import kotlin.test.*
class PageConnectionRuntimeRegression {
 @Test fun pageRuntimeExposesMutableConnectionContractWithoutChangingLaunchability(){
  val runtime:PageConnectionRuntimePort=ProductionPageRuntime()
  val on=runtime.setConnection(PageId.CAD,PageId.CAM,true)
  assertTrue(on.connections.single{it.target==PageId.CAM}.connected);assertTrue(on.launchable)
  val off=runtime.setConnection(PageId.CAD,PageId.CAM,false)
  assertFalse(off.connections.single{it.target==PageId.CAM}.connected);assertTrue(off.launchable)
 }
}
