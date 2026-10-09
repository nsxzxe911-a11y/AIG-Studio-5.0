package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class CadAutosaveControllerRegression {
    private class FakePort(var raw:String):CadPersistencePort,CadRuntimePort {
        var restored:String?=null
        var state=CadState.initial()
        var mutate=true
        override fun exportCheckpoint():String=raw
        override fun restoreCheckpoint(raw:String):CadDispatchResult { restored=raw; return CadDispatchResult(true,state) }
        override fun snapshot():CadState=state
        override fun dispatch(command:CadCommand):CadDispatchResult {
            if(mutate) state=state.copy(revision=state.revision+1)
            return CadDispatchResult(true,state)
        }
    }

    @Test fun saveIsAtomicAndRestoreRejectsInvalidSchemaBeforeRuntime() {
        val root=Files.createTempDirectory("aig-cad-save").toFile()
        val first="AIG_CAD_CHECKPOINT_V1\nREV|1\nEND\n"; val port=FakePort(first); val c=CadAutosaveController(root,port)
        val finalFile=c.saveNow(); assertEquals("cad-checkpoint.aig",finalFile.name); assertEquals(first,finalFile.readText()); assertFalse(root.resolve("cad-checkpoint.tmp").exists())
        val second="AIG_CAD_CHECKPOINT_V1\nREV|2\nEND\n"; port.raw=second; c.saveNow(); assertEquals(second,finalFile.readText())
        assertNotNull(c.restoreIfPresent()); assertEquals(second,port.restored)
        finalFile.writeText("BROKEN\n"); port.restored=null; assertNull(c.restoreIfPresent()); assertNull(port.restored)
        root.deleteRecursively()
    }

    @Test fun runtimeBlocksUntilRecoveryThenAutosavesOnlyRevisionChanges() {
        val root=Files.createTempDirectory("aig-cad-gate").toFile()
        val raw="AIG_CAD_CHECKPOINT_V1\nREV|3\nEND\n"; val port=FakePort(raw); val c=CadAutosaveController(root,port); c.saveNow()
        val runtime=RecoveringCadRuntimePort(port,c)
        assertFalse(runtime.dispatch(CadCommand.ClearMessage).accepted)
        assertNotNull(runtime.completeRecovery()); assertEquals(raw,port.restored)
        root.resolve("cad-checkpoint.aig").delete(); port.mutate=false
        assertTrue(runtime.dispatch(CadCommand.ClearMessage).accepted); assertFalse(root.resolve("cad-checkpoint.aig").exists())
        port.mutate=true; assertTrue(runtime.dispatch(CadCommand.ClearMessage).accepted); assertTrue(root.resolve("cad-checkpoint.aig").exists())
        root.deleteRecursively()
    }
}
