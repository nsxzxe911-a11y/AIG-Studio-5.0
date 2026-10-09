package com.aigstudio.runtime4.contract

enum class CamMotionKind { G0, G1, G2, G3 }
enum class CamContourSide { OUTSIDE, INSIDE }
enum class CamContourDirection { CCW, CW }
enum class CamSourceKind { NONE, CAD_SNAPSHOT, AI_CAMERA, PHOTO }
enum class CamSourceLinkState { CONNECTED, DISCONNECTED }
enum class CamToolpathLinkState { CONNECTED, DISCONNECTED }
enum class CamZoneKind { FIXTURE, CLAMP, KEEP_OUT }

data class CamPointSnapshot(
    val x:Double, val y:Double, val z:Double,
    val a:Double, val b:Double, val c:Double,
    val motion:CamMotionKind,
    val arcI:Double?=null, val arcJ:Double?=null,
    val manualOverride:Boolean=false, val avoidance:Boolean=false,
)

data class OrientationCandidate(val a:Double,val b:Double,val c:Double) {
    init {
        require(listOf(a,b,c).all { it.isFinite() && kotlin.math.abs(it)<=360.0 }) { "Orientation candidate A/B/C out of range" }
    }
}
data class CamSourcePoint(val xMm:Double,val yMm:Double)
data class CamContourSnapshot(val points:List<CamSourcePoint>)
data class CamZoneSnapshot(
    val id:String, val kind:CamZoneKind,
    val minX:Double, val minY:Double, val maxX:Double, val maxY:Double,
    val safeClearanceMm:Double,
)
data class CamMachiningRegion(val minX:Double,val minY:Double,val maxX:Double,val maxY:Double)
data class CamStrategySnapshot(
    val toolNumber:Int=1,
    val toolDiameterMm:Double=10.0,
    val depthMm:Double=-2.0,
    val safeZMm:Double=5.0,
    val feedMmMin:Double=150.0,
    val spindleRpm:Double=2300.0,
    val side:CamContourSide=CamContourSide.OUTSIDE,
    val direction:CamContourDirection=CamContourDirection.CCW,
    val leadInMm:Double=2.0,
    val leadOutMm:Double=2.0,
    val machiningRegion:CamMachiningRegion?=null,
    val revision:Long=0L,
    val digest:String="",
)
data class CamSourceSnapshot(
    val kind:CamSourceKind,
    val sourceId:String,
    val sourceRevision:Long,
    val digest:String,
    val contours:List<CamContourSnapshot>,
    val zones:List<CamZoneSnapshot>,
)
data class CamToolpathVersion(
    val id:String,
    val revision:Long,
    val digest:String,
    val points:List<CamPointSnapshot>,
    val frozen:Boolean=false,
    val sourceRevision:Long?=null,
    val strategyRevision:Long=0L,
)
data class CamCandidateToolpath(
    val id:String,
    val revision:Long,
    val digest:String,
    val points:List<CamPointSnapshot>,
    val sourceRevision:Long?=null,
    val strategyRevision:Long=0L,
)
data class CamSaveRecord(
    val revision:Long,
    val kind:String,
    val id:String,
    val digest:String,
    val message:String,
)
data class CamState(
    val source:CamSourceSnapshot?=null,
    val sourceLink:CamSourceLinkState=CamSourceLinkState.DISCONNECTED,
    val strategy:CamStrategySnapshot=CamStrategySnapshot(),
    val toolpathLink:CamToolpathLinkState=CamToolpathLinkState.CONNECTED,
    val active:CamToolpathVersion?=null,
    val candidate:CamCandidateToolpath?=null,
    val savedCandidates:List<CamCandidateToolpath> = emptyList(),
    val zones:List<CamZoneSnapshot> = emptyList(),
    val saveHistory:List<CamSaveRecord> = emptyList(),
    val previewCandidateId:String?=null,
    val message:RuntimeMessage?=null,
) { companion object { fun initial()=CamState() } }

sealed interface CamCommand {
    data object StartManual:CamCommand
    data class SetToolNumber(val value:Int):CamCommand
    data class SetToolDiameter(val valueMm:Double):CamCommand
    data class SetDepth(val valueMm:Double):CamCommand
    data class SetSafeZ(val valueMm:Double):CamCommand
    data class SetFeed(val valueMmMin:Double):CamCommand
    data class SetSpeed(val valueRpm:Double):CamCommand
    data class SetContourSide(val value:CamContourSide):CamCommand
    data class SetContourDirection(val value:CamContourDirection):CamCommand
    data class SetLeadIn(val valueMm:Double):CamCommand
    data class SetLeadOut(val valueMm:Double):CamCommand
    data class SetMachiningRegion(val value:CamMachiningRegion?):CamCommand
    data class SelectSource(val source:CamSourceSnapshot):CamCommand
    data object DisconnectSource:CamCommand
    data object ConnectSource:CamCommand
    data object ConnectToolpath:CamCommand
    data object DisconnectToolpath:CamCommand
    data object GenerateCandidate:CamCommand
    data object PreviewCandidate:CamCommand
    data object KeepActiveToolpath:CamCommand
    data object AdoptCandidate:CamCommand
    data object SaveCandidateAsNewVersion:CamCommand
    data class AddPoint(val index:Int,val x:Double,val y:Double,val z:Double,val a:Double,val b:Double,val c:Double,val motion:CamMotionKind):CamCommand
    data class DeletePoint(val index:Int):CamCommand
    data class ReplacePointXYZABC(val index:Int,val x:Double,val y:Double,val z:Double,val a:Double,val b:Double,val c:Double,val motion:CamMotionKind):CamCommand
    data class SetMotionKind(val index:Int,val motion:CamMotionKind):CamCommand
    data class InsertAvoidance(val afterIndex:Int,val landingX:Double,val landingY:Double,val landingZ:Double):CamCommand
    data class AddZone(val zone:CamZoneSnapshot):CamCommand
    data class RemoveZone(val id:String):CamCommand
    data class SetSafeClearance(val id:String,val valueMm:Double):CamCommand    data object FreezeActive:CamCommand
    data object UnfreezeActive:CamCommand
    data object ClearLocalMessage:CamCommand
}

data class CamDispatchResult(val accepted:Boolean,val state:CamState)
interface CamRuntimePort { fun snapshot():CamState; fun dispatch(command:CamCommand):CamDispatchResult }
interface CamPersistencePort { fun exportCheckpoint():String; fun restoreCheckpoint(raw:String):CamDispatchResult }
