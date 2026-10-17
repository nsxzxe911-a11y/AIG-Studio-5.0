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
    check(parsed.evidence.getValue("blocks")=="2")
    val preview=ax6.dispatch(axisCmd(PageId.AX6,"6AX.NC_FIRST","6AX.NC_FIRST.PREVIEW")) as PageResult.Accepted
    check(preview.evidence.getValue("axisWordCount").toInt()>=6)
    check(ax6.snapshot().state["ncFirstStage"]=="PREVIEW")

    val forbidden="G90 G1 X1 C45 F100"
    ax5.dispatch(axisCmd(PageId.AX5,"5AX.NC_FIRST","5AX.NC_FIRST.OPEN","gcode" to forbidden))
    val rejected=ax5.dispatch(axisCmd(PageId.AX5,"5AX.NC_FIRST","5AX.NC_FIRST.PARSE"))
    check(rejected is PageResult.Rejected)
    check(ax5.messages().last().pageId==PageId.AX5)

    println("AXIS_PAGE_RUNTIME_PASS|3AX_XYZ|4AX_A|5AX_AB|6AX_ABC|STATE_PERSISTENCE|VIEW_PRESET|NC_FIRST_AXIS_PRECHECK|LOCAL_REJECT")
}
