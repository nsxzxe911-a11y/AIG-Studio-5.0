package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class FourthCadRuntimeAdapterRegression {
    private fun draw(runtime: FourthCadRuntimeAdapter, tool: CadTool, a: CadPoint, b: CadPoint): CadDispatchResult {
        runtime.dispatch(CadCommand.SelectTool(tool))
        runtime.dispatch(CadCommand.PointerDown(a))
        return runtime.dispatch(CadCommand.PointerUp(b))
    }

    private fun select(runtime: FourthCadRuntimeAdapter, p: CadPoint): CadDispatchResult {
        runtime.dispatch(CadCommand.SelectTool(CadTool.SELECT))
        runtime.dispatch(CadCommand.PointerDown(p))
        return runtime.dispatch(CadCommand.PointerUp(p))
    }

    @Test
    fun drawingCommandsExposeRealPrimitivesAndIncrementRevisionOnce() {
        val runtime = FourthCadRuntimeAdapter()
        var revision = runtime.snapshot().revision
        for ((tool, a, b) in listOf(
            Triple(CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(20.0, 0.0)),
            Triple(CadTool.RECT, CadPoint(30.0, 0.0), CadPoint(50.0, 10.0)),
            Triple(CadTool.CIRCLE, CadPoint(70.0, 0.0), CadPoint(75.0, 0.0)),
            Triple(CadTool.HOLE, CadPoint(90.0, 0.0), CadPoint(95.0, 0.0)),
        )) {
            val result = draw(runtime, tool, a, b)
            assertTrue(result.accepted)
            assertEquals(revision + 1L, result.state.revision)
            revision = result.state.revision
        }
        assertTrue(runtime.snapshot().primitives.isNotEmpty())
        assertTrue(runtime.snapshot().primitives.any { it is CadPrimitiveSnapshot.Hole })
    }

    @Test
    fun selectSupportsTwoEntities() {
        val runtime = FourthCadRuntimeAdapter()
        draw(runtime, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(20.0, 0.0))
        draw(runtime, CadTool.LINE, CadPoint(0.0, 20.0), CadPoint(20.0, 20.0))
        assertTrue(select(runtime, CadPoint(10.0, 0.0)).accepted)
        assertTrue(select(runtime, CadPoint(10.0, 20.0)).accepted)
        assertEquals(2, runtime.snapshot().selectedCount)
    }

    @Test
    fun undoRedoRestoreGeometryAndIncrementRevisionOnce() {
        val runtime = FourthCadRuntimeAdapter()
        draw(runtime, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(20.0, 0.0))
        val beforeUndo = runtime.snapshot()
        val undo = runtime.dispatch(CadCommand.Undo)
        assertTrue(undo.accepted)
        assertEquals(beforeUndo.revision + 1L, undo.state.revision)
        val redo = runtime.dispatch(CadCommand.Redo)
        assertTrue(redo.accepted)
        assertEquals(undo.state.revision + 1L, redo.state.revision)
        assertEquals(beforeUndo.primitives.size, redo.state.primitives.size)
    }

    @Test
    fun snapCycleStartsAtEndpointAndRemainsLocalState() {
        val runtime = FourthCadRuntimeAdapter()
        val before = runtime.snapshot().revision
        val result = runtime.dispatch(CadCommand.CycleSnap)
        assertTrue(result.accepted)
        assertEquals(CadSnapMode.ENDPOINT, result.state.snapMode)
        assertEquals(before, result.state.revision)
    }

    @Test
    fun rejectedTinyLineDoesNotAdvanceRevisionAndNextValidLineWorks() {
        val runtime = FourthCadRuntimeAdapter()
        runtime.dispatch(CadCommand.SelectTool(CadTool.LINE))
        val before = runtime.snapshot().revision
        runtime.dispatch(CadCommand.PointerDown(CadPoint(0.0, 0.0)))
        val rejected = runtime.dispatch(CadCommand.PointerUp(CadPoint(0.0005, 0.0)))
        assertFalse(rejected.accepted)
        assertEquals(before, rejected.state.revision)
        assertNotNull(rejected.state.message)
        runtime.dispatch(CadCommand.PointerDown(CadPoint(0.0, 0.0)))
        val accepted = runtime.dispatch(CadCommand.PointerUp(CadPoint(10.0, 0.0)))
        assertTrue(accepted.accepted)
        assertEquals(before + 1L, accepted.state.revision)
    }

    @Test
    fun trimExtendOffsetArrayChamferFilletAndTopologyAreRealEdits() {
        fun assertEdit(setup: (FourthCadRuntimeAdapter) -> Unit, command: CadCommand) {
            val runtime = FourthCadRuntimeAdapter()
            setup(runtime)
            val before = runtime.snapshot().revision
            val result = runtime.dispatch(command)
            assertTrue(result.accepted, "Expected accepted: $command, message=${result.state.message}")
            assertEquals(before + 1L, result.state.revision)
        }
        assertEdit({ r ->
            draw(r, CadTool.LINE, CadPoint(-10.0, 0.0), CadPoint(10.0, 0.0)); draw(r, CadTool.LINE, CadPoint(0.0, -10.0), CadPoint(0.0, 10.0)); select(r, CadPoint(-5.0, 0.0)); select(r, CadPoint(0.0, 5.0))
        }, CadCommand.Trim)
        assertEdit({ r ->
            draw(r, CadTool.LINE, CadPoint(-10.0, 0.0), CadPoint(-2.0, 0.0)); draw(r, CadTool.LINE, CadPoint(0.0, -10.0), CadPoint(0.0, 10.0)); select(r, CadPoint(-5.0, 0.0)); select(r, CadPoint(0.0, 5.0))
        }, CadCommand.Extend)
        assertEdit({ r -> draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(10.0, 0.0)); select(r, CadPoint(5.0, 0.0)) }, CadCommand.Offset(5.0))
        assertEdit({ r -> draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(10.0, 0.0)); select(r, CadPoint(5.0, 0.0)) }, CadCommand.Array(3, 10.0, 0.0))
        assertEdit({ r -> draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(30.0, 0.0)); draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(0.0, 30.0)); select(r, CadPoint(20.0, 0.0)); select(r, CadPoint(0.0, 20.0)) }, CadCommand.Chamfer(5.0))
        assertEdit({ r -> draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(30.0, 0.0)); draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(0.0, 30.0)); select(r, CadPoint(20.0, 0.0)); select(r, CadPoint(0.0, 20.0)) }, CadCommand.Fillet(5.0))
        assertEdit({ r -> draw(r, CadTool.LINE, CadPoint(0.0, 0.0), CadPoint(10.0, 0.0)); draw(r, CadTool.LINE, CadPoint(10.0, 0.0), CadPoint(20.0, 0.0)); select(r, CadPoint(5.0, 0.0)); select(r, CadPoint(15.0, 0.0)) }, CadCommand.ToggleTopology)
    }
}
