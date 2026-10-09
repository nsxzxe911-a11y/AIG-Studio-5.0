import com.aigstudio.production.runtime.*
import com.aigstudio.runtime4.contract.*

private fun contour(offset:Double=0.0)=CamContourSnapshot(listOf(
    CamSourcePoint(0.0+offset,0.0),CamSourcePoint(40.0+offset,0.0),CamSourcePoint(40.0+offset,30.0),CamSourcePoint(0.0+offset,30.0),CamSourcePoint(0.0+offset,0.0)
))

fun main(){
    val pointFields=CamSourcePoint::class.java.declaredFields.filterNot{it.isSynthetic}.map{it.name}.toSet()
    check(pointFields==setOf("xMm","yMm")){"CamSourcePoint leaked non-XY fields: $pointFields"}
    val orientation=OrientationCandidate(15.0,-20.0,35.0)
    check(orientation.a==15.0 && orientation.b==-20.0 && orientation.c==35.0)

    val source1=CamSourceAdapter.fromCalibratedContours(CamSourceKind.PHOTO,"photo-1",1,listOf(contour()),emptyList())
    check(source1.digest.isNotBlank() && source1.kind==CamSourceKind.PHOTO)
    check(runCatching{CamSourceAdapter.fromCalibratedContours(CamSourceKind.NONE,"bad",1,listOf(contour()),emptyList())}.isFailure)
    check(runCatching{CamSourceAdapter.fromCalibratedContours(CamSourceKind.PHOTO,"bad",1,listOf(CamContourSnapshot(listOf(CamSourcePoint(Double.NaN,0.0),CamSourcePoint(1.0,1.0)))),emptyList())}.isFailure)

    val runtime=FourthCamRuntimeAdapter()
    check(runtime.dispatch(CamCommand.StartManual).accepted)
    check(runtime.dispatch(CamCommand.SetSafeZ(8.0)).accepted)
    check(runtime.dispatch(CamCommand.ReplacePointXYZABC(0,0.0,0.0,8.0,10.0,20.0,30.0,CamMotionKind.G0)).accepted)
    val activeBefore=runtime.snapshot().active!!
    check(runtime.dispatch(CamCommand.SelectSource(source1)).accepted)
    check(runtime.dispatch(CamCommand.ConnectSource).accepted)
    val generated1=runtime.dispatch(CamCommand.GenerateCandidate)
    check(generated1.accepted)
    val candidate1=generated1.state.candidate!!
    check(candidate1.points.size>=2)
    check(candidate1.sourceRevision==1L)
    check(candidate1.points.all{it.a==0.0 && it.b==0.0 && it.c==0.0})
    check(generated1.state.active!!.digest==activeBefore.digest)
    check(generated1.state.active!!.points[0].a==10.0 && generated1.state.active!!.points[0].b==20.0 && generated1.state.active!!.points[0].c==30.0)

    val source2=CamSourceAdapter.fromCalibratedContours(CamSourceKind.AI_CAMERA,"camera-1",2,listOf(contour(5.0)),emptyList())
    check(runtime.dispatch(CamCommand.SelectSource(source2)).accepted)
    val generated2=runtime.dispatch(CamCommand.GenerateCandidate)
    check(generated2.accepted)
    check(generated2.state.candidate!!.sourceRevision==2L)
    check(generated2.state.candidate!!.id!=candidate1.id)
    check(generated2.state.active!!.digest==activeBefore.digest)

    println("FOURTH_CAM_SOURCE_ISOLATION_PASS|AIG_CNC|PHOTO_AI_CAMERA|XY_ONLY|ACTIVE_PROTECTED|AUTO_CANDIDATE|XYZABC_ZERO")
}
