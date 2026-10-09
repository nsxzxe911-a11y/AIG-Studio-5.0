package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CadLayerRuntimeRegression {
    private fun drawLine(runtime: FourthCadRuntimeAdapter) {
        runtime.dispatch(CadCommand.SelectTool(CadTool.LINE))
        runtime.dispatch(CadCommand.PointerDown(CadPoint(0.0, 0.0)))
        assertTrue(runtime.dispatch(CadCommand.PointerUp(CadPoint(20.0, 0.0))).accepted)
    }

    private fun selectLine(runtime: FourthCadRuntimeAdapter): CadDispatchResult {
        runtime.dispatch(CadCommand.SelectTool(CadTool.SELECT))
        runtime.dispatch(CadCommand.PointerDown(CadPoint(10.0, 0.0)))
        return runtime.dispatch(CadCommand.PointerUp(CadPoint(10.0, 0.0)))
    }

    @Test fun activeLayerIsInheritedAndHiddenGeometryIsNotRenderedOrSelectable() {
        val session = CleanCadSession()
        val runtime = FourthCadRuntimeAdapter(session)
        assertEquals(CadLayer.WORKPIECE, runtime.snapshot().activeLayer)
        assertTrue(runtime.snapshot().layerVisibility.values.all { it })
        assertTrue(runtime.dispatch(CadCommand.SetActiveLayer(CadLayer.CENTERLINE)).accepted)
        drawLine(runtime)
        assertEquals(1, session.entityCount())
        assertEquals(1, runtime.snapshot().primitives.size)
        assertTrue(runtime.dispatch(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE)).accepted)
        assertEquals(1, session.entityCount())
        assertTrue(runtime.snapshot().primitives.isEmpty())
        val hiddenSelect = selectLine(runtime)
        assertFalse(hiddenSelect.accepted)
        assertEquals(0, runtime.snapshot().selectedCount)
        assertTrue(runtime.dispatch(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE)).accepted)
        assertEquals(1, runtime.snapshot().primitives.size)
    }

    @Test fun selectedGeometryCanBeReassignedAndAssignmentSupportsUndoRedo() {
        val runtime = FourthCadRuntimeAdapter()
        drawLine(runtime)
        assertTrue(selectLine(runtime).accepted)
        assertTrue(runtime.dispatch(CadCommand.AssignSelectionToLayer(CadLayer.CENTERLINE)).accepted)
        assertTrue(runtime.dispatch(CadCommand.ToggleLayerVisibility(CadLayer.CENTERLINE)).accepted)
        assertTrue(runtime.snapshot().primitives.isEmpty())
        assertTrue(runtime.dispatch(CadCommand.Undo).accepted)
        assertEquals(1, runtime.snapshot().primitives.size)
        assertTrue(runtime.dispatch(CadCommand.Redo).accepted)
        assertTrue(runtime.snapshot().primitives.isEmpty())
    }
}
