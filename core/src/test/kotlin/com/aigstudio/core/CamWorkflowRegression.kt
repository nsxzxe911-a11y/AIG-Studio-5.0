package com.aigstudio.core

fun main() {
    val base=CamSettings(
        safeZ=5.0,
        depth=-2.0,
        pathMode=CamPathMode.MANUAL,
        manualPath=listOf(
            ManualCamPoint(0.0,0.0,-2.0,false,axisA=10.0,axisB=20.0,axisC=30.0),
            ManualCamPoint(10.0,0.0,-2.0,false,axisA=10.0,axisB=20.0,axisC=30.0),
            ManualCamPoint(20.0,0.0,-2.0,false,axisA=10.0,axisB=20.0,axisC=30.0)
        )
    )

    check(CamWorkflowEngine.profile(CamMachiningIntent.WORKPIECE_OUTER).side==ContourSide.OUTSIDE)
    check(CamWorkflowEngine.profile(CamMachiningIntent.INNER_CONTOUR).side==ContourSide.INSIDE)
    check(CamWorkflowEngine.profile(CamMachiningIntent.MOLD_POCKET).side==ContourSide.INSIDE)
    check(CamWorkflowEngine.profile(CamMachiningIntent.MOLD_POCKET).pocket)
    check(CamWorkflowEngine.profile(CamMachiningIntent.MOLD_CORE).side==ContourSide.OUTSIDE)

    val bypass=CamWorkflowEngine.insertFixtureBypass(
        base,afterIndex=0,liftZ=8.0,safeX=3.0,safeY=4.0,
        landingX=15.0,landingY=6.0,landingZ=-2.0
    )
    check(bypass.manualPath.size==base.manualPath.size+4)
    val inserted=bypass.manualPath.subList(1,5)
    check(inserted[0].rapid && inserted[0].x==0.0 && inserted[0].y==0.0 && inserted[0].z==8.0)
    check(inserted[1].rapid && inserted[1].x==3.0 && inserted[1].y==4.0 && inserted[1].z==8.0)
    check(inserted[2].rapid && inserted[2].x==15.0 && inserted[2].y==6.0 && inserted[2].z==8.0)
    check(!inserted[3].rapid && inserted[3].x==15.0 && inserted[3].y==6.0 && inserted[3].z==-2.0)
    check(inserted.all{it.axisA==10.0 && it.axisB==20.0 && it.axisC==30.0})

    val reversed=CamWorkflowEngine.reverseLinearCutSpan(base,0,2)
    check(reversed.manualPath.map{it.x}==listOf(20.0,10.0,0.0))

    val movedEntry=CamWorkflowEngine.moveCutEntry(base,2.0,3.0,-1.0)
    check(movedEntry.manualPath.first{!it.rapid}.let{it.x==2.0 && it.y==3.0 && it.z==-1.0})
    val movedExit=CamWorkflowEngine.moveCutExit(base,25.0,7.0,-2.5)
    check(movedExit.manualPath.last{!it.rapid}.let{it.x==25.0 && it.y==7.0 && it.z==-2.5})

    check(CamWorkflowEngine.uiActions==listOf("外銑","內銑","型腔","方向","起/落刀","避讓壓板","Safe-Z"))
    println("STUDIO_CAM_WORKFLOW_PASS|OUTSIDE|INSIDE|MOLD|REVERSE|ENTRY_EXIT|SAFE_WAYPOINT|ABC")
}
