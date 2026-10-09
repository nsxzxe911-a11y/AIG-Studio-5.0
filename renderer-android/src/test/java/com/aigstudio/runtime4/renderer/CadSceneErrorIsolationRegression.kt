package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class CadSceneErrorIsolationRegression {
    private class FakePort : CadRuntimePort {
        var state = CadState.initial().copy(message = RuntimeMessage(MessageSeverity.ALARM, "LOCAL ONLY"))
        val commands = mutableListOf<CadCommand>()
        override fun snapshot() = state
        override fun dispatch(command: CadCommand): CadDispatchResult { commands += command; return CadDispatchResult(false, state) }
    }

    @Test fun alarmMessageNeverDisablesCadNodes() {
        val fake = FakePort()
        val controller = CadSceneController(fake)
        val nodes = controller.nodes(1080f,2316f,3f)
        assertTrue(nodes.filter { it.id.startsWith("CAD.") && it.id != "CAD.VIEWPORT" }.filter { it.visible }.all { it.enabled })
        controller.activate("CAD.UNDO")
        assertTrue(fake.commands.last() is CadCommand.Undo)
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.LINE" }.enabled)
    }

    @Test fun oneKeyToolGroupExpandsRealAdvancedNodes() {
        val controller = CadSceneController(FakePort())
        assertFalse(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.TRIM" }.visible)
        controller.activate("CAD.TOOL_GROUP")
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.TRIM" }.visible)
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.FILLET" }.visible)
    }
}
