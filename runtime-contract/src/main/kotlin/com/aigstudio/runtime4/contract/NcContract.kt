package com.aigstudio.runtime4.contract

enum class NcMotionKind { NONE, G0, G1, G2, G3, CYCLE }
enum class NcEditMode { INSERT, REPLACE }
enum class NcCamLinkState { CONNECTED, DISCONNECTED }
enum class NcCandidateSourceKind { CAM_POST, MANUAL_IMPORT, AI_SUGGESTION }

data class NcAxisRangeSnapshot(val min:Double,val max:Double){
    init { require(min.isFinite() && max.isFinite() && min < max){"NC axis range must be finite and min < max"} }
    fun contains(value:Double):Boolean=value.isFinite() && value>=min && value<=max
}

data class NcMachineProfileSnapshot(
    val id:String,
    val axisCount:Int,
    val x:NcAxisRangeSnapshot?=null,
    val y:NcAxisRangeSnapshot?=null,
    val z:NcAxisRangeSnapshot?=null,
    val a:NcAxisRangeSnapshot?=null,
    val b:NcAxisRangeSnapshot?=null,
    val c:NcAxisRangeSnapshot?=null,
    val customCodes:Set<String> = emptySet(),
    val g34Profile:String="UNCONFIGURED",
    val revision:Long=0L,
    val digest:String="",
){
    init {
        require(axisCount in 3..6){"NC machine axisCount must be 3..6"}
        require(id.isNotBlank()){"NC machine profile id is blank"}
    }
    companion object {
        fun defaultFanuc3Ax()=NcMachineProfileSnapshot("fanuc-3ax",3)
    }
}

data class MotionBlockSnapshot(
    val lineNumber:Int,
    val raw:String,
    val x:Double?=null,
    val y:Double?=null,
    val z:Double?=null,
    val a:Double?=null,
    val b:Double?=null,
    val c:Double?=null,
    val motion:NcMotionKind=NcMotionKind.NONE,
    val arcI:Double?=null,
    val arcJ:Double?=null,
    val arcK:Double?=null,
    val feed:Double?=null,
    val spindle:Double?=null,
    val tool:Int?=null,
    val mCodes:List<String> = emptyList(),
    val cycleCode:String?=null,
    val sourceWorkOffset:String?=null,
)

data class MotionProgram(
    val id:String,
    val revision:Long,
    val digest:String,
    val blocks:List<MotionBlockSnapshot>,
)

data class NcWorkingCopy(
    val id:String,
    val revision:Long,
    val digest:String,
    val program:String,
    val cursorOffset:Int=0,
    val frozen:Boolean=false,
)

data class NcCandidate(
    val id:String,
    val revision:Long,
    val digest:String,
    val program:String,
    val sourceKind:NcCandidateSourceKind,
    val sourceRevision:Long?=null,
    val motionProgram:MotionProgram?=null,
)

data class NcDiagnostic(
    val lineNumber:Int,
    val severity:MessageSeverity,
    val code:String,
    val message:String,
)

data class NcSaveRecord(
    val revision:Long,
    val kind:String,
    val id:String,
    val digest:String,
    val message:String,
)

data class NcState(
    val machineProfile:NcMachineProfileSnapshot=NcMachineProfileSnapshot.defaultFanuc3Ax(),
    val working:NcWorkingCopy=NcWorkingCopy("NC0",0L,"","",0,false),
    val camLink:NcCamLinkState=NcCamLinkState.DISCONNECTED,
    val candidate:NcCandidate?=null,
    val savedCandidates:List<NcCandidate> = emptyList(),
    val previewCandidateId:String?=null,
    val motionProgram:MotionProgram?=null,
    val diagnostics:List<NcDiagnostic> = emptyList(),
    val saveHistory:List<NcSaveRecord> = emptyList(),
    val editMode:NcEditMode=NcEditMode.INSERT,
    val message:RuntimeMessage?=null,
){ companion object { fun initial(profile:NcMachineProfileSnapshot=NcMachineProfileSnapshot.defaultFanuc3Ax())=NcState(machineProfile=profile) } }

sealed interface NcCommand {
    data class SetProgram(val text:String):NcCommand
    data class InsertText(val text:String):NcCommand
    data object Backspace:NcCommand
    data object DeleteForward:NcCommand
    data object ToggleInsertMode:NcCommand
    data class SetCursor(val offset:Int):NcCommand
    data object NewBlock:NcCommand
    data object ToggleBlockSkip:NcCommand
    data object Validate:NcCommand
    data object ConnectCam:NcCommand
    data object DisconnectCam:NcCommand
    data class ReceiveCandidate(val candidate:NcCandidate):NcCommand
    data object PreviewCandidate:NcCommand
    data object KeepWorkingCopy:NcCommand
    data object AdoptCandidate:NcCommand
    data object SaveCandidateAsNewVersion:NcCommand
    data object FreezeActive:NcCommand
    data object UnfreezeActive:NcCommand
    data class SelectMachineProfile(val profile:NcMachineProfileSnapshot):NcCommand
    data object ClearLocalMessage:NcCommand
}

data class NcDispatchResult(val accepted:Boolean,val state:NcState)
interface NcRuntimePort { fun snapshot():NcState; fun dispatch(command:NcCommand):NcDispatchResult }
interface NcPersistencePort { fun exportCheckpoint():String; fun restoreCheckpoint(raw:String):NcDispatchResult }