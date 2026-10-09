package com.aigstudio.production.runtime

import com.aigstudio.core.DepartmentCheckpoint
import com.aigstudio.core.DepartmentContinuityPolicy
import com.aigstudio.core.NetworkResiliencePolicy
import com.aigstudio.core.RollingUpdatePolicy
import com.aigstudio.core.UpdateCheckpoint
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties

data class CleanAiResumeSnapshot(
    val packageId:String,
    val downloadedBytes:Long,
    val totalBytes:Long?,
    val resumeOffset:Long
)

data class CleanAiNetworkStatus(
    val circuitOpen:Boolean,
    val runtimeBlocked:Boolean,
    val retryDelayMs:Long,
    val mode:String,
    val defensiveOnly:Boolean
)

class CleanAiContinuitySession(private val root:File) {
    private val updateFile = File(root,"ai/update.checkpoint.properties")
    private val departmentFile = DepartmentContinuityPolicy.checkpointFile(root,"AI")

    fun saveUpdateCheckpoint(packageId:String, downloadedBytes:Long, totalBytes:Long?):CleanAiResumeSnapshot {
        require(packageId.isNotBlank()) { "packageId required" }
        require(downloadedBytes>=0L) { "negative downloaded bytes" }
        totalBytes?.let { require(downloadedBytes<=it) { "downloaded bytes beyond total" } }
        val checkpoint=UpdateCheckpoint(packageId,downloadedBytes,totalBytes)
        val offset=RollingUpdatePolicy.resumeOffset(checkpoint)
        updateFile.parentFile?.mkdirs()
        val props=Properties().apply {
            setProperty("packageId",packageId)
            setProperty("downloadedBytes",downloadedBytes.toString())
            setProperty("totalBytes",totalBytes?.toString().orEmpty())
        }
        val temp=File(updateFile.parentFile,updateFile.name+".tmp")
        temp.outputStream().use { props.store(it,"AIG AI update checkpoint") }
        Files.move(temp.toPath(),updateFile.toPath(),StandardCopyOption.REPLACE_EXISTING)
        return CleanAiResumeSnapshot(packageId,downloadedBytes,totalBytes,offset)
    }

    fun loadUpdateCheckpoint():CleanAiResumeSnapshot? {
        if(!updateFile.isFile) return null
        val props=Properties().apply { updateFile.inputStream().use(::load) }
        val id=props.getProperty("packageId")?.takeIf { it.isNotBlank() } ?: return null
        val downloaded=props.getProperty("downloadedBytes")?.toLongOrNull() ?: return null
        val total=props.getProperty("totalBytes")?.takeIf { it.isNotBlank() }?.toLongOrNull()
        val checkpoint=UpdateCheckpoint(id,downloaded,total)
        return CleanAiResumeSnapshot(id,downloaded,total,RollingUpdatePolicy.resumeOffset(checkpoint))
    }

    fun saveDepartmentCheckpoint(phase:String,version:String,completedUnits:Int,totalUnits:Int?,lastError:String?):DepartmentCheckpoint {
        val checkpoint=DepartmentCheckpoint("AI",phase,version,completedUnits=completedUnits,totalUnits=totalUnits,lastError=lastError)
        DepartmentContinuityPolicy.save(departmentFile,checkpoint)
        return checkpoint
    }

    fun loadDepartmentCheckpoint():DepartmentCheckpoint? = DepartmentContinuityPolicy.load(departmentFile)

    fun networkStatus(consecutiveFailures:Int):CleanAiNetworkStatus {
        require(consecutiveFailures>=0) { "negative failure count" }
        val attempt=(consecutiveFailures-1).coerceAtLeast(0)
        return CleanAiNetworkStatus(
            circuitOpen=NetworkResiliencePolicy.shouldOpenCircuit(consecutiveFailures),
            runtimeBlocked=NetworkResiliencePolicy.networkFailureBlocksRuntime(),
            retryDelayMs=NetworkResiliencePolicy.retryDelayMs(attempt),
            mode=NetworkResiliencePolicy.MODE,
            defensiveOnly=NetworkResiliencePolicy.defensiveOnly()
        )
    }
}
