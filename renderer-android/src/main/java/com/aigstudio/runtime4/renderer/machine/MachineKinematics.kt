package com.aigstudio.runtime4.renderer.machine

import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

object MachineKinematics {
    fun rotatePoint(point:MachineVec3,pivot:MachineVec3,direction:MachineVec3,degrees:Double):MachineVec3 {
        val len=sqrt((direction.x*direction.x+direction.y*direction.y+direction.z*direction.z).toDouble());require(len>1e-9)
        val ux=direction.x/len;val uy=direction.y/len;val uz=direction.z/len;val x=point.x-pivot.x;val y=point.y-pivot.y;val z=point.z-pivot.z
        val rad=Math.toRadians(degrees);val c=cos(rad);val s=sin(rad);val dot=ux*x+uy*y+uz*z
        val rx=x*c+(uy*z-uz*y)*s+ux*dot*(1.0-c);val ry=y*c+(uz*x-ux*z)*s+uy*dot*(1.0-c);val rz=z*c+(ux*y-uy*x)*s+uz*dot*(1.0-c)
        return MachineVec3((pivot.x+rx).toFloat(),(pivot.y+ry).toFloat(),(pivot.z+rz).toFloat())
    }
}