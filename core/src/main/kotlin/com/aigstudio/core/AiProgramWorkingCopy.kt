package com.aigstudio.core

import java.security.MessageDigest

enum class AiProgramCopyStatus { EMPTY, WORKING, VERIFIED }

data class AiProgramVerification(
    val ok:Boolean,
    val issues:List<String>,
    val summary:String
)

data class AiProgramWorkingCopySnapshot(
    val status:AiProgramCopyStatus,
    val immutableMainDigest:String?,
    val workingDigest:String?,
    val verifiedDigest:String?,
    val hasChanges:Boolean
)

/**
 * NC-program working-copy vault for AI-assisted edits.
 * The immutable main captured by open() is never mutated by stage/verify/promote.
 * promote() only returns the verified candidate; the production caller must explicitly
 * decide whether to assign it to its NC main state.
 */
class AiProgramWorkingCopyVault {
    private var immutableMain:String?=null
    private var working:String?=null
    private var verified:String?=null
    private var status=AiProgramCopyStatus.EMPTY

    @Synchronized fun open(mainProgram:String):AiProgramWorkingCopySnapshot {
        immutableMain=mainProgram
        working=mainProgram
        verified=null
        status=AiProgramCopyStatus.WORKING
        return snapshot()
    }

    @Synchronized fun stage(candidate:String):AiProgramWorkingCopySnapshot {
        check(immutableMain!=null) { "Working copy is not open" }
        working=candidate
        verified=null
        status=AiProgramCopyStatus.WORKING
        return snapshot()
    }

    @Synchronized fun verify(validator:(String)->AiProgramVerification):AiProgramVerification {
        val candidate=working ?: error("Working copy is not open")
        val result=validator(candidate)
        if(result.ok) {
            verified=candidate
            status=AiProgramCopyStatus.VERIFIED
        } else {
            verified=null
            status=AiProgramCopyStatus.WORKING
        }
        return result
    }

    /** Returns the verified candidate only. Never mutates immutableMain. */
    @Synchronized fun promote():String {
        check(status==AiProgramCopyStatus.VERIFIED && verified!=null) { "Working copy is not verified" }
        return verified!!
    }

    @Synchronized fun immutableMain():String=immutableMain ?: error("Working copy is not open")
    @Synchronized fun working():String=working ?: error("Working copy is not open")
    @Synchronized fun verified():String?=verified

    @Synchronized fun snapshot():AiProgramWorkingCopySnapshot {
        val main=immutableMain
        val work=working
        val verifiedText=verified
        return AiProgramWorkingCopySnapshot(
            status=status,
            immutableMainDigest=main?.let(::sha256),
            workingDigest=work?.let(::sha256),
            verifiedDigest=verifiedText?.let(::sha256),
            hasChanges=main!=null && work!=null && main!=work
        )
    }

    @Synchronized fun reset() {
        immutableMain=null; working=null; verified=null; status=AiProgramCopyStatus.EMPTY
    }

    companion object {
        fun sha256(text:String):String=MessageDigest.getInstance("SHA-256")
            .digest(text.toByteArray(Charsets.UTF_8))
            .joinToString(""){"%02x".format(it)}
    }
}

object AiProgramNcVerifier {
    fun verify(
        program:String,
        controller:CncControllerProfile,
        rotaryClampProfile:RotaryAxisClampProfile=RotaryAxisClampProfile.unconfigured(),
        rotaryMode:RotaryAxisOperationMode=RotaryAxisOperationMode.NONE
    ):AiProgramVerification {
        if(program.isBlank()) return AiProgramVerification(false,listOf("EMPTY_PROGRAM"),"NC VERIFY • EMPTY PROGRAM")
        val authority=NcSemanticAuthority.resolveProgram(program,controller,rotaryClampProfile,rotaryMode)
        val issues=mutableListOf<String>()
        authority.forEach { result ->
            result.conflictCodes.forEach { issues += "L${result.lineNumber}:CONFLICT:$it" }
            result.safetyCodes.forEach { issues += "L${result.lineNumber}:SAFETY:$it" }
        }
        val timeline=NcExecutionTimeline.build(
            program=program,controller=controller,rotaryClampProfile=rotaryClampProfile,rotaryMode=rotaryMode
        )
        timeline.filter{it.status=="BLOCKED"}.forEach { event ->
            event.reasons.forEach { reason -> issues += "L${event.lineNumber}:INTERLOCK:$reason" }
        }
        val distinct=issues.distinct()
        val summary=NcSemanticAuthority.programSummary(program,controller,rotaryClampProfile,rotaryMode)+
            " • "+NcExecutionTimeline.programSummary(program,controller,rotaryClampProfile=rotaryClampProfile,rotaryMode=rotaryMode)
        return AiProgramVerification(distinct.isEmpty(),distinct,summary)
    }
}
