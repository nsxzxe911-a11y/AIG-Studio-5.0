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
    // Common-pocket core: malformed CAD must never be reduced to a valid
    // looking toolpath. Only a single circle or exactly four closed full edges.
    val pocketSettings=CamSettings(toolDiameter=6.0,depth=-2.0,safeZ=8.0,feedMmMin=160.0)
    val pocketCorners=listOf(Vec2(-15.0,-10.0),Vec2(15.0,-10.0),
        Vec2(15.0,10.0),Vec2(-15.0,10.0))
    val fullEdges=(0..3).map { i ->
        Line(id="POCKET_$i",a=pocketCorners[i],b=pocketCorners[(i+1)%4])
    }
    val pocket=CamWorkflowEngine.buildCommonPocket(fullEdges,pocketSettings)
    check(pocket.pathMode==CamPathMode.MANUAL)
    check(pocket.manualPath.count{!it.rapid}>4) {
        "Closed rectangle must produce an actual multi-pass clearing path"
    }
    val pocketCam=CamModel.fromCad(
        90005L,DrawingSnapshot(emptyList()),pocket
    )
    check(pocketCam.toolpaths.flatMap{it.moves}.any{!it.rapid})
    check("G1" in CncPost.generate(pocketCam,FanucPostSettings())) {
        "Valid closed pocket needs real Fanuc cutting motion"
    }
    val circle=Circle(id="POCKET_CIRCLE",center=Vec2(0.0,0.0),radius=14.0)
    check(CamWorkflowEngine.buildCommonPocket(listOf(circle),pocketSettings)
        .manualPath.any{!it.rapid})
    check(runCatching {
        CamWorkflowEngine.buildCommonPocket(
            listOf(circle,fullEdges[0]),pocketSettings
        )
    }.isFailure) { "Mixed CAD entities must not be silently ignored" }
    val missingSide=listOf(fullEdges[0],fullEdges[1],fullEdges[2],
        Line(id="BROKEN_EDGE",a=Vec2(-15.0,10.0),b=Vec2(-15.0,1.0)))
    check(runCatching {
        CamWorkflowEngine.buildCommonPocket(missingSide,pocketSettings)
    }.isFailure) { "Open rectangle must not generate cutting NC" }
    check(runCatching {
        CamWorkflowEngine.buildCommonPocket(
            listOf(fullEdges[0],fullEdges[0].copy(id="DUPLICATE"),
                fullEdges[1],fullEdges[2]),pocketSettings
        )
    }.isFailure) { "Duplicate rectangle edge must fail closed" }
    check(runCatching {
        CamWorkflowEngine.buildCommonPocket(
            listOf(Circle(id="NAN_CIRCLE",center=Vec2(Double.NaN,0.0),radius=14.0)),
            pocketSettings
        )
    }.isFailure) { "Nonfinite cutting coordinates must fail closed" }
    println("STUDIO_COMMON_POCKET_CONTOUR_GATE_PASS|CLOSED_RECT|CIRCLE|FANUC_G1|MIXED_BLOCK|GAP_BLOCK|DUPLICATE_BLOCK|NONFINITE_BLOCK")
    // Source A/B/C posture must survive entry/exit XY correction; only
    // verified Safe-Z neighbors may be moved, never an arbitrary rapid.
    val axisPoints=listOf(
        ManualCamPoint(0.0,0.0,8.0,true,axisA=15.0,axisB=-10.0,axisC=45.0),
        ManualCamPoint(5.0,0.0,-2.0,false,axisA=15.0,axisB=-10.0,axisC=45.0),
        ManualCamPoint(10.0,0.0,-2.0,false,axisA=15.0,axisB=-10.0,axisC=45.0),
        ManualCamPoint(10.0,0.0,8.0,true,axisA=15.0,axisB=-10.0,axisC=45.0)
    )
    val axisManual=pocketSettings.copy(pathMode=CamPathMode.MANUAL,manualPath=axisPoints)
    val movedEntry=CamWorkflowEngine.moveCutEntry(axisManual,6.0,2.0,-2.0)
    check(movedEntry.manualPath[0].let{
        it.rapid && it.x==6.0 && it.y==2.0 && it.z==8.0 && it.axisC==45.0
    })
    val movedExit=CamWorkflowEngine.moveCutExit(movedEntry,12.0,3.0,-2.0)
    check(movedExit.manualPath[3].let{
        it.rapid && it.x==12.0 && it.y==3.0 && it.z==8.0 &&
        it.axisA==15.0 && it.axisB== -10.0 && it.axisC==45.0
    })
    check(axisManual.manualPath==axisPoints) { "Immutable original CAM path must be preserved" }
    val noApproach=axisManual.copy(manualPath=axisPoints.drop(1))
    check(runCatching { CamWorkflowEngine.moveCutEntry(noApproach,8.0,2.0,-2.0) }.isFailure)
    val diagonalRapid=axisManual.copy(
        manualPath=axisPoints.dropLast(1)+ManualCamPoint(20.0,0.0,8.0,true)
    )
    check(runCatching { CamWorkflowEngine.moveCutExit(diagonalRapid,12.0,3.0,-2.0) }.isFailure)
    println("STUDIO_MANUAL_ENTRY_EXIT_GATE_PASS|SAFE_Z_VERTICAL|ABC_RETAIN|UNSAFE_BLOCK|ORIGINAL_PRESERVED")
    // Invalid numeric CAM inputs must be stopped at model creation, not
    // propagated to a bogus NC coordinate or oversized material-removal grid.
    val invalidConfigurations=listOf<()->CamSettings>(
        {CamSettings(toolDiameter=Double.POSITIVE_INFINITY)},
        {CamSettings(depth=Double.NEGATIVE_INFINITY)},
        {CamSettings(safeZ=Double.POSITIVE_INFINITY)},
        {CamSettings(feedMmMin=Double.POSITIVE_INFINITY)},
        {CamSettings(leadInMm=Double.NaN)},
        {CamSettings(leadOutMm=Double.POSITIVE_INFINITY)}
    )
    invalidConfigurations.forEachIndexed { index,invalid ->
        check(runCatching {invalid()}.isFailure) {
            "Invalid CAM model numeric configuration #$index must fail closed"
        }
    }
    println("STUDIO_FINITE_CAM_INPUT_GATE_PASS|TOOL|DEPTH|SAFE_Z|FEED|LEAD_IN|LEAD_OUT")
    // Shared wire-level golden hash must match FastModel's JSON fixture.
    val goldenPoints=listOf(
        AigReadOnlyMotionPoint(0.0,0.0,8.0,rapid=true),
        AigReadOnlyMotionPoint(0.0,0.0,-2.0),
        AigReadOnlyMotionPoint(20.0,0.0,-2.0),
        AigReadOnlyMotionPoint(20.0,0.0,8.0,rapid=true)
    )
    val golden=AigReadOnlyMotionPreview.export(goldenPoints,"3AX",1500.0)
    check("\"sha256\":\"371e8f78e51a412294300e7f832fd0c315041ee69d8d66723fde8541d276f99e\"" in golden){
        "Kotlin CNC exporter and FastModel importer must agree byte-for-byte"
    }
    check(runCatching {
        AigReadOnlyMotionPreview.export(goldenPoints.map{it.copy(rapid=true)},"3AX",1500.0)
    }.isFailure)
    check(runCatching {
        AigReadOnlyMotionPreview.export(goldenPoints.map{it.copy(x=1.0,y=0.0,z=8.0)},"3AX",1500.0)
    }.isFailure)
    check(runCatching {
        AigReadOnlyMotionPreview.export(goldenPoints.mapIndexed { index,p->
            if(index==1)p.copy(c=45.0) else p
        },"5AX",1500.0)
    }.isFailure)
    check(runCatching {
        AigReadOnlyMotionPreview.export(goldenPoints.mapIndexed { index,p->
            if(index==1)p.copy(x=Double.NaN) else p
        },"3AX",1500.0)
    }.isFailure)
    val realPreview=AigReadOnlyMotionPreview.fromCam(cam3x,"3AX")
    check(realPreview.contains("\"sourceDomain\":\"CNC_CAM_SIM\"") &&
        realPreview.contains("\"machineExecutionAllowed\":false") &&
        realPreview.contains("\"humanRiggedAnimation\":false"))
    check(runCatching{AigReadOnlyMotionPreview.fromCam(cam,"5AX")}.isFailure) {
        "A/B/C trajectory must not be mislabeled as verified five-axis motion"
    }
    println("AIG_READONLY_MOTION_INTEROP_CORE_PASS|SHA256_GOLDEN|G0_G1|REAL_TOOLPOINTS|MACHINE_BLOCKED|NO_FAKE_HUMAN_RIG|INVALID_BLOCKED")
    // Existing size-ranking misclassified a separate small workpiece as an
    // inner hole. Nesting and cross-contour collision now drive CAM labels.
    val farCircles=listOf<Entity>(
        Circle(id="OUTER_A",center=Vec2(0.0,0.0),radius=20.0),
        Circle(id="OUTER_B",center=Vec2(60.0,0.0),radius=5.0)
    )
    check(CamFeatureRecognizer.recognize(farCircles).count{
        it.kind==CamFeatureKind.OUTER
    }==2)
    val nestedCircles=listOf<Entity>(
        Circle(id="RING_1",center=Vec2(0.0,0.0),radius=30.0),
        Circle(id="RING_2",center=Vec2(0.0,0.0),radius=12.0),
        Circle(id="RING_3",center=Vec2(0.0,0.0),radius=3.0)
    )
    val nesting=CamFeatureRecognizer.recognize(nestedCircles)
    check(nesting.count{it.kind==CamFeatureKind.OUTER}==2 &&
        nesting.count{it.kind==CamFeatureKind.INNER}==1)
    val bowtie=listOf(
        Vec2(0.0,0.0),Vec2(10.0,10.0),Vec2(0.0,10.0),
        Vec2(10.0,0.0),Vec2(0.0,0.0)
    )
    check(CadClosedContourTopology.inspect(bowtie)==null)
    val crossedLines=(0..3).map{index->
        Line(id="BOWTIE_$index",a=bowtie[index],b=bowtie[index+1])
    }
    check(CamFeatureRecognizer.recognize(crossedLines).isEmpty()) {
        "Self-intersecting CAD may not be recognized as a cut profile"
    }
    check(CadClosedContourTopology.inspect(listOf(Vec2(0.0,0.0),
        Vec2(10.0,0.0),Vec2(Double.NaN,10.0),Vec2(0.0,0.0)))==null)
    val overlappingRectangles=(0..3).map{ i->
        val a=listOf(Vec2(0.0,0.0),Vec2(20.0,0.0),
            Vec2(20.0,20.0),Vec2(0.0,20.0))
        Line(id="A_$i",a=a[i],b=a[(i+1)%4])
    }+(0..3).map{ i->
        val b=listOf(Vec2(10.0,10.0),Vec2(30.0,10.0),
            Vec2(30.0,30.0),Vec2(10.0,30.0))
        Line(id="B_$i",a=b[i],b=b[(i+1)%4])
    }
    check(runCatching{CamFeatureRecognizer.recognize(overlappingRectangles)}.isFailure) {
        "Intersecting CAD contours must not be assigned CAM roles"
    }
    check(runCatching{
        CamModel.fromCad(90009L,DrawingSnapshot(crossedLines),CamSettings())
    }.isFailure) { "Actual AUTO CAM must block bowtie before NC post" }
    check(runCatching{
        CamModel.fromCad(90010L,DrawingSnapshot(overlappingRectangles),CamSettings())
    }.isFailure) { "Actual AUTO CAM must block overlapping closed profiles" }
    val validOpen=CamModel.fromCad(90011L,
        DrawingSnapshot(listOf(Line(id="OPEN_LINE",a=Vec2(0.0,0.0),
            b=Vec2(25.0,0.0)))),CamSettings())
    check(validOpen.toolpaths.flatMap{it.moves}.any{!it.rapid}) {
        "Legitimate open CAD line workflow must remain operational"
    }
    println("STUDIO_CAD_TO_CAM_SAFETY_GATE_PASS|BOWTIE_BLOCKS_NC|OVERLAP_BLOCKS_NC|OPEN_LINE_RETAINED")
    println("STUDIO_CAD_TOPOLOGY_GATE_PASS|SEPARATE_OUTER|NESTED_HOLE|ISLAND|SELF_INTERSECTION_BLOCK|OVERLAP_BLOCK|NONFINITE_BLOCK")
    // Analytic CAD rather than raster pixels or sampled intersections.
    fun near(actual:Double,expected:Double)=kotlin.math.abs(actual-expected)<1e-8
    val analytic=AigAnalyticCadKernel
    val crossing=analytic.segmentSegment(Vec2(0.0,0.0),Vec2(10.0,10.0),
        Vec2(0.0,10.0),Vec2(10.0,0.0))
    check(crossing.size==1 && near(crossing[0].x,5.0) && near(crossing[0].y,5.0))
    check(analytic.segmentSegment(Vec2(0.0,0.0),Vec2(1.0,0.0),
        Vec2(0.0,1.0),Vec2(1.0,1.0)).isEmpty())
    check(runCatching{analytic.segmentSegment(Vec2(0.0,0.0),Vec2(5.0,0.0),
        Vec2(2.0,0.0),Vec2(8.0,0.0))}.isFailure)
    val circleHits=analytic.segmentCircle(Vec2(-10.0,0.0),Vec2(10.0,0.0),
        Vec2(0.0,0.0),5.0)
    check(circleHits.size==2 && near(circleHits[0].x,-5.0) &&
        near(circleHits[1].x,5.0))
    val tangent=analytic.segmentCircle(Vec2(-5.0,5.0),Vec2(5.0,5.0),
        Vec2(0.0,0.0),5.0)
    check(tangent.size==1 && near(tangent[0].y,5.0))
    val circles=analytic.circleCircle(Vec2(0.0,0.0),5.0,
        Vec2(10.0,0.0),5.0)
    check(circles.size==1 && near(circles[0].x,5.0))
    val onlyQuarter=analytic.segmentArc(Vec2(-2.0,0.0),Vec2(2.0,0.0),
        AigAnalyticCadKernel.ArcSpec(Vec2(0.0,0.0),1.0,0.0,Math.PI/2))
    check(onlyQuarter.size==1 && near(onlyQuarter[0].x,1.0))
    val square=listOf(Vec2(0.0,0.0),Vec2(10.0,0.0),
        Vec2(10.0,10.0),Vec2(0.0,10.0),Vec2(0.0,0.0))
    val outside=analytic.offsetClosedConvex(square,2.0)
    val inside=analytic.offsetClosedConvex(square,-2.0)
    check(outside.size==5 && near(outside[0].x,-2.0) &&
        near(outside[0].y,-2.0) && near(outside[2].x,12.0))
    check(inside.size==5 && near(inside[0].x,2.0) &&
        near(inside[0].y,2.0) && near(inside[2].x,8.0))
    check(runCatching{analytic.offsetClosedConvex(square,-6.0)}.isFailure)
    val concave=listOf(Vec2(0.0,0.0),Vec2(4.0,0.0),
        Vec2(4.0,4.0),Vec2(2.0,1.0),Vec2(0.0,4.0),Vec2(0.0,0.0))
    check(runCatching{analytic.offsetClosedConvex(concave,1.0)}.isFailure)
    val vertices=listOf(Triple(0.0,0.0,0.0),Triple(1.0,0.0,0.0),
        Triple(0.0,1.0,0.0),Triple(0.0,0.0,1.0))
    val faces=listOf(Triple(0,2,1),Triple(0,1,3),Triple(0,3,2),Triple(1,2,3))
    val shell=AigTriangleShellTopology.requireClosed(vertices,faces)
    check(shell.uniqueEdges==6 && shell.faceCount==4 &&
        near(shell.absVolumeMm3,1.0/6.0))
    check(runCatching {
        AigTriangleShellTopology.requireClosed(vertices,faces.dropLast(1))
    }.isFailure)
    check(runCatching {
        AigTriangleShellTopology.requireClosed(vertices,faces.dropLast(1)+Triple(1,3,2))
    }.isFailure)
    val nativeCross=AigNativeCadGeometryQueries.intersections(
        Line(id="NCROSS_A",a=Vec2(0.0,0.0),b=Vec2(10.0,10.0)),
        Line(id="NCROSS_B",a=Vec2(0.0,10.0),b=Vec2(10.0,0.0)))
    check(nativeCross.size==1 && near(nativeCross.single().x,5.0))
    val nativeTangent=AigNativeCadGeometryQueries.intersections(
        Line(id="TANGENT",a=Vec2(-5.0,5.0),b=Vec2(5.0,5.0)),
        Circle(id="NCIRCLE",center=Vec2(0.0,0.0),radius=5.0))
    check(nativeTangent.size==1 && near(nativeTangent.single().y,5.0))
    val edges=(0..3).map { i ->
        val p=listOf(Vec2(0.0,0.0),Vec2(10.0,0.0),
            Vec2(10.0,10.0),Vec2(0.0,10.0))
        Line(id="OFFSET_$i",a=p[i],b=p[(i+1)%4])
    }
    val nativeOffset=AigNativeCadGeometryQueries.offsetClosedLineContour(edges,1.5)
    check(nativeOffset.size==5 && near(nativeOffset[0].x,-1.5))
    check(runCatching{AigNativeCadGeometryQueries.offsetClosedLineContour(edges,-6.0)}.isFailure)
    println("AIG_NATIVE_CAD_ENTITY_BRIDGE_PASS|LINE_LINE|LINE_CIRCLE|CLOSED_OFFSET|COLLAPSE_BLOCK")
    println("AIG_ANALYTIC_GEOMETRY_GATE_PASS|LINE_LINE|LINE_CIRCLE|CIRCLE_TANGENT|ARC_SWEEP|CONVEX_OFFSET|INSIDE_COLLAPSE_BLOCK|CONCAVE_BLOCK|3D_CLOSED_SHELL|OPEN_OR_INVERTED_SHELL_BLOCK")
    val drawingLine=Line(id="DRAWING-LINE-86001",
        a=Vec2(0.0,0.0),b=Vec2(30.0,40.0))
    val drawingHole=Circle(id="DRAWING-HOLE-86002",
        center=Vec2(20.0,10.0),radius=5.0)
    val (mechanicalLine,measuredLength)=AigMechanicalNativeBridge.line(
        drawingLine,"FEAT-LINE","DIM-50",0.01,-0.02)
    val (mechanicalHole,measuredDiameter)=AigMechanicalNativeBridge.designatedHole(
        drawingHole,"FEAT-HOLE","DIM-10",12.0,0.005,-0.005)
    val nativeMechanicalEntities=setOf(drawingLine.id,drawingHole.id)
    check(kotlin.math.abs(measuredLength.nominal-50.0)<1e-9)
    check(kotlin.math.abs(measuredDiameter.nominal-10.0)<1e-9)
    check(kotlin.math.abs(mechanicalHole.nominalDepthMm!!-12.0)<1e-9)
    val mechanicalSheet=AigMechanicalDrawingSheet(
        drawingNumber="AIG-PLATE-01",revision="R1",partNumber="PLATE-01",
        material="S45C",projectionStandard=AigMechanicalStandard.ISO_GPS,
        features=listOf(mechanicalLine,mechanicalHole),
        views=listOf(
            AigMechanicalView("VIEW-FRONT",AigMechanicalViewKind.FRONT,
                setOf("FEAT-LINE","FEAT-HOLE")),
            AigMechanicalView("VIEW-SECTION-A",AigMechanicalViewKind.SECTION,
                setOf("FEAT-HOLE"),sectionReference="A-A")
        ),
        dimensions=listOf(measuredLength,measuredDiameter),
        datums=listOf(AigMechanicalDatum("A","FEAT-LINE")),
        frames=listOf(AigMechanicalGdtFrame("GDT-HOLE",
            AigMechanicalGdtKind.POSITION,"FEAT-HOLE",0.02,listOf("A"))),
        billOfMaterials=listOf(
            AigMechanicalBomRow("PLATE-01","Machined plate",1)),
        notes=listOf("G90 master X0.000 Y0.000; datum A is design intent")
    )
    val mechanicalAudit=AigMechanicalDrawingCore.audit(
        mechanicalSheet,nativeMechanicalEntities)
    check(mechanicalAudit.featureCount==2&&mechanicalAudit.viewCount==2&&
        mechanicalAudit.dimensionCount==2&&
        mechanicalAudit.nativeGeometryReferencesVerified&&
        mechanicalAudit.gdtCrossReferencesValidated&&
        !mechanicalAudit.gdtStandardFullyCertified&&
        !mechanicalAudit.manufacturingInstructionsGenerated&&
        !mechanicalAudit.machineExecutionAllowed){
        "Drawing evidence MUST NOT masquerade as GD&T validation or Fanuc NC"
    }
    val holeGrid=AigMechanicalDrawingCore.rectangularHoleCenters(
        Vec2(10.0,20.0),3,2,30.0,15.0)
    check(holeGrid.size==6&&holeGrid.first()==Vec2(10.0,20.0)&&
        holeGrid.last()==Vec2(70.0,35.0))
    check(runCatching {
        AigMechanicalDrawingCore.rectangularHoleCenters(
            Vec2(0.0,0.0),3,2,-30.0,15.0)
    }.isFailure)
    check(runCatching{AigMechanicalDrawingCore.audit(
        mechanicalSheet,nativeMechanicalEntities-setOf(measuredDiameter.nativeEntityId)
    )}.isFailure){"Must block drawing on deleted native CAD geometry"}
    check(runCatching{AigMechanicalDrawingCore.audit(mechanicalSheet.copy(
        dimensions=mechanicalSheet.dimensions+measuredDiameter.copy(
            id="DUP-FAIL",nativeEntityId="NOT-AN-ENTITY")),nativeMechanicalEntities
    )}.isFailure)
    check(runCatching{AigMechanicalDrawingCore.audit(mechanicalSheet.copy(
        dimensions=mechanicalSheet.dimensions.map {d->
            if(d.id=="DIM-10")d.copy(plusTolerance=-0.001) else d
        }),nativeMechanicalEntities
    )}.isFailure)
    check(runCatching{AigMechanicalDrawingCore.audit(mechanicalSheet.copy(
        datums=emptyList()),nativeMechanicalEntities
    )}.isFailure){"Dangling datum references may not be called valid GD&T"}
    check(runCatching{AigMechanicalDrawingCore.audit(mechanicalSheet.copy(
        views=listOf(AigMechanicalView("BAD-SECTION",AigMechanicalViewKind.SECTION,
            setOf("FEAT-HOLE")))),nativeMechanicalEntities
    )}.isFailure)
    check(runCatching{AigMechanicalDrawingCore.audit(mechanicalSheet.copy(
        features=listOf(mechanicalLine,mechanicalLine)),nativeMechanicalEntities
    )}.isFailure)
    println("AIG_MECHANICAL_DRAWING_CORE_GATE_PASS|ACTUAL_NATIVE_LINE_50MM|ACTUAL_HOLE_D10|DEPTH_12|FRONT_SECTION|DATUM_GDT_REFERENCES|BOM|HOLE_GRID|DANGLING_BLOCKED|TOLERANCE_BLOCKED|NO_FAKE_FANUC_NC")
    println("STUDIO_CORE_RECOVERY_SMOKE_PASS|EMPTY_CAD_MANUAL|NO_FAKE_G0_ONLY|REAL_FEED|REMOVAL_CELLS|3AX_FANUC_G0_G1|6AX_C_NC_BLOCKED|ABC_PERSIST|NC_PERSIST|V3_ATOMIC_SAVE|CAD_AUTO_SIM_NC|NC_FIRST_EVENTS")
}
