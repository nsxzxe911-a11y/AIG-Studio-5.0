package com.aigstudio.production.runtime

import com.aigstudio.core.AiPackageArtifact
import com.aigstudio.core.RollingUpdatePolicy
import com.aigstudio.core.StudioPackageRegistry
import com.aigstudio.core.VerifiedWorkingCopy
import java.io.File

data class CleanAiUpdateSnapshot(
    val currentVersion:String,
    val targetVersion:String,
    val packageHealthy:Boolean,
    val packageCount:Int,
    val forwardAllowed:Boolean,
    val promotionReady:Boolean,
    val status:String,
    val policy:String
)

class CleanAiUpdateSession(private val installedVersion:String) {
    fun health():CleanAiUpdateSnapshot {
        val validation=StudioPackageRegistry.validate()
        return CleanAiUpdateSnapshot(
            installedVersion,"",validation.ok,StudioPackageRegistry.official.packages.size,
            false,false,
            if(validation.ok) "PACKAGE BUNDLE HEALTHY" else "PACKAGE BUNDLE INVALID",
            policySummary()
        )
    }

    fun evaluate(current:String,baseline:String,target:String,gatePass:Boolean,digestsVerified:Boolean):CleanAiUpdateSnapshot {
        val validation=StudioPackageRegistry.validate()
        val forward=validation.ok && RollingUpdatePolicy.updateAllowed(current,baseline,target)
        val promote=forward && RollingUpdatePolicy.canPromote(baseline,target,gatePass,digestsVerified,false,true)
        val status=when {
            !validation.ok -> "UPDATE BLOCKED • PACKAGE BUNDLE INVALID"
            !forward -> "UPDATE BLOCKED • FORWARD ONLY"
            promote -> "UPDATE VERIFIED • PROMOTE READY"
            else -> "UPDATE WAITING • VERIFIED GATE REQUIRED"
        }
        return CleanAiUpdateSnapshot(current,target,validation.ok,StudioPackageRegistry.official.packages.size,forward,promote,status,policySummary())
    }

    fun stageVerified(source:File,workingRoot:File,artifact:AiPackageArtifact):File =
        VerifiedWorkingCopy.stage(source,workingRoot,artifact)

    fun promoteVerified(staged:File,target:File,currentBaseline:String,candidateVersion:String,gatePass:Boolean,digestsVerified:Boolean):File {
        require(RollingUpdatePolicy.canPromote(currentBaseline,candidateVersion,gatePass,digestsVerified,false,true)) {
            "Promotion blocked until newer version, relevant Gate PASS, and verified digests"
        }
        return VerifiedWorkingCopy.promote(staged,target)
    }

    fun policySummary():String =
        "${RollingUpdatePolicy.MODE} • OFFLINE_FIRST=${RollingUpdatePolicy.OFFLINE_FIRST} • NETWORK_BLOCKS_RUNTIME=${RollingUpdatePolicy.NETWORK_BLOCKS_RUNTIME} • DOWNGRADE=${RollingUpdatePolicy.ALLOW_DOWNGRADE}"
}
