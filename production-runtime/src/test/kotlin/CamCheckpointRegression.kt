import com.aigstudio.production.runtime.FourthCamRuntimeAdapter
import com.aigstudio.production.runtime.CamSourceAdapter
import com.aigstudio.runtime4.contract.*

fun main() {
    val source=CamSourceAdapter.fromCalibratedContours(
        CamSourceKind.PHOTO,"photo-7",7L,
        listOf(CamContourSnapshot(listOf(CamSourcePoint(0.0,0.0),CamSourcePoint(20.0,0.0),CamSourcePoint(20.0,20.0)))),
        listOf(CamZoneSnapshot("source-clamp",CamZoneKind.CLAMP,2.0,2.0,4.0,4.0,3.0)),
    )
    val r=FourthCamRuntimeAdapter()
    check(r.dispatch(CamCommand.SelectSource(source)).accepted)
    check(r.dispatch(CamCommand.ConnectSource).accepted)
    check(r.dispatch(CamCommand.StartManual).accepted)
    check(r.dispatch(CamCommand.SetSafeZ(8.0)).accepted)
    check(r.dispatch(CamCommand.ReplacePointXYZABC(0,0.0,0.0,8.0,15.0,-20.0,35.0,CamMotionKind.G0)).accepted)
    check(r.dispatch(CamCommand.ReplacePointXYZABC(1,10.0,0.0,-2.0,15.0,-20.0,35.0,CamMotionKind.G1)).accepted)
    check(r.dispatch(CamCommand.AddZone(CamZoneSnapshot("fixture",CamZoneKind.FIXTURE,-5.0,-5.0,5.0,5.0,4.0))).accepted)
    check(r.dispatch(CamCommand.ConnectToolpath).accepted)
    check(r.dispatch(CamCommand.SaveCandidateAsNewVersion).accepted)
    check(r.dispatch(CamCommand.PreviewCandidate).accepted)
    check(r.dispatch(CamCommand.FreezeActive).accepted)
    val before=r.snapshot()
    val raw=(r as CamPersistencePort).exportCheckpoint()
    check(raw.startsWith("AIG_CAM_CHECKPOINT_V1\n"))
    check(raw.trimEnd().endsWith("END"))

    val restored=FourthCamRuntimeAdapter()
    val rr=(restored as CamPersistencePort).restoreCheckpoint(raw)
    check(rr.accepted){ rr.state.message?.text ?: "restore rejected" }
    val after=rr.state
    check(after.strategy.digest==before.strategy.digest)
    check(after.active!!.digest==before.active!!.digest && after.active!!.frozen)
    check(after.candidate!!.digest==before.candidate!!.digest)
    check(after.savedCandidates.map{it.digest}==before.savedCandidates.map{it.digest})
    check(after.source!!.digest==before.source!!.digest && after.source!!.sourceRevision==7L)
    check(after.zones==before.zones)
    check(after.previewCandidateId==before.previewCandidateId)
    check(after.active!!.points.any{it.c==35.0})

    val candidateBefore=after.candidate!!.digest
    check(restored.dispatch(CamCommand.GenerateCandidate).accepted)
    check(restored.snapshot().candidate!!.digest==candidateBefore)

    val liveDigest=restored.snapshot().active!!.digest
    val bad=(restored as CamPersistencePort).restoreCheckpoint("AIG_CAM_CHECKPOINT_V1\nBROKEN\n")
    check(!bad.accepted)
    check(bad.state.active!!.digest==liveDigest)
    check(bad.state.message?.severity==MessageSeverity.WARNING)
    check(restored.dispatch(CamCommand.SetFeed(200.0)).accepted)
    check(restored.snapshot().active!!.digest==liveDigest)

    println("FOURTH_CAM_CHECKPOINT_PASS|AIG_CNC|ROUNDTRIP|BASELINE|XYZABC|CORRUPT_REJECT|LOCAL_WARNING")
}