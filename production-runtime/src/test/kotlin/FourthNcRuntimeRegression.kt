import com.aigstudio.production.runtime.*
import com.aigstudio.runtime4.contract.*
import com.aigstudio.core.CncControllerProfile
import com.aigstudio.core.NcEditorAlarmRouter
import com.aigstudio.core.NcMachineTravelLimits

private fun profile6()=NcMachineProfileSnapshot(
    id="fanuc-6ax",axisCount=6,
    x=NcAxisRangeSnapshot(-1000.0,1000.0),y=NcAxisRangeSnapshot(-1000.0,1000.0),z=NcAxisRangeSnapshot(-500.0,500.0),
    a=NcAxisRangeSnapshot(-360.0,360.0),b=NcAxisRangeSnapshot(-360.0,360.0),c=NcAxisRangeSnapshot(-180.0,180.0),
    customCodes=setOf("M42","M44","G34"),g34Profile="XY_J0_I_DIAMETER_K_COUNT",revision=1L,digest="p6"
)

fun main(){
    val coreLimits=NcMachineTravelLimits.verified(-1000.0,1000.0,-1000.0,1000.0,-500.0,500.0,-360.0,360.0,-360.0,360.0,-180.0,180.0)
    val cOnly="G90 G54\nG0 X0. Y0. Z30. C35.\nM30"
    check(NcEditorAlarmRouter.firstAlarm(cOnly,CncControllerProfile.FANUC,coreLimits)==null){"C axis must be recognized by NC core"}

    val runtime=FourthNcRuntimeAdapter(profile6())
    val program=listOf(
        "G90 G54",
        "T9",
        "S2300 M3",
        "G0 G43 X0. Y0. Z30. A10. B20. C35. H9 M8",
        "G1 X1.000 Y2.000 Z-3.000 A11.000 B21.000 C36.000 F150.",
        "G2 X2.000 Y2.000 Z-3.000 I0.500 J0.000 F120.",
        "G83 X3. Y4. Z-8. R2. Q1. F80.",
        "G80",
        "M30"
    ).joinToString("\n")
    val set=runtime.dispatch(NcCommand.SetProgram(program)); check(set.accepted)
    check(set.state.working.program==program)
    check(set.state.diagnostics.none{it.code.contains("UNSUPPORTED_NC_ADDRESS_C")})
    val blocks=set.state.motionProgram!!.blocks
    check(blocks.any{it.motion==NcMotionKind.G1 && it.c==36.0 && it.feed==150.0})
    check(blocks.any{it.motion==NcMotionKind.G2 && it.arcI==0.5 && it.arcJ==0.0})
    check(blocks.any{it.motion==NcMotionKind.CYCLE && it.cycleCode=="G83"})
    check(blocks.any{it.spindle==2300.0})
    check(blocks.any{it.tool==9})

    val vendorRuntime=FourthNcRuntimeAdapter(profile6())
    val vendorProgram=listOf(
        "G90 G54",
        "M42",
        "G34 J0. I30. K6 G83 R3. Z-20. Q2. F150.",
        "G80",
        "M44",
        "M30"
    ).joinToString("\n")
    val vendor=vendorRuntime.dispatch(NcCommand.SetProgram(vendorProgram)); check(vendor.accepted)
    check(vendor.state.working.program==vendorProgram)
    check(vendor.state.diagnostics.isEmpty()){
        "configured custom M/G34 should remain editor-valid: ${vendor.state.diagnostics}"
    }
    val rev0=set.state.working.revision
    check(runtime.dispatch(NcCommand.SetCursor(program.length)).accepted)
    check(runtime.dispatch(NcCommand.NewBlock).accepted)
    check(runtime.dispatch(NcCommand.InsertText("G0 X5. C40.")).accepted)
    val edited=runtime.snapshot(); check(edited.working.revision>rev0 && edited.working.program.endsWith("G0 X5. C40."))
    check(edited.motionProgram!!.blocks.any{it.c==40.0})

    val beforeBackspace=edited.working.program
    check(runtime.dispatch(NcCommand.Backspace).accepted)
    check(runtime.snapshot().working.program.length==beforeBackspace.length-1)
    check(runtime.dispatch(NcCommand.InsertText(".")).accepted)
    check(runtime.dispatch(NcCommand.SetCursor(runtime.snapshot().working.program.length-1)).accepted)
    check(runtime.dispatch(NcCommand.DeleteForward).accepted)
    check(runtime.dispatch(NcCommand.InsertText(".")).accepted)
    check(runtime.dispatch(NcCommand.ToggleBlockSkip).accepted)
    check(runtime.snapshot().working.program.lineSequence().last().startsWith("/"))

    val invalid="G90 G54\nG999 X0.\nM30"
    val invalidResult=runtime.dispatch(NcCommand.SetProgram(invalid)); check(invalidResult.accepted)
    check(invalidResult.state.working.program==invalid)
    check(invalidResult.state.diagnostics.any{it.lineNumber==2})
    check(invalidResult.state.message?.severity==MessageSeverity.WARNING)
    val fixed=runtime.dispatch(NcCommand.SetProgram("G90 G54\nG0 X0. C35.\nM30")); check(fixed.accepted)
    check(fixed.state.diagnostics.none{it.lineNumber==2 && it.severity==MessageSeverity.ALARM})
    check(fixed.state.motionProgram!!.blocks.any{it.c==35.0})

    check(runtime.dispatch(NcCommand.FreezeActive).accepted)
    val frozenDigest=runtime.snapshot().working.digest
    val reject=runtime.dispatch(NcCommand.InsertText("\nM8")); check(!reject.accepted)
    check(reject.state.working.digest==frozenDigest)
    check(reject.state.message?.severity==MessageSeverity.WARNING)
    check(runtime.dispatch(NcCommand.UnfreezeActive).accepted)
    check(runtime.dispatch(NcCommand.InsertText("\nM8")).accepted)

    val p3=NcMachineProfileSnapshot("fanuc-3ax",3,revision=2L,digest="p3")
    val mismatch=runtime.dispatch(NcCommand.SelectMachineProfile(p3)); check(mismatch.accepted)
    check(mismatch.state.diagnostics.any{it.code=="AXIS_C_UNSUPPORTED_BY_PROFILE"})
    check(mismatch.state.working.program.contains("C35")){"profile mismatch must not delete C data"}
    println("FOURTH_NC_RUNTIME_PASS|AIG_CNC|DIRECT_EDIT|LOCAL_DIAGNOSTIC|XYZABC|MOTION_PROGRAM")
}