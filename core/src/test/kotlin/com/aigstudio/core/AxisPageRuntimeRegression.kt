package com.aigstudio.core

private fun axisCmd(page:PageId,subpage:String,id:String,vararg args:Pair<String,String>)=
    PageCommand(page,PageCatalog.requireSubpage(subpage),id,mapOf(*args))

fun main(){
    val ax3=AxisPageRuntime(PageId.AX3)
    val ax4=AxisPageRuntime(PageId.AX4)
    val ax5=AxisPageRuntime(PageId.AX5)
    val ax6=AxisPageRuntime(PageId.AX6)

    check(ax3.dispatch(axisCmd(PageId.AX3,"3AX.MACHINE","3AX.MACHINE.JOG_X_POS","step" to "2.5")) is PageResult.Accepted)
    check(ax3.snapshot().state["X"]=="2.5")
    check(ax3.dispatch(axisCmd(PageId.AX3,"3AX.MACHINE","3AX.MACHINE.JOG_Z_NEG","step" to "1")) is PageResult.Accepted)
    check(ax3.snapshot().state["Z"]=="-1.0")

    check(ax4.dispatch(axisCmd(PageId.AX4,"4AX.MACHINE","4AX.MACHINE.JOG_A_POS","step" to "15")) is PageResult.Accepted)
    check(ax4.snapshot().state["A"]=="15.0")
    val ax4Before=ax4.snapshot()
    check(ax4.dispatch(axisCmd(PageId.AX4,"4AX.MACHINE","4AX.MACHINE.JOG_B_POS","step" to "5")) is PageResult.Rejected)
    check(ax4.snapshot()==ax4Before)

    check(ax5.dispatch(axisCmd(PageId.AX5,"5AX.MACHINE","5AX.MACHINE.JOG_A_POS","step" to "10")) is PageResult.Accepted)
    check(ax5.dispatch(axisCmd(PageId.AX5,"5AX.MACHINE","5AX.MACHINE.JOG_B_NEG","step" to "20")) is PageResult.Accepted)
    check(ax5.snapshot().state["A"]=="10.0" && ax5.snapshot().state["B"]=="-20.0")
    val ax5Before=ax5.snapshot()
    check(ax5.dispatch(axisCmd(PageId.AX5,"5AX.MACHINE","5AX.MACHINE.JOG_C_POS","step" to "5")) is PageResult.Rejected)
    check(ax5.snapshot()==ax5Before)

    check(ax6.dispatch(axisCmd(PageId.AX6,"6AX.MACHINE","6AX.MACHINE.JOG_A_POS","step" to "10")) is PageResult.Accepted)
    check(ax6.dispatch(axisCmd(PageId.AX6,"6AX.MACHINE","6AX.MACHINE.JOG_B_POS","step" to "20")) is PageResult.Accepted)
    check(ax6.dispatch(axisCmd(PageId.AX6,"6AX.MACHINE","6AX.MACHINE.JOG_C_NEG","step" to "30")) is PageResult.Accepted)
    check(ax6.snapshot().state["A"]=="10.0" && ax6.snapshot().state["B"]=="20.0" && ax6.snapshot().state["C"]=="-30.0")

    val view=ax6.dispatch(axisCmd(PageId.AX6,"6AX.MACHINE","6AX.MACHINE.VIEW","preset" to "FULL_MACHINE")) as PageResult.Accepted
    check(view.evidence["visibleRotaryAxes"]=="A,B,C")
    check(view.evidence.getValue("zoom").toDouble()==AxisCockpitSkinContract.FULL_MACHINE_ZOOM)
    check(ax6.dispatch(axisCmd(PageId.AX6,"6AX.MACHINE","6AX.MACHINE.HOME_VIEW")) is PageResult.Accepted)
    check(ax6.snapshot().state["viewPreset"]=="RESET")

    val gcode="G90 G0 X0 Y0 Z5\nG1 X10 Y5 Z-2 A10 B20 C30 F150"
    check(ax6.dispatch(axisCmd(PageId.AX6,"6AX.NC_FIRST","6AX.NC_FIRST.OPEN","gcode" to gcode)) is PageResult.Accepted)
    val parsed=ax6.dispatch(axisCmd(PageId.AX6,"6AX.NC_FIRST","6AX.NC_FIRST.PARSE")) as PageResult.Accepted
    check(parsed.evidence["axisPrecheck"]=="PASS")
    check(parsed.evidence["fanucParser"]=="PASS")
    check(parsed.evidence["g34Profile"]=="XY_J0_I_DIAMETER_K_COUNT")
    check(parsed.evidence["cAxis"]=="VALIDATED")
    check(parsed.evidence.getValue("blocks")=="2")
    val preview=ax6.dispatch(axisCmd(PageId.AX6,"6AX.NC_FIRST","6AX.NC_FIRST.PREVIEW","toolDiameter" to "6")) as PageResult.Accepted
    check(preview.evidence["previewLevel"]=="MACHINING_3D_MATERIAL_REMOVAL")
    check(preview.evidence.getValue("axisWordCount").toInt()>=6)
    check(preview.evidence.getValue("moveCount").toInt()>=2)
    check(preview.evidence.getValue("removedCells").toInt()>0)
    check(preview.evidence.getValue("removedVolumeMm3").toDouble()>0.0)
    check(preview.evidence.getValue("meshVertices").toInt()>0)
    check(preview.evidence.getValue("meshTriangles").toInt()>0)
    check(preview.evidence["fixtureCoverage"]=="UNMODELED")
    check(preview.evidence["preflightReady"]=="false")
    check(ax6.snapshot().state["ncFirstStage"]=="PREVIEW_3D")
    check(ax6.ncFirstMachiningResult()!=null)

    ax6.setNcFirstFixtures(listOf(FixtureObstacle(99,FixtureKind.FIXTURE,40.0,40.0,-5.0,50.0,50.0,5.0)))
    val modeledPreview=ax6.dispatch(axisCmd(PageId.AX6,"6AX.NC_FIRST","6AX.NC_FIRST.PREVIEW","toolDiameter" to "6")) as PageResult.Accepted
    check(modeledPreview.evidence["fixtureCoverage"]=="MODELED")
    check(modeledPreview.evidence["preflightReady"]=="true")

    val drillAx=AxisPageRuntime(PageId.AX3)
    val drillProgram="G90 G54\nG0 X0 Y0 Z30\nG34 J0 I30 K6 G83 R3 Z-20 Q2 F150\nG80"
    check(drillAx.dispatch(axisCmd(PageId.AX3,"3AX.NC_FIRST","3AX.NC_FIRST.OPEN","gcode" to drillProgram)) is PageResult.Accepted)
    val drillParsed=drillAx.dispatch(axisCmd(PageId.AX3,"3AX.NC_FIRST","3AX.NC_FIRST.PARSE")) as PageResult.Accepted
    check(drillParsed.evidence["g34Profile"]=="XY_J0_I_DIAMETER_K_COUNT")
    val drillPreview=drillAx.dispatch(axisCmd(PageId.AX3,"3AX.NC_FIRST","3AX.NC_FIRST.PREVIEW","toolDiameter" to "6")) as PageResult.Accepted
    check(drillPreview.evidence["g34HoleCount"]=="6")
    check(drillPreview.evidence["cannedCycleHoleCount"]=="6")
    check(drillPreview.evidence.getValue("cycleModels").contains("G83_FULL_R_RETRACT"))
    check(drillPreview.evidence.getValue("removedCells").toInt()>0)
    check(drillPreview.evidence.getValue("removedVolumeMm3").toDouble()>0.0)
    check(drillAx.snapshot().state["ncG34HoleCount"]=="6")

    val forbidden="G90 G0 X0 Y0 Z5\nG1 X1 Z-1 C45 F100"
    ax5.dispatch(axisCmd(PageId.AX5,"5AX.NC_FIRST","5AX.NC_FIRST.OPEN","gcode" to forbidden))
    val rejected=ax5.dispatch(axisCmd(PageId.AX5,"5AX.NC_FIRST","5AX.NC_FIRST.PARSE"))
    check(rejected is PageResult.Rejected)
    check(ax5.messages().last().pageId==PageId.AX5)

    println("AXIS_PAGE_RUNTIME_PASS|3AX_XYZ|4AX_A|5AX_AB|6AX_ABC|STATE_PERSISTENCE|VIEW_PRESET|NC_FIRST_FANUC_PARSE|NC_FIRST_G34_G83|NC_FIRST_TRUE_3D|NC_FIRST_MATERIAL_REMOVAL|NC_FIRST_PREFLIGHT|LOCAL_REJECT")
}
