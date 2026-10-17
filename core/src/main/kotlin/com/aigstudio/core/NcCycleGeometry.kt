package com.aigstudio.core

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

object NcCycleGeometry {
    fun circularPattern(
        centerX:Double,
        centerY:Double,
        radius:Double,
        holeCount:Int,
        startAngleDeg:Double,
    ):List<Pair<Double,Double>> {
        require(listOf(centerX,centerY,radius,startAngleDeg).all{it.isFinite()}){"G34 circular-pattern values must be finite"}
        require(radius>0.0){"G34 pattern radius must be positive"}
        require(holeCount>=1){"G34 hole count must be >= 1"}
        val step=360.0/holeCount
        return (0 until holeCount).map { index ->
            val angle=(startAngleDeg+step*index)*PI/180.0
            centerX+radius*cos(angle) to centerY+radius*sin(angle)
        }
    }

    fun peckDepths(retractR:Double,depthZ:Double,peckQ:Double):List<Double> {
        require(retractR.isFinite() && depthZ.isFinite() && peckQ.isFinite()){"Canned-cycle depths must be finite"}
        require(retractR>depthZ){"R plane must be above drilling depth"}
        require(peckQ>0.0){"Peck Q must be positive"}
        val out=mutableListOf<Double>()
        var z=retractR
        while(z-peckQ>depthZ){ z-=peckQ;out+=z }
        if(out.lastOrNull()!=depthZ)out+=depthZ
        return out
    }
}
