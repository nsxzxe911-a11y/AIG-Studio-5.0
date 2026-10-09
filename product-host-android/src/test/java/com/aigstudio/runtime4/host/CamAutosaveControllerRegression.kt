package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class CamAutosaveControllerRegression {
    private class FakePort(var raw:String):CamPersistencePort,CamRuntimePort {
        var restored:String?=null
        var state=CamState.initial()
        override fun exportCheckpoint():String=raw
        override fun restoreCheckpoint(raw:String):CamDispatchResult { restored=raw; return CamDispatchResult(true,state) }
        override fun snapshot():CamState=state
        override fun dispatch(command:CamCommand):CamDispatchResult=CamDispatchResult(true,state)
    }

    @Test fun saveIsAtomicAndRestoreRejectsInvalidSchemaBeforeRuntime() {
        val root=Files.createTempDirectory("aig-cam-save").toFile()
        val first="AIG_CAM_CHECKPOINT_V1\nEND\n"; val port=FakePort(first); val c=CamAutosaveController(root,port)
        val finalFile=c.saveNow(); assertEquals("cam-checkpoint.aig",finalFile.name); assertEquals(first,finalFile.readText()); assertFalse(root.resolve("cam-checkpoint.tmp").exists())
        val second="AIG_CAM_CHECKPOINT_V1\nSTATE|2\nEND\n"; port.raw=second; c.saveNow(); assertEquals(second,finalFile.readText())
        assertNotNull(c.restoreIfPresent()); assertEquals(second,port.restored)
        finalFile.writeText("BROKEN\n"); port.restored=null; assertNull(c.restoreIfPresent()); assertNull(port.restored)
        root.deleteRecursively()
    }

    @Test fun runtimeBlocksUntilRecoveryThenAcceptedCommandsAutosave() {
        val root=Files.createTempDirectory("aig-cam-gate").toFile()
        val raw="AIG_CAM_CHECKPOINT_V1\nEND\n"; val port=FakePort(raw); val c=CamAutosaveController(root,port); c.saveNow()
        val runtime=RecoveringCamRuntimePort(port,c)
        val blocked=runtime.dispatch(CamCommand.ClearLocalMessage)
        assertFalse(blocked.accepted); assertEquals("RECOVERY_PENDING",blocked.state.message?.text)
        assertNotNull(runtime.completeRecovery()); assertEquals(raw,port.restored)
        root.resolve("cam-checkpoint.aig").delete()
        assertTrue(runtime.dispatch(CamCommand.ClearLocalMessage).accepted)
        assertTrue(root.resolve("cam-checkpoint.aig").exists())
        root.deleteRecursively()
    }
}