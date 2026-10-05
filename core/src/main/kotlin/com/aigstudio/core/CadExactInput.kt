package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

private const val CAD_EXACT_MAX_ABS_MM = 1_000_000.0

data class CadExactPoint(val x:Double,val y:Double)

sealed interface CadExactPrimitive

data class CadExactLine(
    val a:CadExactPoint,
    val b:CadExactPoint,
    val rectangleEdge:Boolean=false
):CadExactPrimitive

data class CadExactCircle(
    val center:CadExactPoint,
    val radius:Double,
    val hole:Boolean=false
):CadExactPrimitive

data class CadExactArc(
    val center:CadExactPoint,
    val radius:Double,
    val start:CadExactPoint,
    val end:CadExactPoint,
    val clockwise:Boolean
):CadExactPrimitive

object CadExactInputEngine {
    private fun coordinate(value:Double,label:String):Double {
        require(value.isFinite() && abs(value)<=CAD_EXACT_MAX_ABS_MM) { "$label out of range" }
        return value
    }

    private fun positiveMm(value:Double,label:String):Double {
        require(value.isFinite() && value>=CNC_RESOLUTION_MM) { "$label must be >= 0.001 mm" }
        require(value<=CAD_EXACT_MAX_ABS_MM) { "$label out of range" }
        return value
    }

    private fun point(x:Double,y:Double)=CadExactPoint(coordinate(x,"X"),coordinate(y,"Y"))

    fun lineEndpoints(x1:Double,y1:Double,x2:Double,y2:Double):List<CadExactPrimitive> {
        val a=point(x1,y1)
        val b=point(x2,y2)
        require(hypot(b.x-a.x,b.y-a.y)>=CNC_RESOLUTION_MM) { "LINE length must be >= 0.001 mm" }
        return listOf(CadExactLine(a,b))
    }

    fun linePolar(x:Double,y:Double,lengthMm:Double,angleDeg:Double):List<CadExactPrimitive> {
        val a=point(x,y)
        val length=positiveMm(lengthMm,"LINE length")
        require(angleDeg.isFinite()) { "LINE angle must be finite" }
        val r=Math.toRadians(angleDeg)
        val b=point(a.x+cos(r)*length,a.y+sin(r)*length)
        return listOf(CadExactLine(a,b))
    }

    fun rectangle(x:Double,y:Double,widthMm:Double,heightMm:Double):List<CadExactPrimitive> {
        val a=point(x,y)
        val width=positiveMm(widthMm,"RECT width")
        val height=positiveMm(heightMm,"RECT height")
        val b=point(a.x+width,a.y)
        val c=point(a.x+width,a.y+height)
        val d=point(a.x,a.y+height)
        return listOf(
            CadExactLine(a,b,true),
            CadExactLine(b,c,true),
            CadExactLine(c,d,true),
            CadExactLine(d,a,true)
        )
    }

    fun circleRadius(cx:Double,cy:Double,radiusMm:Double):List<CadExactPrimitive> =
        listOf(CadExactCircle(point(cx,cy),positiveMm(radiusMm,"CIRCLE radius"),false))

    fun circleDiameter(cx:Double,cy:Double,diameterMm:Double):List<CadExactPrimitive> {
        val diameter=positiveMm(diameterMm,"CIRCLE diameter")
        require(diameter>=CNC_RESOLUTION_MM*2.0) { "CIRCLE diameter must be >= 0.002 mm" }
        return listOf(CadExactCircle(point(cx,cy),diameter/2.0,false))
    }

    fun holeDiameter(cx:Double,cy:Double,diameterMm:Double):List<CadExactPrimitive> {
        val diameter=positiveMm(diameterMm,"HOLE diameter")
        require(diameter>=CNC_RESOLUTION_MM*2.0) { "HOLE diameter must be >= 0.002 mm" }
        return listOf(CadExactCircle(point(cx,cy),diameter/2.0,true))
    }

    fun arcDegrees(
        cx:Double,cy:Double,radiusMm:Double,startDeg:Double,endDeg:Double,clockwise:Boolean
    ):List<CadExactPrimitive> {
        val center=point(cx,cy)
        val radius=positiveMm(radiusMm,"ARC radius")
        require(startDeg.isFinite() && endDeg.isFinite()) { "ARC angles must be finite" }
        var sweep=(endDeg-startDeg)%360.0
        if(sweep<0.0) sweep+=360.0
        require(abs(sweep)>1e-9 && abs(sweep-360.0)>1e-9) { "ARC start/end must define a non-zero sweep" }
        val startRad=Math.toRadians(startDeg)
        val endRad=Math.toRadians(endDeg)
        val start=point(center.x+cos(startRad)*radius,center.y+sin(startRad)*radius)
        val end=point(center.x+cos(endRad)*radius,center.y+sin(endRad)*radius)
        return listOf(CadExactArc(center,radius,start,end,clockwise))
    }
}

object CadAssistViewContract {
    val presets=listOf("TOP","FRONT","RIGHT","ISO","FIT","RESET")
    const val viewOnly=true
    const val doesNotMutateCad=true
    const val doesNotRecalculateCam=true
    const val orbitYawDegrees=360.0
    const val minimumInputMm=0.001
}
