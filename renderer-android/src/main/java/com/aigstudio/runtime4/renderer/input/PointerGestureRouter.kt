package com.aigstudio.runtime4.renderer

import com.aigstudio.runtime4.contract.*

class PointerGestureRouter(private val runtime: CadRuntimePort) {
    private var active = false

    fun onDown(point: CadPoint): CadDispatchResult? {
        if (active) return null
        active = true
        return runtime.dispatch(CadCommand.PointerDown(point))
    }

    fun onUp(point: CadPoint): CadDispatchResult? {
        if (!active) return null
        active = false
        return runtime.dispatch(CadCommand.PointerUp(point))
    }

    fun cancel() { active = false }
}
