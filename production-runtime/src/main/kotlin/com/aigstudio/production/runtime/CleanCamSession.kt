package com.aigstudio.production.runtime

import com.aigstudio.core.CamPathMode
import com.aigstudio.core.CamSettings
import com.aigstudio.core.ContourDirection
import com.aigstudio.core.ContourSide
import com.aigstudio.core.ManualCamPathEngine
import com.aigstudio.core.ManualCamPoint
import com.aigstudio.runtime4.contract.*

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
    fun toolDiameter()=settings.toolDiameter
    fun depth()=settings.depth
    fun feed()=settings.feedMmMin
    fun leadIn()=settings.leadInMm
    fun leadOut()=settings.leadOutMm
    fun setToolDiameter(value:Double){ settings=settings.copy(toolDiameter=value) }
    fun setDepth(value:Double){ settings=settings.copy(depth=value) }
    fun setFeed(value:Double){ settings=settings.copy(feedMmMin=value) }
    fun setLeadIn(value:Double){ settings=settings.copy(leadInMm=value) }
    fun setLeadOut(value:Double){ settings=settings.copy(leadOutMm=value) }
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
    fun restoreBaseline(strategy:CamStrategySnapshot,points:List<CamPointSnapshot>){
        val manual=points.map { p ->
            require(listOf(p.x,p.y,p.z,p.a,p.b,p.c).all{it.isFinite()}){"CAM baseline point must be finite"}
            require(kotlin.math.abs(p.a)<=360.0 && kotlin.math.abs(p.b)<=360.0 && kotlin.math.abs(p.c)<=360.0){"CAM baseline A/B/C out of range"}
            val rapid=p.motion==CamMotionKind.G0
            if(rapid) require(p.z+1e-9>=strategy.safeZMm){"CAM baseline G0 below Safe-Z"} else require(p.z<=1e-9){"CAM baseline cut above Z0"}
            if(p.motion==CamMotionKind.G2 || p.motion==CamMotionKind.G3) require(p.arcI!=null && p.arcJ!=null){"CAM baseline arc missing center"}
            ManualCamPoint(p.x,p.y,p.z,rapid,p.arcI,p.arcJ,when(p.motion){CamMotionKind.G2->true;CamMotionKind.G3->false;else->null},p.a,p.b,p.c)
        }
        val side=ContourSide.valueOf(strategy.side.name)
        val direction=ContourDirection.valueOf(strategy.direction.name)
        settings=CamSettings(
            toolDiameter=strategy.toolDiameterMm,depth=strategy.depthMm,safeZ=strategy.safeZMm,feedMmMin=strategy.feedMmMin,
            climb=direction==ContourDirection.CCW,contourSide=side,contourDirection=direction,
            pathMode=if(manual.isEmpty()) CamPathMode.AUTO else CamPathMode.MANUAL,manualPath=manual,
            leadInMm=strategy.leadInMm,leadOutMm=strategy.leadOutMm,
        )
    }    internal fun coreSettings():CamSettings=settings
    private fun ensureManual(){ if(settings.pathMode!=CamPathMode.MANUAL) startManual() }
}