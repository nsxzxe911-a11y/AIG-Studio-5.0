package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.renderer.gpu.FirstFrameSignal
import org.junit.Assert.assertEquals
import org.junit.Test

class FirstFrameSignalRegression {
    @Test fun callbackFiresExactlyOnce() {
        var calls = 0
        val signal = FirstFrameSignal { calls++ }
        signal.fireOnce()
        signal.fireOnce()
        assertEquals(1, calls)
    }
}
