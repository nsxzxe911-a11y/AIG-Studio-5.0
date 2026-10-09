package com.aigstudio.production.runtime

import com.aigstudio.core.CamEngine
import com.aigstudio.core.CamPathMode
import com.aigstudio.core.MaterialRemoval3D
import com.aigstudio.core.Stock3D

data class CleanSimResult(
    val removedCells:Int,val minDepthMm:Double,val removedVolumeMm3:Double,
    val nx:Int,val ny:Int,val depth:DoubleArray
)

class CleanSimSession(private val cam:CleanCamSession) {
    fun run():CleanSimResult {
        val settings=cam.coreSettings()
        require(settings.pathMode==CamPathMode.MANUAL){"SIM requires MANUAL CAM path"}
        require(settings.manualPath.any{!it.rapid}){"SIM requires cutting points"}
        val paths=CamEngine.generateManual(settings)
        val pts=settings.manualPath
        val minX=pts.minOf{it.x}; val maxX=pts.maxOf{it.x}
        val minY=pts.minOf{it.y}; val maxY=pts.maxOf{it.y}
        val pad=10.0
        val stock=Stock3D(minX-pad,minY-pad,maxX+pad,maxY+pad,20.0)
        val field=MaterialRemoval3D.simulate(paths,settings,stock)
        val removed=field.depth.count{it<0.0}
        val minDepth=field.depth.minOrNull() ?: 0.0
        val dx=(stock.maxX-stock.minX)/(field.nx-1).toDouble()
        val dy=(stock.maxY-stock.minY)/(field.ny-1).toDouble()
        val volume=field.depth.filter{it<0.0}.sumOf{-it*dx*dy}
        return CleanSimResult(removed,minDepth,volume,field.nx,field.ny,field.depth.copyOf())
    }
}
