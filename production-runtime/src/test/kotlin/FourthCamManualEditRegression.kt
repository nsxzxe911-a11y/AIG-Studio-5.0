import com.aigstudio.production.runtime.FourthCamRuntimeAdapter
import com.aigstudio.runtime4.contract.*

fun main() {
    val r=FourthCamRuntimeAdapter()
    var result=r.dispatch(CamCommand.StartManual)
    check(result.accepted)
    val strategyRev=result.state.strategy.revision

    result=r.dispatch(CamCommand.SetSafeZ(8.0))
    check(result.accepted)
    val afterStrategyRev=result.state.strategy.revision
    check(afterStrategyRev>strategyRev)

    result=r.dispatch(CamCommand.ReplacePointXYZABC(0,0.0,0.0,8.0,10.0,20.0,30.0,CamMotionKind.G0))
    check(result.accepted)
    val rev1=result.state.active!!.revision
    check(result.state.active!!.points[0].manualOverride)
    check(result.state.active!!.points[0].c==30.0)
    check(result.state.strategy.revision==afterStrategyRev)

    result=r.dispatch(CamCommand.ReplacePointXYZABC(1,10.0,0.0,-2.0,10.0,20.0,30.0,CamMotionKind.G1))
    check(result.accepted && result.state.active!!.revision>rev1)

    result=r.dispatch(CamCommand.AddPoint(2,20.0,0.0,8.0,10.0,20.0,30.0,CamMotionKind.G0))
    check(result.accepted && result.state.active!!.points.size==3)
    val addedDigest=result.state.active!!.digest

    result=r.dispatch(CamCommand.DeletePoint(2))
    check(result.accepted && result.state.active!!.points.size==2)
    check(result.state.active!!.digest!=addedDigest)
    result=r.dispatch(CamCommand.DeletePoint(1))
    check(!result.accepted)
    check(result.state.active!!.points.size==2)
    check(result.state.message?.severity==MessageSeverity.WARNING)

    result=r.dispatch(CamCommand.ReplacePointXYZABC(0,0.0,0.0,2.0,10.0,20.0,30.0,CamMotionKind.G0))
    check(!result.accepted)
    val protectedDigest=result.state.active!!.digest
    result=r.dispatch(CamCommand.SetFeed(190.0))
    check(result.accepted && result.state.message==null)
    check(result.state.active!!.digest==protectedDigest)

    result=r.dispatch(CamCommand.SetMotionKind(0,CamMotionKind.G1))
    check(!result.accepted)
    result=r.dispatch(CamCommand.SetMotionKind(0,CamMotionKind.G0))
    check(result.accepted)

    result=r.dispatch(CamCommand.InsertAvoidance(1,25.0,15.0,-2.0))
    check(result.accepted)
    val pts=result.state.active!!.points
    check(pts.size==5)
    val inserted=pts.subList(2,5)
    check(inserted[0].motion==CamMotionKind.G0 && inserted[0].z>=8.0)
    check(inserted[1].motion==CamMotionKind.G0 && inserted[1].z>=8.0)
    check(inserted[2].motion==CamMotionKind.G1 && inserted[2].z==-2.0)
    check(inserted.all { it.a==10.0 && it.b==20.0 && it.c==30.0 && it.avoidance })

    val fx=CamZoneSnapshot("fixture-1",CamZoneKind.FIXTURE,-5.0,-5.0,5.0,5.0,2.0)
    val clamp=CamZoneSnapshot("clamp-1",CamZoneKind.CLAMP,20.0,10.0,30.0,20.0,3.0)
    val keep=CamZoneSnapshot("keep-1",CamZoneKind.KEEP_OUT,40.0,10.0,50.0,20.0,4.0)
    result=r.dispatch(CamCommand.AddZone(fx)); check(result.accepted)
    result=r.dispatch(CamCommand.AddZone(clamp)); check(result.accepted)
    result=r.dispatch(CamCommand.AddZone(keep)); check(result.accepted && result.state.zones.size==3)
    result=r.dispatch(CamCommand.SetSafeClearance("clamp-1",6.0))
    check(result.accepted && result.state.zones.first{it.id=="clamp-1"}.safeClearanceMm==6.0)
    result=r.dispatch(CamCommand.RemoveZone("fixture-1"))
    check(result.accepted && result.state.zones.none{it.id=="fixture-1"})

    println("FOURTH_CAM_MANUAL_EDIT_PASS|AIG_CNC|G0_G1|XYZABC|SAFE_Z|AVOIDANCE|ZONES|LOCAL_WARNING")
}