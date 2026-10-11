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
        assertTrue(nodes.filterIsInstance<RgbGlassButtonNode>().filter { it.id.startsWith("CAD.") && it.visible }.all { it.enabled })
        controller.activate("CAD.UNDO")
        assertTrue(fake.commands.last() is CadCommand.Undo)
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.LINE" }.enabled)
    }

    @Test fun oneKeyToolGroupExpandsRealAdvancedNodes() {
        val controller = CadSceneController(FakePort())
        assertTrue(controller.nodes(1080f,2316f,3f).none { it.id == "CAD.CHAMFER" })
        assertTrue(controller.nodes(1080f,2316f,3f).none { it.id == "CAD.FILLET" })
        controller.activate("CAD.TOOL_GROUP")
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.CHAMFER" }.visible)
        assertTrue(controller.nodes(1080f,2316f,3f).first { it.id == "CAD.FILLET" }.visible)
    }
}
