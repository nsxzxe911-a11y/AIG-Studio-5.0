package com.aigstudio.core

import kotlin.math.*

data class ToolDirectionVector(val x:Double,val y:Double,val z:Double) {
    fun length():Double=sqrt(x*x+y*y+z*z)
    fun normalized():ToolDirectionVector {
        val n=length()
        require(n>1e-12){"Zero tool direction"}
        return ToolDirectionVector(x/n,y/n,z/n)
    }
}

enum class SixAxisToolPreset { DOWN_0, SIDE_45, SIDE_90, FLIP_180 }

data class SixAxisToolPresetState(
    val preset:SixAxisToolPreset,
    val tiltDeg:Double,
    val label:String
)

data class SixAxisToolDirectionHud(
    val axisA:Double,
    val axisB:Double,
    val axisC:Double,
    val tiltDeg:Double,
    val vector:ToolDirectionVector,
    val nearestPreset:SixAxisToolPreset
)

object SixAxisToolDirectionContract {
    const val Z_IS_LINEAR=true
    const val SHOW_TOOL_AXIS_ARROW=true
    const val SHOW_CONTACT_POINT=true
    const val SHOW_PREVIOUS_POSE_GHOST=true
    val viewActions=listOf("加工視角","刀軸視角","側視","上視")

    private val states=mapOf(
        SixAxisToolPreset.DOWN_0 to SixAxisToolPresetState(SixAxisToolPreset.DOWN_0,0.0,"0° 正下銑"),
        SixAxisToolPreset.SIDE_45 to SixAxisToolPresetState(SixAxisToolPreset.SIDE_45,45.0,"45° 斜側銑"),
        SixAxisToolPreset.SIDE_90 to SixAxisToolPresetState(SixAxisToolPreset.SIDE_90,90.0,"90° 側銑"),
        SixAxisToolPreset.FLIP_180 to SixAxisToolPresetState(SixAxisToolPreset.FLIP_180,180.0,"180° 對側銑")
    )

    fun preset(id:SixAxisToolPreset):SixAxisToolPresetState=states.getValue(id)

    /** Cutting direction. 0° points down -Z, 180° points toward +Z. */
    fun fromTiltAzimuth(tiltDeg:Double,azimuthDeg:Double):ToolDirectionVector {
        require(tiltDeg.isFinite() && azimuthDeg.isFinite()){"Non-finite tool direction"}
        require(tiltDeg in 0.0..180.0){"Tool tilt must be 0..180 degrees"}
        val t=Math.toRadians(tiltDeg)
        val a=Math.toRadians(azimuthDeg)
        return ToolDirectionVector(
            sin(t)*cos(a),
            sin(t)*sin(a),
            -cos(t)
        ).normalized()
    }

    /**
     * A/B determine tool tilt; C is reported in the HUD but does not change the
     * cutting-axis vector because it is rotation about the spindle/tool axis.
     * Formula matches the existing A/B machine-kinematic convention, inverted
     * from shank direction to cutting direction.
     */
    fun fromRotaryAB(axisA:Double,axisB:Double):ToolDirectionVector {
        require(axisA.isFinite() && axisB.isFinite()){"Non-finite rotary axis"}
        val a=Math.toRadians(axisA)
        val b=Math.toRadians(axisB)
        return ToolDirectionVector(
            -cos(a)*sin(b),
            sin(a),
            -cos(a)*cos(b)
        ).normalized()
    }

    fun tiltFromVector(vector:ToolDirectionVector):Double {
        val v=vector.normalized()
        return Math.toDegrees(acos((-v.z).coerceIn(-1.0,1.0)))
    }

    fun nearestPreset(tiltDeg:Double):SixAxisToolPreset =
        states.values.minBy { abs(it.tiltDeg-tiltDeg) }.preset

    fun hud(axisA:Double,axisB:Double,axisC:Double):SixAxisToolDirectionHud {
        require(axisC.isFinite()){"Non-finite C axis"}
        val vector=fromRotaryAB(axisA,axisB)
        val tilt=tiltFromVector(vector)
        return SixAxisToolDirectionHud(axisA,axisB,axisC,tilt,vector,nearestPreset(tilt))
    }

    /** Camera rotations that make the tool shank point into screen depth. */
    fun cameraAnglesAlongTool(axisA:Double,axisB:Double):Pair<Double,Double> {
        val cut=fromRotaryAB(axisA,axisB)
        val shank=ToolDirectionVector(-cut.x,-cut.y,-cut.z)
        val rotateX=Math.toDegrees(atan2(shank.y,shank.z))
        val zAfterX=hypot(shank.y,shank.z)
        val rotateY=Math.toDegrees(atan2(-shank.x,zAfterX))
        return rotateX to rotateY
    }
}
