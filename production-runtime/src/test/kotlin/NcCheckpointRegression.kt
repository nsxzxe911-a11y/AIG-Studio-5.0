import com.aigstudio.production.runtime.*
import com.aigstudio.runtime4.contract.*

private fun p6()=NcMachineProfileSnapshot(
    "fanuc-6ax",6,
    x=NcAxisRangeSnapshot(-1000.0,1000.0),y=NcAxisRangeSnapshot(-1000.0,1000.0),z=NcAxisRangeSnapshot(-500.0,500.0),
    a=NcAxisRangeSnapshot(-360.0,360.0),b=NcAxisRangeSnapshot(-360.0,360.0),c=NcAxisRangeSnapshot(-180.0,180.0),
    customCodes=setOf("M42","M44","G34"),g34Profile="XY_J0_I_DIAMETER_K_COUNT",revision=5L,digest="profile5"
)
private fun candidate(runtime:FourthNcRuntimeAdapter):NcCandidate{
    val program="G90 G54\nG0 X0. Y0. Z30.\nG1 X10. Y0. Z-2. F150.\nM30"
    val motion=NcMotionAdapter.parse(program,p6(),9L).first
    val digest=java.security.MessageDigest.getInstance("SHA-256").digest(program.toByteArray()).joinToString(""){"%02x".format(it)}
    return NcCandidate("C9",9L,digest,program,NcCandidateSourceKind.CAM_POST,9L,motion)
}
fun main(){
    val r=FourthNcRuntimeAdapter(p6())
    val program="(UTF8 中文註解)\nG90 G54\nG0 X0. Y0. Z30. A10. B20. C35.\nG1 X1. Y2. Z-3. A11. B21. C36. F150.\nM30"
    check(r.dispatch(NcCommand.SetProgram(program)).accepted)
    check(r.dispatch(NcCommand.SetCursor(17)).accepted)
    check(r.dispatch(NcCommand.DisconnectCam).accepted)
    check(r.dispatch(NcCommand.ReceiveCandidate(candidate(r))).accepted)
    check(r.dispatch(NcCommand.PreviewCandidate).accepted)
    check(r.dispatch(NcCommand.SaveCandidateAsNewVersion).accepted)
    check(r.dispatch(NcCommand.FreezeActive).accepted)
    val before=r.snapshot(); val raw=(r as NcPersistencePort).exportCheckpoint()
    check(raw.startsWith("AIG_NC_CHECKPOINT_V1\n") && raw.trimEnd().endsWith("END"))

    val restored=FourthNcRuntimeAdapter()
    val rr=(restored as NcPersistencePort).restoreCheckpoint(raw); check(rr.accepted){rr.state.message?.text ?: "restore failed"}
    val after=rr.state
    check(after.working.program==before.working.program)
    check(after.working.digest==before.working.digest && after.working.revision==before.working.revision)
    check(after.working.cursorOffset==17 && after.working.frozen)
    check(after.camLink==NcCamLinkState.DISCONNECTED)
    check(after.machineProfile.id=="fanuc-6ax" && after.machineProfile.customCodes.contains("M42"))
    check(after.candidate?.id==before.candidate?.id && after.previewCandidateId==before.previewCandidateId)
    check(after.savedCandidates.map{it.id}==before.savedCandidates.map{it.id})
    check(after.motionProgram!!.digest==before.motionProgram!!.digest)
    check(after.motionProgram!!.blocks.any{it.c==36.0})

    val liveDigest=after.working.digest
    val bad=(restored as NcPersistencePort).restoreCheckpoint("AIG_NC_CHECKPOINT_V1\nBROKEN\n")
    check(!bad.accepted && bad.state.working.digest==liveDigest)
    check(bad.state.message?.severity==MessageSeverity.WARNING)
    check(restored.dispatch(NcCommand.SetCursor(0)).accepted)
    println("FOURTH_NC_CHECKPOINT_PASS|AIG_CNC|ATOMIC|RECOVERY|XYZABC|CANDIDATE|CORRUPT_REJECT")
}