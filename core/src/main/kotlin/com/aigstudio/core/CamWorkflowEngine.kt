package com.aigstudio.core

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

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

    /**
     * Real pocket clearing for the common primitive cases used most often on the
     * shop floor: a single circle or an axis-aligned four-line rectangle.
     * The result is an ordinary MANUAL path, so SIM/NC consume the same points.
     */
    fun buildCommonPocket(entities:List<Entity>,settings:CamSettings):CamSettings {
        val circle=entities.filterIsInstance<Circle>().singleOrNull()
        if(circle!=null) return circlePocket(circle,settings)

        val lines=entities.filterIsInstance<Line>()
        require(lines.size==4 && entities.size==4){
            "Pocket clearing currently requires one Circle or one 4-line rectangular contour"
        }
        val xs=lines.flatMap{listOf(it.a.x,it.b.x)}
        val ys=lines.flatMap{listOf(it.a.y,it.b.y)}
        val minX=xs.minOrNull() ?: error("Rectangle pocket missing X")
        val maxX=xs.maxOrNull() ?: error("Rectangle pocket missing X")
        val minY=ys.minOrNull() ?: error("Rectangle pocket missing Y")
        val maxY=ys.maxOrNull() ?: error("Rectangle pocket missing Y")
        require(lines.all { line ->
            val horizontal=abs(line.a.y-line.b.y)<=EPS &&
                (abs(line.a.y-minY)<=EPS || abs(line.a.y-maxY)<=EPS)
            val vertical=abs(line.a.x-line.b.x)<=EPS &&
                (abs(line.a.x-minX)<=EPS || abs(line.a.x-maxX)<=EPS)
            horizontal || vertical
        }){"Pocket rectangle must be axis-aligned and closed"}
        return rectanglePocket(minX,minY,maxX,maxY,settings)
    }

    private fun circlePocket(circle:Circle,settings:CamSettings):CamSettings {
        val toolR=settings.toolDiameter/2.0
        val outer=circle.radius-toolR
        require(outer>=CNC_RESOLUTION_MM){"Tool is too large for circle pocket"}
        val step=max(settings.toolDiameter*0.60,CNC_RESOLUTION_MM)
        val points=mutableListOf<ManualCamPoint>()
        var radius=outer
        var first=true
        while(radius>CNC_RESOLUTION_MM) {
            val startX=circle.center.x+radius
            val startY=circle.center.y
            if(first) {
                points+=ManualCamPoint(startX,startY,settings.safeZ,true)
                points+=ManualCamPoint(startX,startY,settings.depth,false)
                first=false
            } else {
                points+=ManualCamPoint(startX,startY,settings.depth,false)
            }
            val segments=48
            for(i in 1..segments) {
                val a=2.0*PI*i/segments.toDouble()
                points+=ManualCamPoint(
                    circle.center.x+radius*cos(a),
                    circle.center.y+radius*sin(a),
                    settings.depth,false
                )
            }
            radius-=step
        }
        points+=ManualCamPoint(circle.center.x,circle.center.y,settings.depth,false)
        require(points.size>=2)
        return settings.copy(
            contourSide=ContourSide.INSIDE,
            pathMode=CamPathMode.MANUAL,
            manualPath=points
        )
    }

    private fun rectanglePocket(
        minX:Double,minY:Double,maxX:Double,maxY:Double,settings:CamSettings
    ):CamSettings {
        val toolR=settings.toolDiameter/2.0
        val left=minX+toolR; val right=maxX-toolR
        val bottom=minY+toolR; val top=maxY-toolR
        require(right-left>=CNC_RESOLUTION_MM && top-bottom>=CNC_RESOLUTION_MM){
            "Tool is too large for rectangle pocket"
        }
        val step=max(settings.toolDiameter*0.60,CNC_RESOLUTION_MM)
        val points=mutableListOf<ManualCamPoint>()
        var y=bottom
        var leftToRight=true
        points+=ManualCamPoint(left,bottom,settings.safeZ,true)
        points+=ManualCamPoint(left,bottom,settings.depth,false)
        while(y<=top+EPS) {
            val x=if(leftToRight) right else left
            points+=ManualCamPoint(x,y.coerceAtMost(top),settings.depth,false)
            val nextY=(y+step).coerceAtMost(top)
            if(nextY-y>EPS) points+=ManualCamPoint(x,nextY,settings.depth,false)
            if(nextY>=top-EPS) break
            y=nextY
            leftToRight=!leftToRight
        }
        return settings.copy(
            contourSide=ContourSide.INSIDE,
            pathMode=CamPathMode.MANUAL,
            manualPath=points
        )
    }

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
