package com.aigstudio.core

import kotlin.math.abs
import kotlin.math.sqrt

private fun near(a:Double,b:Double,eps:Double=1e-9)=abs(a-b)<=eps

fun main() {
    check(SixAxisToolDirectionContract.Z_IS_LINEAR)
    check(SixAxisToolDirectionContract.SHOW_TOOL_AXIS_ARROW)
    check(SixAxisToolDirectionContract.SHOW_CONTACT_POINT)
    check(SixAxisToolDirectionContract.viewActions == listOf("加工視角","刀軸視角","側視","上視"))

    val down=SixAxisToolDirectionContract.fromTiltAzimuth(0.0,0.0)
    check(near(down.x,0.0) && near(down.y,0.0) && near(down.z,-1.0))

    val tilt45=SixAxisToolDirectionContract.fromTiltAzimuth(45.0,0.0)
    check(near(tilt45.x,sqrt(0.5)))
    check(near(tilt45.y,0.0))
    check(near(tilt45.z,-sqrt(0.5)))
    check(near(tilt45.length(),1.0))

    val side90=SixAxisToolDirectionContract.fromTiltAzimuth(90.0,0.0)
    check(near(side90.x,1.0) && near(side90.z,0.0,1e-8))

    val flipped=SixAxisToolDirectionContract.fromTiltAzimuth(180.0,0.0)
    check(near(flipped.x,0.0,1e-8) && near(flipped.z,1.0))

    val ySide=SixAxisToolDirectionContract.fromTiltAzimuth(90.0,90.0)
    check(near(ySide.x,0.0,1e-8) && near(ySide.y,1.0) && near(ySide.z,0.0,1e-8))

    check(SixAxisToolDirectionContract.preset(SixAxisToolPreset.SIDE_45).tiltDeg == 45.0)
    check(SixAxisToolDirectionContract.preset(SixAxisToolPreset.SIDE_90).tiltDeg == 90.0)
    check(SixAxisToolDirectionContract.preset(SixAxisToolPreset.FLIP_180).tiltDeg == 180.0)

    val camera0=SixAxisToolDirectionContract.cameraAnglesAlongTool(0.0,0.0)
    check(near(camera0.first,0.0) && near(camera0.second,0.0))
    val cameraB90=SixAxisToolDirectionContract.cameraAnglesAlongTool(0.0,90.0)
    check(near(cameraB90.first,0.0,1e-8))
    check(near(cameraB90.second,-90.0,1e-8))
    val cameraA45=SixAxisToolDirectionContract.cameraAnglesAlongTool(45.0,0.0)
    check(near(cameraA45.first,-45.0,1e-8))

    println("STUDIO_6AX_TOOL_DIRECTION_PASS|0|45|90|180|VECTOR|CONTACT|TOOL_CAMERA|Z_LINEAR")
}
