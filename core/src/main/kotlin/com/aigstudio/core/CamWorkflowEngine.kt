package com.aigstudio.core

enum class CamMachiningIntent {
    WORKPIECE_OUTER,
    INNER_CONTOUR,
    MOLD_POCKET,
    MOLD_CORE
}

data class CamIntentProfile(
    val intent:CamMachiningIntent,
    val side:ContourSide,
    val pocket:Boolean,
    val label:String
)

/**
 * High-level CAM workflow operations used by the compact "刀路" UI.
 * Geometry ownership stays in the existing CAM engine.  Manual edits keep the
 * existing point A/B/C posture so fixture avoidance does not silently zero axes.
 */
object CamWorkflowEngine {
    val uiActions=listOf("外銑","內銑","型腔","方向","起/落刀","避讓壓板","Safe-Z")

    fun profile(intent:CamMachiningIntent):CamIntentProfile = when(intent) {
        CamMachiningIntent.WORKPIECE_OUTER -> CamIntentProfile(intent,ContourSide.OUTSIDE,false,"工件外形 / 外銑")
        CamMachiningIntent.INNER_CONTOUR -> CamIntentProfile(intent,ContourSide.INSIDE,false,"內輪廓 / 內銑")
        CamMachiningIntent.MOLD_POCKET -> CamIntentProfile(intent,ContourSide.INSIDE,true,"模具型腔 / 內銑")
        CamMachiningIntent.MOLD_CORE -> CamIntentProfile(intent,ContourSide.OUTSIDE,false,"模芯 / 凸模 / 外銑")
    }

    fun applyIntent(settings:CamSettings,intent:CamMachiningIntent):CamSettings =
        settings.copy(contourSide=profile(intent).side)

    fun insertFixtureBypass(
        settings:CamSettings,
        afterIndex:Int,
        liftZ:Double,
        safeX:Double,
        safeY:Double,
        landingX:Double,
        landingY:Double,
        landingZ:Double
    ):CamSettings {
        require(settings.pathMode==CamPathMode.MANUAL){"Fixture bypass requires MANUAL CAM"}
        require(afterIndex in settings.manualPath.indices){"Bypass insertion point out of range"}
        require(listOf(liftZ,safeX,safeY,landingX,landingY,landingZ).all{it.isFinite()}){
            "Fixture bypass coordinates must be finite"
        }
        require(liftZ+EPS>=settings.safeZ){"Bypass lift Z must be at or above Safe-Z"}
        require(landingZ<=EPS){"Bypass landing point must be at or below Z0"}

        val from=settings.manualPath[afterIndex]
        val pose={x:Double,y:Double,z:Double,rapid:Boolean ->
            ManualCamPoint(
                x=x,y=y,z=z,rapid=rapid,
                axisA=from.axisA,axisB=from.axisB,axisC=from.axisC
            )
        }
        val list=settings.manualPath.toMutableList()
        val at=afterIndex+1
        list.add(at,pose(from.x,from.y,liftZ,true))
        list.add(at+1,pose(safeX,safeY,liftZ,true))
        list.add(at+2,pose(landingX,landingY,liftZ,true))
        list.add(at+3,pose(landingX,landingY,landingZ,false))
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }

    fun reverseLinearCutSpan(settings:CamSettings,first:Int,last:Int):CamSettings {
        require(settings.pathMode==CamPathMode.MANUAL){"Direction edit requires MANUAL CAM"}
        require(first in settings.manualPath.indices && last in settings.manualPath.indices && first<=last){
            "Direction span out of range"
        }
        val span=settings.manualPath.subList(first,last+1)
        require(span.all{!it.rapid}){"Direction span must contain cutting points only"}
        require(span.all{it.arcI==null && it.arcJ==null && it.clockwise==null}){
            "Arc span reversal requires explicit arc redefinition"
        }
        val list=settings.manualPath.toMutableList()
        span.reversed().forEachIndexed{offset,p->list[first+offset]=p}
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }

    fun moveCutEntry(settings:CamSettings,x:Double,y:Double,z:Double):CamSettings =
        moveCutEndpoint(settings,true,x,y,z)

    fun moveCutExit(settings:CamSettings,x:Double,y:Double,z:Double):CamSettings =
        moveCutEndpoint(settings,false,x,y,z)

    private fun moveCutEndpoint(
        settings:CamSettings,
        entry:Boolean,
        x:Double,
        y:Double,
        z:Double
    ):CamSettings {
        require(settings.pathMode==CamPathMode.MANUAL){"Entry/exit edit requires MANUAL CAM"}
        require(listOf(x,y,z).all{it.isFinite()}){"Entry/exit coordinates must be finite"}
        require(z<=EPS){"Entry/exit cutting Z must be at or below Z0"}
        val index=if(entry) settings.manualPath.indexOfFirst{!it.rapid} else settings.manualPath.indexOfLast{!it.rapid}
        require(index>=0){"Manual path has no cutting point"}
        val old=settings.manualPath[index]
        val list=settings.manualPath.toMutableList()
        list[index]=old.copy(x=x,y=y,z=z,rapid=false,arcI=null,arcJ=null,clockwise=null)
        return settings.copy(pathMode=CamPathMode.MANUAL,manualPath=list)
    }
}
