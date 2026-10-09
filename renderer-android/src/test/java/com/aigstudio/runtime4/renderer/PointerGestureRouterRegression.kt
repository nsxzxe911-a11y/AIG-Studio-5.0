package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*
import org.junit.Assert.*
import org.junit.Test

class PointerGestureRouterRegression {
    private class FakePort : CadRuntimePort {
        var state = CadState.initial()
        val commands = mutableListOf<CadCommand>()
        override fun snapshot() = state
        override fun dispatch(command: CadCommand): CadDispatchResult {
            commands += command
            if (command is CadCommand.PointerUp) state = state.copy(revision = state.revision + 1)
            return CadDispatchResult(true, state)
        }
    }

    @Test fun duplicateDownUpDoesNotDuplicateGeometryMutation() {
        val fake = FakePort()
        val router = PointerGestureRouter(fake)
        assertNotNull(router.onDown(CadPoint(0.0,0.0)))
        assertNull(router.onDown(CadPoint(0.0,0.0)))
        assertNotNull(router.onUp(CadPoint(10.0,0.0)))
        assertNull(router.onUp(CadPoint(10.0,0.0)))
        assertEquals(1, fake.commands.count { it is CadCommand.PointerDown })
        assertEquals(1, fake.commands.count { it is CadCommand.PointerUp })
        assertEquals(1L, fake.snapshot().revision)
    }
}
