package com.aigstudio.production.runtime

import com.aigstudio.core.AiProgramNcVerifier
import com.aigstudio.core.AiProgramWorkingCopyVault
import com.aigstudio.core.CncControllerProfile

data class CleanAiSnapshot(
    val state:String,
    val immutableMainDigest:String,
    val workingDigest:String,
    val verifiedDigest:String,
    val hasChanges:Boolean,
    val verified:Boolean,
    val issueCount:Int,
    val summary:String,
    val currentMain:String,
    val workingProgram:String
)

class CleanAiSession {
    private val vault=AiProgramWorkingCopyVault()
    private var currentMain=CleanNcSession.DEFAULT_PROGRAM
    private var lastSummary="AI VAULT READY"
    private var lastIssues=0

    init { vault.open(currentMain) }

    fun openMain():CleanAiSnapshot {
        vault.open(currentMain); lastSummary="IMMUTABLE MAIN OPENED"; lastIssues=0
        return snapshot()
    }

    fun stage(candidate:String):CleanAiSnapshot {
        vault.stage(candidate.replace("\r\n","\n")); lastSummary="WORKING COPY STAGED"; lastIssues=0
        return snapshot()
    }

    fun verify():CleanAiSnapshot {
        val result=vault.verify { AiProgramNcVerifier.verify(it,CncControllerProfile.FANUC) }
        lastSummary=result.summary; lastIssues=result.issues.size
        return snapshot()
    }

    fun promote():CleanAiSnapshot {
        currentMain=vault.promote()
        lastSummary="VERIFIED MAIN PROMOTED"; lastIssues=0
        return snapshot()
    }

    fun restoreWorkingToMain():CleanAiSnapshot = openMain()

    fun snapshot():CleanAiSnapshot {
        val s=vault.snapshot()
        return CleanAiSnapshot(
            state=s.status.name,
            immutableMainDigest=s.immutableMainDigest.orEmpty(),
            workingDigest=s.workingDigest.orEmpty(),
            verifiedDigest=s.verifiedDigest.orEmpty(),
            hasChanges=s.hasChanges,
            verified=s.verifiedDigest!=null,
            issueCount=lastIssues,
            summary=lastSummary,
            currentMain=currentMain,
            workingProgram=vault.working()
        )
    }
}
