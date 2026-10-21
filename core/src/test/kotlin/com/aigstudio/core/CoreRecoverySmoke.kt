package com.aigstudio.core

import java.nio.file.Files

/** Focused existing-core execution. Does not certify 6-axis machine motion. */
fun main() {
    val settings=CamSettings(toolDiameter=6.0,depth=-2.0,safeZ=8.0,feedMmMin=160.0)
    val draft=ManualCamPathEngine.startBlank(settings,0.0,0.0)
    check(draft.pathMode==CamPathMode.MANUAL)
    check(draft.manualPath.all{it.rapid})
    check(runCatching{CamModel.fromCad(90001L,DrawingSnapshot(emptyList()),draft)}.isFailure) {
        "All-G0 manual draft is NOT machined geometry"
    }
    val ready=ManualCamPathEngine.replacePoint(
        draft,index=1,x=12.0,y=3.0,z=-2.0,rapid=false,
        axisA=15.0,axisB=-10.0,axisC=45.0
    )
    val cam=CamModel.fromCad(90002L,DrawingSnapshot(emptyList()),ready)
    val moves=cam.toolpaths.flatMap{it.moves}
    check(moves.size>=2 && moves.any{!it.rapid})
    check(moves.last().axisA==15.0 && moves.last().axisB == -10.0 &&
          moves.last().axisC==45.0) { "MANUAL A/B/C motion disappeared" }
    val stock=Stock3D.fromSnapshot(
        DrawingSnapshot(emptyList()),margin=8.0,thickness=20.0,
        manualPath=ready.manualPath
    )
    val removal=MaterialRemoval3D.simulate(cam.toolpaths,ready,stock)
    check(removal.depth.any{it<0.0}) { "Simulation must remove material, not only draw a path" }
    // The C-axis points are real data, but six-axis TCP/kinematics is NOT certified.
    // Never disable this safety guard merely to make an integration test pass.
    val unsafePost=runCatching{CncPost.generate(cam,FanucPostSettings())}.exceptionOrNull()
    check(unsafePost is IllegalArgumentException &&
        unsafePost.message?.contains("6AX_C_AXIS_NC_POST_BLOCKED")==true) {
        "Unverified 6AX C-axis NC output must fail closed"
    }
    // Verify supported 3-axis Fanuc emission separately from unsafe six-axis NC.
    val safe3x=ManualCamPathEngine.replacePoint(
        draft,index=1,x=12.0,y=3.0,z=-2.0,rapid=false,
        axisA=0.0,axisB=0.0,axisC=0.0
    )
    val cam3x=CamModel.fromCad(90003L,DrawingSnapshot(emptyList()),safe3x)
    val posted=CncPost.generate(cam3x,FanucPostSettings())
    check("G0" in posted && "G1" in posted) { "Verified 3-axis Fanuc G0/G1 must generate NC" }
    // True CAD → AUTO CAM → removal → supported 3AX Fanuc NC.
    val cadDoc=DrawingDocument()
    val corners=listOf(Vec2(-15.0,-10.0),Vec2(15.0,-10.0),
        Vec2(15.0,10.0),Vec2(-15.0,10.0))
    for(i in corners.indices)cadDoc.put(Line(
        id="RECT_"+i,a=corners[i],b=corners[(i+1)%corners.size]
    ))
    check(cadDoc.size()==4)
    val cadSettings=CamSettings(toolDiameter=6.0,depth=-2.0,safeZ=8.0,feedMmMin=160.0)
    val autoCam=CamModel.fromCad(90004L,cadDoc.snapshot(),cadSettings)
    check(autoCam.toolpaths.flatMap{it.moves}.count{!it.rapid}>=4) {
        "CAD AUTO CAM must generate actual cutting segments"
    }
    val autoStock=Stock3D.fromSnapshot(cadDoc.snapshot())
    val autoRemoval=MaterialRemoval3D.simulate(autoCam.toolpaths,cadSettings,autoStock)
    check(autoRemoval.depth.any{it<0.0}) {
        "CAD AUTO→SIM must remove numeric material, not only render lines"
    }
    val cadNc=CncPost.generate(autoCam,FanucPostSettings())
    check("G0" in cadNc && "G1" in cadNc) { "CAD AUTO needs real 3AX Fanuc NC" }
    // NC-first event parser can run alone without a CAD file. This is
    // *not* a proof that full 6AX NC-first physical stock removal is ready.
    val directNc=NcExecutionTimeline.build(
        "G90 G54\nG0 X0. Y0. Z8.\nG1 Z-2. F160.\nG1 X10.",
        CncControllerProfile.FANUC
    )
    check(directNc.any{it.action=="CUT_LINEAR" && it.executable})
    val doc=DrawingDocument()
    val source=StudioProjectRepository.capture(
        doc,ready,axisA=15.0,axisB=-10.0,axisMode="6AX",
        ncText="G90 G54\nG0 X0. Y0. Z8.\nG1 Z-2. F160.",
        axisC=45.0
    )
    val file=Files.createTempFile("aig-studio-core-recovery-", ".aigp").toFile()
    try {
        StudioProjectRepository.save(source,file)
        val loaded=StudioProjectRepository.load(file)
        check(loaded.camSettings.pathMode==CamPathMode.MANUAL)
        check(loaded.camSettings.manualPath==ready.manualPath)
        check(loaded.axisMode=="6AX"&&loaded.axisA==15.0&&
              loaded.axisB == -10.0&&loaded.axisC==45.0)
        check(loaded.ncText==source.ncText)
    } finally { file.delete() }
    println("STUDIO_CORE_RECOVERY_SMOKE_PASS|EMPTY_CAD_MANUAL|NO_FAKE_G0_ONLY|REAL_FEED|REMOVAL_CELLS|3AX_FANUC_G0_G1|6AX_C_NC_BLOCKED|ABC_PERSIST|NC_PERSIST|V3_ATOMIC_SAVE|CAD_AUTO_SIM_NC|NC_FIRST_EVENTS")
}
