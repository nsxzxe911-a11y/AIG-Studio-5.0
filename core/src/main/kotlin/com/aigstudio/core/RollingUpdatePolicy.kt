package com.aigstudio.core

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest

enum class UpdateSafetyScope { UI_AI_NETWORK, GCODE, COORDINATE, CUTTER_COMP, COLLISION }

data class AiPackageArtifact(
    val id:String,
    val version:String,
    val sha256:String,
    val downloadUrl:String,
    val baseSha256:String?=null,
    val safetyScope:UpdateSafetyScope=UpdateSafetyScope.UI_AI_NETWORK
)

data class AiPackageManifest(
    val product:String,
    val targetVersion:String,
    val baselineFloor:String,
    val packages:List<AiPackageArtifact>
)

data class UpdateCheckpoint(
    val packageId:String,
    val downloadedBytes:Long,
    val totalBytes:Long?=null
)

object RollingUpdatePolicy {
    const val MODE="FORWARD_ONLY_AFTER_VERIFIED_PASS"
    const val OFFLINE_FIRST=true
    const val NETWORK_BLOCKS_RUNTIME=false
    const val PARTIAL_CHECKPOINT_PERSIST=true
    const val CHANGED_PACKAGES_ONLY=true
    const val WORKING_COPY_BEFORE_PROMOTE=true

    private fun parts(v:String)=v.trim().split('.').map { it.toIntOrNull() ?: 0 }
    fun compareVersions(a:String,b:String):Int {
        val aa=parts(a); val bb=parts(b); val n=maxOf(aa.size,bb.size)
        for(i in 0 until n){
            val av=aa.getOrElse(i){0}; val bv=bb.getOrElse(i){0}
            if(av!=bv) return av.compareTo(bv)
        }
        return 0
    }

    fun updateAllowed(current:String,baseline:String,target:String):Boolean =
        compareVersions(current,baseline)>=0 && compareVersions(target,current)>0

    fun changedPackages(manifest:AiPackageManifest,installedSha:Map<String,String>):List<AiPackageArtifact> =
        manifest.packages.filter { installedSha[it.id]?.equals(it.sha256,ignoreCase=true) != true }

    fun requiresCncRegression(packages:List<AiPackageArtifact>):Boolean =
        packages.any { it.safetyScope != UpdateSafetyScope.UI_AI_NETWORK }

    fun resumeOffset(checkpoint:UpdateCheckpoint?):Long {
        if(checkpoint==null) return 0L
        require(checkpoint.downloadedBytes>=0L){"Negative checkpoint"}
        checkpoint.totalBytes?.let { require(checkpoint.downloadedBytes<=it){"Checkpoint beyond total"} }
        return checkpoint.downloadedBytes
    }

    fun canPromote(
        currentBaseline:String,
        candidateVersion:String,
        relevantGatePass:Boolean,
        allDigestsVerified:Boolean,
        cncRegressionRequired:Boolean,
        cncRegressionPass:Boolean
    ):Boolean =
        compareVersions(candidateVersion,currentBaseline)>0 &&
            relevantGatePass && allDigestsVerified &&
            (!cncRegressionRequired || cncRegressionPass)
}

object VerifiedWorkingCopy {
    fun sha256(file:File):String {
        val md=MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer=ByteArray(64*1024)
            while(true){ val n=input.read(buffer); if(n<=0) break; md.update(buffer,0,n) }
        }
        return md.digest().joinToString(""){"%02x".format(it)}
    }

    fun stage(source:File,workingRoot:File,artifact:AiPackageArtifact):File {
        require(source.isFile){"Package source missing"}
        require(Regex("^[0-9a-fA-F]{64}$").matches(artifact.sha256)){"Invalid package SHA-256"}
        workingRoot.mkdirs()
        val staged=File(workingRoot,artifact.id+"-"+artifact.version+".working")
        source.copyTo(staged,overwrite=true)
        require(sha256(staged).equals(artifact.sha256,ignoreCase=true)){"Package SHA-256 mismatch"}
        return staged
    }

    fun promote(staged:File,target:File):File {
        require(staged.isFile){"Verified working copy missing"}
        target.parentFile?.mkdirs()
        if(target.exists()) require(target.delete()){"Unable to replace package"}
        val moved=runCatching {
            Files.move(staged.toPath(),target.toPath(),StandardCopyOption.ATOMIC_MOVE)
        }.isSuccess
        if(!moved) Files.move(staged.toPath(),target.toPath())
        require(target.isFile){"Package promotion failed"}
        return target
    }
}
