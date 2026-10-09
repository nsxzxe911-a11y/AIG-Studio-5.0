package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import java.io.File
import java.io.FileOutputStream
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption

class CadAutosaveController(
    private val root: File,
    private val persistence: CadPersistencePort,
) {
    private val finalFile = root.resolve("cad-checkpoint.aig")
    private val tempFile = root.resolve("cad-checkpoint.tmp")

    fun saveNow(): File {
        require(root.exists() || root.mkdirs()) { "CAD checkpoint directory unavailable" }
        val bytes = persistence.exportCheckpoint().toByteArray(Charsets.UTF_8)
        FileOutputStream(tempFile).use { output ->
            output.write(bytes)
            output.flush()
            output.fd.sync()
        }
        try {
            Files.move(tempFile.toPath(), finalFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
        } catch (_: AtomicMoveNotSupportedException) {
            Files.move(tempFile.toPath(), finalFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }
        return finalFile
    }

    fun restoreIfPresent(): CadDispatchResult? {
        if (!finalFile.isFile) return null
        val raw = finalFile.readText(Charsets.UTF_8)
        val normalized = raw.replace("\r\n", "\n").replace('\r', '\n').trimEnd('\n')
        val lines = normalized.split('\n')
        if (lines.firstOrNull() != "AIG_CAD_CHECKPOINT_V1" || lines.lastOrNull() != "END") return null
        return persistence.restoreCheckpoint(raw)
    }
}

class RecoveringCadRuntimePort(
    private val delegate: CadRuntimePort,
    private val autosave: CadAutosaveController,
) : CadRuntimePort {
    @Volatile private var ready = false

    override fun snapshot(): CadState = delegate.snapshot()

    override fun dispatch(command: CadCommand): CadDispatchResult {
        if (!ready) {
            val pending = delegate.snapshot().copy(message = RuntimeMessage(MessageSeverity.INFO, "RECOVERY_PENDING"))
            return CadDispatchResult(false, pending)
        }
        val beforeRevision = delegate.snapshot().revision
        val result = delegate.dispatch(command)
        if (result.accepted && result.state.revision != beforeRevision) autosave.saveNow()
        return result
    }

    fun completeRecovery(): CadDispatchResult? {
        val result = autosave.restoreIfPresent()
        ready = true
        return result
    }

    fun saveNowIfReady(): File? = if (ready) autosave.saveNow() else null
}
