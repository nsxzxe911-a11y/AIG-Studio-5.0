import com.aigstudio.production.runtime.CleanCamSession
import com.aigstudio.production.runtime.FourthCamRuntimeAdapter
import com.aigstudio.runtime4.contract.*

fun main() {
    val runtime=FourthCamRuntimeAdapter()
    var state=runtime.snapshot()
    check(state.source==null)
    check(state.sourceLink==CamSourceLinkState.DISCONNECTED)
    check(state.toolpathLink==CamToolpathLinkState.CONNECTED)
    check(state.active==null && state.candidate==null)

    var result=runtime.dispatch(CamCommand.StartManual)
    check(result.accepted)
    state=result.state
    check(state.active!=null && state.active!!.revision==1L)
    check(state.active!!.points.size==2)
    check(state.active!!.points.all { it.a==0.0 && it.b==0.0 && it.c==0.0 })
    check(state.toolpathLink==CamToolpathLinkState.DISCONNECTED)
    val activeV1=state.active!!.digest

    result=runtime.dispatch(CamCommand.SetSafeZ(8.0))
    check(result.accepted && result.state.strategy.safeZMm==8.0)
    check(result.state.active!!.digest==activeV1)
    val strategyAfterSafeZ=result.state.strategy.revision

    result=runtime.dispatch(CamCommand.SetToolDiameter(12.0))
    check(result.accepted && result.state.strategy.toolDiameterMm==12.0)
    check(result.state.strategy.revision>strategyAfterSafeZ)
    check(result.state.active!!.digest==activeV1)

    result=runtime.dispatch(CamCommand.ConnectToolpath)
    check(result.accepted)
    state=result.state
    check(state.toolpathLink==CamToolpathLinkState.CONNECTED)
    check(state.candidate!=null)
    check(state.active!!.digest==activeV1)
    check(state.candidate!!.points.filter { it.motion==CamMotionKind.G0 }.all { it.z>=8.0 })
    val candidateId=state.candidate!!.id
    val candidateDigest=state.candidate!!.digest

    result=runtime.dispatch(CamCommand.PreviewCandidate)
    check(result.accepted && result.state.previewCandidateId==candidateId)
    check(result.state.active!!.digest==activeV1)

    result=runtime.dispatch(CamCommand.KeepActiveToolpath)
    check(result.accepted && result.state.previewCandidateId==null)
    check(result.state.active!!.digest==activeV1)

    result=runtime.dispatch(CamCommand.SaveCandidateAsNewVersion)
    check(result.accepted && result.state.savedCandidates.size==1)
    check(result.state.active!!.digest==activeV1)

    result=runtime.dispatch(CamCommand.FreezeActive)
    check(result.accepted && result.state.active!!.frozen)
    val frozenDigest=result.state.active!!.digest

    result=runtime.dispatch(CamCommand.AdoptCandidate)
    check(!result.accepted)
    check(result.state.active!!.digest==frozenDigest)
    check(result.state.message?.severity==MessageSeverity.WARNING)

    result=runtime.dispatch(CamCommand.SetFeed(180.0))
    check(result.accepted && result.state.strategy.feedMmMin==180.0)
    check(result.state.active!!.digest==frozenDigest)
    check(result.state.message==null)

    val source31=CamSourceSnapshot(CamSourceKind.CAD_SNAPSHOT,"cad",31L,"cad31",emptyList(),emptyList())
    result=runtime.dispatch(CamCommand.SelectSource(source31))
    check(result.accepted && result.state.active!!.digest==frozenDigest)
    result=runtime.dispatch(CamCommand.ConnectSource)
    check(result.accepted && result.state.sourceLink==CamSourceLinkState.CONNECTED)
    val source32=source31.copy(sourceRevision=32L,digest="cad32")
    result=runtime.dispatch(CamCommand.SelectSource(source32))
    check(result.accepted && result.state.source!!.sourceRevision==32L)
    check(result.state.active!!.digest==frozenDigest)

    result=runtime.dispatch(CamCommand.UnfreezeActive)
    check(result.accepted && !result.state.active!!.frozen)
    result=runtime.dispatch(CamCommand.AdoptCandidate)
    check(result.accepted)
    check(result.state.active!!.digest==candidateDigest)
    check(result.state.candidate==null && result.state.previewCandidateId==null)

    val seeded=CleanCamSession()
    seeded.startManual()
    seeded.replacePoint(0,0.0,0.0,5.0,true,15.0,-20.0,35.0)
    seeded.replacePoint(1,10.0,0.0,-2.0,false,15.0,-20.0,35.0)
    val seededRuntime=FourthCamRuntimeAdapter(seeded)
    state=seededRuntime.dispatch(CamCommand.StartManual).state
    check(state.active!!.points.all { it.a==15.0 && it.b==-20.0 && it.c==35.0 })
    val seededActiveDigest=state.active!!.digest
    state=seededRuntime.dispatch(CamCommand.SetToolDiameter(11.0)).state
    check(state.active!!.digest==seededActiveDigest)
    state=seededRuntime.dispatch(CamCommand.ConnectToolpath).state
    check(state.candidate!!.points.all { it.a==15.0 && it.b==-20.0 && it.c==35.0 })
    state=seededRuntime.dispatch(CamCommand.AdoptCandidate).state
    check(state.active!!.points.all { it.a==15.0 && it.b==-20.0 && it.c==35.0 })

    println("FOURTH_CAM_RUNTIME_STATE_PASS|AIG_CNC|ISOLATED_ACTIVE|CANDIDATE|FREEZE|SOURCE|XYZABC")
}