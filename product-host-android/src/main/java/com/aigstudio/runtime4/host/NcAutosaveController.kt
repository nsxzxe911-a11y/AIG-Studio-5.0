package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import java.io.File
import java.io.FileOutputStream
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class NcAutosaveController(
    private val root:File,
    private val persistence:NcPersistencePort,
){
    private val finalFile=root.resolve("nc-checkpoint.aig")
    private val tempFile=root.resolve("nc-checkpoint.tmp")
    fun saveNow():File{
        require(root.exists() || root.mkdirs()){"NC checkpoint directory unavailable"}
        val bytes=persistence.exportCheckpoint().toByteArray(Charsets.UTF_8)
        FileOutputStream(tempFile).use{out->out.write(bytes);out.flush();out.fd.sync()}
        try{Files.move(tempFile.toPath(),finalFile.toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE)}
        catch(_:AtomicMoveNotSupportedException){Files.move(tempFile.toPath(),finalFile.toPath(),StandardCopyOption.REPLACE_EXISTING)}
        return finalFile
    }
    fun restoreIfPresent():NcDispatchResult?{
        if(!finalFile.isFile)return null
        val raw=finalFile.readText(Charsets.UTF_8)
        val lines=raw.replace("\r\n","\n").replace('\r','\n').trimEnd('\n').split('\n')
        if(lines.firstOrNull()!="AIG_NC_CHECKPOINT_V1" || lines.lastOrNull()!="END")return null
        return persistence.restoreCheckpoint(raw)
    }
}

class RecoveringNcRuntimePort(
    private val delegate:NcRuntimePort,
    private val autosave:NcAutosaveController,
):NcRuntimePort{
    @Volatile private var ready=false
    override fun snapshot():NcState=delegate.snapshot()
    override fun dispatch(command:NcCommand):NcDispatchResult{
        if(!ready){
            val pending=delegate.snapshot().copy(message=RuntimeMessage(MessageSeverity.INFO,"RECOVERY_PENDING"))
            return NcDispatchResult(false,pending)
        }
        val result=delegate.dispatch(command)
        if(result.accepted)autosave.saveNow()
        return result
    }
    fun completeRecovery():NcDispatchResult?{val result=autosave.restoreIfPresent();ready=true;return result}
    fun saveNowIfReady():File?=if(ready)autosave.saveNow() else null
}