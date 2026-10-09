package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import com.aigstudio.runtime4.renderer.gpu.RendererStateSource
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class RendererStateIsolationRegression {
    private class FakePort : CadRuntimePort {
        var state = CadState.initial().copy(
            revision = 7L,
            primitives = listOf(CadPrimitiveSnapshot.Segment(0.0,0.0,10.0,0.0,false)),
        )
        override fun snapshot(): CadState = state
        override fun dispatch(command: CadCommand): CadDispatchResult = CadDispatchResult(true, state)
    }

    @Test fun rendererRecreationReadsSameAuthoritativeCadState() {
        val port = FakePort()
        val first = RendererStateSource(port)
        assertEquals(7L, first.snapshotForFrame().revision)
        assertEquals(1, first.snapshotForFrame().primitives.size)
        port.state = port.state.copy(revision = 8L)
        val recreated = RendererStateSource(port)
        assertSame(port, recreated.runtimePort)
        assertEquals(8L, recreated.snapshotForFrame().revision)
        assertEquals(1, recreated.snapshotForFrame().primitives.size)
    }
}
