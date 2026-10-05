package com.aigstudio.core

fun main() {
    val settings=CamSettings(
        safeZ=5.0,
        pathMode=CamPathMode.MANUAL,
        manualPath=listOf(
            ManualCamPoint(0.0,0.0,5.0,true,axisA=10.0,axisB=20.0,axisC=30.0),
            ManualCamPoint(10.0,0.0,8.0,true,axisA=10.0,axisB=20.0,axisC=30.0),
            ManualCamPoint(10.0,0.0,-2.0,false,axisA=10.0,axisB=20.0,axisC=30.0)
        )
    )
    val raised=CamWorkflowEngine.updateSafeZ(settings,12.0)
    check(raised.safeZ==12.0)
    check(raised.manualPath.filter{it.rapid}.all{it.z>=12.0})
    check(raised.manualPath.last().z==-2.0)
    check(raised.manualPath.all{it.axisA==10.0 && it.axisB==20.0 && it.axisC==30.0})
    println("STUDIO_CAM_SAFE_Z_PASS|RAPID_RAISED|CUT_UNCHANGED|ABC")
}
