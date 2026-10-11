package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.SimState
import java.util.Locale
import kotlin.math.max

data class SimImageLiveCell(val bounds:UiBounds,val magnitude:Float)
data class SimImageLiveOverlay(val cells:List<SimImageLiveCell>,val status:String,val displayMode:String)

object SimImageLiveOverlayPlan {
 fun build(state:SimState,viewport:UiBounds):SimImageLiveOverlay {
  val status=String.format(Locale.US,"SIM %s | CELLS %d | MIN %.3f | VOL %.3f | BLOCK %d/%d",
   state.displayMode,state.removedCells,state.minDepthMm,state.removedVolumeMm3,(state.blockIndex+1).coerceAtLeast(0),state.blockCount)
  if(!state.ready||state.depth.isEmpty()||state.nx<=0||state.ny<=0)return SimImageLiveOverlay(emptyList(),status,state.displayMode)
  val stride=max(1,max(state.nx,state.ny)/32)
  val cw=viewport.width/state.nx.toFloat(); val ch=viewport.height/state.ny.toFloat()
  val denom=(-state.minDepthMm).coerceAtLeast(0.001)
  val cells=mutableListOf<SimImageLiveCell>()
  var iy=0
  while(iy<state.ny){
   var ix=0
   while(ix<state.nx){
    val idx=iy*state.nx+ix
    if(idx<state.depth.size&&state.depth[idx]<0.0){
     val left=viewport.left+ix*cw; val top=viewport.top+iy*ch
     val right=(left+cw*stride).coerceAtMost(viewport.right); val bottom=(top+ch*stride).coerceAtMost(viewport.bottom)
     val mag=((-state.depth[idx])/denom).toFloat().coerceIn(0f,1f)
     cells+=SimImageLiveCell(UiBounds(left,top,right,bottom),mag)
    }
    ix+=stride
   }
   iy+=stride
  }
  return SimImageLiveOverlay(cells,status,state.displayMode)
 }
}
