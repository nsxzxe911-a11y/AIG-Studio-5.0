package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SimState
import org.junit.Assert.*
import org.junit.Test

class SimImageLiveOverlayRegression {
 @Test fun realDepthGridMapsIntoApprovedImageViewport(){
  val viewport=UiBounds(100f,200f,500f,600f)
  val state=SimState(ready=true,displayMode="MATERIAL",removedCells=3,minDepthMm=-4.0,removedVolumeMm3=12.5,nx=4,ny=2,
   depth=listOf(0.0,-1.0,-2.0,0.0,0.0,-3.0,0.0,0.0))
  val plan=SimImageLiveOverlayPlan.build(state,viewport)
  assertTrue(plan.cells.isNotEmpty())
  assertTrue(plan.cells.all{it.bounds.left>=viewport.left&&it.bounds.right<=viewport.right&&it.bounds.top>=viewport.top&&it.bounds.bottom<=viewport.bottom})
  assertTrue(plan.cells.all{it.magnitude in 0f..1f})
  assertEquals("MATERIAL",plan.displayMode)
  assertTrue(plan.status.contains("CELLS 3"))
  assertTrue(plan.status.contains("-4.000"))
 }

 @Test fun notReadyOrEmptyDepthDoesNotInventRemoval(){
  val viewport=UiBounds(0f,0f,400f,300f)
  assertTrue(SimImageLiveOverlayPlan.build(SimState(),viewport).cells.isEmpty())
  assertTrue(SimImageLiveOverlayPlan.build(SimState(ready=true,nx=2,ny=2,depth=emptyList()),viewport).cells.isEmpty())
 }
}
