package com.aigstudio.core

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.Properties

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

enum class ContinuityFailureClass { NETWORK, INFRASTRUCTURE, UI_STATUS, PRODUCT_SAFETY, COMPILE_RUNTIME, INTEGRITY }

data class DepartmentCheckpoint(
    val department:String,
    val phase:String,
    val version:String,
    val exactSha:String?=null,
    val completedUnits:Int=0,
    val totalUnits:Int?=null,
    val lastError:String?=null
)

object DepartmentContinuityPolicy {
    const val MODE="RESUME_FROM_LAST_CHECKPOINT"
    const val RED_TEXT_IS_STATUS_NOT_STOP=true
    const val NETWORK_DISCONNECT_RESUMABLE=true
    const val INFRA_FAILURE_RESUMABLE=true
    const val PRODUCT_SAFETY_FAILURE_BLOCKS_RELEASE=true
    val departments=setOf("HOME","CAD","CAM","SIM","3AX","4AX","5AX","NC","AI","UIUX","ANDROID_BUILD","WINDOWS_BUILD","ANDROID_COMPILE","WINDOWS_COMPILE","PACKAGE_VERIFY","WEB","WEB_DEPLOY")

    fun resumeAllowed(failureClass:ContinuityFailureClass):Boolean =
        failureClass==ContinuityFailureClass.NETWORK ||
            failureClass==ContinuityFailureClass.INFRASTRUCTURE ||
            failureClass==ContinuityFailureClass.UI_STATUS

    fun blocksRelease(failureClass:ContinuityFailureClass):Boolean =
        failureClass==ContinuityFailureClass.PRODUCT_SAFETY ||
            failureClass==ContinuityFailureClass.COMPILE_RUNTIME ||
            failureClass==ContinuityFailureClass.INTEGRITY

    private fun safeDepartment(value:String):String = value.trim().uppercase().also {
        require(it in departments){"Unknown continuity department: $value"}
    }

    fun checkpointFile(root:File,department:String):File =
        File(root,"continuity/"+safeDepartment(department).lowercase()+".checkpoint.properties")

    fun save(file:File,checkpoint:DepartmentCheckpoint) {
        val department=safeDepartment(checkpoint.department)
        require(checkpoint.completedUnits>=0){"Negative completedUnits"}
        checkpoint.totalUnits?.let { require(it>=checkpoint.completedUnits){"completedUnits beyond totalUnits"} }
        file.parentFile?.mkdirs()
        val props=Properties().apply {
            setProperty("department",department)
            setProperty("phase",checkpoint.phase)
            setProperty("version",checkpoint.version)
            setProperty("exactSha",checkpoint.exactSha.orEmpty())
            setProperty("completedUnits",checkpoint.completedUnits.toString())
            setProperty("totalUnits",checkpoint.totalUnits?.toString().orEmpty())
            setProperty("lastError",checkpoint.lastError.orEmpty())
        }
        val temp=File(file.parentFile,file.name+".tmp")
        temp.outputStream().use { props.store(it,"AIG department continuity checkpoint") }
        val moved=runCatching {
            Files.move(temp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE)
        }.isSuccess
        if(!moved) Files.move(temp.toPath(),file.toPath(),StandardCopyOption.REPLACE_EXISTING)
    }

    fun load(file:File):DepartmentCheckpoint? {
        if(!file.isFile) return null
        val props=Properties().apply { file.inputStream().use(::load) }
        val department=props.getProperty("department")?.takeIf{it.isNotBlank()} ?: return null
        return DepartmentCheckpoint(
            department=safeDepartment(department),
            phase=props.getProperty("phase").orEmpty(),
            version=props.getProperty("version").orEmpty(),
            exactSha=props.getProperty("exactSha")?.takeIf{it.isNotBlank()},
            completedUnits=props.getProperty("completedUnits")?.toIntOrNull() ?: 0,
            totalUnits=props.getProperty("totalUnits")?.toIntOrNull(),
            lastError=props.getProperty("lastError")?.takeIf{it.isNotBlank()}
        )
    }
}

object NetworkResiliencePolicy {
    const val MODE="OFFLINE_FIRST_CIRCUIT_BREAKER"
    const val UI_THREAD_NETWORK_WAIT_ALLOWED=false
    const val MAX_RETRY_ATTEMPTS=2
    const val BASE_RETRY_DELAY_MS=350L
    const val CIRCUIT_OPEN_AFTER_FAILURES=3
    const val CIRCUIT_COOLDOWN_MS=30_000L
    const val PEER_DISRUPTION_ACTION="ISOLATE_LOCAL_CONNECTION_ONLY"

    fun retryDelayMs(attempt:Int):Long {
        require(attempt>=0){"attempt must be >= 0"}
        return (BASE_RETRY_DELAY_MS*(attempt+1L)).coerceAtMost(1_500L)
    }

    fun shouldOpenCircuit(consecutiveFailures:Int):Boolean =
        consecutiveFailures>=CIRCUIT_OPEN_AFTER_FAILURES

    fun networkFailureBlocksRuntime():Boolean=false
    fun defensiveOnly():Boolean=true
}

object RollingUpdatePolicy {
    const val MODE="FORWARD_ONLY_AFTER_VERIFIED_PASS"
    const val OFFLINE_FIRST=true
    const val NETWORK_BLOCKS_RUNTIME=false
    const val PARTIAL_CHECKPOINT_PERSIST=true
    const val CHANGED_PACKAGES_ONLY=true
    const val WORKING_COPY_BEFORE_PROMOTE=true
    const val REGRESSION_EXECUTION_ENABLED=false
    const val ALLOW_DOWNGRADE=false
    const val ALLOW_EQUAL_VERSION_REINSTALL=false
    const val REGRESSION_REENABLE_REQUIRES_EXPLICIT_USER_APPROVAL=true
    const val CNC_SAFETY_POLICY_CHANGES_REQUIRE_EXPLICIT_USER_APPROVAL=true
    const val CNC_SAFETY_CORE_LOCKED=true
    const val CNC_SAFETY_DISABLE_ALLOWED=false
    const val STARTUP_VERSION_COMPARE_ENABLED=true
    const val STARTUP_VERSION_COMPARE_AFTER_HOME_FIRST_FRAME=true
    const val STARTUP_APPLY_ONLY_VERIFIED_NEWER=true
    const val STARTUP_NETWORK_MAY_BLOCK_UI=false
    const val STARTUP_OFFLINE_USES_INSTALLED_VERSION=true
    const val STARTUP_BACKGROUND_DOWNLOAD_FOLLOWS_USER_SETTING=true
    const val STARTUP_BINARY_INSTALL_REQUIRES_USER_CONFIRMATION=true

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

    @Suppress("UNUSED_PARAMETER")
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
            !cncRegressionRequired
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
