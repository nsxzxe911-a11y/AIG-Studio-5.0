package com.aigstudio.runtime4.renderer.gpu

import java.util.concurrent.atomic.AtomicBoolean

class FirstFrameSignal(private val callback: () -> Unit) {
    private val fired = AtomicBoolean(false)
    fun fireOnce() {
        if (fired.compareAndSet(false, true)) callback()
    }
}
