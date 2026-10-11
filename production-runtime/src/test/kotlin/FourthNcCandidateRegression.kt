import com.aigstudio.production.runtime.*
import com.aigstudio.runtime4.contract.*

private fun profile()=NcMachineProfileSnapshot(
    "fanuc-6ax",6,
    x=NcAxisRangeSnapshot(-1000.0,1000.0),y=NcAxisRangeSnapshot(-1000.0,1000.0),z=NcAxisRangeSnapshot(-500.0,500.0),
    a=NcAxisRangeSnapshot(-360.0,360.0),b=NcAxisRangeSnapshot(-360.0,360.0),c=NcAxisRangeSnapshot(-180.0,180.0),
    revision=1L,digest="p6"
)
private fun strategy()=CamStrategySnapshot(
    toolNumber=9,toolDiameterMm=10.0,depthMm=-2.0,safeZMm=5.0,feedMmMin=150.0,spindleRpm=2300.0,
    revision=12L,digest="strategy12"
)
private fun path(c:Double=0.0)=CamToolpathVersion(
    id="TP7",revision=7L,digest="tp7",points=listOf(
        CamPointSnapshot(0.0,0.0,5.0,0.0,0.0,c,CamMotionKind.G0),
        CamPointSnapshot(0.0,0.0,-2.0,0.0,0.0,c,CamMotionKind.G1),
        CamPointSnapshot(20.0,0.0,-2.0,0.0,0.0,c,CamMotionKind.G1),
        CamPointSnapshot(20.0,0.0,5.0,0.0,0.0,c,CamMotionKind.G0),
    ),sourceRevision=3L,strategyRevision=12L
)

fun main(){
    val post=NcPostBridge.fromCam(path(),strategy(),profile())
    check(post.accepted){post.message ?: "CAM post rejected"}
    val candidate=post.candidate!!
    check(candidate.program.contains("G90 G54"))
    check(candidate.program.contains("M98 P4"))
    check(candidate.program.contains("M98 P5"))
    check(candidate.motionProgram!!.blocks.any{it.motion==NcMotionKind.G1})

    val runtime=FourthNcRuntimeAdapter(profile())
    val handwritten="G90 G54\nG0 X0. Y0. Z30. C35.\nG1 X5. Y0. Z-1. C35. F100.\nM30"
    check(runtime.dispatch(NcCommand.SetProgram(handwritten)).accepted)
    check(runtime.dispatch(NcCommand.DisconnectCam).accepted)
    val manualDigest=runtime.snapshot().working.digest
    check(runtime.dispatch(NcCommand.ReceiveCandidate(candidate)).accepted)
    check(runtime.snapshot().working.digest==manualDigest)
    check(runtime.snapshot().candidate?.id==candidate.id)
    check(runtime.dispatch(NcCommand.PreviewCandidate).accepted)
    check(runtime.snapshot().previewCandidateId==candidate.id)
    check(runtime.snapshot().working.digest==manualDigest)
    check(runtime.dispatch(NcCommand.KeepWorkingCopy).accepted)
    check(runtime.snapshot().previewCandidateId==null && runtime.snapshot().working.digest==manualDigest)
    check(runtime.dispatch(NcCommand.SaveCandidateAsNewVersion).accepted)
    check(runtime.snapshot().savedCandidates.any{it.id==candidate.id})
    check(runtime.snapshot().working.digest==manualDigest)

    check(runtime.dispatch(NcCommand.FreezeActive).accepted)
    val frozenReject=runtime.dispatch(NcCommand.AdoptCandidate); check(!frozenReject.accepted)
    check(frozenReject.state.working.digest==manualDigest)
    check(frozenReject.state.message?.severity==MessageSeverity.WARNING)
    check(runtime.dispatch(NcCommand.UnfreezeActive).accepted)
    check(runtime.dispatch(NcCommand.AdoptCandidate).accepted)
    check(runtime.snapshot().working.program==candidate.program)
    check(runtime.snapshot().working.digest==candidate.digest)
    check(runtime.snapshot().candidate==null)

    val protected=runtime.snapshot().working.digest
    val cPost=NcPostBridge.fromCam(path(35.0),strategy(),profile())
    check(!cPost.accepted && cPost.candidate==null)
    check(cPost.message?.contains("C",ignoreCase=true)==true)
    check(runtime.snapshot().working.digest==protected)
    check(runtime.dispatch(NcCommand.ConnectCam).accepted)
    check(runtime.snapshot().camLink==NcCamLinkState.CONNECTED)
    println("FOURTH_NC_CANDIDATE_PASS|AIG_CNC|DISCONNECT|PREVIEW|ADOPT|SAVE_VERSION|FREEZE|C_POST_BLOCKED_LOCAL")
}