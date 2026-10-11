package com.aigstudio.runtime4.host

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class NcAutosaveControllerRegression {
    private class FakePort(var raw:String):NcPersistencePort,NcRuntimePort {
        var restored:String?=null
        var state=NcState.initial()
        override fun exportCheckpoint():String=raw
        override fun restoreCheckpoint(raw:String):NcDispatchResult { restored=raw; return NcDispatchResult(true,state) }
        override fun snapshot():NcState=state
        override fun dispatch(command:NcCommand):NcDispatchResult=NcDispatchResult(true,state)
    }
    @Test fun saveIsAtomicAndSchemaCheckedBeforeRestore(){
        val root=Files.createTempDirectory("aig-nc-save").toFile(); val first="AIG_NC_CHECKPOINT_V1\nEND\n"; val port=FakePort(first); val c=NcAutosaveController(root,port)
        val finalFile=c.saveNow(); assertEquals("nc-checkpoint.aig",finalFile.name); assertEquals(first,finalFile.readText()); assertFalse(root.resolve("nc-checkpoint.tmp").exists())
        val second="AIG_NC_CHECKPOINT_V1\nSTATE|2\nEND\n"; port.raw=second; c.saveNow(); assertEquals(second,finalFile.readText())
        assertNotNull(c.restoreIfPresent()); assertEquals(second,port.restored)
        finalFile.writeText("BROKEN\n"); port.restored=null; assertNull(c.restoreIfPresent()); assertNull(port.restored); root.deleteRecursively()
    }
    @Test fun runtimeBlocksUntilRecoveryThenAutosavesAcceptedCommands(){
        val root=Files.createTempDirectory("aig-nc-gate").toFile(); val raw="AIG_NC_CHECKPOINT_V1\nEND\n"; val port=FakePort(raw); val c=NcAutosaveController(root,port); c.saveNow()
        val runtime=RecoveringNcRuntimePort(port,c)
        val blocked=runtime.dispatch(NcCommand.ClearLocalMessage); assertFalse(blocked.accepted); assertEquals("RECOVERY_PENDING",blocked.state.message?.text)
        assertNotNull(runtime.completeRecovery()); assertEquals(raw,port.restored)
        root.resolve("nc-checkpoint.aig").delete(); assertTrue(runtime.dispatch(NcCommand.ClearLocalMessage).accepted); assertTrue(root.resolve("nc-checkpoint.aig").exists())
        root.deleteRecursively()
    }
}