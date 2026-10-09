package com.aigstudio.production.runtime

import com.aigstudio.runtime4.contract.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class FourthCadArcRuntimeRegression {
    private fun tap(runtime: FourthCadRuntimeAdapter, p: CadPoint): CadDispatchResult {
        runtime.dispatch(CadCommand.PointerDown(p))
        return runtime.dispatch(CadCommand.PointerUp(p))
    }

    @Test fun arcCommitsOnlyOnThirdTapAndDirectionControlsSweep() {
        val runtime = FourthCadRuntimeAdapter()
        runtime.dispatch(CadCommand.SelectTool(CadTool.ARC))
        val base = runtime.snapshot().revision
        assertTrue(tap(runtime, CadPoint(0.0, 0.0)).accepted)
        assertEquals(1, runtime.snapshot().arcStage)
        assertEquals(base, runtime.snapshot().revision)
        assertTrue(tap(runtime, CadPoint(10.0, 0.0)).accepted)
        assertEquals(2, runtime.snapshot().arcStage)
        assertEquals(base, runtime.snapshot().revision)
        val ccw = tap(runtime, CadPoint(0.0, 10.0))
        assertTrue(ccw.accepted)
        assertEquals(base + 1L, ccw.state.revision)
        val arc = ccw.state.primitives.single { it is CadPrimitiveSnapshot.Arc } as CadPrimitiveSnapshot.Arc
        assertTrue(arc.sweepDeg > 0.0)

        val cwRuntime = FourthCadRuntimeAdapter()
        cwRuntime.dispatch(CadCommand.SelectTool(CadTool.ARC))
        cwRuntime.dispatch(CadCommand.ToggleArcDirection)
        assertTrue(cwRuntime.snapshot().arcClockwise)
        tap(cwRuntime, CadPoint(0.0, 0.0))
        tap(cwRuntime, CadPoint(10.0, 0.0))
        val cw = tap(cwRuntime, CadPoint(0.0, 10.0))
        val cwArc = cw.state.primitives.single { it is CadPrimitiveSnapshot.Arc } as CadPrimitiveSnapshot.Arc
        assertTrue(cwArc.sweepDeg < 0.0)
    }

    @Test fun invalidArcIsLocalWarningAndNextValidLineStillWorks() {
        val runtime = FourthCadRuntimeAdapter()
        runtime.dispatch(CadCommand.SelectTool(CadTool.ARC))
        tap(runtime, CadPoint(0.0, 0.0))
        val rejected = tap(runtime, CadPoint(0.0, 0.0))
        assertFalse(rejected.accepted)
        assertNotNull(rejected.state.message)
        assertEquals(MessageSeverity.WARNING, rejected.state.message?.severity)
        assertEquals(0L, rejected.state.revision)
        runtime.dispatch(CadCommand.SelectTool(CadTool.LINE))
        runtime.dispatch(CadCommand.PointerDown(CadPoint(0.0, 0.0)))
        val line = runtime.dispatch(CadCommand.PointerUp(CadPoint(10.0, 0.0)))
        assertTrue(line.accepted)
        assertEquals(1L, line.state.revision)
    }
}
