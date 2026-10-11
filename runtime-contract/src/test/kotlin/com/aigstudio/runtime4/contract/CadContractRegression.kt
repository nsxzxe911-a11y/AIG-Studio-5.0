package com.aigstudio.runtime4.contract

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class CadContractRegression {
    @Test
    fun initialStateIsStandaloneAndUnlocked() {
        val state = CadState.initial()
        assertEquals(CadTool.LINE, state.activeTool)
        assertEquals(CadSnapMode.OFF, state.snapMode)
        assertEquals(0L, state.revision)
        assertEquals(0.0, state.originX)
        assertEquals(0.0, state.originY)
        assertFalse(state.arcClockwise)
        assertEquals(0, state.arcStage)
        assertTrue(state.primitives.isEmpty())
        assertEquals(0, state.selectedCount)
        assertEquals(0, state.topologyCount)
        assertNull(state.message)
        val forbidden = CadState::class.java.declaredFields.map { it.name.lowercase() }
        assertFalse(forbidden.any { it == "lock" || it == "locked" || it == "failed" || it == "failure" || it == "globalfail" || it == "globallock" })
    }

    @Test
    fun sceneIdsAndCommandsAreConstructible() {
        assertEquals(listOf("HOME","CAD","CAM","SIM","MULTIFUNCTION","AXIS3","AXIS4","AXIS5","AXIS6","NC","AI"), SceneId.entries.map { it.name })
        assertTrue(CadTool.ARC in CadTool.entries)
        val p = CadPoint(1.0, 2.0)
        val commands: List<CadCommand> = listOf(
            CadCommand.SelectTool(CadTool.RECT), CadCommand.CycleSnap, CadCommand.ToggleArcDirection,
            CadCommand.PointerDown(p), CadCommand.PointerUp(p),
            CadCommand.Undo, CadCommand.Redo, CadCommand.Trim, CadCommand.Extend,
            CadCommand.Offset(5.0), CadCommand.Array(3, 10.0, 0.0),
            CadCommand.Chamfer(5.0), CadCommand.Fillet(5.0),
            CadCommand.ToggleTopology, CadCommand.ClearMessage
        )
        assertEquals(15, commands.size)
        assertEquals(8, CadSnapMode.entries.size)
    }
}
