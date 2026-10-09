package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import java.io.File
import java.io.FileOutputStream
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class CamAutosaveController(
    private val root:File,
    private val persistence:CamPersistencePort,
) {
    private val finalFile=root.resolve("cam-checkpoint.aig")
    private val tempFile=root.resolve("cam-checkpoint.tmp")

    fun saveNow():File {
        require(root.exists() || root.mkdirs()){"CAM checkpoint directory unavailable"}
        val bytes=persistence.exportCheckpoint().toByteArray(Charsets.UTF_8)
        FileOutputStream(tempFile).use { out -> out.write(bytes); out.flush(); out.fd.sync() }
        try {
            Files.move(tempFile.toPath(),finalFile.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE)
        } catch(_:AtomicMoveNotSupportedException) {
            Files.move(tempFile.toPath(),finalFile.toPath(),StandardCopyOption.REPLACE_EXISTING)
        }
        return finalFile
    }

    fun restoreIfPresent():CamDispatchResult? {
        if(!finalFile.isFile) return null
        val raw=finalFile.readText(Charsets.UTF_8)
        val lines=raw.replace("\r\n","\n").replace('\r','\n').trimEnd('\n').split('\n')
        if(lines.firstOrNull()!="AIG_CAM_CHECKPOINT_V1" || lines.lastOrNull()!="END") return null
        return persistence.restoreCheckpoint(raw)
    }
}

class RecoveringCamRuntimePort(
    private val delegate:CamRuntimePort,
    private val autosave:CamAutosaveController,
):CamRuntimePort {
    @Volatile private var ready=false
    override fun snapshot():CamState=delegate.snapshot()
    override fun dispatch(command:CamCommand):CamDispatchResult {
        if(!ready) {
            val pending=delegate.snapshot().copy(message=RuntimeMessage(MessageSeverity.INFO,"RECOVERY_PENDING"))
            return CamDispatchResult(false,pending)
        }
        val result=delegate.dispatch(command)
        if(result.accepted) autosave.saveNow()
        return result
    }
    fun completeRecovery():CamDispatchResult? { val result=autosave.restoreIfPresent(); ready=true; return result }
    fun saveNowIfReady():File?=if(ready) autosave.saveNow() else null
}
