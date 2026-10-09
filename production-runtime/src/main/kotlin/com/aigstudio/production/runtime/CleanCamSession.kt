package com.aigstudio.production.runtime

import com.aigstudio.core.CamPathMode
import com.aigstudio.core.CamSettings
import com.aigstudio.core.ContourDirection
import com.aigstudio.core.ContourSide
import com.aigstudio.core.ManualCamPathEngine
import com.aigstudio.core.ManualCamPoint
import com.aigstudio.runtime4.contract.CamMotionKind

data class CleanCamPoint(
    val x:Double,
    val y:Double,
    val z:Double,
    val rapid:Boolean,
    val axisA:Double,
    val axisB:Double,
    val axisC:Double,
    val motion:CamMotionKind,
    val arcI:Double?=null,
    val arcJ:Double?=null,
    val clockwise:Boolean?=null,
)

class CleanCamSession {
    private var settings=CamSettings()
    fun mode()=settings.pathMode.name
    fun side()=settings.contourSide.name
    fun direction()=settings.contourDirection.name
    fun safeZ()=settings.safeZ
    fun points():List<CleanCamPoint> = settings.manualPath.map { p ->
        val motion=when {
            p.rapid -> CamMotionKind.G0
            p.arcI!=null && p.arcJ!=null && p.clockwise==true -> CamMotionKind.G2
            p.arcI!=null && p.arcJ!=null -> CamMotionKind.G3
            else -> CamMotionKind.G1
        }
        CleanCamPoint(p.x,p.y,p.z,p.rapid,p.axisA,p.axisB,p.axisC,motion,p.arcI,p.arcJ,p.clockwise)
    }
    fun startManual(){ settings=ManualCamPathEngine.startBlank(settings) }
    fun useAuto(){ settings=ManualCamPathEngine.useAuto(settings) }
    fun useManual(){ settings=ManualCamPathEngine.useManual(settings) }
    fun setSafeZ(z:Double){
        require(z.isFinite() && z>0.0){"Safe-Z must be positive"}
        val moved=settings.manualPath.map{p->if(p.rapid && p.z<z) p.copy(z=z) else p}
        settings=settings.copy(safeZ=z,manualPath=moved)
    }
    fun addCutPoint(x:Double,y:Double,z:Double){
        ensureManual(); settings=ManualCamPathEngine.insertPoint(settings,settings.manualPath.size-1,ManualCamPoint(x,y,z,false))
    }
    fun addRapidPoint(x:Double,y:Double){
        ensureManual(); settings=ManualCamPathEngine.insertPoint(settings,settings.manualPath.size,ManualCamPoint(x,y,settings.safeZ,true))
    }
    fun replacePoint(index:Int,x:Double,y:Double,z:Double,rapid:Boolean,axisA:Double?=null,axisB:Double?=null,axisC:Double?=null){
        ensureManual(); settings=ManualCamPathEngine.replacePoint(settings,index,x,y,z,rapid,axisA,axisB,axisC)
    }
    fun insertAvoidance(afterIndex:Int,landingX:Double,landingY:Double,landingZ:Double){
        ensureManual(); settings=ManualCamPathEngine.insertAvoidance(settings,afterIndex,settings.safeZ,landingX,landingY,landingZ)
    }
    fun toggleSide(){ settings=settings.copy(contourSide=if(settings.contourSide==ContourSide.OUTSIDE)ContourSide.INSIDE else ContourSide.OUTSIDE) }
    fun toggleDirection(){
        val d=if(settings.contourDirection==ContourDirection.CCW)ContourDirection.CW else ContourDirection.CCW
        settings=settings.copy(contourDirection=d,climb=d==ContourDirection.CCW)
    }
    internal fun coreSettings():CamSettings=settings
    private fun ensureManual(){ if(settings.pathMode!=CamPathMode.MANUAL) startManual() }
}